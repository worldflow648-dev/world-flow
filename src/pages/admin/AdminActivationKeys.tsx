import { useState } from 'react';
import { Plus, Copy, Trash2, Key, Search, Check, User } from 'lucide-react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CreateKeyModal } from '@/components/admin/CreateKeyModal';
import { useActivationKeys, useDeleteActivationKey } from '@/hooks/useActivationKeys';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';

type AppRole = Database['public']['Enums']['app_role'];

const roleColors: Record<AppRole, string> = {
  admin: 'bg-destructive/10 text-destructive',
  staff: 'bg-primary/10 text-primary',
  merchant: 'bg-green-500/10 text-green-600',
  guest: 'bg-muted text-muted-foreground'
};

const AdminActivationKeys = () => {
  const { t, dir, language } = useLanguage();
  const dateLocale = language === 'ar' ? ar : enUS;
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'used' | 'expired'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | AppRole>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  
  const { data: keys, isLoading } = useActivationKeys();
  const deleteKey = useDeleteActivationKey();

  const roleLabel = (role: AppRole): string => {
    switch (role) {
      case 'admin': return t('admin.activationKeys3.roleAdmin');
      case 'staff': return t('admin.activationKeys3.roleStaff');
      case 'merchant': return t('admin.activationKeys3.roleMerchant');
      case 'guest': return t('admin.activationKeys3.roleGuest');
      default: return role;
    }
  };
  
  const handleCopy = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success(t('admin.activationKeys3.copiedToast'));
    setTimeout(() => setCopiedId(null), 2000);
  };
  
  const handleDelete = async () => {
    if (!deleteKeyId) return;
    try {
      await deleteKey.mutateAsync(deleteKeyId);
      toast.success(t('admin.activationKeys3.deletedToast'));
    } catch { toast.error(t('admin.activationKeys3.deleteFailed')); }
    finally { setDeleteKeyId(null); }
  };
  
  const getKeyStatus = (key: { is_used: boolean | null; expires_at: string }) => {
    if (key.is_used) return 'used';
    if (new Date(key.expires_at) < new Date()) return 'expired';
    return 'active';
  };
  
  const filteredKeys = keys?.filter(key => {
    const status = getKeyStatus(key);
    if (statusFilter !== 'all' && status !== statusFilter) return false;
    if (roleFilter !== 'all' && key.role !== roleFilter) return false;
    if (search && !key.code.toLowerCase().includes(search.toLowerCase()) && !key.label?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  
  const stats = {
    total: keys?.length || 0,
    active: keys?.filter(k => getKeyStatus(k) === 'active').length || 0,
    used: keys?.filter(k => k.is_used).length || 0,
    expired: keys?.filter(k => getKeyStatus(k) === 'expired').length || 0,
  };
  
  const statusBadge = (status: string) => {
    if (status === 'active') return <Badge variant="secondary" className="bg-green-500/10 text-green-600">{t('admin.activationKeys3.statusActive')}</Badge>;
    if (status === 'used') return <Badge variant="secondary" className="bg-primary/10 text-primary">{t('admin.activationKeys3.statusUsed')}</Badge>;
    return <Badge variant="secondary" className="bg-muted text-muted-foreground">{t('admin.activationKeys3.statusExpired')}</Badge>;
  };
  
  return (
    <div className="space-y-6" dir={dir}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Key className="h-6 w-6" />{t('admin.activationKeys3.title')}</h1>
          <p className="text-muted-foreground">{t('admin.activationKeys3.subtitle')}</p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)} className="w-full sm:w-auto">
          <Plus className="ml-2 h-4 w-4" />{t('admin.activationKeys3.createKey')}
        </Button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{stats.total}</div><p className="text-xs text-muted-foreground">{t('admin.activationKeys3.totalKeys')}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-green-600">{stats.active}</div><p className="text-xs text-muted-foreground">{t('admin.activationKeys3.activeKeys')}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-primary">{stats.used}</div><p className="text-xs text-muted-foreground">{t('admin.activationKeys3.usedKeys')}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-muted-foreground">{stats.expired}</div><p className="text-xs text-muted-foreground">{t('admin.activationKeys3.expiredKeys')}</p></CardContent></Card>
      </div>
      
      <Card>
        <CardHeader><CardTitle className="text-lg">{t('admin.activationKeys3.keysList')}</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t('admin.activationKeys3.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder={t('admin.activationKeys3.statusFilter')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.activationKeys3.allStatuses')}</SelectItem>
                <SelectItem value="active">{t('admin.activationKeys3.statusActive')}</SelectItem>
                <SelectItem value="used">{t('admin.activationKeys3.statusUsed')}</SelectItem>
                <SelectItem value="expired">{t('admin.activationKeys3.statusExpired')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder={t('admin.activationKeys3.roleFilter')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.activationKeys3.allRoles')}</SelectItem>
                <SelectItem value="merchant">{t('admin.activationKeys3.roleMerchant')}</SelectItem>
                <SelectItem value="staff">{t('admin.activationKeys3.roleStaff')}</SelectItem>
                <SelectItem value="admin">{t('admin.activationKeys3.roleAdmin')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">{t('admin.activationKeys3.loading')}</div>
          ) : filteredKeys?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{t('admin.activationKeys3.noKeys')}</div>
          ) : isMobile ? (
            <div className="space-y-3">
              {filteredKeys?.map((key) => {
                const status = getKeyStatus(key);
                return (
                  <div key={key.id} className="border border-border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <code className="bg-muted px-2 py-1 rounded text-sm font-mono">{key.code}</code>
                      {statusBadge(status)}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className={roleColors[key.role]}>{roleLabel(key.role)}</Badge>
                      {key.label && <span className="text-sm text-muted-foreground">{key.label}</span>}
                    </div>
                    {status === 'used' && key.used_by_profile && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />{key.used_by_profile.full_name}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="text-xs text-muted-foreground">{format(new Date(key.expires_at), 'dd MMM yyyy', { locale: dateLocale })}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleCopy(key.code, key.id)} disabled={status !== 'active'}>
                          {copiedId === key.id ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        </Button>
                        {status === 'active' && (
                          <Button variant="ghost" size="icon" onClick={() => setDeleteKeyId(key.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">{t('admin.activationKeys3.codeCol')}</TableHead>
                    <TableHead className="text-start">{t('admin.activationKeys3.roleCol')}</TableHead>
                    <TableHead className="text-start">{t('admin.activationKeys3.labelCol')}</TableHead>
                    <TableHead className="text-start">{t('admin.activationKeys3.statusCol')}</TableHead>
                    <TableHead className="text-start">{t('admin.activationKeys3.expiresCol')}</TableHead>
                    <TableHead className="text-end">{t('admin.activationKeys3.actionsCol')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredKeys?.map((key) => {
                    const status = getKeyStatus(key);
                    return (
                      <TableRow key={key.id}>
                        <TableCell><code className="bg-muted px-2 py-1 rounded text-sm">{key.code}</code></TableCell>
                        <TableCell><Badge variant="secondary" className={roleColors[key.role]}>{roleLabel(key.role)}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{key.label || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {statusBadge(status)}
                            {status === 'used' && key.used_by_profile && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" />{key.used_by_profile.full_name}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{format(new Date(key.expires_at), 'dd MMM yyyy', { locale: dateLocale })}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleCopy(key.code, key.id)} disabled={status !== 'active'}>
                              {copiedId === key.id ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                            </Button>
                            {status === 'active' && (
                              <Button variant="ghost" size="icon" onClick={() => setDeleteKeyId(key.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      <CreateKeyModal open={createModalOpen} onOpenChange={setCreateModalOpen} />
      
      <AlertDialog open={!!deleteKeyId} onOpenChange={() => setDeleteKeyId(null)}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.activationKeys3.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('admin.activationKeys3.deleteDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>{t('admin.common2.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t('admin.common2.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminActivationKeys;
