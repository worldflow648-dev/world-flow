import { useState, useEffect } from 'react';
import { CalendarIcon, RefreshCw, Info } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { DiscountCode } from '@/hooks/useDiscountCodes';

interface ExtendDiscountModalProps {
  code: DiscountCode | null;
  onClose: () => void;
  onExtend: (params: { id: string; expires_at?: string | null; max_uses?: number | null }) => Promise<void>;
  isLoading?: boolean;
}

const ExtendDiscountModal = ({ code, onClose, onExtend, isLoading }: ExtendDiscountModalProps) => {
  const [newExpiresAt, setNewExpiresAt] = useState<Date | undefined>(undefined);
  const [newMaxUses, setNewMaxUses] = useState<string>('');

  useEffect(() => {
    if (code) {
      setNewExpiresAt(code.expires_at ? new Date(code.expires_at) : undefined);
      setNewMaxUses(code.max_uses?.toString() ?? '');
    }
  }, [code]);

  if (!code) return null;

  const isExpired = !!code.expires_at && new Date(code.expires_at) <= new Date();
  const isDepleted = !!code.max_uses && code.used_count >= code.max_uses;
  const statusLabel = isExpired ? 'منتهي' : isDepleted ? 'مستنفد' : 'متوقف';
  const statusVariant = isExpired ? 'destructive' : 'outline';

  const currentExpiryISO = code.expires_at ?? null;
  const newExpiryISO = newExpiresAt ? newExpiresAt.toISOString() : null;
  const expiryChanged = newExpiryISO !== currentExpiryISO;

  const parsedMaxUses = newMaxUses.trim() === '' ? null : parseInt(newMaxUses, 10);
  const maxUsesValid = parsedMaxUses === null || (Number.isFinite(parsedMaxUses) && parsedMaxUses > code.used_count);
  const maxUsesChanged = parsedMaxUses !== (code.max_uses ?? null);

  const expiryValid = !newExpiresAt || newExpiresAt > new Date();
  const canSubmit = (expiryChanged || maxUsesChanged) && expiryValid && maxUsesValid && !isLoading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const payload: { id: string; expires_at?: string | null; max_uses?: number | null } = { id: code.id };
    if (expiryChanged) payload.expires_at = newExpiryISO;
    if (maxUsesChanged) payload.max_uses = parsedMaxUses;
    await onExtend(payload);
    onClose();
  };

  return (
    <Dialog open={!!code} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            تمديد كود الخصم
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Code header */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="font-mono font-bold text-primary text-lg">{code.code}</span>
            <Badge variant={statusVariant as 'destructive' | 'outline'}>{statusLabel}</Badge>
          </div>

          {/* Current values */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 border border-border rounded-lg">
              <div className="text-muted-foreground text-xs mb-1">الانتهاء الحالي</div>
              <div className="font-medium">
                {code.expires_at ? format(new Date(code.expires_at), 'dd MMM yyyy', { locale: ar }) : 'بدون'}
              </div>
            </div>
            <div className="p-3 border border-border rounded-lg">
              <div className="text-muted-foreground text-xs mb-1">الاستخدام الحالي</div>
              <div className="font-medium">
                {code.used_count}{code.max_uses ? ` / ${code.max_uses}` : ' / غير محدود'}
              </div>
            </div>
          </div>

          {/* New expiry */}
          <div className="space-y-2">
            <Label>تاريخ انتهاء جديد (اختياري)</Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'flex-1 justify-start text-right font-normal',
                      !newExpiresAt && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {newExpiresAt ? format(newExpiresAt, 'dd MMM yyyy', { locale: ar }) : 'اختر تاريخاً'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newExpiresAt}
                    onSelect={setNewExpiresAt}
                    disabled={(date) => date <= new Date()}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
              {newExpiresAt && (
                <Button variant="ghost" size="sm" onClick={() => setNewExpiresAt(undefined)}>
                  مسح
                </Button>
              )}
            </div>
            {!expiryValid && (
              <p className="text-xs text-destructive">يجب أن يكون التاريخ في المستقبل</p>
            )}
          </div>

          {/* New max uses */}
          <div className="space-y-2">
            <Label>الحد الأقصى للاستخدام (اختياري)</Label>
            <Input
              type="number"
              min={code.used_count + 1}
              placeholder="اتركه فارغاً للاستخدام غير المحدود"
              value={newMaxUses}
              onChange={(e) => setNewMaxUses(e.target.value)}
            />
            {!maxUsesValid && (
              <p className="text-xs text-destructive">
                يجب أن يكون أكبر من الاستخدام الحالي ({code.used_count})
              </p>
            )}
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              التمديد سيقوم بإعادة تفعيل الكود تلقائياً.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isLoading ? 'جاري التمديد...' : 'تمديد الكود'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExtendDiscountModal;
