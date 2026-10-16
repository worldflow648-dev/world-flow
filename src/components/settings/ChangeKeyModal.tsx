import { useState } from 'react';
import { Key, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useChangeActivationKey } from '@/hooks/useActivationKeys';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

interface ChangeKeyModalProps { open: boolean; onOpenChange: (open: boolean) => void; currentKey?: string | null; }

export function ChangeKeyModal({ open, onOpenChange, currentKey }: ChangeKeyModalProps) {
  const [newKey, setNewKey] = useState('');
  const { user } = useAuth();
  const changeKey = useChangeActivationKey();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await changeKey.mutateAsync({ userId: user.id, newKeyCode: newKey.trim().toUpperCase() });
      toast.success(t('settings.activationKey'));
      onOpenChange(false);
      setNewKey('');
      window.location.reload();
    } catch (error) { toast.error(error instanceof Error ? error.message : t('errors.unexpected')); }
  };

  const handleClose = () => { setNewKey(''); onOpenChange(false); };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Key className="h-5 w-5" />{t('settings.activationKey')}</DialogTitle>
          <DialogDescription>{t('auth.activationKeyDesc')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {currentKey && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">{t('settings.activationKey')}</Label>
              <div className="bg-muted rounded-lg p-3"><code className="text-sm">{currentKey}</code></div>
            </div>
          )}
          <div className="space-y-2">
            <Label>{t('common.new')} *</Label>
            <Input value={newKey} onChange={(e) => setNewKey(e.target.value.toUpperCase())} placeholder="XXXX-XXXX-XXXX" className="font-mono tracking-wider" required />
          </div>
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{t('errors.unexpected')}</AlertDescription>
          </Alert>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">{t('common.cancel')}</Button>
            <Button type="submit" className="flex-1" disabled={changeKey.isPending || !newKey.trim()}>
              {changeKey.isPending ? t('common.loading') : t('common.confirm')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
