// Centralized translation helpers for admin status / enum labels.
// Pass in the `t` function from useLanguage() and call these from any admin file.
import type { Database } from '@/integrations/supabase/types';

type T = (key: string, params?: Record<string, string | number>) => string;
type OrderStatus = Database['public']['Enums']['order_status'];

export function getOrderStatusLabel(status: OrderStatus | null | undefined, t: T): string {
  if (!status) return t('admin.orderStatus.pending');
  return t(`admin.orderStatus.${status}`);
}

export function getReturnReasonLabel(reason: string | null | undefined, t: T): string {
  if (!reason) return t('admin.returnReason.other');
  const key = `admin.returnReason.${reason}`;
  const translated = t(key);
  // If translation missing (returns key itself), fall back to raw reason text.
  return translated === key ? reason : translated;
}

export function getIssueStatusLabel(status: string, t: T): string {
  return t(`admin.issues.statusLabel.${status}`);
}

export function getIssueUrgencyLabel(urgency: string, t: T): string {
  return t(`admin.issues.urgencyLabel.${urgency}`);
}

export function getTierLabel(tier: string | null | undefined, t: T): string {
  if (tier === 'professional') return t('admin.merchants2.tierProfessional');
  return t('admin.merchants2.tierBasic');
}
