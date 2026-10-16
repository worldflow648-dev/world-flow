import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatWalletBalance } from '@/hooks/useAdminMerchants';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  merchantId: string;
  merchantName: string;
  currentBalance: number;
}

export const EditWalletModal = ({ open, onOpenChange, merchantId, merchantName, currentBalance }: Props) => {
  const [newBalance, setNewBalance] = useState(currentBalance.toString());
  const [note, setNote] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setNewBalance(currentBalance.toString());
      setNote('');
    }
  }, [open, currentBalance]);

  const mutation = useMutation({
    mutationFn: async () => {
      const target = Number(newBalance);
      if (isNaN(target)) throw new Error('قيمة غير صالحة');
      const delta = target - currentBalance;
      if (delta === 0) throw new Error('لم يتم تغيير الرصيد');

      const { data: wallet, error: wErr } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('merchant_id', merchantId)
        .single();
      if (wErr) throw wErr;
      if (!wallet) throw new Error('المحفظة غير موجودة');

      const { error: updErr } = await supabase
        .from('wallets')
        .update({ balance: target })
        .eq('id', wallet.id);
      if (updErr) throw updErr;

      const description = `تعديل يدوي من الإدارة${note.trim() ? `: ${note.trim()}` : ''}`;
      const { error: txErr } = await supabase
        .from('wallet_transactions')
        .insert({
          wallet_id: wallet.id,
          amount: delta,
          type: delta > 0 ? 'credit' : 'debit',
          description,
        });
      if (txErr) throw txErr;
    },
    onSuccess: () => {
      toast({ title: 'تم تعديل الرصيد', description: merchantName });
      queryClient.invalidateQueries({ queryKey: ['admin-merchants'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-history', merchantId] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast({ title: 'خطأ', description: e.message, variant: 'destructive' }),
  });

  const target = Number(newBalance);
  const delta = !isNaN(target) ? target - currentBalance : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" /> تعديل المحفظة
          </DialogTitle>
          <DialogDescription>
            {merchantName} — الرصيد الحالي: <span className="font-semibold">{formatWalletBalance(currentBalance)}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="new-balance">الرصيد الجديد (د.ع)</Label>
            <Input id="new-balance" type="number" value={newBalance} onChange={(e) => setNewBalance(e.target.value)} />
            {delta !== 0 && !isNaN(delta) && (
              <p className={`text-sm ${delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {delta > 0 ? 'إضافة' : 'خصم'}: {Math.abs(delta).toLocaleString('ar-IQ')} د.ع
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">ملاحظة (اختياري)</Label>
            <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="سبب التعديل..." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || delta === 0}>
            {mutation.isPending && <Loader2 className="w-4 h-4 mx-2 animate-spin" />}
            حفظ التعديل
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
