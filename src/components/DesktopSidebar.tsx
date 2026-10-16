import { Link, useLocation } from "react-router-dom";
import {
  Home, Search, ShoppingCart, ClipboardList, BarChart3, Bell, User, Settings, HelpCircle, LogIn,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BrandLogo } from "@/components/BrandLogo";
import { cn } from "@/lib/utils";

export function DesktopSidebar() {
  const location = useLocation();
  const { getItemCount } = useCart();
  const { unreadCount } = useNotifications();
  const { profile, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const itemCount = getItemCount();

  const publicNav = [
    { path: "/", icon: Home, label: t('nav.home') },
    { path: "/search", icon: Search, label: t('nav.search') },
  ];

  const authMainNav = [
    { path: "/", icon: Home, label: t('nav.home') },
    { path: "/search", icon: Search, label: t('nav.search') },
    { path: "/cart", icon: ShoppingCart, label: t('nav.cart'), badge: "cart" as const },
    { path: "/orders", icon: ClipboardList, label: t('nav.orders') },
    { path: "/dashboard", icon: BarChart3, label: t('nav.dashboard') },
    { path: "/notifications", icon: Bell, label: t('nav.notifications'), badge: "notifications" as const },
  ];

  const bottomNavItems = [
    { path: "/profile", icon: User, label: t('nav.profile') },
    { path: "/settings", icon: Settings, label: t('nav.settings') },
    { path: "/help", icon: HelpCircle, label: t('nav.help') },
  ];

  const mainNav = isAuthenticated ? authMainNav : publicNav;

  const getBadge = (badge?: "cart" | "notifications") => {
    if (badge === "cart") return itemCount;
    if (badge === "notifications") return unreadCount;
    return 0;
  };

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 border-l border-border/50 bg-card/50 backdrop-blur-sm rtl:border-l rtl:border-r-0 ltr:border-r ltr:border-l-0">
      {/* Logo */}
      <div className="p-6 border-b border-border/30">
        <Link to="/" className="flex items-center gap-3">
          <BrandLogo className="h-10 w-10" />
          <span className="text-xl font-bold">{t('header.title')}</span>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {mainNav.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          const badgeCount = 'badge' in item ? getBadge(item.badge as "cart" | "notifications") : 0;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {badgeCount > 0 && (
                  <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                    {badgeCount > 9 ? "9+" : badgeCount}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
              {isActive && (
                <div className="ms-auto w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/30 mx-4" />

      {/* Bottom Links */}
      <div className="p-4 space-y-1">
        {isAuthenticated ? (
          bottomNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })
        ) : (
          <Link
            to="/auth"
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-primary hover:bg-primary/10 transition-all duration-200"
          >
            <LogIn className="h-5 w-5" />
            <span>{t('nav.login')}</span>
          </Link>
        )}
      </div>

      {/* User Info */}
      {isAuthenticated && (
        <div className="p-4 border-t border-border/30">
          <Link
            to="/profile"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors"
          >
            <Avatar className="w-9 h-9">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-primary text-white text-sm font-bold">
                {profile?.full_name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{profile?.full_name || t('profile.user')}</p>
              <p className="text-xs text-muted-foreground">{t('roles.merchant')}</p>
            </div>
          </Link>
        </div>
      )}
    </aside>
  );
}
