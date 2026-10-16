import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, Store, Calendar, Wallet, LogOut, Loader2, Shield, Briefcase, ChevronLeft, ChevronRight, Settings, HelpCircle, CreditCard, Pencil, Link2, Clock } from 'lucide-react';
import { format, isBefore, addDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { enUS } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { EditProfileModal } from '@/components/profile/EditProfileModal';
import { MerchantLayout } from '@/components/MerchantLayout';
import { useUserActivationKey } from '@/hooks/useActivationKeys';

const Profile = () => {
  const { user, profile, role, signOut, isLoading } = useAuth();
  const { t, language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { data: activationKey } = useUserActivationKey(user?.id);

  const BackArrow = isRTL ? ChevronLeft : ChevronRight;

  useEffect(() => {
    const fetchWallet = async () => {
      if (user) {
        const { data } = await supabase.from('wallets').select('balance').eq('merchant_id', user.id).single();
        if (data) setWalletBalance(data.balance);
      }
    };
    fetchWallet();
  }, [user, role]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
    navigate('/auth', { replace: true });
  };

  const keyExpiryInfo = useMemo(() => {
    if (!activationKey?.expires_at) return null;
    const expiresAt = new Date(activationKey.expires_at);
    const now = new Date();
    const isExpired = isBefore(expiresAt, now);
    const isExpiringSoon = !isExpired && isBefore(expiresAt, addDays(now, 7));
    return { expiresAt, isExpired, isExpiringSoon };
  }, [activationKey]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-gradient-primary/10 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const roleLabels: Record<string, { label: string; gradient: string; icon: React.ReactNode }> = {
    admin: { label: t('profile.admin'), gradient: 'from-red-500 to-rose-600', icon: <Shield className="h-3 w-3" /> },
    merchant: { label: t('profile.merchant'), gradient: 'from-indigo-500 to-purple-600', icon: <Store className="h-3 w-3" /> },
    staff: { label: t('profile.staff'), gradient: 'from-purple-500 to-violet-600', icon: <Briefcase className="h-3 w-3" /> },
    guest: { label: t('profile.guest'), gradient: 'from-gray-500 to-slate-600', icon: <User className="h-3 w-3" /> },
  };

  const roleInfo = role ? roleLabels[role] : roleLabels.guest;
  const dateLocale = language === 'en' ? enUS : ar;
  const memberSince = user?.created_at ? format(new Date(user.created_at), 'MMMM yyyy', { locale: dateLocale }) : '';
  const profileAny = profile as any;

  return (
    <MerchantLayout hideHeader>
      <div className="pb-24 md:pb-8">
        <header className="sticky top-0 z-40 glass-strong border-b border-border/30">
          <div className="flex items-center gap-2 py-4 px-4">
            <User className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">{t('profile.title')}</h1>
          </div>
        </header>

        <div className="p-4 space-y-4">
          {/* Profile Card */}
          <Card className="shadow-card border-0 overflow-hidden animate-slide-up">
            <div className={cn("h-20 bg-gradient-to-l", roleInfo.gradient)} />
            <CardContent className="relative pt-0 pb-6 -mt-10">
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <Avatar className="w-20 h-20 border-4 border-card shadow-elevated">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-primary text-white text-xl font-bold">
                      {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <button onClick={() => setIsEditModalOpen(true)} className="absolute -bottom-1 -left-1 w-8 h-8 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors press-effect">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h2 className="text-xl font-bold mt-3 mb-1">{profile?.full_name || t('profile.user')}</h2>
                {profileAny?.store_name && (
                  <p className="text-sm text-muted-foreground mb-1">{profileAny.store_name}</p>
                )}
                <p className="text-muted-foreground text-sm mb-3">{user?.email}</p>
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <Badge className={cn("gap-1 text-white border-0", `bg-gradient-to-l ${roleInfo.gradient}`)}>
                    {roleInfo.icon}{roleInfo.label}
                  </Badge>
                  {profile?.merchant_tier && (
                    <Badge variant="outline" className="text-xs">
                      {profile.merchant_tier === 'professional' ? `${t('cart.tierProfessional')} ⭐` : t('cart.tierBasic')}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Wallet */}
          {walletBalance !== null && (
            <Card className="shadow-card border-0 bg-gradient-success text-white overflow-hidden animate-slide-up" style={{ animationDelay: '75ms' }}>
              <CardContent className="pt-6 pb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                      <Wallet className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-sm text-white/80 mb-1">{t('profile.walletBalance')}</p>
                      <p className="text-2xl font-bold">
                        {walletBalance !== null ? `${walletBalance.toLocaleString(language === 'en' ? 'en-US' : 'ar-IQ')} ${t('common.currency')}` : '---'}
                      </p>
                    </div>
                  </div>
                  <CreditCard className="h-6 w-6 text-white/60" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info rows */}
          <Card className="shadow-card border-0 animate-slide-up" style={{ animationDelay: '150ms' }}>
            <CardContent className="pt-6 space-y-1 divide-y divide-border/50">
              {profile?.phone && (
                <InfoRow icon={<Phone className="h-5 w-5 text-primary" />} label={t('profile.phoneNumber')} value={profile.phone} dir="ltr" />
              )}
              {profileAny?.store_link && (
                <div className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Link2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('profile.storeLink')}</p>
                      <a href={profileAny.store_link} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline text-sm truncate block max-w-[200px]" dir="ltr">
                        {profileAny.store_link.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  </div>
                </div>
              )}
              
              {memberSince && (
                <InfoRow icon={<Calendar className="h-5 w-5 text-primary" />} label={t('profile.memberSince')} value={memberSince} />
              )}
              {keyExpiryInfo && (
                <div className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", keyExpiryInfo.isExpired ? 'bg-destructive/10' : keyExpiryInfo.isExpiringSoon ? 'bg-amber-500/10' : 'bg-primary/10')}>
                      <Clock className={cn("h-5 w-5", keyExpiryInfo.isExpired ? 'text-destructive' : keyExpiryInfo.isExpiringSoon ? 'text-amber-500' : 'text-primary')} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('profile.keyExpiry')}</p>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{format(keyExpiryInfo.expiresAt, 'dd/MM/yyyy', { locale: dateLocale })}</p>
                        {keyExpiryInfo.isExpired && <Badge variant="destructive" className="text-xs">{t('profile.keyExpired')}</Badge>}
                        {keyExpiryInfo.isExpiringSoon && <Badge className="text-xs bg-amber-500 hover:bg-amber-600 border-0">{t('profile.keyExpiringSoon')}</Badge>}
                        {!keyExpiryInfo.isExpired && !keyExpiryInfo.isExpiringSoon && <Badge className="text-xs bg-emerald-500 hover:bg-emerald-600 border-0">{t('profile.keyActive')}</Badge>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <Card className="shadow-card border-0 animate-slide-up" style={{ animationDelay: '225ms' }}>
            <CardContent className="pt-4 pb-2">
              <button onClick={() => navigate('/settings')} className="w-full flex items-center justify-between py-4 hover:bg-secondary/50 rounded-xl px-2 transition-colors press-effect">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Settings className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <span className="font-medium">{t('nav.settings')}</span>
                </div>
                <BackArrow className="h-5 w-5 text-muted-foreground" />
              </button>
              <button onClick={() => navigate('/help')} className="w-full flex items-center justify-between py-4 hover:bg-secondary/50 rounded-xl px-2 transition-colors press-effect">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <HelpCircle className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <span className="font-medium">{t('profile.helpSupport')}</span>
                </div>
                <BackArrow className="h-5 w-5 text-muted-foreground" />
              </button>
            </CardContent>
          </Card>

          <Button
            variant="outline"
            className="w-full h-12 rounded-2xl border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all press-effect animate-slide-up"
            style={{ animationDelay: '300ms' }}
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? (
              <><Loader2 className="me-2 h-4 w-4 animate-spin" />{t('auth.signingOut')}</>
            ) : (
              <><LogOut className="me-2 h-4 w-4" />{t('auth.signOut')}</>
            )}
          </Button>
        </div>
      </div>

      <EditProfileModal open={isEditModalOpen} onOpenChange={setIsEditModalOpen} />
    </MerchantLayout>
  );
};

function InfoRow({ icon, label, value, dir }: { icon: React.ReactNode; label: string; value: string; dir?: string }) {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-medium" dir={dir}>{value}</p>
        </div>
      </div>
    </div>
  );
}

export default Profile;
