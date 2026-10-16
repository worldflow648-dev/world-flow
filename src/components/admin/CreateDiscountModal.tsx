 import { useState } from 'react';
 import { Store, Package, Shuffle, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
 } from '@/components/ui/dialog';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
 import { Calendar as CalendarComponent } from '@/components/ui/calendar';
 import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
 import { cn } from '@/lib/utils';
 import { format } from 'date-fns';
 import { ar } from 'date-fns/locale';
 import ProductSelector from './ProductSelector';
 import { CreateDiscountCodeData, generateRandomCode } from '@/hooks/useDiscountCodes';
 
 interface CreateDiscountModalProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onSubmit: (data: CreateDiscountCodeData) => Promise<void>;
   isLoading?: boolean;
 }
 
 type Step = 'scope' | 'product' | 'details';
 
 const CreateDiscountModal = ({ open, onOpenChange, onSubmit, isLoading }: CreateDiscountModalProps) => {
  const [step, setStep] = useState<Step>('scope');
  const [scope, setScope] = useState<'store' | 'product'>('store');
  const [productIds, setProductIds] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [minOrderValue, setMinOrderValue] = useState('');
  const [expiresAt, setExpiresAt] = useState<Date | undefined>();

  const resetForm = () => {
    setStep('scope');
    setScope('store');
    setProductIds([]);
    setCode('');
    setDiscountType('percentage');
    setDiscountValue('');
    setMaxUses('');
    setMinOrderValue('');
    setExpiresAt(undefined);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleNext = () => {
    if (step === 'scope') {
      if (scope === 'product') {
        setStep('product');
      } else {
        setStep('details');
      }
    } else if (step === 'product') {
      setStep('details');
    }
  };

  const handleBack = () => {
    if (step === 'details') {
      if (scope === 'product') {
        setStep('product');
      } else {
        setStep('scope');
      }
    } else if (step === 'product') {
      setStep('scope');
    }
  };

  const handleSubmit = async () => {
    const data: CreateDiscountCodeData = {
      code: code.toUpperCase(),
      discount_type: discountType,
      discount_value: parseFloat(discountValue),
      scope,
      product_ids: scope === 'product' ? productIds : undefined,
      max_uses: maxUses ? parseInt(maxUses) : null,
      min_order_value: minOrderValue ? parseFloat(minOrderValue) : null,
      expires_at: expiresAt ? expiresAt.toISOString() : null,
    };

    await onSubmit(data);
    handleClose();
  };

  const canProceedFromScope = scope !== null;
  const canProceedFromProduct = productIds.length > 0;
  const canSubmit = code.trim() && discountValue && parseFloat(discountValue) > 0;
 
   return (
     <Dialog open={open} onOpenChange={handleClose}>
       <DialogContent className="sm:max-w-md">
         <DialogHeader>
           <DialogTitle>
             {step === 'scope' && 'إنشاء كود خصم جديد'}
             {step === 'product' && 'اختر المنتج'}
             {step === 'details' && 'تفاصيل الخصم'}
           </DialogTitle>
         </DialogHeader>
 
         <div className="py-4">
           {/* Step 1: Choose Scope */}
           {step === 'scope' && (
             <div className="space-y-4">
               <Label>نطاق الخصم</Label>
               <div className="grid grid-cols-2 gap-4">
                 <button
                   type="button"
                   onClick={() => setScope('store')}
                   className={cn(
                     'p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3',
                     scope === 'store'
                       ? 'border-primary bg-primary/10'
                       : 'border-border hover:border-primary/50'
                   )}
                 >
                   <Store className="w-8 h-8 text-primary" />
                   <span className="font-medium">كل المتجر</span>
                 </button>
                 <button
                   type="button"
                   onClick={() => setScope('product')}
                   className={cn(
                     'p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3',
                     scope === 'product'
                       ? 'border-primary bg-primary/10'
                       : 'border-border hover:border-primary/50'
                   )}
                 >
                   <Package className="w-8 h-8 text-primary" />
                   <span className="font-medium">منتج محدد</span>
                 </button>
               </div>
             </div>
           )}
 
            {/* Step 2: Select Product(s) */}
            {step === 'product' && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">يمكنك اختيار أكثر من منتج</p>
                <ProductSelector
                  multiple
                  selectedProductIds={productIds}
                  onChange={setProductIds}
                />
              </div>
            )}
 
           {/* Step 3: Discount Details */}
           {step === 'details' && (
             <div className="space-y-4">
               {/* Code */}
               <div className="space-y-2">
                 <Label>كود الخصم</Label>
                 <div className="flex gap-2">
                   <Input
                     value={code}
                     onChange={(e) => setCode(e.target.value.toUpperCase())}
                     placeholder="مثال: SAVE20"
                     className="font-mono uppercase"
                   />
                   <Button
                     type="button"
                     variant="outline"
                     size="icon"
                     onClick={() => setCode(generateRandomCode())}
                     title="توليد كود عشوائي"
                   >
                     <Shuffle className="w-4 h-4" />
                   </Button>
                 </div>
               </div>
 
               {/* Discount Type */}
               <div className="space-y-2">
                 <Label>نوع الخصم</Label>
                 <RadioGroup
                   value={discountType}
                   onValueChange={(v) => setDiscountType(v as 'percentage' | 'fixed')}
                   className="flex gap-4"
                 >
                   <div className="flex items-center gap-2">
                     <RadioGroupItem value="percentage" id="percentage" />
                     <Label htmlFor="percentage" className="font-normal cursor-pointer">
                       نسبة مئوية (%)
                     </Label>
                   </div>
                   <div className="flex items-center gap-2">
                     <RadioGroupItem value="fixed" id="fixed" />
                     <Label htmlFor="fixed" className="font-normal cursor-pointer">
                       مبلغ ثابت (د.ع)
                     </Label>
                   </div>
                 </RadioGroup>
               </div>
 
               {/* Discount Value */}
               <div className="space-y-2">
                 <Label>قيمة الخصم</Label>
                 <Input
                   type="number"
                   value={discountValue}
                   onChange={(e) => setDiscountValue(e.target.value)}
                   placeholder={discountType === 'percentage' ? '20' : '5000'}
                   min="0"
                   max={discountType === 'percentage' ? '100' : undefined}
                 />
               </div>
 
               {/* Advanced Options */}
               <div className="pt-2 border-t border-border space-y-4">
                 <p className="text-sm text-muted-foreground">خيارات متقدمة (اختياري)</p>
 
                 {/* Max Uses */}
                 <div className="space-y-2">
                   <Label>الحد الأقصى للاستخدام</Label>
                   <Input
                     type="number"
                     value={maxUses}
                     onChange={(e) => setMaxUses(e.target.value)}
                     placeholder="بدون حد"
                     min="1"
                   />
                 </div>
 
                 {/* Min Order Value */}
                 <div className="space-y-2">
                   <Label>الحد الأدنى للطلب (د.ع)</Label>
                   <Input
                     type="number"
                     value={minOrderValue}
                     onChange={(e) => setMinOrderValue(e.target.value)}
                     placeholder="بدون حد أدنى"
                     min="0"
                   />
                 </div>
 
                 {/* Expiration Date */}
                 <div className="space-y-2">
                   <Label>تاريخ الانتهاء</Label>
                   <Popover>
                     <PopoverTrigger asChild>
                       <Button
                         variant="outline"
                         className={cn(
                           'w-full justify-start text-right font-normal',
                           !expiresAt && 'text-muted-foreground'
                         )}
                       >
                         <Calendar className="ml-2 h-4 w-4" />
                         {expiresAt ? format(expiresAt, 'PPP', { locale: ar }) : 'بدون تاريخ انتهاء'}
                       </Button>
                     </PopoverTrigger>
                     <PopoverContent className="w-auto p-0" align="start">
                       <CalendarComponent
                         mode="single"
                         selected={expiresAt}
                         onSelect={setExpiresAt}
                         disabled={(date) => date < new Date()}
                         initialFocus
                       />
                     </PopoverContent>
                   </Popover>
                 </div>
               </div>
             </div>
           )}
         </div>
 
         {/* Footer Actions */}
         <div className="flex justify-between gap-3">
           {step === 'scope' ? (
             <>
               <Button variant="outline" onClick={handleClose}>
                 إلغاء
               </Button>
               <Button onClick={handleNext} disabled={!canProceedFromScope}>
                 التالي
                 <ChevronLeft className="w-4 h-4 mr-2" />
               </Button>
             </>
           ) : step === 'product' ? (
             <>
               <Button variant="outline" onClick={handleBack}>
                 <ChevronRight className="w-4 h-4 ml-2" />
                 السابق
               </Button>
               <Button onClick={handleNext} disabled={!canProceedFromProduct}>
                 التالي
                 <ChevronLeft className="w-4 h-4 mr-2" />
               </Button>
             </>
           ) : (
             <>
               <Button variant="outline" onClick={handleBack}>
                 <ChevronRight className="w-4 h-4 ml-2" />
                 السابق
               </Button>
               <Button onClick={handleSubmit} disabled={!canSubmit || isLoading}>
                 {isLoading ? 'جاري الإنشاء...' : 'إنشاء ✓'}
               </Button>
             </>
           )}
         </div>
       </DialogContent>
     </Dialog>
   );
 };
 
 export default CreateDiscountModal;