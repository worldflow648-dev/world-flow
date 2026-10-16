import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Users, TrendingUp, Shield } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const Auth = () => {
  const { isAuthenticated, role, isLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (role === 'admin') navigate('/admin', { replace: true });
      else if (role === 'staff') navigate('/staff', { replace: true });
      else navigate('/', { replace: true });
    }
  }, [isAuthenticated, role, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background gradient-mesh">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const features = [
    { icon: TrendingUp, label: t('auth.trackProfits') },
    { icon: Users, label: t('auth.manageCustomers') },
    { icon: Shield, label: t('auth.securePayment') },
  ];

  return (
    <div className="min-h-screen bg-background gradient-mesh flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl animate-float" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />
      </div>

      <Card className="w-full max-w-md shadow-elevated border-border/50 bg-card/95 backdrop-blur-sm animate-scale-in relative z-10">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto relative">
            <div className="absolute inset-0 w-20 h-20 bg-primary/30 rounded-2xl blur-xl animate-pulse-subtle" />
            <div className="relative w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-glow animate-bounce-in">
              <Store className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold text-gradient-primary">{t('auth.appTitle')}</CardTitle>
            <CardDescription className="text-base">{t('auth.appDescription')}</CardDescription>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/80 text-xs font-medium text-muted-foreground animate-slide-up")} style={{ animationDelay: `${0.2 + index * 0.1}s` }}>
                  <Icon className="w-3.5 h-3.5 text-primary" />
                  {feature.label}
                </div>
              );
            })}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 h-12 p-1 bg-secondary/50 rounded-xl">
              <TabsTrigger value="login" className="rounded-lg h-10 data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all font-medium">{t('auth.login')}</TabsTrigger>
              <TabsTrigger value="register" className="rounded-lg h-10 data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all font-medium">{t('auth.register')}</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="animate-fade-in"><LoginForm /></TabsContent>
            <TabsContent value="register" className="animate-fade-in"><RegisterForm /></TabsContent>
          </Tabs>
          <p className="text-center text-xs text-muted-foreground mt-6 flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            {t('auth.dataProtected')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
