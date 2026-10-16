CREATE OR REPLACE FUNCTION public.handle_order_returned(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_is_admin boolean := false;
  v_is_staff boolean := false;
  v_order record;
  v_existing record;
  v_deadline timestamptz;
  v_wholesale numeric;
BEGIN
  -- Authorisation: only admins, staff, or the order's own merchant can trigger this.
  IF v_caller IS NOT NULL THEN
    SELECT public.has_role(v_caller, 'admin'::app_role) INTO v_is_admin;
    SELECT public.has_role(v_caller, 'staff'::app_role) INTO v_is_staff;
  END IF;

  SELECT id, merchant_id, total_wholesale_cost
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;

  -- System callers (auth.uid IS NULL) are allowed (cron / service role).
  IF v_caller IS NOT NULL
     AND NOT v_is_admin
     AND NOT v_is_staff
     AND v_caller <> v_order.merchant_id THEN
    RAISE EXCEPTION 'NOT_AUTHORISED';
  END IF;

  -- Pick the most relevant existing return for this order using the same
  -- priority used in the client (pending > resent > expired, then newest).
  SELECT *
  INTO v_existing
  FROM public.order_returns
  WHERE order_id = p_order_id
  ORDER BY (CASE status WHEN 'pending' THEN 0 WHEN 'resent' THEN 1 ELSE 2 END),
           created_at DESC
  LIMIT 1;

  -- No prior return → create a fresh pending return with a 7-day deadline.
  IF v_existing.id IS NULL THEN
    v_deadline := now() + interval '7 days';
    INSERT INTO public.order_returns (order_id, merchant_id, deadline_days, deadline_at)
    VALUES (p_order_id, v_order.merchant_id, 7, v_deadline);
    RETURN;
  END IF;

  -- Already pending → nothing to do.
  IF v_existing.status = 'pending' THEN
    RETURN;
  END IF;

  -- Already expired (final) → nothing to do.
  IF v_existing.status = 'expired' THEN
    RETURN;
  END IF;

  -- Status was 'resent' and the order came back again → finalise the return:
  -- charge the merchant the wholesale cost (if not yet settled) then mark
  -- the existing return as expired so no further resend is possible.
  IF v_existing.status = 'resent' THEN
    v_wholesale := COALESCE(v_order.total_wholesale_cost, 0);
    IF NOT v_existing.wholesale_settled AND v_wholesale > 0 THEN
      PERFORM public.charge_merchant_wholesale(v_existing.id, 'expired');
    END IF;

    UPDATE public.order_returns
    SET status = 'expired',
        updated_at = now()
    WHERE id = v_existing.id;
    RETURN;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_order_returned(uuid) TO authenticated;