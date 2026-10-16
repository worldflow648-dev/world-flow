import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useActiveBanners } from "@/hooks/useAdminBanners";
import { useLanguage } from "@/contexts/LanguageContext";

export function HeroSlider() {
  const { data: banners, isLoading } = useActiveBanners();
  const { isRTL } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const activeBanners = banners ?? [];

  const nextSlide = useCallback(() => {
    if (activeBanners.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
    setProgress(0);
  }, [activeBanners.length]);

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const duration = 5000;
    const interval = 50;
    const increment = (interval / duration) * 100;
    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) { nextSlide(); return 0; }
        return prev + increment;
      });
    }, interval);
    return () => clearInterval(progressTimer);
  }, [nextSlide, activeBanners.length]);

  useEffect(() => {
    setCurrentIndex(0);
    setProgress(0);
  }, [activeBanners.length]);

  if (isLoading || activeBanners.length === 0) return null;

  return (
    <div className="relative overflow-hidden mx-4 mt-4">
      <div
        className="flex transition-transform duration-700 ease-out"
        style={{ transform: `translateX(${(isRTL ? 1 : -1) * currentIndex * 100}%)` }}
      >
        {activeBanners.map((banner) => {
          const bg = (banner as any).image_url ? (
            <img src={(banner as any).image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className={cn("absolute inset-0 bg-gradient-to-l", banner.bg_gradient)} />
          );
          const title = banner.title?.trim();
          const subtitle = banner.subtitle?.trim();
          const cta = banner.cta_text?.trim();
          const hasText = !!(title || subtitle || cta);
          const content = (
            <>
              {bg}
              {hasText && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                  <div className={cn("absolute inset-0 flex flex-col justify-end p-4 sm:p-6 gap-1.5 text-white", isRTL ? "items-end text-right" : "items-start text-left")}>
                    {subtitle && <p className="text-xs sm:text-sm opacity-90 drop-shadow">{subtitle}</p>}
                    {title && <h3 className="text-lg sm:text-2xl font-bold drop-shadow-lg leading-tight">{title}</h3>}
                    {cta && (
                      <span className="mt-1 inline-block px-3 py-1.5 rounded-full bg-white text-black text-xs sm:text-sm font-semibold shadow-lg">
                        {cta}
                      </span>
                    )}
                  </div>
                </>
              )}
            </>
          );
          return (
            <div key={banner.id} className="min-w-full relative overflow-hidden rounded-2xl shadow-elevated aspect-video">
              {banner.link ? (
                <Link to={banner.link} className="absolute inset-0 block">
                  {content}
                </Link>
              ) : content}
            </div>
          );
        })}
      </div>

      {activeBanners.length > 1 && (
        <div className="flex gap-2 justify-center mt-3">
          {activeBanners.map((_, index) => (
            <button
              key={index}
              onClick={() => { setCurrentIndex(index); setProgress(0); }}
              className="relative h-1.5 rounded-full overflow-hidden transition-all duration-300"
              style={{ width: index === currentIndex ? "28px" : "8px" }}
              aria-label={`Go to slide ${index + 1}`}
            >
              <div className="absolute inset-0 bg-muted-foreground/30" />
              {index === currentIndex && (
                <div className="absolute inset-0 bg-primary rounded-full" style={{ transform: `scaleX(${progress / 100})`, transformOrigin: isRTL ? "right" : "left" }} />
              )}
              {index < currentIndex && <div className="absolute inset-0 bg-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
