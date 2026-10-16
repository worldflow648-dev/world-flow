CREATE OR REPLACE FUNCTION public.admin_resend_returned_order(
  p_return_id uuid,
  p_resent_to_name text,
  p_resent_to_phone text,
  p_resent_to_phone2 text,
  p_resent_to_governorate text,
  p_resent_to_region text,
  p_resent_to_landmark text,
  p_new_retail_price numeric DEFAULT NULL::numeric,
  p_discount_code text DEFAULT NULL::text,
  p_discount_amount numeric DEFAULT NULL::numeric,
  p_discount_base_price numeric DEFAULT NULL::numeric
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_is_admin boolean := false;
  v_return record;
  v_order record;
  v_wallet_id uuid;
  v_apply_discount boolean := false;
  v_final_price numeric;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  SELECT public.has_role(v_caller, 'admin'::app_role) INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  SELECT * INTO v_return FROM public.order_returns WHERE id = p_return_id;
  IF v_return.id IS NULL THEN
    RAISE EXCEPTION 'RETURN_NOT_FOUND';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = v_return.order_id;
  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;

  IF v_return.status <> 'expired' OR v_return.resent_at IS NULL THEN
    RAISE EXCEPTION 'INVALID_STATE';
  END IF;

  IF p_resent_to_name IS NULL OR length(trim(p_resent_to_name)) = 0
     OR p_resent_to_phone IS NULL OR length(trim(p_resent_to_phone)) = 0
     OR p_resent_to_governorate IS NULL OR length(trim(p_resent_to_governorate)) = 0 THEN
    RAISE EXCEPTION 'MISSING_RECIPIENT';
  END IF;

  -- Reverse wholesale charge if it was settled.
  IF v_return.wholesale_settled = true AND COALESCE(v_return.wholesale_charge_amount, 0) > 0 THEN
    SELECT id INTO v_wallet_id FROM public.wallets WHERE merchant_id = v_return.merchant_id;
    IF v_wallet_id IS NOT NULL THEN
      UPDATE public.wallets
      SET balance = balance + v_return.wholesale_charge_amount,
          updated_at = now()
      WHERE id = v_wallet_id;

      INSERT INTO public.wallet_transactions (wallet_id, order_id, amount, type, description)
      VALUES (
        v_wallet_id,
        v_return.order_id,
        v_return.wholesale_charge_amount,
        'credit',
        'Reversal: admin resend of order ' || v_order.order_number
      );
    END IF;
  END IF;

  v_apply_discount := p_discount_amount IS NOT NULL
                      AND p_discount_amount > 0
                      AND p_discount_base_price IS NOT NULL
                      AND p_discount_base_price > 0;

  -- Compute final retail price.
  IF v_apply_discount THEN
    v_final_price := GREATEST(p_discount_base_price - p_discount_amount, 0);
  ELSIF p_new_retail_price IS NOT NULL AND p_new_retail_price > 0 THEN
    v_final_price := p_new_retail_price;
  ELSE
    v_final_price := v_order.final_retail_price;
  END IF;

  UPDATE public.order_returns
  SET status = 'resent',
      resent_at = now(),
      resent_to_name = p_resent_to_name,
      resent_to_phone = p_resent_to_phone,
      resent_to_phone2 = p_resent_to_phone2,
      resent_to_governorate = p_resent_to_governorate,
      resent_to_region = p_resent_to_region,
      resent_to_landmark = p_resent_to_landmark,
      new_retail_price = COALESCE(p_new_retail_price, new_retail_price),
      wholesale_settled = false,
      wholesale_charge_amount = NULL,
      wholesale_charged_at = NULL,
      wholesale_charged_by = NULL,
      updated_at = now()
  WHERE id = p_return_id;

  UPDATE public.orders
  SET status = 'resent',
      customer_name = p_resent_to_name,
      customer_phone = p_resent_to_phone,
      customer_phone2 = p_resent_to_phone2,
      governorate = p_resent_to_governorate,
      region = p_resent_to_region,
      landmark = p_resent_to_landmark,
      final_retail_price = v_final_price,
      discount_code = CASE WHEN v_apply_discount THEN upper(trim(p_discount_code)) ELSE discount_code END,
      discount_amount = CASE WHEN v_apply_discount THEN p_discount_amount ELSE discount_amount END,
      updated_at = now()
  WHERE id = v_return.order_id;

  IF v_apply_discount AND p_discount_code IS NOT NULL AND length(trim(p_discount_code)) > 0 THEN
    PERFORM public.increment_discount_used_count(upper(trim(p_discount_code)));
  END IF;

  RETURN v_return.order_id;
END;
$function$;