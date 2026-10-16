import { cn } from "@/lib/utils";
import { ShoppingBag, ClipboardList, Search, Package, Bell, AlertCircle, WifiOff } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type EmptyStateType = "cart" | "orders" | "search" | "products" | "notifications" | "error" | "network";

interface EmptyStateProps {
  type: EmptyStateType;
  title?: string;
  description?: string;
  className?: string;
  action?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const iconMap: Record<EmptyStateType, React.ElementType> = {
  cart: ShoppingBag,
  orders: ClipboardList,
  search: Search,
  products: Package,
  notifications: Bell,
  error: AlertCircle,
  network: WifiOff,
};

const sizeClasses = {
  sm: { container: 'py-8 px-4', icon: 'w-16 h-16', innerIcon: 'w-12 h-12', iconSize: 'w-6 h-6', title: 'text-base', desc: 'text-xs' },
  md: { container: 'py-12 px-6', icon: 'w-24 h-24', innerIcon: 'w-16 h-16', iconSize: 'w-8 h-8', title: 'text-lg', desc: 'text-sm' },
  lg: { container: 'py-16 px-8', icon: 'w-28 h-28', innerIcon: 'w-20 h-20', iconSize: 'w-10 h-10', title: 'text-xl', desc: 'text-base' },
};

export function EmptyState({
  type,
  title,
  description,
  className,
  action,
  size = 'md',
}: EmptyStateProps) {
  const { t } = useLanguage();
  const Icon = iconMap[type];
  const sizes = sizeClasses[size];

  const defaultTitle = t(`empty.${type}`);
  const defaultDescription = t(`empty.${type}Desc`);

  return (
    <div className={cn("flex flex-col items-center justify-center text-center", sizes.container, className)}>
      <div className="relative mb-6">
        <div className={cn("rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center animate-float", sizes.icon)}>
          <div className={cn("rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center", sizes.innerIcon)}>
            <Icon className={cn(sizes.iconSize, "text-primary/60")} />
          </div>
        </div>
        <div className="absolute -top-2 -right-2 w-3 h-3 rounded-full bg-primary/30 animate-pulse-subtle" />
        <div className="absolute -bottom-1 -left-3 w-2 h-2 rounded-full bg-primary/20 animate-pulse-subtle" style={{ animationDelay: "0.5s" }} />
        <div className="absolute top-1/2 -right-4 w-2 h-2 rounded-full bg-primary/25 animate-pulse-subtle" style={{ animationDelay: "1s" }} />
      </div>

      <h3 className={cn("font-bold text-foreground mb-2", sizes.title)}>
        {title || defaultTitle}
      </h3>
      <p className={cn("text-muted-foreground max-w-[200px]", sizes.desc)}>
        {description || defaultDescription}
      </p>

      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
