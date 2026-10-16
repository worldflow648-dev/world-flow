
-- 1. Settlement receipts (references wallet_transactions)
DELETE FROM settlement_receipts;

-- 2. Wallet transactions (references orders + wallets)
DELETE FROM wallet_transactions;

-- 3. Settlement requests
DELETE FROM settlement_requests;

-- 4. Order child tables
DELETE FROM order_status_history;
DELETE FROM order_returns;
DELETE FROM order_items;

-- 5. Orders
DELETE FROM orders;

-- 6. Product variants (references products)
DELETE FROM product_variants;

-- 7. Products
DELETE FROM products;

-- 8. Reset wallet balances
UPDATE wallets SET balance = 0, total_earned = 0, total_withdrawn = 0, updated_at = now();

-- 9. Other test data
DELETE FROM expenses;
DELETE FROM discount_codes;
DELETE FROM banners;
