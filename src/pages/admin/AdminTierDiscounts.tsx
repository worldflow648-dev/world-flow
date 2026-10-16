import { useState, useEffect } from "react";
import { Crown, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useTierDiscounts, useUpdateTierDiscount, TierDiscount } from "@/hooks/useTierDiscounts";
import { useLanguage } from "@/contexts/LanguageContext";

function TierCard({ tier, onSave, isSaving }: { tier: TierDiscount; onSave: (params: any) => void; isSaving: boolean }) {
  const { t } = useLanguage();
  const [discountType, setDiscountType] = useState(tier.discount_type);
  const [discountValue, setDiscountValue] = useState(tier.discount_value.toString());
  const [isActive, setIsActive] = useState(tier.is_active);

  useEffect(() => {
    setDiscountType(tier.discount_type);
    setDiscountValue(tier.discount_value.toString());
    setIsActive(tier.is_active);
  }, [tier]);

  const handleSave = () => {
    onSave({
      id: tier.id,
      discount_type: discountType,
      discount_value: parseFloat(discountValue) || 0,
      is_active: isActive,
    });
  };

  const tierLabel = tier.tier === 'professional'
    ? t('admin.tierDiscounts3.tierProfessional')
    : t('admin.tierDiscounts3.tierBasic');

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Crown className={`w-5 h-5 ${tier.tier === 'professional' ? 'text-amber-500' : 'text-muted-foreground'}`} />
            {tierLabel}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor={`active-${tier.id}`} className="text-sm text-muted-foreground">{t('admin.tierDiscounts3.enabled')}</Label>
            <Switch id={`active-${tier.id}`} checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-sm">{t('admin.tierDiscounts3.discountType')}</Label>
            <Select value={discountType} onValueChange={setDiscountType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">{t('admin.tierDiscounts3.percentage')}</SelectItem>
                <SelectItem value="fixed">{t('admin.tierDiscounts3.fixed')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">{t('admin.tierDiscounts3.discountValue')}</Label>
            <Input
              type="number"
              min="0"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={discountType === 'percentage' ? '10' : '5000'}
            />
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
          {t('admin.tierDiscounts3.saveChanges')}
        </Button>
      </CardContent>
    </Card>
  );
}

const AdminTierDiscounts = () => {
  const { t, dir } = useLanguage();
  const { data: tiers, isLoading } = useTierDiscounts();
  const updateTier = useUpdateTierDiscount();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" dir={dir}>
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir={dir}>
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Crown className="w-6 h-6 text-amber-500" />
          {t('admin.tierDiscounts3.title')}
        </h1>
        <p className="text-muted-foreground mt-1">{t('admin.tierDiscounts3.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tiers?.map((tier) => (
          <TierCard
            key={tier.id}
            tier={tier}
            onSave={(params) => updateTier.mutate(params)}
            isSaving={updateTier.isPending}
          />
        ))}
      </div>
    </div>
  );
};

export default AdminTierDiscounts;
