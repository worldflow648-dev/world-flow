import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Moon, Bell, Lock, ChevronLeft, ChevronRight, Key, Shield, Info, FileText, Globe } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ChangePasswordModal } from '@/components/settings/ChangePasswordModal';
import { ChangeKeyModal } from '@/components/settings/ChangeKeyModal';
import { MerchantLayout } from '@/components/MerchantLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUserActivationKey } from '@/hooks/useActivationKeys';
import { languageConfig, Language } from '@/i18n';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language, setLanguage, isRTL } = useLanguage();
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const { data: activationKey } = useUserActivationKey(user?.id);

  const BackArrow = isRTL ? ChevronLeft : ChevronRight;

  const languages: { key: Language; flag: string }[] = [
    { key: 'ar', flag: '🇮🇶' },
    { key: 'en', flag: '🇬🇧' },
    { key: 'ku', flag: '🇮🇶' },
  ];

  return (
    <MerchantLayout hideHeader>
      <div className="pb-24 md:pb-8">
        <header className="sticky top-0 z-40 glass-strong border-b border-border/30">
          <div className="flex items-center gap-3 py-4 px-4">
            <Button variant="ghost" size="icon" className="rounded-xl md:hidden" onClick={() => navigate('/profile')}>
              <ArrowRight className={cn("h-5 w-5", !isRTL && "rotate-180")} />
            </Button>
            <h1 className="text-lg font-bold">{t('settings.title')}</h1>
          </div>
        </header>

        <div className="p-4 space-y-4">
          {/* Language */}
          <Card className="shadow-card border-0 animate-slide-up">
            <CardContent className="pt-6 space-y-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{t('settings.language')}</p>
                  <p className="text-xs text-muted-foreground">{t('settings.languageDesc')}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {languages.map((lang) => (
                  <button
                    key={lang.key}
                    onClick={() => setLanguage(lang.key)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all press-effect",
                      language === lang.key
                        ? "border-primary bg-primary/5"
                        : "border-border/50 hover:border-primary/30"
                    )}
                  >
                    <span className="text-lg">{lang.flag}</span>
                    <span className="text-xs font-medium">{languageConfig[lang.key].label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card className="shadow-card border-0 animate-slide-up" style={{ animationDelay: '50ms' }}>
            <CardContent className="pt-6 space-y-1 divide-y divide-border/50">
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Moon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{t('settings.darkMode')}</p>
                    <p className="text-xs text-muted-foreground">{t('settings.darkModeDesc')}</p>
                  </div>
                </div>
                <ThemeToggle />
              </div>
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{t('settings.notificationsLabel')}</p>
                    <p className="text-xs text-muted-foreground">{t('settings.notificationsDesc')}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">{t('common.enabled')}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="shadow-card border-0 animate-slide-up" style={{ animationDelay: '75ms' }}>
            <CardContent className="pt-6 space-y-1 divide-y divide-border/50">
              <button onClick={() => setPasswordModalOpen(true)} className="w-full flex items-center justify-between py-4 hover:bg-secondary/50 rounded-xl px-2 transition-colors press-effect">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="text-start">
                    <p className="font-medium">{t('settings.changePassword')}</p>
                    <p className="text-xs text-muted-foreground">{t('settings.changePasswordDesc')}</p>
                  </div>
                </div>
                <BackArrow className="h-5 w-5 text-muted-foreground" />
              </button>
            </CardContent>
          </Card>

          {/* Activation Key */}
          <Card className="shadow-card border-0 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <CardContent className="pt-6 space-y-1 divide-y divide-border/50">
              <button onClick={() => setKeyModalOpen(true)} className="w-full flex items-center justify-between py-4 hover:bg-secondary/50 rounded-xl px-2 transition-colors press-effect">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Key className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-start">
                    <p className="font-medium">{t('settings.activationKey')}</p>
                    {activationKey ? (
                      <p className="text-xs text-muted-foreground">
                        {activationKey.code} • {activationKey.used_at && format(new Date(activationKey.used_at), 'dd MMM yyyy', { locale: ar })}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">{t('settings.noKeyLinked')}</p>
                    )}
                  </div>
                </div>
                <BackArrow className="h-5 w-5 text-muted-foreground" />
              </button>
            </CardContent>
          </Card>

          {/* Invoices */}
          <Card className="shadow-card border-0 animate-slide-up" style={{ animationDelay: '125ms' }}>
            <CardContent className="pt-6 space-y-1 divide-y divide-border/50">
              <button onClick={() => navigate('/invoices')} className="w-full flex items-center justify-between py-4 hover:bg-secondary/50 rounded-xl px-2 transition-colors press-effect">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-start">
                    <p className="font-medium">{t('settings.invoices')}</p>
                    <p className="text-xs text-muted-foreground">{t('settings.invoicesDesc')}</p>
                  </div>
                </div>
                <BackArrow className="h-5 w-5 text-muted-foreground" />
              </button>
            </CardContent>
          </Card>

          {/* Content Pages */}
          <Card className="shadow-card border-0 animate-slide-up" style={{ animationDelay: '150ms' }}>
            <CardContent className="pt-6 space-y-1 divide-y divide-border/50">
              <button onClick={() => navigate('/privacy-policy')} className="w-full flex items-center justify-between py-4 hover:bg-secondary/50 rounded-xl px-2 transition-colors press-effect">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="text-start">
                    <p className="font-medium">{t('settings.privacyPolicy')}</p>
                  </div>
                </div>
                <BackArrow className="h-5 w-5 text-muted-foreground" />
              </button>
              <button onClick={() => navigate('/about')} className="w-full flex items-center justify-between py-4 hover:bg-secondary/50 rounded-xl px-2 transition-colors press-effect">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Info className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="text-start">
                    <p className="font-medium">{t('settings.aboutApp')}</p>
                  </div>
                </div>
                <BackArrow className="h-5 w-5 text-muted-foreground" />
              </button>
            </CardContent>
          </Card>

          <div className="text-center pt-6 text-muted-foreground text-sm animate-slide-up" style={{ animationDelay: '150ms' }}>
            <p>{t('common.version')} 1.0.0</p>
          </div>
        </div>
      </div>

      <ChangePasswordModal open={passwordModalOpen} onOpenChange={setPasswordModalOpen} />
      <ChangeKeyModal open={keyModalOpen} onOpenChange={setKeyModalOpen} currentKey={activationKey?.code} />
    </MerchantLayout>
  );
};

export default Settings;
