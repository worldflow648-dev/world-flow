import { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUpdateIssueNote, useUpdateIssueStatus, type AdminIssue } from '@/hooks/useAdminIssues';
import { toast } from '@/hooks/use-toast';

type Mode = 'note' | 'duplicate';

interface Props {
  open: boolean;
  mode: Mode;
  issue: AdminIssue | null;
  allIssues: AdminIssue[];
  onClose: () => void;
}

export const IssueActionDialog = ({ open, mode, issue, allIssues, onClose }: Props) => {
  const { t } = useLanguage();
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');
  const [pickedId, setPickedId] = useState<string | null>(null);

  const updateNote = useUpdateIssueNote();
  const updateStatus = useUpdateIssueStatus();

  useEffect(() => {
    if (open && issue) {
      setNote(issue.adminNotes || '');
      setPickedId(issue.duplicateOf);
      setSearch('');
    }
  }, [open, issue]);

  const candidates = useMemo(() => {
    if (!issue) return [];
    const q = search.trim().toLowerCase();
    return allIssues
      .filter(i => i.id !== issue.id)
      .filter(i =>
        !q ||
        i.orderNumber.toLowerCase().includes(q) ||
        i.issueType.toLowerCase().includes(q) ||
        i.customerName.toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [allIssues, issue, search]);

  if (!issue) return null;

  const handleSave = async () => {
    try {
      if (mode === 'note') {
        await updateNote.mutateAsync({ id: issue.id, adminNotes: note.trim() || null });
        toast({ title: t('admin.issues.toast.noteSaved') });
      } else {
        if (!pickedId) return;
        await updateStatus.mutateAsync({
          id: issue.id,
          status: 'duplicate',
          duplicateOf: pickedId,
        });
        toast({ title: t('admin.issues.toast.statusUpdated') });
      }
      onClose();
    } catch (err) {
      toast({ title: t('errors.generic'), variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === 'note' ? t('admin.issues.dialog.noteTitle') : t('admin.issues.dialog.duplicateTitle')}
          </DialogTitle>
        </DialogHeader>

        {mode === 'note' ? (
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('admin.issues.dialog.notePlaceholder')}
            rows={5}
            dir="rtl"
          />
        ) : (
          <div className="space-y-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.issues.dialog.duplicatePlaceholder')}
              dir="rtl"
            />
            <ScrollArea className="h-64 border border-border rounded-md">
              <div className="p-2 space-y-1">
                {candidates.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">
                    {t('common.noResults')}
                  </p>
                ) : candidates.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setPickedId(c.id)}
                    className={`w-full text-right p-2 rounded-md transition-colors ${
                      pickedId === c.id ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">{c.orderNumber}</span>
                      <Badge variant="outline" className="text-xs">{c.issueType}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{c.customerName}</p>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('admin.issues.dialog.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              (mode === 'duplicate' && !pickedId) ||
              updateNote.isPending ||
              updateStatus.isPending
            }
          >
            {t('admin.issues.dialog.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
