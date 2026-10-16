-- 1. Update wallet trigger to reverse on un-deliver
CREATE OR REPLACE FUNCTION public.update_wallet_on_delivery()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_credit_id uuid;
BEGIN
  -- Credit on transition INTO delivered
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    UPDATE wallets
    SET 
      balance = balance + NEW.net_profit,
      total_earned = total_earned + NEW.net_profit,
      updated_at = now()
    WHERE merchant_id = NEW.merchant_id;
    
    INSERT INTO wallet_transactions (wallet_id, order_id, amount, type, description)
    SELECT w.id, NEW.id, NEW.net_profit, 'credit', 'Order delivered: ' || NEW.order_number
    FROM wallets w WHERE w.merchant_id = NEW.merchant_id;
    
    NEW.delivered_at := now();

  -- Reverse on transition OUT of delivered
  ELSIF OLD.status = 'delivered' AND NEW.status != 'delivered' THEN
    -- Defensive guard: only reverse if a matching credit exists and no reversal already recorded
    SELECT wt.id INTO v_existing_credit_id
    FROM wallet_transactions wt
    JOIN wallets w ON w.id = wt.wallet_id
    WHERE w.merchant_id = OLD.merchant_id
      AND wt.order_id = OLD.id
      AND wt.type = 'credit'
    LIMIT 1;

    IF v_existing_credit_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM wallet_transactions wt2
      JOIN wallets w2 ON w2.id = wt2.wallet_id
      WHERE w2.merchant_id = OLD.merchant_id
        AND wt2.order_id = OLD.id
        AND wt2.type = 'debit'
        AND wt2.description LIKE 'Reversal:%'
    ) THEN
      UPDATE wallets
      SET 
        balance = balance - OLD.net_profit,
        total_earned = total_earned - OLD.net_profit,
        updated_at = now()
      WHERE merchant_id = OLD.merchant_id;

      INSERT INTO wallet_transactions (wallet_id, order_id, amount, type, description)
      SELECT w.id, OLD.id, -OLD.net_profit, 'debit',
             'Reversal: order ' || OLD.order_number || ' moved out of delivered'
      FROM wallets w WHERE w.merchant_id = OLD.merchant_id;

      -- Clear delivered_at only for non-terminal reversals
      IF NEW.status NOT IN ('cancelled', 'returned') THEN
        NEW.delivered_at := NULL;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Ensure trigger exists (idempotent)
DROP TRIGGER IF EXISTS trg_update_wallet_on_delivery ON public.orders;
CREATE TRIGGER trg_update_wallet_on_delivery
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_wallet_on_delivery();

-- 2. settlement_order_links table
CREATE TABLE IF NOT EXISTS public.settlement_order_links (
  settlement_id uuid NOT NULL REFERENCES public.settlement_receipts(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (settlement_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_settlement_order_links_order ON public.settlement_order_links(order_id);
CREATE INDEX IF NOT EXISTS idx_settlement_order_links_settlement ON public.settlement_order_links(settlement_id);

ALTER TABLE public.settlement_order_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settlement_order_links"
ON public.settlement_order_links
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Merchants can view own settlement links"
ON public.settlement_order_links
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM settlement_receipts sr
  WHERE sr.id = settlement_order_links.settlement_id
    AND sr.merchant_id = auth.uid()
));

-- 3. Backfill: link historical delivered orders to settlements (date heuristic, one-time)
DO $$
DECLARE
  r_merchant RECORD;
  r_settlement RECORD;
  r_order RECORD;
  v_prev_settlement_at timestamptz;
BEGIN
  FOR r_merchant IN SELECT DISTINCT merchant_id FROM settlement_receipts LOOP
    v_prev_settlement_at := 'epoch'::timestamptz;
    FOR r_settlement IN
      SELECT id, created_at FROM settlement_receipts
      WHERE merchant_id = r_merchant.merchant_id
      ORDER BY created_at ASC
    LOOP
      FOR r_order IN
        SELECT o.id FROM orders o
        WHERE o.merchant_id = r_merchant.merchant_id
          AND o.status = 'delivered'
          AND o.delivered_at IS NOT NULL
          AND o.delivered_at > v_prev_settlement_at
          AND o.delivered_at <= r_settlement.created_at
          AND NOT EXISTS (
            SELECT 1 FROM settlement_order_links sol WHERE sol.order_id = o.id
          )
      LOOP
        INSERT INTO settlement_order_links (settlement_id, order_id)
        VALUES (r_settlement.id, r_order.id)
        ON CONFLICT DO NOTHING;
      END LOOP;
      v_prev_settlement_at := r_settlement.created_at;
    END LOOP;
  END LOOP;
END $$;