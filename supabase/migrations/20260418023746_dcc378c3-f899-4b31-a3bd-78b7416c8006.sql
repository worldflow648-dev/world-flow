-- 1. Add wholesale_price to addons & options
ALTER TABLE public.product_addons
  ADD COLUMN IF NOT EXISTS wholesale_price numeric NOT NULL DEFAULT 0;

ALTER TABLE public.addon_options
  ADD COLUMN IF NOT EXISTS wholesale_price numeric;

-- 2. Update create_order_with_validation: include shipping in final_retail_price + addon wholesale in costs
CREATE OR REPLACE FUNCTION public.create_order_with_validation(
  p_customer_name text,
  p_customer_phone text,
  p_customer_phone2 text,
  p_governorate text,
  p_region text,
  p_landmark text,
  p_merchant_notes text,
  p_discount_code text,
  p_deposit_receipt_url text,
  p_merchant_payment_receipt_url text,
  p_items jsonb
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_merchant boolean;
  v_merchant_tier text;
  v_tier_discount_type text;
  v_tier_discount_value numeric := 0;
  v_shipping_fee numeric;
  v_allow_below_cost boolean := true;
  v_setting_value text;

  v_item jsonb;
  v_product_id uuid;
  v_variant_id uuid;
  v_size text;
  v_color text;
  v_quantity int;
  v_retail_price numeric;
  v_design_url text;
  v_mockup_url text;
  v_addons jsonb;

  v_product_name text;
  v_product_image text;
  v_merchant_price numeric;
  v_wholesale_price numeric;

  v_addon_entry jsonb;
  v_addon_id uuid;
  v_option_id uuid;
  v_addon_price numeric;
  v_addon_wholesale numeric;
  v_addon_name text;
  v_option_name text;
  v_addon_requires_deposit boolean;
  v_addon_deposit_price numeric;
  v_item_addons_total numeric;
  v_item_addons_wholesale_total numeric;
  v_item_deposit_total numeric;
  v_resolved_addons jsonb;

  v_total_wholesale_cost numeric := 0;
  v_total_merchant_cost_raw numeric := 0;
  v_final_retail_price numeric := 0;
  v_total_deposit numeric := 0;

  v_tier_discount_amount numeric := 0;
  v_total_merchant_cost numeric;
  v_net_profit numeric;
  v_merchant_payment_amount numeric := 0;

  v_discount_amount numeric := 0;
  v_discount_row record;

  v_order_number text;
  v_order_id uuid;
  v_stock_ok boolean;

  v_order_items_buffer jsonb := '[]'::jsonb;
  v_buffer_item jsonb;
BEGIN
  -- Auth: must be a merchant
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  SELECT public.has_role(v_user_id, 'merchant'::app_role) INTO v_is_merchant;
  IF NOT v_is_merchant THEN
    RAISE EXCEPTION 'NOT_MERCHANT';
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'NO_ITEMS';
  END IF;

  SELECT shipping_fee INTO v_shipping_fee
  FROM governorates
  WHERE id = p_governorate AND is_active = true;
  IF v_shipping_fee IS NULL THEN
    RAISE EXCEPTION 'INVALID_GOVERNORATE';
  END IF;

  SELECT value INTO v_setting_value FROM app_settings WHERE key = 'allow_below_cost_pricing';
  IF v_setting_value = 'false' THEN
    v_allow_below_cost := false;
  END IF;

  SELECT COALESCE(merchant_tier, 'basic') INTO v_merchant_tier FROM profiles WHERE id = v_user_id;
  SELECT discount_type, discount_value INTO v_tier_discount_type, v_tier_discount_value
  FROM tier_discounts
  WHERE tier = v_merchant_tier AND is_active = true
  LIMIT 1;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := NULLIF(v_item->>'product_id','')::uuid;
    v_variant_id := NULLIF(v_item->>'variant_id','')::uuid;
    v_size := v_item->>'size';
    v_color := v_item->>'color';
    v_quantity := COALESCE((v_item->>'quantity')::int, 0);
    v_retail_price := COALESCE((v_item->>'retail_price')::numeric, 0);
    v_design_url := v_item->>'design_file_url';
    v_mockup_url := v_item->>'mockup_file_url';
    v_addons := COALESCE(v_item->'addons', '[]'::jsonb);

    IF v_product_id IS NULL THEN
      RAISE EXCEPTION 'INVALID_PRODUCT';
    END IF;
    IF v_quantity <= 0 THEN
      RAISE EXCEPTION 'INVALID_QUANTITY';
    END IF;

    SELECT name, COALESCE(images[1], NULL), merchant_price, wholesale_price
    INTO v_product_name, v_product_image, v_merchant_price, v_wholesale_price
    FROM products
    WHERE id = v_product_id AND is_active = true;
    IF v_product_name IS NULL THEN
      RAISE EXCEPTION 'PRODUCT_NOT_FOUND';
    END IF;

    IF v_variant_id IS NULL THEN
      SELECT id INTO v_variant_id FROM product_variants
      WHERE product_id = v_product_id AND size = v_size AND is_active = true
      LIMIT 1;
    ELSE
      PERFORM 1 FROM product_variants
      WHERE id = v_variant_id AND product_id = v_product_id AND is_active = true;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'INVALID_VARIANT';
      END IF;
    END IF;

    IF v_variant_id IS NOT NULL THEN
      SELECT public.check_and_decrement_stock(v_variant_id, v_quantity) INTO v_stock_ok;
      IF NOT v_stock_ok THEN
        RAISE EXCEPTION 'OUT_OF_STOCK:%', v_product_name;
      END IF;
    END IF;

    v_item_addons_total := 0;
    v_item_addons_wholesale_total := 0;
    v_item_deposit_total := 0;
    v_resolved_addons := '[]'::jsonb;

    FOR v_addon_entry IN SELECT * FROM jsonb_array_elements(v_addons)
    LOOP
      v_addon_id := NULLIF(v_addon_entry->>'id','')::uuid;
      v_option_id := NULLIF(v_addon_entry->>'optionId','')::uuid;
      IF v_addon_id IS NULL THEN
        RAISE EXCEPTION 'INVALID_ADDON';
      END IF;

      SELECT name, price, COALESCE(wholesale_price, 0), COALESCE(requires_deposit,false), COALESCE(deposit_price,0)
      INTO v_addon_name, v_addon_price, v_addon_wholesale, v_addon_requires_deposit, v_addon_deposit_price
      FROM product_addons
      WHERE id = v_addon_id AND is_active = true;
      IF v_addon_name IS NULL THEN
        RAISE EXCEPTION 'ADDON_NOT_FOUND';
      END IF;

      v_option_name := NULL;
      IF v_option_id IS NOT NULL THEN
        SELECT ao.name, COALESCE(ao.price, v_addon_price), COALESCE(ao.wholesale_price, v_addon_wholesale)
        INTO v_option_name, v_addon_price, v_addon_wholesale
        FROM addon_options ao
        WHERE ao.id = v_option_id AND ao.addon_id = v_addon_id AND ao.is_active = true;
        IF v_option_name IS NULL THEN
          RAISE EXCEPTION 'ADDON_OPTION_NOT_FOUND';
        END IF;
      END IF;

      v_item_addons_total := v_item_addons_total + v_addon_price;
      v_item_addons_wholesale_total := v_item_addons_wholesale_total + v_addon_wholesale;
      IF v_addon_requires_deposit THEN
        v_item_deposit_total := v_item_deposit_total + COALESCE(NULLIF(v_addon_deposit_price,0), v_addon_price);
      END IF;

      v_resolved_addons := v_resolved_addons || jsonb_build_object(
        'id', v_addon_id,
        'name', CASE WHEN v_option_name IS NOT NULL THEN v_addon_name || ' (' || v_option_name || ')' ELSE v_addon_name END,
        'price', v_addon_price,
        'wholesale_price', v_addon_wholesale,
        'optionId', v_option_id,
        'optionName', v_option_name,
        'requires_deposit', v_addon_requires_deposit,
        'deposit_price', v_addon_deposit_price
      );
    END LOOP;

    IF v_retail_price <= 0 THEN
      RAISE EXCEPTION 'ZERO_RETAIL_PRICE:%', v_product_name;
    END IF;
    IF NOT v_allow_below_cost AND v_retail_price < (v_merchant_price + v_item_addons_total) THEN
      RAISE EXCEPTION 'BELOW_COST:%', v_product_name;
    END IF;

    -- Accumulate totals: wholesale cost now includes addon wholesale
    v_total_wholesale_cost := v_total_wholesale_cost + (v_wholesale_price + v_item_addons_wholesale_total) * v_quantity;
    v_total_merchant_cost_raw := v_total_merchant_cost_raw + (v_merchant_price + v_item_addons_total) * v_quantity;
    v_final_retail_price := v_final_retail_price + v_retail_price * v_quantity;
    v_total_deposit := v_total_deposit + v_item_deposit_total * v_quantity;

    v_order_items_buffer := v_order_items_buffer || jsonb_build_object(
      'product_id', v_product_id,
      'variant_id', v_variant_id,
      'product_name', v_product_name,
      'product_image', v_product_image,
      'size', v_size,
      'color', v_color,
      'quantity', v_quantity,
      'merchant_price', v_merchant_price,
      'wholesale_price', v_wholesale_price,
      'retail_price', v_retail_price,
      'addons', v_resolved_addons,
      'design_file_url', v_design_url,
      'mockup_file_url', v_mockup_url
    );
  END LOOP;

  IF v_tier_discount_type = 'percentage' AND COALESCE(v_tier_discount_value,0) > 0 THEN
    v_tier_discount_amount := floor(v_total_merchant_cost_raw * v_tier_discount_value / 100);
  ELSIF v_tier_discount_type = 'fixed' AND COALESCE(v_tier_discount_value,0) > 0 THEN
    v_tier_discount_amount := LEAST(v_tier_discount_value, v_total_merchant_cost_raw);
  END IF;
  v_total_merchant_cost := v_total_merchant_cost_raw - v_tier_discount_amount;

  IF p_discount_code IS NOT NULL AND length(trim(p_discount_code)) > 0 THEN
    SELECT * INTO v_discount_row FROM discount_codes
    WHERE code = upper(trim(p_discount_code))
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now());
    IF v_discount_row.id IS NULL THEN
      RAISE EXCEPTION 'INVALID_DISCOUNT_CODE';
    END IF;
    IF v_discount_row.max_uses IS NOT NULL AND COALESCE(v_discount_row.used_count,0) >= v_discount_row.max_uses THEN
      RAISE EXCEPTION 'DISCOUNT_USED_UP';
    END IF;
    IF v_discount_row.min_order_value IS NOT NULL AND v_final_retail_price < v_discount_row.min_order_value THEN
      RAISE EXCEPTION 'DISCOUNT_MIN_ORDER';
    END IF;
    IF v_discount_row.scope = 'product' AND v_discount_row.product_id IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_items) it WHERE (it->>'product_id')::uuid = v_discount_row.product_id) THEN
        RAISE EXCEPTION 'DISCOUNT_PRODUCT_MISMATCH';
      END IF;
    END IF;
    IF v_discount_row.discount_type = 'percentage' THEN
      v_discount_amount := floor(v_final_retail_price * v_discount_row.discount_value / 100);
    ELSE
      v_discount_amount := v_discount_row.discount_value;
    END IF;
    v_discount_amount := LEAST(v_discount_amount, v_final_retail_price);
  END IF;

  -- Final retail price = sum(retail*qty) - discount + shipping (customer pays shipping)
  v_final_retail_price := v_final_retail_price - v_discount_amount + v_shipping_fee;
  -- Net profit (merchant payout) = final retail - merchant cost - shipping (unchanged semantics)
  v_net_profit := v_final_retail_price - v_total_merchant_cost - v_shipping_fee;
  v_merchant_payment_amount := CASE WHEN v_net_profit < 0 THEN abs(v_net_profit) ELSE 0 END;

  IF v_merchant_payment_amount > 0 AND (p_merchant_payment_receipt_url IS NULL OR length(trim(p_merchant_payment_receipt_url)) = 0) THEN
    RAISE EXCEPTION 'MERCHANT_PAYMENT_RECEIPT_REQUIRED';
  END IF;

  SELECT public.generate_order_number() INTO v_order_number;

  INSERT INTO orders (
    merchant_id, order_number, customer_name, customer_phone, customer_phone2,
    governorate, region, landmark, merchant_notes,
    shipping_fee, total_merchant_cost, total_wholesale_cost, final_retail_price, net_profit,
    discount_code, discount_amount,
    deposit_amount, deposit_receipt_url, deposit_verified,
    merchant_payment_amount, merchant_payment_receipt_url, merchant_payment_verified,
    status
  ) VALUES (
    v_user_id, v_order_number, p_customer_name, p_customer_phone, p_customer_phone2,
    p_governorate, p_region, p_landmark, p_merchant_notes,
    v_shipping_fee, v_total_merchant_cost, v_total_wholesale_cost, v_final_retail_price, v_net_profit,
    CASE WHEN v_discount_amount > 0 THEN upper(trim(p_discount_code)) ELSE NULL END,
    v_discount_amount,
    v_total_deposit, p_deposit_receipt_url, false,
    v_merchant_payment_amount, p_merchant_payment_receipt_url, false,
    'pending'
  ) RETURNING id INTO v_order_id;

  FOR v_buffer_item IN SELECT * FROM jsonb_array_elements(v_order_items_buffer)
  LOOP
    INSERT INTO order_items (
      order_id, product_id, variant_id, product_name, product_image,
      size, color, quantity, merchant_price, wholesale_price, retail_price,
      addons, design_file_url, mockup_file_url
    ) VALUES (
      v_order_id,
      NULLIF(v_buffer_item->>'product_id','')::uuid,
      NULLIF(v_buffer_item->>'variant_id','')::uuid,
      v_buffer_item->>'product_name',
      v_buffer_item->>'product_image',
      v_buffer_item->>'size',
      v_buffer_item->>'color',
      (v_buffer_item->>'quantity')::int,
      (v_buffer_item->>'merchant_price')::numeric,
      (v_buffer_item->>'wholesale_price')::numeric,
      (v_buffer_item->>'retail_price')::numeric,
      v_buffer_item->'addons',
      v_buffer_item->>'design_file_url',
      v_buffer_item->>'mockup_file_url'
    );
  END LOOP;

  IF v_discount_amount > 0 THEN
    PERFORM public.increment_discount_used_count(upper(trim(p_discount_code)));
  END IF;

  RETURN v_order_id;
END;
$function$;