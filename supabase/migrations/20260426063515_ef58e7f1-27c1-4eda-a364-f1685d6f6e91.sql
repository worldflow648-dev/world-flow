-- Allow the wholesale-charge RPC to be invoked by the internal system caller
-- (service-role, auth.uid() IS NULL) used by the auto-expire scheduled job.
-- Authenticated callers still must be admins.

CREATE OR REPLACE FUNCTION public.charge_merchant_wholesale(p_return_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_is_admin boolean;
  v_return record;
  v_order record;
  v_amount numeric;
  v_wallet_id uuid;
  v_description text;
BEGIN
  -- System callers (cron / service-role) have NULL auth.uid(); allow them.
  -- Authenticated callers must be admins.
  IF v_caller IS NOT NULL THEN
    SELECT public.has_role(v_caller, 'admin'::app_role) INTO v_is_admin;
    IF NOT v_is_admin THEN
      RAISE EXCEPTION 'NOT_ADMIN';
    END IF;
  END IF;

  SELECT * INTO v_return FROM public.order_returns WHERE id = p_return_id;
  IF v_return.id IS NULL THEN
    RAISE EXCEPTION 'RETURN_NOT_FOUND';
  END IF;

  IF v_return.wholesale_settled THEN
    RAISE EXCEPTION 'ALREADY_SETTLED';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = v_return.order_id;
  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;

  v_amount := COALESCE(v_order.total_wholesale_cost, 0);
  IF v_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_WHOLESALE_AMOUNT';
  END IF;

  SELECT id INTO v_wallet_id FROM public.wallets WHERE merchant_id = v_return.merchant_id;
  IF v_wallet_id IS NULL THEN
    INSERT INTO public.wallets (merchant_id, balance, total_earned, total_withdrawn)
    VALUES (v_return.merchant_id, 0, 0, 0)
    RETURNING id INTO v_wallet_id;
  END IF;

  UPDATE public.wallets
  SET balance = balance - v_amount,
      updated_at = now()
  WHERE id = v_wallet_id;

  IF p_reason = 'expired' THEN
    v_description := 'Wholesale charge for expired return: ' || v_order.order_number;
  ELSE
    v_description := 'Wholesale charge for unreceived order ' || v_order.order_number;
  END IF;

  INSERT INTO public.wallet_transactions (wallet_id, order_id, amount, type, description)
  VALUES (
    v_wallet_id,
    v_return.order_id,
    -v_amount,
    'debit',
    v_description
  );

  UPDATE public.order_returns
  SET wholesale_settled = true,
      wholesale_charge_amount = v_amount,
      wholesale_charged_at = now(),
      wholesale_charged_by = v_caller, -- NULL for system runs
      updated_at = now()
  WHERE id = p_return_id;

  RETURN v_amount;
END;
$function$;

-- Enable required extensions for the scheduled cron job.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net  WITH SCHEMA extensions;