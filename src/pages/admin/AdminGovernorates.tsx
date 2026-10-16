import { useState, useEffect } from 'react';
import { MapPin, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAdminGovernorates, useUpdateGovernorate } from '@/hooks/useAdminGovernorates';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';

interface LocalState {
  shipping_fee: number;
  is_active: boolean;
}

const AdminGovernorates = () => {
  const { t, dir } = useLanguage();
  const { data: governorates, isLoading, error } = useAdminGovernorates();
  const updateGovernorate = useUpdateGovernorate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [localState, setLocalState] = useState<Record<string, LocalState>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (governorates) {
      const state: Record<string, LocalState> = {};
      governorates.forEach((g) => {
        state[g.id] = { shipping_fee: g.shipping_fee ?? 5000, is_active: g.is_active ?? true };
      });
      setLocalState(state);
    }
  }, [governorates]);

  const handleSave = async (id: string) => {
    const s = localState[id];
    if (!s) return;
    setSaving(id);
    try {
      await updateGovernorate.mutateAsync({ id, shipping_fee: s.shipping_fee, is_active: s.is_active });
      toast({ title: t('admin.governorates3.saveSuccess'), description: t('admin.governorates3.saveSuccessDesc') });
    } catch {
      toast({ title: t('admin.governorates3.saveError'), description: t('admin.governorates3.saveErrorDesc'), variant: 'destructive' });
    }
    setSaving(null);
  };

  const updateLocal = (id: string, field: keyof LocalState, value: number | boolean) => {
    setLocalState((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  if (error) {
    return <div className="p-6 text-center text-destructive">{t('admin.governorates3.loadError')}</div>;
  }

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4" dir={dir}>
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6" dir={dir}>
      <div className="flex items-center gap-3">
        <MapPin className="w-6 h-6 text-primary" />
        <h1 className="text-xl md:text-2xl font-bold text-foreground">{t('admin.governorates3.title')}</h1>
      </div>

      {isMobile ? (
        <div className="space-y-3">
          {governorates?.map((g) => {
            const s = localState[g.id];
            if (!s) return null;
            const changed = s.shipping_fee !== (g.shipping_fee ?? 5000) || s.is_active !== (g.is_active ?? true);
            return (
              <Card key={g.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{g.name_ar}</p>
                      <p className="text-xs text-muted-foreground">{g.name_en}</p>
                    </div>
                    <Badge variant={s.is_active ? 'default' : 'secondary'}>
                      {s.is_active ? t('admin.governorates3.enabled') : t('admin.governorates3.disabled')}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-muted-foreground whitespace-nowrap">{t('admin.governorates3.shippingFeeLabel')}</label>
                    <Input
                      type="number"
                      value={s.shipping_fee}
                      onChange={(e) => updateLocal(g.id, 'shipping_fee', Number(e.target.value))}
                      className="w-28"
                    />
                    <span className="text-xs text-muted-foreground">{t('admin.common2.currency')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch checked={s.is_active} onCheckedChange={(v) => updateLocal(g.id, 'is_active', v)} />
                      <span className="text-sm text-muted-foreground">{s.is_active ? t('admin.governorates3.enabled') : t('admin.governorates3.disabled')}</span>
                    </div>
                    {changed && (
                      <Button size="sm" onClick={() => handleSave(g.id)} disabled={saving === g.id}>
                        <Save className="w-4 h-4 ml-1" />
                        {t('admin.common2.save')}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.governorates3.governoratesCount', { count: governorates?.length ?? 0 })}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start">{t('admin.governorates3.governorateCol')}</TableHead>
                  <TableHead className="text-start">{t('admin.governorates3.nameEnCol')}</TableHead>
                  <TableHead className="text-start">{t('admin.governorates3.shippingFeeCol')}</TableHead>
                  <TableHead className="text-start">{t('admin.governorates3.statusCol')}</TableHead>
                  <TableHead className="text-start">{t('admin.governorates3.actionCol')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {governorates?.map((g) => {
                  const s = localState[g.id];
                  if (!s) return null;
                  const changed = s.shipping_fee !== (g.shipping_fee ?? 5000) || s.is_active !== (g.is_active ?? true);
                  return (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">{g.name_ar}</TableCell>
                      <TableCell className="text-muted-foreground">{g.name_en}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={s.shipping_fee}
                          onChange={(e) => updateLocal(g.id, 'shipping_fee', Number(e.target.value))}
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch checked={s.is_active} onCheckedChange={(v) => updateLocal(g.id, 'is_active', v)} />
                          <Badge variant={s.is_active ? 'default' : 'secondary'}>
                            {s.is_active ? t('admin.governorates3.enabled') : t('admin.governorates3.disabled')}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {changed && (
                          <Button size="sm" onClick={() => handleSave(g.id)} disabled={saving === g.id}>
                            <Save className="w-4 h-4 ml-1" />
                            {t('admin.common2.save')}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminGovernorates;
