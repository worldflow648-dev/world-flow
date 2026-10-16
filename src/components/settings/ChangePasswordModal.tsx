import { useState } from 'react';
import { Loader2, Eye, EyeOff, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

interface ChangePasswordModalProps { open: boolean; onOpenChange: (open: boolean) => void; }

export function ChangePasswordModal({ open, onOpenChange }: ChangePasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { t } = useLanguage();

  const resetForm = () => { setNewPassword(''); setConfirmPassword(''); setShowNewPassword(false); setShowConfirmPassword(false); setError(''); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) { setError(t('auth.passwordMin')); return; }
    if (newPassword !== confirmPassword) { setError(t('auth.passwordMismatch')); return; }
    setIsLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      toast.success(t('settings.passwordUpdated'));
      resetForm();
      onOpenChange(false);
    } catch (err: any) { setError(err.message || t('settings.passwordUpdateError')); } finally { setIsLoading(false); }
  };

  const handleOpenChange = (isOpen: boolean) => { if (!isOpen) resetForm(); onOpenChange(isOpen); };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Lock className="h-5 w-5 text-primary" />{t('settings.changePassword')}</DialogTitle>
          <DialogDescription>{t('settings.enterNewPasswordDesc')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">{t('settings.newPassword')}</Label>
            <div className="relative">
              <Input id="newPassword" type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t('settings.newPasswordPlaceholder')} className="pl-10" autoComplete="new-password" />
              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t('settings.confirmPasswordLabel')}</Label>
            <div className="relative">
              <Input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t('settings.confirmPasswordPlaceholder')} className="pl-10" autoComplete="new-password" />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className="flex-1" disabled={isLoading}>{t('common.cancel')}</Button>
            <Button type="submit" className="flex-1" disabled={isLoading || !newPassword || !confirmPassword}>
              {isLoading ? (<><Loader2 className="h-4 w-4 ml-2 animate-spin" />{t('profile.saving')}</>) : t('settings.saveChanges')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
