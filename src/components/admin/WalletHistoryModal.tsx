import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { History, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  merchantId: string;
  merchantName: string;
}

interface Tx {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
}

export const WalletHistoryModal = ({ open, onOpenChange, merchantId, merchantName }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ['wallet-history', merchantId],
    enabled: open && !!merchantId,
    queryFn: async (): Promise<Tx[]> => {
      const { data: wallet } = await supabase.from('wallets').select('id').eq('merchant_id', merchantId).single();
      if (!wallet) return [];
      const { data: txs, error } = await supabase
        .from('wallet_transactions')
        .select('id, amount, type, description, created_at')
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (txs || []) as Tx[];
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" /> سجل المحفظة
          </DialogTitle>
          <DialogDescription>{merchantName}</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : !data?.length ? (
            <p className="text-center text-muted-foreground py-8">لا توجد حركات بعد</p>
          ) : (
            <div className="space-y-2">
              {data.map((tx) => {
                const isCredit = tx.amount > 0;
                return (
                  <div key={tx.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                    {isCredit ? (
                      <ArrowUpCircle className="w-8 h-8 text-green-600 shrink-0" />
                    ) : (
                      <ArrowDownCircle className="w-8 h-8 text-red-600 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={isCredit ? 'default' : 'destructive'} className={isCredit ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100' : ''}>
                          {isCredit ? 'إضافة' : 'خصم'}
                        </Badge>
                        <span className={`font-bold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                          {isCredit ? '+' : '-'}{Math.abs(tx.amount).toLocaleString('ar-IQ')} د.ع
                        </span>
                      </div>
                      {tx.description && <p className="text-sm text-muted-foreground mt-1 truncate">{tx.description}</p>}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Intl.DateTimeFormat('ar-IQ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(tx.created_at))}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
