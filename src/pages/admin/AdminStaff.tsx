import { useState, useMemo, useCallback } from 'react';
import { UserCog, Plus, Lock, Unlock, Trash2, Loader2, Download, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAdminStaff, useToggleStaffSuspension, useRemoveStaffRole, AdminStaff } from '@/hooks/useAdminStaff';
import AddStaffModal from '@/components/admin/AddStaffModal';
import AssignShiftDialog from '@/components/admin/AssignShiftDialog';
import { AdminTableSearch } from '@/components/admin/AdminTableSearch';
import { exportToCSV, formatDateForExport } from '@/lib/exportUtils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar as arLocale, enUS } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';

const AdminStaffPage = () => {
  const { t, language } = useLanguage();
  const dateLocale = language === 'en' ? enUS : arLocale;
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [staffToRemove, setStaffToRemove] = useState<AdminStaff | null>(null);
  const [staffToAssignShift, setStaffToAssignShift] = useState<AdminStaff | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const isMobile = useIsMobile();

  const { data: staff, isLoading, error } = useAdminStaff();
  const toggleSuspension = useToggleStaffSuspension();
  const removeStaffRole = useRemoveStaffRole();

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const filteredStaff = useMemo(() => {
    if (!staff || !searchQuery) return staff || [];
    const q = searchQuery.toLowerCase();
    return staff.filter(
      (member) =>
        member.name.toLowerCase().includes(q) ||
        member.phone?.toLowerCase().includes(q)
    );
  }, [staff, searchQuery]);

  const unassignedLabel = t('attendance.unassigned');
  const activeLabel = t('admin.merchants2.statusActive');
  const suspendedLabel = t('admin.merchants2.statusSuspended');

  const handleExport = useCallback(() => {
    if (!filteredStaff) return;
    const exportData = filteredStaff.map((member) => ({
      name: member.name,
      phone: member.phone || '-',
      shift: member.shiftName || unassignedLabel,
      status: member.status === 'active' ? activeLabel : suspendedLabel,
      joined_at: formatDateForExport(member.joinedAt),
    }));
    exportToCSV(exportData, 'staff', [
      { key: 'name', label: t('admin.merchants.name') },
      { key: 'phone', label: t('admin.merchants.phone') },
      { key: 'shift', label: t('attendance.shift') },
      { key: 'status', label: t('admin.merchants.status') },
      { key: 'joined_at', label: t('admin.merchants2.joinedAt') },
    ]);
  }, [filteredStaff, t, unassignedLabel, activeLabel, suspendedLabel]);

  const handleToggleSuspension = async (staffMember: AdminStaff) => {
    const newStatus = staffMember.status === 'active';
    try {
      await toggleSuspension.mutateAsync({ staffId: staffMember.id, suspend: newStatus });
      toast.success(newStatus ? `${suspendedLabel}: ${staffMember.name}` : `${activeLabel}: ${staffMember.name}`);
    } catch (error) {
      toast.error(t('admin.common.updateError'));
    }
  };

  const handleRemoveStaff = async () => {
    if (!staffToRemove) return;
    try {
      await removeStaffRole.mutateAsync(staffToRemove.id);
      toast.success(t('admin.staff2.removed'));
      setStaffToRemove(null);
    } catch (error) {
      toast.error(t('admin.staff2.removeFailed'));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><Skeleton className="h-8 w-40" /><Skeleton className="h-4 w-60 mt-2" /></div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('admin.staff.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('admin.staff2.subtitle')}</p>
        </div>
        <div className="bg-destructive/10 text-destructive rounded-xl p-6 text-center">
          {t('admin.common.genericError')}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('admin.staff.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('admin.staff2.subtitle')}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <AdminTableSearch
            placeholder={t('admin.staff.searchStaff')}
            onSearch={handleSearch}
            className="w-full sm:w-64"
          />
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleExport} disabled={!filteredStaff?.length} className="flex-1 sm:flex-none">
              <Download className="w-4 h-4 mx-2" />
              {t('admin.common.export')}
            </Button>
            <Button onClick={() => setIsAddModalOpen(true)} className="flex-1 sm:flex-none">
              <Plus className="w-4 h-4 mx-2" />
              {t('admin.staff.addStaff')}
            </Button>
          </div>
        </div>
      </div>

      {/* Staff List */}
      {filteredStaff?.length === 0 ? (
        <div className="bg-card rounded-xl border border-border shadow-sm p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
              <UserCog className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchQuery ? t('admin.merchants2.noResultsFound') : t('admin.staff2.noCurrentStaff')}
            </h3>
            <p className="text-muted-foreground max-w-md mb-4">
              {searchQuery ? t('admin.merchants2.noResultsHint') : ''}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus className="w-4 h-4 mx-2" />
                {t('admin.staff.addStaff')}
              </Button>
            )}
          </div>
        </div>
      ) : isMobile ? (
        /* Mobile Cards */
        <div className="space-y-3">
          {filteredStaff?.map((member) => (
            <Card key={member.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="font-medium">{member.name}</div>
                  <div className="text-sm text-muted-foreground">{member.phone || '-'}</div>
                  <div className="text-xs text-muted-foreground">
                    {member.joinedAt ? format(new Date(member.joinedAt), 'dd MMM yyyy', { locale: dateLocale }) : '-'}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs pt-1">
                    <CalendarClock className="w-3.5 h-3.5 text-muted-foreground" />
                    {member.shiftName ? (
                      <span className="text-foreground">{member.shiftName}</span>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground text-[10px] py-0">{unassignedLabel}</Badge>
                    )}
                  </div>
                </div>
                <Badge
                  variant={member.status === 'active' ? 'default' : 'destructive'}
                  className={member.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100' : ''}
                >
                  {member.status === 'active' ? activeLabel : suspendedLabel}
                </Badge>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStaffToAssignShift(member)}
                  className="flex-1"
                >
                  <CalendarClock className="w-4 h-4 mx-1" />
                  {t('attendance.shift')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleSuspension(member)}
                  disabled={toggleSuspension.isPending}
                  className="flex-1"
                >
                  {member.status === 'active' ? (
                    <><Lock className="w-4 h-4 mx-1 text-amber-600" /> {t('admin.merchants2.suspend')}</>
                  ) : (
                    <><Unlock className="w-4 h-4 mx-1 text-green-600" /> {t('admin.merchants2.activateShort')}</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStaffToRemove(member)}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* Desktop Table */
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>{t('admin.merchants.name')}</TableHead>
                <TableHead>{t('admin.merchants.phone')}</TableHead>
                <TableHead>{t('attendance.shift')}</TableHead>
                <TableHead>{t('admin.merchants2.joinedAt')}</TableHead>
                <TableHead>{t('admin.merchants.status')}</TableHead>
                <TableHead>{t('admin.orders.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff?.map((member) => (
                <TableRow key={member.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell>{member.phone || '-'}</TableCell>
                  <TableCell>
                    {member.shiftName ? (
                      <span className="text-sm">{member.shiftName}</span>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">{unassignedLabel}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.joinedAt ? format(new Date(member.joinedAt), 'dd MMM yyyy', { locale: dateLocale }) : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={member.status === 'active' ? 'default' : 'destructive'}
                      className={member.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100' : ''}
                    >
                      {member.status === 'active' ? activeLabel : suspendedLabel}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => setStaffToAssignShift(member)} title={t('attendance.assignShift')}>
                        <CalendarClock className="w-4 h-4 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleToggleSuspension(member)} disabled={toggleSuspension.isPending} title={member.status === 'active' ? t('admin.merchants2.suspend') : t('admin.merchants2.activateShort')}>
                        {toggleSuspension.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : member.status === 'active' ? <Lock className="w-4 h-4 text-amber-600" /> : <Unlock className="w-4 h-4 text-green-600" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setStaffToRemove(member)} title={t('admin.staff2.remove')}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AddStaffModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} />

      <AssignShiftDialog
        open={!!staffToAssignShift}
        onOpenChange={(open) => !open && setStaffToAssignShift(null)}
        staffId={staffToAssignShift?.id || null}
        staffName={staffToAssignShift?.name || null}
        currentShiftId={staffToAssignShift?.shiftId || null}
      />

      <AlertDialog open={!!staffToRemove} onOpenChange={() => setStaffToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.staff2.remove')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.common.confirmDelete')} <strong>{staffToRemove?.name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>{t('admin.common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveStaff} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {removeStaffRole.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-2" /> : null}
              {t('admin.staff2.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminStaffPage;
