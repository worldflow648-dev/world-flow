import { Check, ShoppingCart, User, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface CheckoutStepperProps {
  currentStep: number;
}

export function CheckoutStepper({ currentStep }: CheckoutStepperProps) {
  const { t } = useLanguage();

  const steps = [
    { id: 1, label: t('checkout.cartStep'), icon: ShoppingCart },
    { id: 2, label: t('checkout.customerStep'), icon: User },
    { id: 3, label: t('checkout.summaryStep'), icon: FileText },
  ];

  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className="w-full py-4 px-4 overflow-hidden">
      <div className="flex items-center justify-between relative max-w-full">
        <div className="absolute top-5 left-12 right-12 h-1 bg-border rounded-full" />
        <div 
          className="absolute top-5 right-12 h-1 bg-gradient-to-l from-primary to-primary/80 rounded-full transition-all duration-700 ease-out"
          style={{ 
            width: `calc(${progress}% - ${progress > 0 ? 0 : 48}px)`,
            boxShadow: progress > 0 ? '0 0 10px hsl(var(--primary) / 0.5)' : 'none',
          }}
        />

        {steps.map((step) => {
          const isCompleted = step.id < currentStep;
          const isActive = step.id === currentStep;
          const isPending = step.id > currentStep;
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex flex-col items-center z-10 relative">
              <div
                className={cn(
                  "relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500",
                  isCompleted && "bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-glow-success",
                  isActive && "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-glow",
                  isPending && "bg-muted text-muted-foreground border-2 border-border"
                )}
              >
                {isActive && <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-30" />}
                {isCompleted ? <Check className="h-5 w-5 animate-scale-in" /> : <Icon className={cn("h-5 w-5", isActive && "animate-bounce-in")} />}
              </div>
              <span className={cn("text-xs mt-2 font-medium transition-all duration-300", isCompleted && "text-green-600 dark:text-green-400", isActive && "text-primary font-semibold", isPending && "text-muted-foreground")}>
                {step.label}
              </span>
              {isCompleted && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center animate-scale-in">
                  <span className="text-[8px] text-white font-bold">{step.id}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
