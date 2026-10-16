import { useNavigate } from 'react-router-dom';
import { ArrowRight, MessageCircle, Phone, Mail, HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MerchantLayout } from '@/components/MerchantLayout';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

const Help = () => {
  const navigate = useNavigate();
  const { data: settings } = useAppSettings();
  const { t, isRTL } = useLanguage();
  const whatsapp = settings?.support_whatsapp || '9647700000000';
  const email = settings?.support_email || 'support@example.com';

  const BackArrow = isRTL ? ChevronLeft : ChevronRight;

  const faqs = useMemo(() => {
    if (settings?.faqs) {
      try {
        const parsed = JSON.parse(settings.faqs);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return [
      { question: t('help.faq1q'), answer: t('help.faq1a') },
      { question: t('help.faq2q'), answer: t('help.faq2a') },
      { question: t('help.faq3q'), answer: t('help.faq3a') },
      { question: t('help.faq4q'), answer: t('help.faq4a') },
      { question: t('help.faq5q'), answer: t('help.faq5a') },
    ];
  }, [settings?.faqs, t]);

  return (
    <MerchantLayout hideHeader>
      <div className="pb-24 md:pb-8">
        <header className="sticky top-0 z-40 glass-strong border-b border-border/30">
          <div className="flex items-center gap-3 py-4 px-4">
            <Button variant="ghost" size="icon" className="rounded-xl md:hidden" onClick={() => navigate('/profile')}>
              <ArrowRight className={cn("h-5 w-5", !isRTL && "rotate-180")} />
            </Button>
            <h1 className="text-lg font-bold">{t('help.title')}</h1>
          </div>
        </header>

        <div className="p-4 space-y-4">
          <Card className="shadow-card border-0 bg-gradient-primary text-white overflow-hidden animate-slide-up">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                  <HelpCircle className="h-7 w-7" />
                </div>
                <div>
                  <p className="font-bold text-lg">{t('help.needHelp')}</p>
                  <p className="text-sm text-white/80">{t('help.supportAvailable')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border-0 animate-slide-up" style={{ animationDelay: '75ms' }}>
            <CardContent className="pt-6 space-y-1 divide-y divide-border/50">
              <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-between py-4 hover:bg-secondary/50 rounded-xl px-2 transition-colors press-effect">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center"><MessageCircle className="h-5 w-5 text-green-600" /></div>
                  <div className="text-start"><p className="font-medium">{t('help.whatsapp')}</p><p className="text-xs text-muted-foreground">{t('help.whatsappDesc')}</p></div>
                </div>
                <BackArrow className="h-5 w-5 text-muted-foreground" />
              </a>
              <a href={`tel:+${whatsapp}`} className="w-full flex items-center justify-between py-4 hover:bg-secondary/50 rounded-xl px-2 transition-colors press-effect">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center"><Phone className="h-5 w-5 text-blue-600" /></div>
                  <div className="text-start"><p className="font-medium">{t('help.callUs')}</p><p className="text-xs text-muted-foreground">{t('help.callUsDesc')}</p></div>
                </div>
                <BackArrow className="h-5 w-5 text-muted-foreground" />
              </a>
              <a href={`mailto:${email}`} className="w-full flex items-center justify-between py-4 hover:bg-secondary/50 rounded-xl px-2 transition-colors press-effect">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center"><Mail className="h-5 w-5 text-purple-600" /></div>
                  <div className="text-start"><p className="font-medium">{t('help.email')}</p><p className="text-xs text-muted-foreground">{t('help.emailDesc')}</p></div>
                </div>
                <BackArrow className="h-5 w-5 text-muted-foreground" />
              </a>
            </CardContent>
          </Card>

          <Card className="shadow-card border-0 animate-slide-up" style={{ animationDelay: '150ms' }}>
            <CardContent className="pt-6">
              <h2 className="font-bold text-lg mb-4">{t('help.faq')}</h2>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-start text-base hover:no-underline">{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </div>
    </MerchantLayout>
  );
};

export default Help;
