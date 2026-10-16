import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Receipt } from 'lucide-react';
import { useExpenses, useCreateExpense, useDeleteExpense } from '@/hooks/useExpenses';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';

const AdminExpenses = () => {
  const { t, dir, locale } = useLanguage();
  const [filterCategory, setFilterCategory] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ category: 'ads', amount: '', description: '', expense_date: new Date().toISOString().split('T')[0] });
  const isMobile = useIsMobile();

  const { data: expenses, isLoading } = useExpenses({ category: filterCategory });
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();

  const totalAmount = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;

  const categoryLabel = (cat: string) => {
    switch (cat) {
      case 'ads': return t('admin.expenses3.catAds');
      case 'rent': return t('admin.expenses3.catRent');
      case 'salaries': return t('admin.expenses3.catSalaries');
      case 'other': return t('admin.expenses3.catOther');
      default: return cat;
    }
  };

  const categories = [
    { value: 'ads', label: t('admin.expenses3.catAds') },
    { value: 'rent', label: t('admin.expenses3.catRent') },
    { value: 'salaries', label: t('admin.expenses3.catSalaries') },
    { value: 'other', label: t('admin.expenses3.catOther') },
  ];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error(t('admin.expenses3.enterValidAmount'));
      return;
    }
    try {
      await createExpense.mutateAsync({
        category: form.category,
        amount: Number(form.amount),
        description: form.description || undefined,
        expense_date: form.expense_date,
      });
      toast.success(t('admin.expenses3.addedToast'));
      setShowAdd(false);
      setForm({ category: 'ads', amount: '', description: '', expense_date: new Date().toISOString().split('T')[0] });
    } catch {
      toast.error(t('admin.expenses3.addFailed'));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteExpense.mutateAsync(id);
      toast.success(t('admin.expenses3.deletedToast'));
    } catch {
      toast.error(t('admin.expenses3.deleteFailed'));
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
  const formatPrice = (p: number) => p.toLocaleString(locale) + ' ' + t('admin.common2.currency');

  return (
    <div className="space-y-6" dir={dir}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Receipt className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('admin.expenses3.title')}</h1>
            <p className="text-muted-foreground text-sm">{t('admin.expenses3.subtitle')}</p>
          </div>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          {t('admin.expenses3.addExpense')}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('admin.expenses3.totalExpenses')}</span>
            <span className="text-2xl font-bold text-destructive">{formatPrice(totalAmount)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder={t('admin.expenses3.filterCategory')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.expenses3.allCategories')}</SelectItem>
            {categories.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : expenses && expenses.length > 0 ? (
        isMobile ? (
          <div className="space-y-3">
            {expenses.map(exp => (
              <Card key={exp.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{categoryLabel(exp.category)}</Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(exp.expense_date)}</span>
                    </div>
                    <div className="font-bold text-destructive text-lg">{formatPrice(exp.amount)}</div>
                    {exp.description && (
                      <p className="text-sm text-muted-foreground">{exp.description}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(exp.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.expenses3.dateCol')}</TableHead>
                  <TableHead>{t('admin.expenses3.categoryCol')}</TableHead>
                  <TableHead>{t('admin.expenses3.amountCol')}</TableHead>
                  <TableHead>{t('admin.expenses3.descriptionCol')}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map(exp => (
                  <TableRow key={exp.id}>
                    <TableCell>{formatDate(exp.expense_date)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{categoryLabel(exp.category)}</Badge>
                    </TableCell>
                    <TableCell className="font-bold text-destructive">{formatPrice(exp.amount)}</TableCell>
                    <TableCell className="text-muted-foreground">{exp.description || '-'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(exp.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )
      ) : (
        <Card className="py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Receipt className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">{t('admin.expenses3.noExpenses')}</p>
              <p className="text-sm text-muted-foreground mt-1">{t('admin.expenses3.noExpensesHint')}</p>
            </div>
          </div>
        </Card>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent dir={dir}>
          <DialogHeader>
            <DialogTitle>{t('admin.expenses3.addModalTitle')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>{t('admin.expenses3.categoryLabel')}</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('admin.expenses3.amountLabel')}</Label>
              <Input
                type="number"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0"
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('admin.expenses3.dateLabel')}</Label>
              <Input
                type="date"
                value={form.expense_date}
                onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('admin.expenses3.descriptionLabel')}</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder={t('admin.expenses3.descriptionPlaceholder')}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)} className="flex-1">{t('admin.common2.cancel')}</Button>
              <Button type="submit" className="flex-1" disabled={createExpense.isPending}>
                {createExpense.isPending ? t('admin.expenses3.addingInProgress') : t('admin.common2.add')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminExpenses;
