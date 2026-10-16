import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ExternalLink, MoreVertical, CheckCircle2, Clock,
  Trash2, FileText, Copy, X, Flag,
} from 'lucide-react';
import {
  useAdminIssues, useUpdateIssueStatus, useBulkUpdateIssueStatus, useDeleteIssue,
  useUpdateIssueUrgency, useBulkUpdateIssueUrgency,
  type IssueStatus, type IssueUrgency, type AdminIssue, OPEN_STATUSES,
} from '@/hooks/useAdminIssues';
import { AdminTableSearch } from '@/components/admin/AdminTableSearch';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger,
  DropdownMenuSubContent, DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { IssueActionDialog } from '@/components/admin/IssueActionDialog';
import { cn } from '@/lib/utils';

const ALL_STATUSES: IssueStatus[] = [
  'new', 'in_progress', 'waiting_merchant', 'postponed', 'solved', 'declined', 'duplicate',
];

const ALL_URGENCIES: IssueUrgency[] = ['high', 'medium', 'low'];

const URGENCY_RANK: Record<IssueUrgency, number> = { high: 3, medium: 2, low: 1 };

type SortKey = 'newest' | 'oldest' | 'urgencyDesc' | 'urgencyAsc';

const statusBadgeClass = (s: IssueStatus): string => {
  switch (s) {
    case 'new': return 'bg-destructive/10 text-destructive border-destructive/30';
    case 'in_progress': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
    case 'waiting_merchant': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
    case 'postponed': return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30';
    case 'solved': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
    case 'declined':
    case 'duplicate':
    default: return 'bg-muted text-muted-foreground border-border';
  }
};

const urgencyBadgeClass = (u: IssueUrgency): string => {
  switch (u) {
    case 'high': return 'bg-destructive/10 text-destructive border-destructive/30';
    case 'medium': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
    case 'low': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
  }
};

const urgencyDotClass = (u: IssueUrgency): string => {
  switch (u) {
    case 'high': return 'bg-destructive';
    case 'medium': return 'bg-amber-500';
    case 'low': return 'bg-emerald-500';
  }
};

