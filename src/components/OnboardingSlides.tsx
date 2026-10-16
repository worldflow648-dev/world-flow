import { useState, useCallback } from 'react';
import { Store, Truck, Shield, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface OnboardingSlidesProps {
  onFinish: () => void;
}

export function OnboardingSlides({ onFinish }: OnboardingSlidesProps) {
  const [current, setCurrent] = useState(0);
  const { t, isRTL } = useLanguage();

  const slides = [
    { icon: Store, title: t('onboarding.slide1title'), description: t('onboarding.slide1desc'), color: 'from-primary to-primary/80' },
    { icon: Truck, title: t('onboarding.slide2title'), description: t('onboarding.slide2desc'), color: 'from-emerald-500 to-emerald-600' },
    { icon: TrendingUp, title: t('onboarding.slide3title'), description: t('onboarding.slide3desc'), color: 'from-amber-500 to-orange-500' },
    { icon: Shield, title: t('onboarding.slide4title'), description: t('onboarding.slide4desc'), color: 'from-blue-500 to-indigo-600' },
  ];

  const next = useCallback(() => {
    if (current === slides.length - 1) {
      localStorage.setItem('onboarding_seen', 'true');
      onFinish();
    } else {
      setCurrent((p) => p + 1);
    }
  }, [current, onFinish, slides.length]);

  const prev = useCallback(() => {
    setCurrent((p) => Math.max(0, p - 1));
  }, []);

  const skip = useCallback(() => {
    localStorage.setItem('onboarding_seen', 'true');
    onFinish();
  }, [onFinish]);

  const slide = slides[current];
  const Icon = slide.icon;
  const isLast = current === slides.length - 1;
  const PrevIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <div className="fixed inset-0 z-[9998] flex flex-col bg-background">
      <div className="flex justify-start p-4">
        <Button variant="ghost" size="sm" onClick={skip} className="text-muted-foreground">
          {t('onboarding.skip')}
        </Button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 animate-fade-in" key={current}>
        <div className={`w-32 h-32 rounded-3xl bg-gradient-to-br ${slide.color} flex items-center justify-center shadow-glow mb-8 animate-bounce-in`}>
          <Icon className="w-16 h-16 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-foreground text-center mb-4">{slide.title}</h2>
        <p className="text-base text-muted-foreground text-center max-w-sm leading-relaxed">{slide.description}</p>
      </div>

      <div className="px-6 pb-8 space-y-4">
        <div className="flex justify-center gap-2">
          {slides.map((_, i) => (
            <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === current ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/30'}`} />
          ))}
        </div>

        <div className="flex gap-3">
          {current > 0 && (
            <Button variant="outline" onClick={prev} className="flex-1 h-12 rounded-xl">
              <PrevIcon className="w-4 h-4 me-1" />
              {t('common.previous')}
            </Button>
          )}
          <Button onClick={next} className="flex-1 h-12 rounded-xl text-base font-medium">
            {isLast ? t('onboarding.start') : t('common.next')}
            {!isLast && <NextIcon className="w-4 h-4 ms-1" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
