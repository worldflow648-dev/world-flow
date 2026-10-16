import { Outlet, Link, useLocation } from 'react-router-dom';
import { Printer, ListChecks, Gift, Clock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const StaffLayout = () => {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  const getInitials = (name?: string | null) => {
    if (!name) return 'S';
    return name.charAt(0).toUpperCase();
  };

  const isActive = (path: string) => {
    if (path === '/staff' && location.pathname === '/staff') return true;
    if (path === '/staff/additions' && location.pathname === '/staff/additions') return true;
    if (path === '/staff/attendance' && location.pathname === '/staff/attendance') return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-card border-b border-border text-foreground sticky top-0 z-50">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Printer className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg">{t('staff.jobQueue')}</h1>
              <p className="text-xs text-muted-foreground">{t('staff.profile')}</p>
            </div>
          </div>
          <Link to="/staff/profile" className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-secondary/80 transition-colors">
            <Avatar className="h-9 w-9 border-2 border-primary/20">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">{getInitials(profile?.full_name)}</AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </header>

      <main><Outlet /></main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-bottom" dir="rtl">
        <div className="flex items-center justify-around py-2">
          <Link
            to="/staff"
            className={cn(
              'flex flex-col items-center gap-1 px-4 py-1.5 rounded-lg transition-colors',
              isActive('/staff') ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <ListChecks className="w-5 h-5" />
            <span className="text-xs font-medium">{t('staff.jobQueue') || 'طابور العمل'}</span>
          </Link>
          <Link
            to="/staff/additions"
            className={cn(
              'flex flex-col items-center gap-1 px-4 py-1.5 rounded-lg transition-colors',
              isActive('/staff/additions') ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Gift className="w-5 h-5" />
            <span className="text-xs font-medium">{t('staff.additions') || 'الإضافات'}</span>
          </Link>
          <Link
            to="/staff/attendance"
            className={cn(
              'flex flex-col items-center gap-1 px-4 py-1.5 rounded-lg transition-colors',
              isActive('/staff/attendance') ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Clock className="w-5 h-5" />
            <span className="text-xs font-medium">{t('attendance.tab') || 'الحضور'}</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default StaffLayout;