const AdminIssues = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: issues, isLoading } = useAdminIssues();
  const updateStatus = useUpdateIssueStatus();
  const bulkUpdate = useBulkUpdateIssueStatus();
  const updateUrgency = useUpdateIssueUrgency();
  const bulkUpdateUrgency = useBulkUpdateIssueUrgency();
  const deleteIssue = useDeleteIssue();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | IssueStatus>('open');
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | IssueUrgency>('all');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<AdminIssue | null>(null);
  const [actionDialog, setActionDialog] = useState<{ mode: 'note' | 'duplicate'; issue: AdminIssue } | null>(null);

  const filtered = useMemo(() => {
    let list = issues || [];
    if (statusFilter === 'open') {
      list = list.filter(i => OPEN_STATUSES.includes(i.status));
    } else if (statusFilter !== 'all') {
      list = list.filter(i => i.status === statusFilter);
    }
    if (urgencyFilter !== 'all') {
      list = list.filter(i => i.urgency === urgencyFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.orderNumber.toLowerCase().includes(q) ||
        i.issueType.toLowerCase().includes(q) ||
        i.reportedBy.toLowerCase().includes(q) ||
        i.customerName.toLowerCase().includes(q)
      );
    }
    // Sort (client-side, copy to avoid mutating cache)
    const sorted = [...list];
    switch (sortKey) {
      case 'oldest':
        sorted.sort((a, b) => new Date(a.reportedAt).getTime() - new Date(b.reportedAt).getTime());
        break;
      case 'urgencyDesc':
        sorted.sort((a, b) => URGENCY_RANK[b.urgency] - URGENCY_RANK[a.urgency]
          || new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
        break;
      case 'urgencyAsc':
        sorted.sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency]
          || new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
        break;
      case 'newest':
      default:
        sorted.sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
        break;
    }
    return sorted;
  }, [issues, search, statusFilter, urgencyFilter, sortKey]);

  const openCount = useMemo(
    () => (issues || []).filter(i => OPEN_STATUSES.includes(i.status)).length,
    [issues]
  );

  const formatDate = (d: string) => new Date(d).toLocaleDateString('ar-IQ', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const toggleRow = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every(i => selected.has(i.id));
  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelected(prev => {
        const next = new Set(prev);
        filtered.forEach(i => next.delete(i.id));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        filtered.forEach(i => next.add(i.id));
        return next;
      });
    }
  };

  const handleChangeStatus = async (issue: AdminIssue, status: IssueStatus) => {
    try {
      await updateStatus.mutateAsync({ id: issue.id, status });
      toast({ title: t('admin.issues.toast.statusUpdated') });
    } catch {
      toast({ title: t('errors.unexpected'), variant: 'destructive' });
    }
  };

  const handleBulk = async (status: IssueStatus) => {
    try {
      await bulkUpdate.mutateAsync({ ids: Array.from(selected), status });
      toast({ title: t('admin.issues.toast.bulkUpdated') });
      setSelected(new Set());
    } catch {
      toast({ title: t('errors.unexpected'), variant: 'destructive' });
    }
  };

  const handleChangeUrgency = async (issue: AdminIssue, urgency: IssueUrgency) => {
    try {
      await updateUrgency.mutateAsync({ id: issue.id, urgency });
      toast({ title: t('admin.issues.toast.urgencyUpdated') });
    } catch {
      toast({ title: t('errors.unexpected'), variant: 'destructive' });
    }
  };

  const handleBulkUrgency = async (urgency: IssueUrgency) => {
    try {
      await bulkUpdateUrgency.mutateAsync({ ids: Array.from(selected), urgency });
      toast({ title: t('admin.issues.toast.urgencyUpdated') });
      setSelected(new Set());
    } catch {
      toast({ title: t('errors.unexpected'), variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteIssue.mutateAsync(deleteTarget.id);
      toast({ title: t('admin.issues.toast.deleted') });
      setDeleteTarget(null);
    } catch {
      toast({ title: t('errors.unexpected'), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-destructive/10 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('admin.issues.title')}</h1>
            <p className="text-muted-foreground text-sm">{t('admin.issues.subtitle')}</p>
          </div>
        </div>
        <Badge variant="destructive" className="text-sm px-3 py-1">
          {openCount} {t('admin.issues.dashboardCount')}
        </Badge>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <AdminTableSearch
          placeholder={t('admin.issues.search')}
          onSearch={setSearch}
          className="flex-1 min-w-[200px] max-w-md"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">{t('admin.issues.filterOpen')}</SelectItem>
            <SelectItem value="all">{t('admin.issues.filterAll')}</SelectItem>
            {ALL_STATUSES.map(s => (
              <SelectItem key={s} value={s}>{t(`admin.issues.statusLabel.${s}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={urgencyFilter} onValueChange={(v) => setUrgencyFilter(v as typeof urgencyFilter)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.issues.filterUrgency')}</SelectItem>
            {ALL_URGENCIES.map(u => (
              <SelectItem key={u} value={u}>
                <span className="flex items-center gap-2">
                  <span className={cn('w-2 h-2 rounded-full', urgencyDotClass(u))} />
                  {t(`admin.issues.urgencyLabel.${u}`)}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t('admin.issues.sortLabel.newest')}</SelectItem>
            <SelectItem value="oldest">{t('admin.issues.sortLabel.oldest')}</SelectItem>
            <SelectItem value="urgencyDesc">{t('admin.issues.sortLabel.urgencyDesc')}</SelectItem>
            <SelectItem value="urgencyAsc">{t('admin.issues.sortLabel.urgencyAsc')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selected.size > 0 && (
        <div className="sticky top-2 z-10 bg-card/95 backdrop-blur border border-border rounded-xl p-3 flex flex-wrap items-center gap-2 shadow-md">
          <span className="text-sm font-medium ml-auto">
            {t('admin.issues.bulkSelected').replace('{count}', String(selected.size))}
          </span>
          <Button size="sm" variant="outline" onClick={() => handleBulk('in_progress')}>
            <Clock className="w-4 h-4" />
            {t('admin.issues.actions.markInProgress')}
          </Button>
          <Button size="sm" variant="default" onClick={() => handleBulk('solved')}>
            <CheckCircle2 className="w-4 h-4" />
            {t('admin.issues.actions.markSolved')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleBulk('declined')}>
            {t('admin.issues.statusLabel.declined')}
          </Button>
          <span className="w-px h-6 bg-border mx-1" />
          <span className="text-xs text-muted-foreground">{t('admin.issues.bulkSetUrgency')}</span>
          {ALL_URGENCIES.map(u => (
            <Button
              key={u}
              size="sm"
              variant="outline"
              className={cn('h-8', urgencyBadgeClass(u))}
              onClick={() => handleBulkUrgency(u)}
            >
              <span className={cn('w-2 h-2 rounded-full', urgencyDotClass(u))} />
              {t(`admin.issues.urgencyLabel.${u}`)}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            <X className="w-4 h-4" />
            {t('admin.issues.bulkClear')}
          </Button>
        </div>
      )}


      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState type="orders" title={t('admin.issues.empty')} description={t('admin.issues.emptyDesc')} />
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allFilteredSelected}
                    onCheckedChange={toggleAll}
                    aria-label="select all"
                  />
                </TableHead>
                <TableHead className="text-right">{t('admin.issues.orderNumber')}</TableHead>
                <TableHead className="text-right">{t('admin.issues.issueType')}</TableHead>
                <TableHead className="text-right">{t('admin.issues.urgency')}</TableHead>
                <TableHead className="text-right">{t('admin.issues.status')}</TableHead>
                <TableHead className="text-right">{t('admin.issues.reportedBy')}</TableHead>
                <TableHead className="text-right">{t('admin.issues.date')}</TableHead>
                <TableHead className="text-left">{t('admin.issues.actionsHeader')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(issue => (
                <TableRow key={issue.id} data-state={selected.has(issue.id) ? 'selected' : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(issue.id)}
                      onCheckedChange={() => toggleRow(issue.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{issue.orderNumber}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-destructive border-destructive/30">
                      {issue.issueType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="inline-flex">
                          <Badge variant="outline" className={cn('font-medium gap-1.5 cursor-pointer hover:opacity-80', urgencyBadgeClass(issue.urgency))}>
                            <span className={cn('w-2 h-2 rounded-full', urgencyDotClass(issue.urgency))} />
                            {t(`admin.issues.urgencyLabel.${issue.urgency}`)}
                          </Badge>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-44 p-1" align="start">
                        {ALL_URGENCIES.map(u => (
                          <button
                            key={u}
                            type="button"
                            onClick={() => handleChangeUrgency(issue, u)}
                            className={cn(
                              'w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent text-right',
                              u === issue.urgency && 'bg-accent/50'
                            )}
                          >
                            <span className={cn('w-2 h-2 rounded-full', urgencyDotClass(u))} />
                            {t(`admin.issues.urgencyLabel.${u}`)}
                          </button>
                        ))}
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('font-medium', statusBadgeClass(issue.status))}>
                      {t(`admin.issues.statusLabel.${issue.status}`)}
                    </Badge>
                    {issue.adminNotes && (
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs truncate" title={issue.adminNotes}>
                        {issue.adminNotes}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>{issue.reportedBy}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(issue.reportedAt)}</TableCell>
                  <TableCell className="text-left">
                    <div className="flex items-center gap-1 justify-end">
                      {issue.status !== 'solved' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-emerald-600 hover:bg-emerald-500/10"
                          onClick={() => handleChangeStatus(issue, 'solved')}
                          title={t('admin.issues.actions.markSolved')}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                      )}
                      {issue.status === 'new' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:bg-blue-500/10"
                          onClick={() => handleChangeStatus(issue, 'in_progress')}
                          title={t('admin.issues.actions.markInProgress')}
                        >
                          <Clock className="w-4 h-4" />
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          <DropdownMenuItem onClick={() => navigate(`/admin/orders?orderId=${issue.orderId}`)}>
                            <ExternalLink className="w-4 h-4" />
                            {t('admin.issues.viewOrder')}
                          </DropdownMenuItem>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              {t('admin.issues.actions.changeStatus')}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="bg-popover">
                              <DropdownMenuRadioGroup
                                value={issue.status}
                                onValueChange={(v) => handleChangeStatus(issue, v as IssueStatus)}
                              >
                                {ALL_STATUSES.map(s => (
                                  <DropdownMenuRadioItem key={s} value={s}>
                                    {t(`admin.issues.statusLabel.${s}`)}
                                  </DropdownMenuRadioItem>
                                ))}
                              </DropdownMenuRadioGroup>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuItem onClick={() => setActionDialog({ mode: 'note', issue })}>
                            <FileText className="w-4 h-4" />
                            {t('admin.issues.actions.editNote')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setActionDialog({ mode: 'duplicate', issue })}>
                            <Copy className="w-4 h-4" />
                            {t('admin.issues.actions.markDuplicate')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(issue)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                            {t('admin.issues.actions.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <IssueActionDialog
        open={!!actionDialog}
        mode={actionDialog?.mode || 'note'}
        issue={actionDialog?.issue || null}
        allIssues={issues || []}
        onClose={() => setActionDialog(null)}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.issues.confirmDelete.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('admin.issues.confirmDelete.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('admin.issues.dialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('admin.issues.actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminIssues;
