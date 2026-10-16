import { useNavigate } from "react-router-dom";
import { ArrowRight, Bell, CheckCheck, Package, Megaphone, Sparkles } from "lucide-react";
import { useNotifications, Notification } from "@/contexts/NotificationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { MerchantLayout } from "@/components/MerchantLayout";
import { cn } from "@/lib/utils";

const Notifications = () => {
  const navigate = useNavigate();
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useNotifications();
  const { t, isRTL } = useLanguage();
  const groupedNotifications = groupByDate(notifications, t);

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.type === 'order_update' && notification.data?.orderId) navigate('/orders');
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'order_update': return <Package className="h-5 w-5" />;
      case 'promo': return <Sparkles className="h-5 w-5" />;
      case 'system': default: return <Megaphone className="h-5 w-5" />;
    }
  };

  return (
    <MerchantLayout hideHeader>
      <div className="pb-24 md:pb-8">
        <header className="sticky top-0 z-40 glass-strong border-b border-border/30">
          <div className="flex items-center gap-3 py-4 px-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-xl transition-colors press-effect md:hidden" aria-label={t('common.back')}>
              <ArrowRight className={cn("h-5 w-5", !isRTL && "rotate-180")} />
            </button>
            <Bell className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold flex-1">{t('notifications.title')}</h1>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-primary text-sm gap-1.5">
                <CheckCheck className="h-4 w-4" />
                {t('notifications.markAllRead')}
              </Button>
            )}
          </div>
        </header>

        {notifications.length === 0 ? (
          <EmptyState type="notifications" className="min-h-[60vh]" action={
            <Button onClick={() => navigate("/")} className="rounded-2xl bg-gradient-primary">{t('common.browseProducts')}</Button>
          } />
        ) : (
          <div className="divide-y divide-border/30">
            {Object.entries(groupedNotifications).map(([dateLabel, items]) => (
              <div key={dateLabel}>
                <div className="sticky top-[65px] z-30 bg-muted/80 backdrop-blur-sm px-4 py-2">
                  <span className="text-sm font-medium text-muted-foreground">{dateLabel}</span>
                </div>
                <div className="divide-y divide-border/20">
                  {items.map((notification, index) => (
                    <button key={notification.id} onClick={() => handleNotificationClick(notification)} className={cn(
                      "w-full text-start p-4 flex gap-3 transition-colors press-effect hover:bg-secondary/50 animate-slide-up",
                      !notification.isRead && "bg-primary/5"
                    )} style={{ animationDelay: `${index * 50}ms` }}>
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                        notification.type === 'order_update' && "bg-primary/10 text-primary",
                        notification.type === 'promo' && "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
                        notification.type === 'system' && "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                      )}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className={cn("text-sm leading-relaxed", !notification.isRead && "font-bold")}>{notification.title}</h3>
                          {!notification.isRead && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{notification.body}</p>
                        <span className="text-xs text-muted-foreground mt-1 block">{formatTime(notification.createdAt, t)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MerchantLayout>
  );
};

function groupByDate(notifications: Notification[], t: (key: string, params?: Record<string, string | number>) => string): Record<string, Notification[]> {
  const groups: Record<string, Notification[]> = {};
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  for (const notification of notifications) {
    const date = new Date(notification.createdAt);
    let label = date >= today ? t('time.today') : date >= yesterday ? t('time.yesterday') : date >= thisWeek ? t('time.thisWeek') : t('time.earlier');
    if (!groups[label]) groups[label] = [];
    groups[label].push(notification);
  }
  return groups;
}

function formatTime(date: Date, t: (key: string, params?: Record<string, string | number>) => string): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (minutes < 1) return t('time.now');
  if (minutes < 60) return t('time.minutesAgo', { count: minutes });
  if (hours < 24) return t('time.hoursAgo', { count: hours });
  return date.toLocaleDateString('ar-IQ', { day: 'numeric', month: 'short' });
}

export default Notifications;
