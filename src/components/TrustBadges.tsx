import { Truck, Shield, RotateCcw, HeadphonesIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface TrustBadgesProps {
  className?: string;
  variant?: "horizontal" | "grid";
}

export function TrustBadges({ className, variant = "horizontal" }: TrustBadgesProps) {
  const { t } = useLanguage();

  const badges = [
    { icon: Truck, label: t('trust.fastDelivery') },
    { icon: Shield, label: t('trust.securePayment') },
    { icon: RotateCcw, label: t('trust.easyReturn') },
    { icon: HeadphonesIcon, label: t('trust.support247') },
  ];

  if (variant === "grid") {
    return (
      <div className={cn("grid grid-cols-2 gap-3", className)}>
        {badges.map((badge, index) => {
          const Icon = badge.icon;
          return (
            <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Icon className="w-5 h-5 text-primary" /></div>
              <span className="text-sm font-medium text-foreground">{badge.label}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("flex gap-2 overflow-x-auto hide-scrollbar py-1", className)}>
      {badges.map((badge, index) => {
        const Icon = badge.icon;
        return (
          <div key={index} className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-card border border-border/50 shadow-sm shrink-0 hover:shadow-card transition-shadow">
            <Icon className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">{badge.label}</span>
          </div>
        );
      })}
    </div>
  );
}
