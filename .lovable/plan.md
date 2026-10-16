## Add wallet edit + history for admins on Merchants page

### UI (AdminMerchants + MerchantFinancialCard)
- Add two new action buttons per merchant row/card:
  - **Edit Wallet** (pencil icon) → opens `EditWalletModal`
  - **History** (clock icon) → opens `WalletHistoryModal`
- Buttons appear in both desktop table row and mobile card actions.

### EditWalletModal
- Shows current balance.
- Input: new balance (number, IQD).
- Optional note/reason field.
- On save:
  - Compute delta = newBalance − currentBalance.
  - Update `wallets.balance` to new value.
  - Insert `wallet_transactions` row: `amount = delta`, `type = 'credit'` if positive else `'debit'`, `description = "تعديل يدوي من الإدارة: <note>"`.
  - Invalidate merchants + wallet queries.

### WalletHistoryModal
- Fetches `wallet_transactions` for that merchant's wallet, newest first.
- Shows date, type (credit/debit badge), amount (+/− with color), description.
- Read-only list; scrollable.

### Data / DB
- No schema changes. Uses existing `wallets` and `wallet_transactions` tables.
- Admin RLS already allows updates on wallets and inserts on wallet_transactions (same path used by existing settlement flow).

### Files
- New: `src/components/admin/EditWalletModal.tsx`, `src/components/admin/WalletHistoryModal.tsx`
- New hooks in `useAdminMerchants.ts`: `useAdminEditWallet`, `useWalletHistory(merchantId)`
- Edit: `MerchantFinancialCard.tsx` and `AdminMerchants.tsx` to wire buttons.

All text in Arabic to match rest of admin UI.
