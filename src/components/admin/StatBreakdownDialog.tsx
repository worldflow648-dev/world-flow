import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search } from 'lucide-react';

export type StatCardKey = 'revenue' | 'cost' | 'adminProfit' | 'outstanding' | 'settled';

export interface BreakdownColumn<T> {
  key: string;
  label: string;
  className?: string;
  render: (row: T) => React.ReactNode;
  searchValue?: (row: T) => string;
}

interface StatBreakdownDialogProps<T> {
  open: boolean;
  onClose: () => void;
  title: string;
  formula: string;
  total: number;
  totalLabel?: string;
  rows: T[] | undefined;
  columns: BreakdownColumn<T>[];
  isLoading: boolean;
  onRowClick?: (row: T) => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
  beforeTable?: React.ReactNode;
  rowKey: (row: T) => string;
}

function formatPrice(n: number) {
  return n.toLocaleString('ar-IQ');
}

export default function StatBreakdownDialog<T>({
  open,
  onClose,
  title,
  formula,
  total,
  totalLabel = 'الإجمالي',
  rows,
  columns,
  isLoading,
  onRowClick,
  searchPlaceholder = 'بحث...',
  emptyMessage = 'لا توجد بيانات',
  beforeTable,
  rowKey,
}: StatBreakdownDialogProps<T>) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!rows) return [];
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(row =>
      columns.some(col => col.searchValue?.(row).toLowerCase().includes(q))
    );
  }, [rows, search, columns]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-3 border-b border-border space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-1">
              <DialogTitle className="text-xl">{title}</DialogTitle>
              <DialogDescription className="text-xs font-mono bg-muted/50 px-2 py-1 rounded inline-block">
                {formula}
              </DialogDescription>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{totalLabel}</p>
              <p className="text-2xl font-bold text-primary">
                {formatPrice(total)}
                <span className="text-sm font-normal text-muted-foreground mr-1">د.ع</span>
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {beforeTable}

          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{emptyMessage}</div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      {columns.map(col => (
                        <th key={col.key} className={`px-3 py-2 text-right font-medium text-muted-foreground text-xs ${col.className || ''}`}>
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map(row => (
                      <tr
                        key={rowKey(row)}
                        onClick={() => onRowClick?.(row)}
                        className={onRowClick ? 'hover:bg-muted/50 cursor-pointer transition-colors' : ''}
                      >
                        {columns.map(col => (
                          <td key={col.key} className={`px-3 py-2 ${col.className || ''}`}>
                            {col.render(row)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-3 py-2 bg-muted/30 text-xs text-muted-foreground border-t border-border">
                {filtered.length} {rows && filtered.length !== rows.length ? `/ ${rows.length}` : ''} سجل
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { formatPrice as formatBreakdownPrice };
export const Pill = ({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' }) => {
  const cls = {
    neutral: 'bg-muted text-foreground',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  }[tone];
  return <Badge className={cls + ' font-normal'}>{children}</Badge>;
};
