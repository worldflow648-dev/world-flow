import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingBag, Package, FolderTree, Users, UserCog, Menu, X,
  Shield, Gift, Tag, Crown, Calculator, Receipt, Headphones, Megaphone, MapPin,
  RotateCcw, FileText, LogOut, Settings, User, BarChart3, AlertTriangle, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAdminIssues, OPEN_STATUSES } from '@/hooks/useAdminIssues';

const AdminSidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();
  const { t, isRTL } = useLanguage();
  const { data: issues } = useAdminIssues();
  const issueCount = (issues || []).filter(i => OPEN_STATUSES.includes(i.status)).length;

  const navItems = [
    { icon: LayoutDashboard, label: t('admin.sidebar.dashboard'), path: '/admin' },
    { icon: ShoppingBag, label: t('admin.sidebar.orders'), path: '/admin/orders' },
    { icon: RotateCcw, label: t('admin.sidebar.returns'), path: '/admin/returns' },
    { icon: AlertTriangle, label: t('admin.sidebar.issues'), path: '/admin/issues', badge: issueCount },
    { icon: Package, label: t('admin.sidebar.inventory'), path: '/admin/inventory' },
    { icon: FolderTree, label: t('admin.sidebar.categories'), path: '/admin/categories' },
    { icon: Gift, label: t('admin.sidebar.addons'), path: '/admin/addons' },
    { icon: Tag, label: t('admin.sidebar.discounts'), path: '/admin/discounts' },
    { icon: Crown, label: t('admin.sidebar.tierDiscounts'), path: '/admin/tier-discounts' },
    { icon: Megaphone, label: t('admin.sidebar.banners'), path: '/admin/banners' },
    { icon: Users, label: t('admin.sidebar.merchants'), path: '/admin/merchants' },
    { icon: UserCog, label: t('admin.sidebar.staff'), path: '/admin/staff' },
    { icon: Clock, label: t('admin.sidebar.attendance') || 'الحضور', path: '/admin/attendance' },
    { icon: Shield, label: t('admin.sidebar.activationKeys'), path: '/admin/activation-keys' },
    { icon: Calculator, label: t('admin.sidebar.accounting'), path: '/admin/accounting' },
    { icon: Receipt, label: t('admin.sidebar.expenses'), path: '/admin/expenses' },
    { icon: MapPin, label: t('admin.sidebar.governorates'), path: '/admin/governorates' },
    { icon: Headphones, label: t('admin.sidebar.support'), path: '/admin/support' },
    { icon: FileText, label: t('admin.sidebar.content'), path: '/admin/content' },
    { icon: BarChart3, label: t('admin.sidebar.graphs'), path: '/admin/graphs' },
  ];

  const handleSignOut = async () => { await signOut(); navigate('/auth'); };
  const toggleSidebar = () => setIsOpen(!isOpen);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center"><Shield className="w-6 h-6 text-primary-foreground" /></div>
          <div><h1 className="font-bold text-foreground">{t('admin.sidebar.title')}</h1><p className="text-xs text-muted-foreground">{t('admin.sidebar.title')}</p></div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
          return (
            <NavLink key={item.path} to={item.path} onClick={() => isMobile && setIsOpen(false)}
              className={cn('flex items-center gap-3 px-4 py-3 rounded-xl transition-all', isActive ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground')}>
              <div className="relative">
                <item.icon className="w-5 h-5" />
                {'badge' in item && (item.badge as number) > 0 && (
                  <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                    {(item.badge as number) > 9 ? '9+' : (item.badge as number)}
                  </span>
                )}
              </div>
              <span className="font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 px-4 py-3 w-full rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
              <Avatar className="w-10 h-10"><AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name} /><AvatarFallback className="bg-primary text-primary-foreground">{profile?.full_name?.charAt(0) || 'A'}</AvatarFallback></Avatar>
              <div className={cn("flex-1", isRTL ? "text-right" : "text-left")}><p className="font-medium text-foreground text-sm">{profile?.full_name || t('profile.admin')}</p><p className="text-xs text-muted-foreground truncate">{user?.email || ''}</p></div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel><p className="font-medium">{profile?.full_name}</p><p className="text-xs text-muted-foreground font-normal">{user?.email}</p></DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer gap-2 flex-row-reverse"><User className="w-4 h-4" /><span>{t('nav.profile')}</span></DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer gap-2 flex-row-reverse"><Settings className="w-4 h-4" /><span>{t('nav.settings')}</span></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer gap-2 flex-row-reverse text-destructive focus:text-destructive"><LogOut className="w-4 h-4" /><span>{t('auth.signOut')}</span></DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="mt-3 px-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t('settings.darkMode')}</span>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {isMobile && <Button variant="outline" size="icon" className={cn("fixed top-4 z-50 bg-card shadow-md", isRTL ? "right-4" : "left-4")} onClick={toggleSidebar}>{isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</Button>}
      {isMobile && isOpen && <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsOpen(false)} />}
      <aside className={cn(
        'bg-card h-screen flex-shrink-0 transition-all duration-300 z-40',
        isRTL ? 'border-l border-border' : 'border-r border-border',
        isMobile
          ? cn('fixed top-0 w-72 shadow-xl', isRTL ? 'right-0' : 'left-0', isOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full'))
          : cn('fixed top-0 w-64', isRTL ? 'right-0' : 'left-0')
      )}>
        <SidebarContent />
      </aside>
    </>
  );
};

export default AdminSidebar;
