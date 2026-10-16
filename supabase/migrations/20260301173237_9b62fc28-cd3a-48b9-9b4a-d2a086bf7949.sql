
-- 1. Replace merchant pending-only update policy with one that allows all statuses
DROP POLICY "Merchants can update own pending orders" ON orders;

CREATE POLICY "Merchants can update own orders"
  ON orders FOR UPDATE
  USING (
    merchant_id = auth.uid()
    AND has_role(auth.uid(), 'merchant'::app_role)
  );

-- 2. Allow staff to read profiles (merchant names/tiers)
CREATE POLICY "Staff can view profiles"
  ON profiles FOR SELECT
  USING (has_role(auth.uid(), 'staff'::app_role));
