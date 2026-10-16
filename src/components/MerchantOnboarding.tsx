import { useState, useCallback, useRef } from 'react';
import { Store, Link, Phone, Camera, User, CheckCircle2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FloatingInput } from '@/components/ui/floating-input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateProfile } from '@/hooks/useUpdateProfile';
import { useUploadAvatar } from '@/hooks/useUpdateProfile';
import { Progress } from '@/components/ui/progress';

interface MerchantOnboardingProps {
  onComplete: () => void;
}

export function MerchantOnboarding({ onComplete }: MerchantOnboardingProps) {
  const [step, setStep] = useState(0);
  const { t, isRTL } = useLanguage();
  const { profile, refreshProfile } = useAuth();
  const { updateProfile, isUpdating } = useUpdateProfile();
  const { uploadAvatar, isUploading } = useUploadAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || '');
  const [storeName, setStoreName] = useState(profile?.store_name || '');
  const [storeLink, setStoreLink] = useState(profile?.store_link || '');
  const [phone, setPhone] = useState(profile?.phone || '');

  const totalSteps = 3;
  const PrevIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;

  const handleAvatarSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    // Upload
    await uploadAvatar(file);
  }, [uploadAvatar]);

  const handleFinish = useCallback(async () => {
    const success = await updateProfile({
      full_name: fullName,
      phone: phone || undefined,
      store_name: storeName || undefined,
      store_link: storeLink || undefined,
    });
    if (success) {
      // Set profile_completed flag
      const { supabase } = await import('@/integrations/supabase/client');
      const { user } = await import('@/contexts/AuthContext').then(() => ({ user: profile }));
      if (profile?.id) {
        await supabase.from('profiles').update({ profile_completed: true }).eq('id', profile.id);
      }
      await refreshProfile();
      onComplete();
    }
  }, [fullName, phone, storeName, storeLink, updateProfile, refreshProfile, onComplete, profile]);

  const canProceedStep0 = fullName.trim().length >= 2;
  const canProceedStep1 = true; // All fields optional

  const next = useCallback(() => {
    if (step === totalSteps - 1) {
      handleFinish();
    } else {
      setStep((s) => s + 1);
    }
  }, [step, handleFinish]);

  const prev = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);

  const isLoading = isUpdating || isUploading;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-background">
      {/* Progress */}
      <div className="px-6 pt-6 pb-2">
        <Progress value={((step + 1) / totalSteps) * 100} className="h-2" />
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {step + 1} / {totalSteps}
        </p>
      </div>

      {/* Step Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 animate-fade-in" key={step}>
        {step === 0 && (
          <div className="w-full max-w-sm space-y-6 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto shadow-lg">
              <User className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">{t('merchantOnboarding.welcomeTitle')}</h2>
            <p className="text-muted-foreground">{t('merchantOnboarding.welcomeDesc')}</p>

            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div
                className="relative cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <Avatar className="w-24 h-24 border-4 border-primary/20">
                  {avatarPreview ? (
                    <AvatarImage src={avatarPreview} alt="Avatar" />
                  ) : (
                    <AvatarFallback className="bg-secondary text-muted-foreground">
                      <Camera className="w-8 h-8" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="absolute bottom-0 end-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <Camera className="w-4 h-4 text-primary-foreground" />
                </div>
                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-full">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarSelect}
              />
              <p className="text-xs text-muted-foreground">{t('profile.avatarHint')}</p>
            </div>

            {/* Full Name */}
            <FloatingInput
              label={t('profile.name')}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              icon={<User className="w-4 h-4" />}
            />
          </div>
        )}

        {step === 1 && (
          <div className="w-full max-w-sm space-y-6 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto shadow-lg">
              <Store className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">{t('merchantOnboarding.storeTitle')}</h2>
            <p className="text-muted-foreground">{t('merchantOnboarding.storeDesc')}</p>

            <div className="space-y-4 text-start">
              <FloatingInput
                label={t('profile.storeName')}
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                icon={<Store className="w-4 h-4" />}
              />
              <FloatingInput
                label={t('profile.storeLink')}
                value={storeLink}
                onChange={(e) => setStoreLink(e.target.value)}
                placeholder={t('profile.storeLinkPlaceholder')}
                icon={<Link className="w-4 h-4" />}
              />
              <FloatingInput
                label={t('profile.phone')}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                icon={<Phone className="w-4 h-4" />}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="w-full max-w-sm space-y-6 text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto shadow-lg animate-bounce-in">
              <CheckCircle2 className="w-12 h-12 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">{t('merchantOnboarding.doneTitle')}</h2>
            <p className="text-muted-foreground">{t('merchantOnboarding.doneDesc')}</p>

            {/* Summary */}
            <div className="bg-secondary/50 rounded-2xl p-4 space-y-3 text-start">
              {avatarPreview && (
                <div className="flex justify-center">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={avatarPreview} alt="Avatar" />
                  </Avatar>
                </div>
              )}
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">{t('profile.name')}:</span> {fullName}</p>
                {storeName && <p><span className="text-muted-foreground">{t('profile.storeName')}:</span> {storeName}</p>}
                {storeLink && <p><span className="text-muted-foreground">{t('profile.storeLink')}:</span> {storeLink}</p>}
                {phone && <p><span className="text-muted-foreground">{t('profile.phone')}:</span> {phone}</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="px-6 pb-8 space-y-3">
        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="outline" onClick={prev} className="flex-1 h-12 rounded-xl" disabled={isLoading}>
              <PrevIcon className="w-4 h-4 me-1" />
              {t('common.previous')}
            </Button>
          )}
          <Button
            onClick={next}
            className="flex-1 h-12 rounded-xl text-base font-medium"
            disabled={(step === 0 && !canProceedStep0) || isLoading}
          >
            {isLoading && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
            {step === totalSteps - 1 ? t('merchantOnboarding.finish') : t('common.next')}
            {step < totalSteps - 1 && <NextIcon className="w-4 h-4 ms-1" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
