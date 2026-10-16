import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MerchantLayout } from '@/components/MerchantLayout';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useLanguage } from '@/contexts/LanguageContext';

const AboutApp = () => {
  const navigate = useNavigate();
  const { data: settings, isLoading } = useAppSettings();
  const { t, isRTL } = useLanguage();
  const content = settings?.about_app || t('settings.aboutApp');
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  return (
    <MerchantLayout hideHeader>
      <div className="pb-24 md:pb-8">
        <header className="sticky top-0 z-40 glass-strong border-b border-border/30">
          <div className="flex items-center gap-3 py-4 px-4">
            <Button variant="ghost" size="icon" className="rounded-xl md:hidden" onClick={() => navigate(-1)}>
              <BackArrow className="h-5 w-5" />
            </Button>
            <Info className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">{t('settings.aboutApp')}</h1>
          </div>
        </header>

        <div className="p-4">
          <Card className="shadow-card border-0">
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="space-y-3"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-full" /></div>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed whitespace-pre-wrap">{content}</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MerchantLayout>
  );
};

export default AboutApp;
