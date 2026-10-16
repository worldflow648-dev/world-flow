import { Database } from '@/integrations/supabase/types';

// Use the database enum type
export type OrderStatus = Database['public']['Enums']['order_status'];

// Status configuration for UI
export const statusConfig: Record<OrderStatus, {
  label: string;
  bgClass: string;
  textClass: string;
  icon: string;
}> = {
  pending: {
    label: 'قيد المراجعة',
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
    textClass: 'text-amber-800 dark:text-amber-200',
    icon: 'Clock',
  },
  processing: {
    label: 'تمت الموافقة',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-800 dark:text-blue-200',
    icon: 'Package',
  },
  printed: {
    label: 'تم التجهيز',
    bgClass: 'bg-indigo-100 dark:bg-indigo-900/30',
    textClass: 'text-indigo-800 dark:text-indigo-200',
    icon: 'Printer',
  },
  shipped: {
    label: 'تم الشحن',
    bgClass: 'bg-purple-100 dark:bg-purple-900/30',
    textClass: 'text-purple-800 dark:text-purple-200',
    icon: 'Truck',
  },
  delivered: {
    label: 'تم التسليم',
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    textClass: 'text-green-800 dark:text-green-200',
    icon: 'CheckCircle',
  },
  returned: {
    label: 'راجع',
    bgClass: 'bg-orange-100 dark:bg-orange-900/30',
    textClass: 'text-orange-800 dark:text-orange-200',
    icon: 'RotateCcw',
  },
  resent: {
    label: 'أعيد الإرسال',
    bgClass: 'bg-cyan-100 dark:bg-cyan-900/30',
    textClass: 'text-cyan-800 dark:text-cyan-200',
    icon: 'Send',
  },
  cancelled: {
    label: 'مؤجل',
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    textClass: 'text-red-800 dark:text-red-200',
    icon: 'XCircle',
  },
};

// Format relative time in Arabic
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'الآن';
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  if (diffDays < 7) return `منذ ${diffDays} يوم`;
  
  return dateObj.toLocaleDateString('ar-IQ');
}
