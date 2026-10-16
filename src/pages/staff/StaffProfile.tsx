import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, LogOut, Moon, Sun, User, Mail, Briefcase, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/contexts/LanguageContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const StaffProfile = () => {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { t, isRTL } = useLanguage();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  const handleSignOut = async () => { setIsSigningOut(true); await signOut(); navigate('/auth', { replace: true }); };
  const getInitials = (name?: string | null) => { if (!name) return 'S'; return name.charAt(0).toUpperCase(); };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/staff')} className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all">
            <BackArrow className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">{t('staff.profile')}</h1>
        </div>
      </header>

      <div className="p-4 space-y-6">
        <Card className="overflow-hidden">
          <div className="h-20 bg-gradient-to-l from-primary/20 to-primary/5" />
          <CardContent className="pt-0 -mt-10">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">{getInitials(profile?.full_name)}</AvatarFallback>
              </Avatar>
              <h2 className="mt-3 text-xl font-bold">{profile?.full_name || t('profile.staff')}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Badge variant="secondary" className="mt-3"><Briefcase className="h-3 w-3 ml-1" />{t('profile.staff')}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground">{t('profile.title')}</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center"><User className="h-5 w-5 text-muted-foreground" /></div>
                <div className="flex-1 min-w-0"><p className="text-xs text-muted-foreground">{t('orders.name')}</p><p className="font-medium truncate">{profile?.full_name || '-'}</p></div>
              </div>
              <Separator />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center"><Mail className="h-5 w-5 text-muted-foreground" /></div>
                <div className="flex-1 min-w-0"><p className="text-xs text-muted-foreground">{t('auth.email')}</p><p className="font-medium truncate" dir="ltr">{user?.email}</p></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground">{t('settings.title')}</h3>
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/80 transition-colors">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", theme === 'dark' ? 'bg-primary/10' : 'bg-secondary')}>
                {theme === 'dark' ? <Sun className="h-5 w-5 text-primary" /> : <Moon className="h-5 w-5 text-muted-foreground" />}
              </div>
              <div className="flex-1 text-right"><p className="font-medium">{t('settings.darkMode')}</p><p className="text-xs text-muted-foreground">{t('settings.darkModeDesc')}</p></div>
            </button>
          </CardContent>
        </Card>

        <Button variant="destructive" className="w-full h-12" onClick={handleSignOut} disabled={isSigningOut}>
          {isSigningOut ? (<><Loader2 className="ml-2 h-4 w-4 animate-spin" />{t('auth.signingOut')}</>) : (<><LogOut className="ml-2 h-4 w-4" />{t('auth.signOut')}</>)}
        </Button>
      </div>
    </div>
  );
};

export default StaffProfile;
