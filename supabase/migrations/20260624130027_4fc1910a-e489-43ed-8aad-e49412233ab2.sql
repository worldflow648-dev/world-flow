-- Fix shipping double-count: store final_retail_price WITHOUT shipping;
-- net_profit no longer subtracts shipping. Customer pays shipping on top.

CREATE OR REPLACE FUNCTION public.create_order_with_validation(p_customer_name text, p_customer_phone text, p_customer_phone2 text, p_governorate text, p_region text, p_landmark text, p_merchant_notes text, p_discount_code text, p_deposit_receipt_url text, p_merchant_payment_receipt_url text, p_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_allowed boolean;
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
  v_design_urls jsonb;
  v_mockup_urls jsonb;
  v_addons jsonb;
  v_variant_match_count int;

  v_product_name text;
  v_product_image text;
  v_product_category_id uuid;
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

  v_scope_count int;
  v_scope_price numeric;
  v_scope_wholesale numeric;
  v_scope_deposit numeric;

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
  v_dcp_count int;
  v_match_found boolean;

  v_order_number text;
  v_order_id uuid;
  v_stock_ok boolean;

  v_order_items_buffer jsonb := '[]'::jsonb;
  v_buffer_item jsonb;

  v_design_arr text[];
  v_mockup_arr text[];
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  SELECT (public.has_role(v_user_id, 'merchant'::app_role) OR public.has_role(v_user_id, 'admin'::app_role))
    INTO v_is_allowed;
  IF NOT v_is_allowed THEN
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
    v_color := NULLIF(v_item->>'color','');
    v_quantity := COALESCE((v_item->>'quantity')::int, 0);
    v_retail_price := COALESCE((v_item->>'retail_price')::numeric, 0);

    v_design_urls := v_item->'design_file_urls';
    v_mockup_urls := v_item->'mockup_file_urls';
    v_design_url := v_item->>'design_file_url';
    v_mockup_url := v_item->>'mockup_file_url';

    IF v_design_urls IS NOT NULL AND jsonb_typeof(v_design_urls) = 'array' AND jsonb_array_length(v_design_urls) > 0 THEN
      SELECT array_agg(value) INTO v_design_arr FROM jsonb_array_elements_text(v_design_urls);
      IF v_design_url IS NULL THEN v_design_url := v_design_arr[1]; END IF;
    ELSIF v_design_url IS NOT NULL THEN
      v_design_arr := ARRAY[v_design_url];
    ELSE
      v_design_arr := NULL;
    END IF;

    IF v_mockup_urls IS NOT NULL AND jsonb_typeof(v_mockup_urls) = 'array' AND jsonb_array_length(v_mockup_urls) > 0 THEN
      SELECT array_agg(value) INTO v_mockup_arr FROM jsonb_array_elements_text(v_mockup_urls);
      IF v_mockup_url IS NULL THEN v_mockup_url := v_mockup_arr[1]; END IF;
    ELSIF v_mockup_url IS NOT NULL THEN
      v_mockup_arr := ARRAY[v_mockup_url];
    ELSE
      v_mockup_arr := NULL;
    END IF;

    v_addons := COALESCE(v_item->'addons', '[]'::jsonb);

    IF v_product_id IS NULL THEN RAISE EXCEPTION 'INVALID_PRODUCT'; END IF;
    IF v_quantity <= 0 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;

    SELECT name, COALESCE(images[1], NULL), merchant_price, wholesale_price, category_id
    INTO v_product_name, v_product_image, v_merchant_price, v_wholesale_price, v_product_category_id
    FROM products WHERE id = v_product_id AND is_active = true;
    IF v_product_name IS NULL THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;

    IF v_variant_id IS NOT NULL THEN
      PERFORM 1 FROM product_variants
      WHERE id = v_variant_id AND product_id = v_product_id AND is_active = true;
      IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_VARIANT'; END IF;
    ELSIF v_color IS NOT NULL THEN
      SELECT id INTO v_variant_id FROM product_variants
      WHERE product_id = v_product_id AND is_active = true AND size = v_size AND color = v_color
      LIMIT 1;
      IF v_variant_id IS NULL THEN RAISE EXCEPTION 'INVALID_VARIANT'; END IF;
    ELSE
      SELECT count(*) INTO v_variant_match_count FROM product_variants
      WHERE product_id = v_product_id AND is_active = true AND size = v_size;
      IF v_variant_match_count = 0 THEN
        RAISE EXCEPTION 'INVALID_VARIANT';
      ELSIF v_variant_match_count > 1 THEN
        RAISE EXCEPTION 'AMBIGUOUS_VARIANT:%', v_product_name;
      ELSE
        SELECT id INTO v_variant_id FROM product_variants
        WHERE product_id = v_product_id AND is_active = true AND size = v_size
        LIMIT 1;
      END IF;
    END IF;

    SELECT public.check_and_decrement_stock(v_variant_id, v_quantity) INTO v_stock_ok;
    IF NOT v_stock_ok THEN RAISE EXCEPTION 'OUT_OF_STOCK:%', v_product_name; END IF;

    v_item_addons_total := 0;
    v_item_addons_wholesale_total := 0;
    v_item_deposit_total := 0;
    v_resolved_addons := '[]'::jsonb;

    FOR v_addon_entry IN SELECT * FROM jsonb_array_elements(v_addons)
    LOOP
      v_addon_id := NULLIF(v_addon_entry->>'addonId','')::uuid;
      v_option_id := NULLIF(v_addon_entry->>'optionId','')::uuid;
      IF v_addon_id IS NULL THEN RAISE EXCEPTION 'INVALID_ADDON'; END IF;
      SELECT name, price, COALESCE(wholesale_price, 0), COALESCE(requires_deposit, false), COALESCE(deposit_price, 0)
      INTO v_addon_name, v_addon_price, v_addon_wholesale, v_addon_requires_deposit, v_addon_deposit_price
      FROM product_addons WHERE id = v_addon_id AND is_active = true;
      IF v_addon_name IS NULL THEN RAISE EXCEPTION 'ADDON_NOT_FOUND'; END IF;

      SELECT count(*) INTO v_scope_count FROM addon_scopes WHERE addon_id = v_addon_id;
      IF v_scope_count > 0 THEN
        SELECT price_override, wholesale_price_override, deposit_price_override
          INTO v_scope_price, v_scope_wholesale, v_scope_deposit
        FROM addon_scopes
        WHERE addon_id = v_addon_id AND product_id = v_product_id LIMIT 1;
        IF NOT FOUND THEN
          IF v_product_category_id IS NOT NULL THEN
            SELECT price_override, wholesale_price_override, deposit_price_override
              INTO v_scope_price, v_scope_wholesale, v_scope_deposit
            FROM addon_scopes
            WHERE addon_id = v_addon_id AND category_id = v_product_category_id LIMIT 1;
          END IF;
          IF NOT FOUND THEN RAISE EXCEPTION 'ADDON_NOT_AVAILABLE_FOR_PRODUCT:%', v_product_name; END IF;
        END IF;
        IF v_scope_price IS NOT NULL THEN v_addon_price := v_scope_price; END IF;
        IF v_scope_wholesale IS NOT NULL THEN v_addon_wholesale := v_scope_wholesale; END IF;
        IF v_scope_deposit IS NOT NULL THEN v_addon_deposit_price := v_scope_deposit; END IF;
        v_scope_price := NULL; v_scope_wholesale := NULL; v_scope_deposit := NULL;
      END IF;

      v_option_name := NULL;
      IF v_option_id IS NOT NULL THEN
        SELECT name, price, COALESCE(wholesale_price, v_addon_wholesale)
        INTO v_option_name, v_addon_price, v_addon_wholesale
        FROM addon_options
        WHERE id = v_option_id AND addon_id = v_addon_id AND is_active = true;
        IF v_option_name IS NULL THEN RAISE EXCEPTION 'ADDON_OPTION_NOT_FOUND'; END IF;
      END IF;
      v_item_addons_total := v_item_addons_total + v_addon_price;
      v_item_addons_wholesale_total := v_item_addons_wholesale_total + v_addon_wholesale;
      IF v_addon_requires_deposit THEN
        v_item_deposit_total := v_item_deposit_total + v_addon_deposit_price;
      END IF;
      v_resolved_addons := v_resolved_addons || jsonb_build_object(
        'addonId', v_addon_id, 'addonName', v_addon_name, 'price', v_addon_price,
        'optionId', v_option_id, 'optionName', v_option_name,
        'requires_deposit', v_addon_requires_deposit, 'deposit_price', v_addon_deposit_price
      );
    END LOOP;

    IF v_retail_price <= 0 THEN RAISE EXCEPTION 'ZERO_RETAIL_PRICE:%', v_product_name; END IF;
    IF NOT v_allow_below_cost AND v_retail_price < (v_merchant_price + v_item_addons_total) THEN
      RAISE EXCEPTION 'BELOW_COST:%', v_product_name;
    END IF;

    v_total_wholesale_cost := v_total_wholesale_cost + (v_wholesale_price + v_item_addons_wholesale_total) * v_quantity;
    v_total_merchant_cost_raw := v_total_merchant_cost_raw + (v_merchant_price + v_item_addons_total) * v_quantity;
    v_final_retail_price := v_final_retail_price + v_retail_price * v_quantity;
    v_total_deposit := v_total_deposit + v_item_deposit_total * v_quantity;

    v_order_items_buffer := v_order_items_buffer || jsonb_build_object(
      'product_id', v_product_id, 'variant_id', v_variant_id,
      'product_name', v_product_name, 'product_image', v_product_image,
      'size', v_size, 'color', v_color, 'quantity', v_quantity,
      'merchant_price', v_merchant_price, 'wholesale_price', v_wholesale_price,
      'retail_price', v_retail_price, 'addons', v_resolved_addons,
      'design_file_url', v_design_url, 'mockup_file_url', v_mockup_url,
      'design_file_urls', COALESCE(to_jsonb(v_design_arr), 'null'::jsonb),
      'mockup_file_urls', COALESCE(to_jsonb(v_mockup_arr), 'null'::jsonb)
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
    IF v_discount_row.id IS NULL THEN RAISE EXCEPTION 'INVALID_DISCOUNT_CODE'; END IF;
    IF v_discount_row.max_uses IS NOT NULL AND COALESCE(v_discount_row.used_count,0) >= v_discount_row.max_uses THEN
      RAISE EXCEPTION 'DISCOUNT_USED_UP';
    END IF;
    IF v_discount_row.min_order_value IS NOT NULL AND v_final_retail_price < v_discount_row.min_order_value THEN
      RAISE EXCEPTION 'DISCOUNT_MIN_ORDER';
    END IF;
    IF v_discount_row.scope = 'product' THEN
      SELECT count(*) INTO v_dcp_count FROM discount_code_products WHERE discount_code_id = v_discount_row.id;
      IF v_dcp_count > 0 THEN
        SELECT EXISTS (
          SELECT 1 FROM jsonb_array_elements(p_items) it
          JOIN discount_code_products dcp ON dcp.product_id = (it->>'product_id')::uuid
          WHERE dcp.discount_code_id = v_discount_row.id
        ) INTO v_match_found;
        IF NOT v_match_found THEN RAISE EXCEPTION 'DISCOUNT_PRODUCT_MISMATCH'; END IF;
      ELSIF v_discount_row.product_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_items) it WHERE (it->>'product_id')::uuid = v_discount_row.product_id) THEN
          RAISE EXCEPTION 'DISCOUNT_PRODUCT_MISMATCH';
        END IF;
      END IF;
    END IF;
    IF v_discount_row.discount_type = 'percentage' THEN
      v_discount_amount := floor(v_final_retail_price * v_discount_row.discount_value / 100);
    ELSE
      v_discount_amount := v_discount_row.discount_value;
    END IF;
    v_discount_amount := LEAST(v_discount_amount, v_final_retail_price);
  END IF;

  -- Shipping is NOT included in final_retail_price; customer pays it on top.
  v_final_retail_price := v_final_retail_price - v_discount_amount;
  v_net_profit := v_final_retail_price - v_total_merchant_cost;
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
      addons, design_file_url, mockup_file_url, design_file_urls, mockup_file_urls
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
      v_buffer_item->>'mockup_file_url',
      CASE WHEN jsonb_typeof(v_buffer_item->'design_file_urls') = 'array'
           THEN ARRAY(SELECT jsonb_array_elements_text(v_buffer_item->'design_file_urls'))
           ELSE NULL END,
      CASE WHEN jsonb_typeof(v_buffer_item->'mockup_file_urls') = 'array'
           THEN ARRAY(SELECT jsonb_array_elements_text(v_buffer_item->'mockup_file_urls'))
           ELSE NULL END
    );
  END LOOP;

  IF v_discount_amount > 0 THEN
    PERFORM public.increment_discount_used_count(upper(trim(p_discount_code)));
  END IF;

  RETURN v_order_id;
