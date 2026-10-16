import { Link } from "react-router-dom";
import { Search, Bell, Receipt } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { BrandLogo } from "@/components/BrandLogo";

interface HeaderProps {
  showSearch?: boolean;
  title?: string;
}

export function Header({ showSearch = true, title }: HeaderProps) {
  const { unreadCount } = useNotifications();
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();

  const displayTitle = title || t('header.title');

  return (
    <header className="sticky top-0 z-40 glass-strong border-b border-border/30">
      <div className="flex items-center justify-between py-3 px-4 max-w-2xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <BrandLogo className="h-7 w-7" />
          <h1 className="text-lg font-bold text-foreground">{displayTitle}</h1>
        </Link>

        <div className="flex items-center gap-1">
          {showSearch && (
            <Link
              to="/search"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all press-effect"
              aria-label={t('nav.search')}
            >
              <Search className="h-5 w-5" />
            </Link>
          )}

          {isAuthenticated && (
            <Link
              to="/notifications"
              className="relative w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all press-effect"
              aria-label={t('nav.notifications')}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -left-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground shadow-float animate-bounce-in">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          )}

          {isAuthenticated && (
            <Link
              to="/invoices"
              className="relative w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all press-effect"
              aria-label={t('nav.invoices')}
            >
              <Receipt className="h-5 w-5" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
