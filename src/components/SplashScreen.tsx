import { useState, useEffect } from 'react';
import { Store } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadeOut(true), 1800);
    const finishTimer = setTimeout(onFinish, 2300);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-primary transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Glow */}
      <div className="absolute w-40 h-40 bg-primary-foreground/20 rounded-full blur-3xl animate-pulse" />

      {/* Logo */}
      <div className="relative w-24 h-24 bg-primary-foreground/15 rounded-3xl flex items-center justify-center shadow-2xl animate-bounce-in backdrop-blur-sm border border-primary-foreground/20">
        <Store className="w-12 h-12 text-primary-foreground" />
      </div>

      {/* App Name */}
      <h1 className="mt-6 text-3xl font-bold text-primary-foreground animate-fade-in">
        طلبات التاجر
      </h1>
      <p className="mt-2 text-sm text-primary-foreground/70 animate-fade-in" style={{ animationDelay: '0.3s' }}>
        منصة الطباعة عند الطلب
      </p>

      {/* Loading dots */}
      <div className="flex gap-1.5 mt-8">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-primary-foreground/50 animate-pulse"
            style={{ animationDelay: `${i * 0.3}s` }}
          />
        ))}
      </div>
    </div>
  );
}
