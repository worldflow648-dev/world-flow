import { useState } from "react";
import { AlertCircle, MapPin, Phone, User, Loader2, StickyNote } from "lucide-react";
import { FloatingInput } from "@/components/ui/floating-input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGovernorates } from "@/hooks/useCatalogData";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export interface CustomerData {
  name: string;
  governorate: string;
  region: string;
  landmark: string;
  phone1: string;
  phone2: string;
  notes: string;
}

interface CustomerFormProps {
  data: CustomerData;
  onChange: (data: CustomerData) => void;
  onNext: () => void;
  onBack: () => void;
}

export function CustomerForm({ data, onChange, onNext, onBack }: CustomerFormProps) {
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerData, string>>>({});
  const { data: governorates, isLoading: governoratesLoading } = useGovernorates();
  const { t } = useLanguage();

  const updateField = (field: keyof CustomerData, value: string) => {
    onChange({ ...data, [field]: value });
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const formatPhoneDisplay = (raw: string) => {
    if (raw.length <= 4) return raw;
    if (raw.length <= 7) return `${raw.slice(0, 4)} ${raw.slice(4)}`;
    return `${raw.slice(0, 4)} ${raw.slice(4, 7)} ${raw.slice(7)}`;
  };

  const handlePhoneChange = (field: "phone1" | "phone2", value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    updateField(field, digits);
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CustomerData, string>> = {};
    if (!data.name.trim()) newErrors.name = t('checkout.nameRequired');
    if (!data.governorate) newErrors.governorate = t('checkout.governorateRequired');
    if (!data.region.trim()) newErrors.region = t('checkout.regionRequired');
    if (!data.landmark.trim()) newErrors.landmark = t('checkout.landmarkRequired');
    if (!data.phone1.trim() || !/^07\d{9}$/.test(data.phone1)) newErrors.phone1 = t('checkout.phoneInvalid');
    if (data.phone2 && !/^07\d{9}$/.test(data.phone2)) newErrors.phone2 = t('checkout.phoneInvalid');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => { if (validate()) onNext(); };

  return (
    <div className="p-4 space-y-5">
      <h2 className="text-lg font-bold text-center mb-6">{t('checkout.customerDetails')}</h2>

      <FloatingInput label={t('checkout.customerName')} value={data.name} onChange={(e) => updateField("name", e.target.value)} error={errors.name} success={!!data.name.trim() && !errors.name} icon={<User className="h-4 w-4" />} />

      <div className="space-y-2">
        <Label htmlFor="governorate" className="flex items-center gap-2 text-sm font-medium">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          {t('checkout.governorate')}
        </Label>
        <Select value={data.governorate} onValueChange={(value) => updateField("governorate", value)} disabled={governoratesLoading}>
          <SelectTrigger className={cn("h-14 rounded-xl bg-secondary/50 border-2 border-transparent focus:border-primary focus:bg-card transition-all", errors.governorate && "border-destructive")}>
            {governoratesLoading ? (
              <div className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-muted-foreground">{t('checkout.loadingGovernorates')}</span></div>
            ) : (
              <SelectValue placeholder={t('checkout.selectGovernorate')} />
            )}
          </SelectTrigger>
          <SelectContent className="bg-card border shadow-lg z-50">
            {governorates?.map((gov) => <SelectItem key={gov.id} value={gov.id}>{gov.name_ar}</SelectItem>)}
          </SelectContent>
        </Select>
        {errors.governorate && <p className="text-destructive text-xs flex items-center gap-1 animate-slide-up"><AlertCircle className="h-3 w-3" />{errors.governorate}</p>}
      </div>

      <FloatingInput label={t('checkout.region')} value={data.region} onChange={(e) => updateField("region", e.target.value)} placeholder={t('checkout.regionExample')} error={errors.region} success={!!data.region.trim() && !errors.region} icon={<MapPin className="h-4 w-4" />} />

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="landmark" className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            {t('checkout.landmark')}
          </Label>
          <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs px-2 py-0.5 rounded-full font-medium">{t('common.important')}</span>
        </div>
        <FloatingInput label={t('checkout.landmark')} value={data.landmark} onChange={(e) => updateField("landmark", e.target.value)} placeholder={t('checkout.landmarkExample')} error={errors.landmark} success={!!data.landmark.trim() && !errors.landmark} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone1" className="flex items-center gap-2 text-sm font-medium"><Phone className="h-4 w-4 text-muted-foreground" />{t('checkout.phone1')}</Label>
        <div className="flex-1">
          <FloatingInput label={t('checkout.phone1')} type="tel" value={formatPhoneDisplay(data.phone1)} onChange={(e) => handlePhoneChange("phone1", e.target.value)} placeholder="07XX XXX XXXX" error={errors.phone1} success={/^07\d{9}$/.test(data.phone1) && !errors.phone1} dir="ltr" className="text-left" maxLength={13} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone2" className="flex items-center gap-2 text-sm font-medium"><Phone className="h-4 w-4 text-muted-foreground" />{t('checkout.phone2')}<span className="text-muted-foreground text-xs">({t('common.optional')})</span></Label>
        <div className="flex-1">
          <FloatingInput label={t('checkout.phone2')} type="tel" value={formatPhoneDisplay(data.phone2)} onChange={(e) => handlePhoneChange("phone2", e.target.value)} placeholder="07XX XXX XXXX" error={errors.phone2} dir="ltr" className="text-left" maxLength={13} />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium"><StickyNote className="h-4 w-4 text-muted-foreground" />{t('checkout.notes')}<span className="text-muted-foreground text-xs">({t('common.optional')})</span></Label>
        <Textarea value={data.notes} onChange={(e) => updateField("notes", e.target.value)} placeholder={t('checkout.notesPlaceholder')} className="rounded-xl bg-secondary/50 border-2 border-transparent focus:border-primary focus:bg-card transition-all min-h-[80px]" />
      </div>

      <div className="flex gap-3 pt-6">
        <Button variant="outline" onClick={onBack} className="flex-1 h-12 rounded-xl border-2 font-medium">{t('common.previous')}</Button>
        <Button onClick={handleNext} className="flex-1 h-12 rounded-xl bg-gradient-to-l from-primary to-primary/80 font-medium shadow-float press-effect">{t('common.next')}</Button>
      </div>
    </div>
  );
}