END;
$function$;

-- Backfill existing orders: remove shipping from final_retail_price, add back to net_profit
UPDATE public.orders
SET final_retail_price = final_retail_price - COALESCE(shipping_fee, 0),
    net_profit         = net_profit + COALESCE(shipping_fee, 0);

-- Reconcile wallets for delivered orders (credit the shipping that was wrongly deducted)
DO $$
DECLARE
  r record;
  v_wallet_id uuid;
BEGIN
  FOR r IN
    SELECT o.id, o.order_number, o.merchant_id, COALESCE(o.shipping_fee, 0) AS shipping_fee
    FROM public.orders o
    WHERE o.status = 'delivered'
      AND COALESCE(o.shipping_fee, 0) > 0
      AND NOT EXISTS (
        SELECT 1 FROM public.wallet_transactions wt
        JOIN public.wallets w ON w.id = wt.wallet_id
        WHERE wt.order_id = o.id
          AND w.merchant_id = o.merchant_id
          AND wt.description LIKE 'Shipping double-count correction:%'
      )
  LOOP
    SELECT id INTO v_wallet_id FROM public.wallets WHERE merchant_id = r.merchant_id;
    IF v_wallet_id IS NULL THEN CONTINUE; END IF;
    UPDATE public.wallets
    SET balance = balance + r.shipping_fee,
        total_earned = total_earned + r.shipping_fee,
        updated_at = now()
    WHERE id = v_wallet_id;
    INSERT INTO public.wallet_transactions (wallet_id, order_id, amount, type, description)
    VALUES (v_wallet_id, r.id, r.shipping_fee, 'credit',
            'Shipping double-count correction: ' || r.order_number);
  END LOOP;
END $$;