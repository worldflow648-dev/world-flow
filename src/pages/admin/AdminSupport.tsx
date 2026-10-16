import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Headphones, Save, MessageCircle, Mail } from 'lucide-react';
import { useAppSettings, useUpdateAppSetting } from '@/hooks/useAppSettings';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

const AdminSupport = () => {
  const { t } = useLanguage();
  const { data: settings, isLoading } = useAppSettings();
  const updateSetting = useUpdateAppSetting();
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (settings) {
      setWhatsapp(settings.support_whatsapp || '');
      setEmail(settings.support_email || '');
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await Promise.all([
        updateSetting.mutateAsync({ key: 'support_whatsapp', value: whatsapp }),
        updateSetting.mutateAsync({ key: 'support_email', value: email }),
      ]);
      toast.success(t('admin.support.saved'));
    } catch {
      toast.error(t('admin.support.saveError'));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-xl">
          <Headphones className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t('admin.support.title')}</h1>
          <p className="text-muted-foreground text-sm">{t('admin.support2.subtitle')}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.support.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-green-600" />
              {t('admin.support.whatsapp')}
            </Label>
            <Input
              value={whatsapp}
              onChange={e => setWhatsapp(e.target.value)}
              placeholder="9647XXXXXXXXX"
              dir="ltr"
              className="text-left"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-purple-600" />
              {t('admin.support.email')}
            </Label>
            <Input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="support@example.com"
              type="email"
              dir="ltr"
              className="text-left"
            />
          </div>

          <Button onClick={handleSave} disabled={updateSetting.isPending} className="gap-2">
            <Save className="w-4 h-4" />
            {updateSetting.isPending ? t('admin.common.saving') : t('admin.support.save')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSupport;
