import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface CancelOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber: string;
  onConfirm: (reason?: string) => void;
  isPending?: boolean;
}

export function CancelOrderModal({ open, onOpenChange, orderNumber, onConfirm, isPending = false }: CancelOrderModalProps) {
  const [reason, setReason] = useState<string>('');
  const { t } = useLanguage();

  const cancelReasons = [
    { value: 'customer_request', label: t('orders.customerRequest') },
    { value: 'wrong_info', label: t('orders.wrongInfo') },
    { value: 'duplicate', label: t('orders.duplicate') },
    { value: 'out_of_stock', label: t('orders.outOfStockReason') },
    { value: 'other', label: t('orders.otherReason') },
  ];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm" aria-describedby="cancel-dialog-description">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center"><AlertTriangle className="h-6 w-6 text-destructive" /></div>
            <AlertDialogTitle className="text-lg">{t('orders.cancelOrder')}</AlertDialogTitle>
          </div>
          <AlertDialogDescription id="cancel-dialog-description">
            {t('orders.cancelConfirm', { orderNumber })}
            <br /><span className="text-destructive">{t('orders.cancelIrreversible')}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <label htmlFor="cancel-reason" className="text-sm font-medium text-muted-foreground mb-2 block">{t('orders.cancelReason')}</label>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger id="cancel-reason"><SelectValue placeholder={t('orders.selectReason')} /></SelectTrigger>
            <SelectContent>{cancelReasons.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <AlertDialogFooter className="flex-row gap-2">
          <AlertDialogCancel className="flex-1 m-0" disabled={isPending}>{t('orders.undo')}</AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm(reason || undefined)} disabled={isPending} className="flex-1 m-0 bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {isPending ? (<><Loader2 className="h-4 w-4 ml-2 animate-spin" />{t('orders.cancelling')}</>) : t('orders.confirmCancel')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
