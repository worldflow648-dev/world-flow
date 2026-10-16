import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Shield, Store, Wrench } from 'lucide-react';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

const RoleSwitcher = () => {
  const { role } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  if (!role || role === 'merchant' || role === 'staff') return null;
  if (location.pathname === '/auth') return null;

  const isInAdminSection = location.pathname.startsWith('/admin');
  const isInStaffSection = location.pathname.startsWith('/staff');

  if (role !== 'admin') return null;

  // In admin section: show two FABs (merchant + staff)
  if (isInAdminSection) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => navigate('/staff')}
              aria-label={t('roleSwitcher.staffView')}
              className="fixed bottom-40 left-5 z-50 w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.5)] flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-[0_6px_25px_-4px_rgba(245,158,11,0.6)] active:scale-95 animate-bounce-in"
            >
              <Wrench className="w-5 h-5 text-white" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {t('roleSwitcher.staffView')}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => navigate('/')}
              aria-label={t('roleSwitcher.merchantView')}
              className="fixed bottom-24 left-5 z-50 w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.5)] flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-[0_6px_25px_-4px_hsl(var(--primary)/0.6)] active:scale-95 animate-bounce-in"
            >
              <Store className="w-5 h-5 text-primary-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {t('roleSwitcher.merchantView')}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // In staff section: show single FAB back to admin
  if (isInStaffSection) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => navigate('/admin')}
              aria-label={t('roleSwitcher.adminPanel')}
              className="fixed bottom-24 left-5 z-50 w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.5)] flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-[0_6px_25px_-4px_hsl(var(--primary)/0.6)] active:scale-95 animate-bounce-in"
            >
              <Shield className="w-5 h-5 text-primary-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {t('roleSwitcher.adminPanel')}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // In merchant section: show single FAB to admin
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => navigate('/admin')}
            aria-label={t('roleSwitcher.adminPanel')}
            className="fixed bottom-24 left-5 z-50 w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.5)] flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-[0_6px_25px_-4px_hsl(var(--primary)/0.6)] active:scale-95 animate-bounce-in"
          >
            <Shield className="w-5 h-5 text-primary-foreground" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {t('roleSwitcher.adminPanel')}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default RoleSwitcher;
