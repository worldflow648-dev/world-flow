import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useCreateAddon, useUpdateAddon, AdminAddon } from '@/hooks/useAdminAddons';
import { useAddonOptions, useCreateAddonOption, useUpdateAddonOption, useDeleteAddonOption, AddonOption } from '@/hooks/useAddonOptions';
import { useAddonScopes, useReplaceAddonScopes } from '@/hooks/useAddonScopes';
import { useCategories, formatPrice } from '@/hooks/useCatalogData';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Gift, Plus, Trash2, Globe, Layers, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AddonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editAddon?: AdminAddon | null;
  initialTab?: 'details' | 'options' | 'visibility';
}

interface LocalOption {
  id?: string;
  name: string;
  name_en: string;
  price: string;
  wholesale_price: string;
  isNew?: boolean;
  isDeleted?: boolean;
}

interface ScopeRow {
  scope_type: 'category' | 'product';
  target_id: string;
  price_override: string;
  wholesale_price_override: string;
  deposit_price_override: string;
}

const AddonModal = ({ open, onOpenChange, editAddon, initialTab = 'details' }: AddonModalProps) => {
  const { toast } = useToast();
  const createAddon = useCreateAddon();
  const updateAddon = useUpdateAddon();
  const createOption = useCreateAddonOption();
  const updateOption = useUpdateAddonOption();
  const deleteOption = useDeleteAddonOption();
  const replaceScopes = useReplaceAddonScopes();
  const { data: categories = [] } = useCategories();
  const { data: products = [] } = useQuery({
    queryKey: ['admin-products-min'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, category_id')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as { id: string; name: string; category_id: string | null }[];
    },
  });
  const { data: existingScopes } = useAddonScopes(editAddon?.id || null);
  
  const { data: existingOptions } = useAddonOptions(editAddon?.id || null);

  const isEditMode = !!editAddon;

  const [formData, setFormData] = useState({
    name: '',
    name_en: '',
    tag: '',
    price: '',
    wholesale_price: '',
    requires_deposit: false,
    deposit_price: '',
  });
  
  const [localOptions, setLocalOptions] = useState<LocalOption[]>([]);
  const [scopeMode, setScopeMode] = useState<'general' | 'category' | 'product'>('general');
  const [scopeRows, setScopeRows] = useState<ScopeRow[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'options' | 'visibility'>(initialTab);
  const optionsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editAddon) {
      setFormData({
        name: editAddon.name,
        name_en: editAddon.name_en || '',
        tag: editAddon.tag || '',
        price: editAddon.price.toString(),
        wholesale_price: editAddon.wholesale_price ? editAddon.wholesale_price.toString() : '',
        requires_deposit: editAddon.requires_deposit || false,
        deposit_price: editAddon.deposit_price ? editAddon.deposit_price.toString() : '',
      });
    } else {
      resetForm();
    }
  }, [editAddon]);

  // Reset to initial tab on open
  useEffect(() => {
    if (open) setActiveTab(initialTab);
  }, [open, initialTab]);
  
  useEffect(() => {
    if (!open) return;
    if (isEditMode && existingOptions && existingOptions.length > 0) {
      setLocalOptions(existingOptions.filter(o => o.is_active).map(opt => ({
        id: opt.id,
        name: opt.name,
        name_en: opt.name_en || '',
        price: opt.price !== null ? opt.price.toString() : '',
        wholesale_price: opt.wholesale_price !== null && opt.wholesale_price !== undefined ? opt.wholesale_price.toString() : '',
        isNew: false,
        isDeleted: false,
      })));
    } else if (!isEditMode) {
      setLocalOptions([]);
    }
    // Only sync from server when modal opens or edited addon changes — not on every query refetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editAddon?.id, existingOptions?.length]);

  // Init scopes once per modal open (avoid re-running on every react-query refetch which resets user's tab clicks)
  useEffect(() => {
    if (!open) return;
    if (isEditMode && existingScopes && existingScopes.length > 0) {
      const firstType = existingScopes[0].scope_type;
      const allSame = existingScopes.every(s => s.scope_type === firstType);
      const mode = allSame ? firstType : 'product';
      setScopeMode(mode);
      setScopeRows(existingScopes
        .filter(s => s.scope_type === mode)
        .map(s => ({
          scope_type: s.scope_type,
          target_id: (s.scope_type === 'category' ? s.category_id : s.product_id) || '',
          price_override: s.price_override !== null ? String(s.price_override) : '',
          wholesale_price_override: s.wholesale_price_override !== null ? String(s.wholesale_price_override) : '',
          deposit_price_override: s.deposit_price_override !== null ? String(s.deposit_price_override) : '',
        })));
    } else {
      setScopeMode('general');
      setScopeRows([]);
    }
    // Only re-init when the modal opens or the edited addon changes — not on every query refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editAddon?.id, existingScopes?.length]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      name_en: '',
      tag: '',
      price: '',
      wholesale_price: '',
      requires_deposit: false,
      deposit_price: '',
    });
    setLocalOptions([]);
    setScopeMode('general');
    setScopeRows([]);
  };

  const handleAddOption = () => {
    setLocalOptions(prev => [...prev, {
      name: '',
      name_en: '',
      price: '',
      wholesale_price: '',
      isNew: true,
      isDeleted: false,
    }]);
    setTimeout(() => {
      optionsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleOptionChange = (index: number, field: keyof LocalOption, value: string) => {
    setLocalOptions(prev => prev.map((opt, i) => 
      i === index ? { ...opt, [field]: value } : opt
    ));
  };

  const handleDeleteOption = (index: number) => {
    setLocalOptions(prev => {
      const option = prev[index];
      if (option.isNew) {
        // Remove new options entirely
        return prev.filter((_, i) => i !== index);
      } else {
        // Mark existing options as deleted
        return prev.map((opt, i) => 
          i === index ? { ...opt, isDeleted: true } : opt
        );
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء الاسم والسعر',
        variant: 'destructive',
      });
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال سعر صحيح',
        variant: 'destructive',
      });
      return;
    }

    // Validate options
    const activeOptions = localOptions.filter(o => !o.isDeleted);
    for (const opt of activeOptions) {
      if (!opt.name.trim()) {
        toast({
          title: 'خطأ',
          description: 'يرجى ملء اسم كل الخيارات الفرعية',
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      let createdAddonId: string | null = null;
      if (isEditMode && editAddon) {
        // Update addon
        await updateAddon.mutateAsync({
          id: editAddon.id,
          name: formData.name,
          name_en: formData.name_en || undefined,
          tag: formData.tag || undefined,
          price,
          wholesale_price: formData.wholesale_price ? parseFloat(formData.wholesale_price) : 0,
          requires_deposit: formData.requires_deposit,
          deposit_price: formData.deposit_price ? parseFloat(formData.deposit_price) : 0,
        });

        // Handle options
        for (const opt of localOptions) {
          if (opt.isDeleted && opt.id) {
            await deleteOption.mutateAsync(opt.id);
          } else if (opt.isNew && !opt.isDeleted) {
            await createOption.mutateAsync({
              addon_id: editAddon.id,
              name: opt.name,
              name_en: opt.name_en || undefined,
              price: opt.price ? parseFloat(opt.price) : null,
              wholesale_price: opt.wholesale_price ? parseFloat(opt.wholesale_price) : null,
              sort_order: localOptions.indexOf(opt),
            });
          } else if (opt.id && !opt.isDeleted) {
            await updateOption.mutateAsync({
              id: opt.id,
              name: opt.name,
              name_en: opt.name_en || null,
              price: opt.price ? parseFloat(opt.price) : null,
              wholesale_price: opt.wholesale_price ? parseFloat(opt.wholesale_price) : null,
              sort_order: localOptions.indexOf(opt),
            });
          }
        }

        toast({
          title: 'تم بنجاح',
          description: 'تم تحديث الإضافة بنجاح',
        });
      } else {
        // Create addon first
        const newAddon = await createAddon.mutateAsync({
          name: formData.name,
          name_en: formData.name_en || undefined,
          tag: formData.tag || undefined,
          price,
          wholesale_price: formData.wholesale_price ? parseFloat(formData.wholesale_price) : 0,
          requires_deposit: formData.requires_deposit,
          deposit_price: formData.deposit_price ? parseFloat(formData.deposit_price) : 0,
        });
        createdAddonId = newAddon.id;

        // Then create options
        for (let i = 0; i < localOptions.length; i++) {
          const opt = localOptions[i];
          if (!opt.isDeleted) {
            await createOption.mutateAsync({
              addon_id: newAddon.id,
              name: opt.name,
              name_en: opt.name_en || undefined,
              price: opt.price ? parseFloat(opt.price) : null,
              wholesale_price: opt.wholesale_price ? parseFloat(opt.wholesale_price) : null,
              sort_order: i,
            });
          }
        }

        toast({
          title: 'تم بنجاح',
          description: 'تمت إضافة الإضافة بنجاح',
        });
      }

      const finalAddonId = isEditMode && editAddon ? editAddon.id : createdAddonId;
      const scopesPayload =
        scopeMode === 'general'
          ? []
          : scopeRows
              .filter((r) => r.target_id)
              .map((r) => ({
                scope_type: scopeMode,
                category_id: scopeMode === 'category' ? r.target_id : null,
                product_id: scopeMode === 'product' ? r.target_id : null,
                price_override: r.price_override ? parseFloat(r.price_override) : null,
                wholesale_price_override: r.wholesale_price_override ? parseFloat(r.wholesale_price_override) : null,
                deposit_price_override: r.deposit_price_override ? parseFloat(r.deposit_price_override) : null,
              }));

      if (finalAddonId) {
        await replaceScopes.mutateAsync({ addonId: finalAddonId, scopes: scopesPayload });
      }

      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const isPending = createAddon.isPending || updateAddon.isPending || 
    createOption.isPending || updateOption.isPending || deleteOption.isPending;

  const activeOptions = localOptions.filter(o => !o.isDeleted);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            {isEditMode ? 'تعديل الإضافة' : 'إضافة جديدة'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger type="button" value="details">التفاصيل</TabsTrigger>
              <TabsTrigger type="button" value="options">الخيارات الفرعية</TabsTrigger>
              <TabsTrigger type="button" value="visibility">الظهور والتسعير</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
          {/* Arabic Name */}
          <div className="space-y-2">
            <Label htmlFor="name">الاسم بالعربية *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="مثال: طباعة"
              className="text-right"
            />
          </div>

          {/* English Name */}
          <div className="space-y-2">
            <Label htmlFor="name_en">الاسم بالإنجليزية</Label>
            <Input
              id="name_en"
              value={formData.name_en}
              onChange={(e) => handleInputChange('name_en', e.target.value)}
              placeholder="e.g. Printing"
              className="text-left"
              dir="ltr"
            />
          </div>


          {/* Tag */}
          <div className="space-y-2">
            <Label htmlFor="tag">الوسم (Tag)</Label>
            <Input
              id="tag"
              value={formData.tag}
              onChange={(e) => handleInputChange('tag', e.target.value)}
              placeholder="مثال: طباعة"
              className="text-right"
            />
            <p className="text-xs text-muted-foreground">
              وسم قصير يستخدمه العمال لتصفية الطلبات
            </p>
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price">سعر البيع للتاجر (د.ع) *</Label>
            <Input
              id="price"
              type="number"
              value={formData.price}
              onChange={(e) => handleInputChange('price', e.target.value)}
              placeholder="0"
              className="text-right"
              min="0"
            />
          </div>

          {/* Wholesale Price (internal cost) */}
          <div className="space-y-2">
            <Label htmlFor="wholesale_price">تكلفة الإنتاج (د.ع)</Label>
            <Input
              id="wholesale_price"
              type="number"
              value={formData.wholesale_price}
              onChange={(e) => handleInputChange('wholesale_price', e.target.value)}
              placeholder="0"
              className="text-right"
              min="0"
            />
            <p className="text-xs text-muted-foreground">
              التكلفة الفعلية للمنصة (حبر، مواد، …). تُستخدم لاحتساب الربح الحقيقي. اتركها 0 إذا لا تكلفة.
            </p>
          </div>

          {/* Requires Deposit Toggle */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div>
              <Label htmlFor="requires_deposit" className="font-medium">يتطلب عربون</Label>
              <p className="text-xs text-muted-foreground mt-0.5">يجب على التاجر دفع عربون لهذه الإضافة</p>
            </div>
            <Switch
              id="requires_deposit"
              checked={formData.requires_deposit}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requires_deposit: checked, deposit_price: checked ? prev.deposit_price : '' }))}
            />
          </div>

          {/* Deposit Price (shown only when requires_deposit is on) */}
          {formData.requires_deposit && (
            <div className="space-y-2">
              <Label htmlFor="deposit_price">مبلغ العربون (د.ع)</Label>
              <Input
                id="deposit_price"
                type="number"
                value={formData.deposit_price}
                onChange={(e) => handleInputChange('deposit_price', e.target.value)}
                placeholder="مثال: 3000"
                className="text-right"
                min="0"
              />
              <p className="text-xs text-muted-foreground">
                اتركه فارغاً لاستخدام سعر الإضافة الكامل كعربون
              </p>
            </div>
          )}
            </TabsContent>

            <TabsContent value="visibility" className="space-y-4 mt-4">
          {/* Visibility / Scope */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">الظهور (Visibility)</Label>
            <Tabs value={scopeMode} onValueChange={(v) => {
              const mode = v as 'general' | 'category' | 'product';
              setScopeMode(mode);
              if (mode === 'general') {
                setScopeRows([]);
              } else {
                setScopeRows([{ scope_type: mode, target_id: '', price_override: '', wholesale_price_override: '', deposit_price_override: '' }]);
              }
            }}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger type="button" value="general" className="gap-1"><Globe className="w-3.5 h-3.5" /> عامة</TabsTrigger>
                <TabsTrigger type="button" value="category" className="gap-1"><Layers className="w-3.5 h-3.5" /> أصناف</TabsTrigger>
                <TabsTrigger type="button" value="product" className="gap-1"><Package className="w-3.5 h-3.5" /> منتجات</TabsTrigger>
              </TabsList>
              <TabsContent value="general">
                <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                  هذه الإضافة ستظهر على جميع المنتجات بسعرها الافتراضي.
                </p>
              </TabsContent>
              <TabsContent value="category" className="space-y-2">
                {scopeRows.length === 0 && (
                  <p className="text-xs text-muted-foreground">اختر صنفاً واحداً أو أكثر تظهر فيه هذه الإضافة، مع إمكانية تخصيص السعر لكل صنف.</p>
                )}
                {scopeRows.map((row, idx) => (
                  <div key={idx} className="p-3 bg-muted/30 rounded-lg space-y-2">
                    <div className="flex gap-2">
                      <select value={row.target_id} onChange={(e) => setScopeRows(prev => prev.map((r, i) => i === idx ? { ...r, target_id: e.target.value } : r))} className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm">
                        <option value="">— اختر صنفاً —</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id} disabled={scopeRows.some((r, i) => i !== idx && r.target_id === c.id)}>{c.name}</option>
                        ))}
                      </select>
                      <Button type="button" variant="ghost" size="icon" onClick={() => setScopeRows(prev => prev.filter((_, i) => i !== idx))} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                    <Input type="number" min="0" placeholder={`سعر مخصص (افتراضي: ${formData.price || 0})`} value={row.price_override} onChange={(e) => setScopeRows(prev => prev.map((r, i) => i === idx ? { ...r, price_override: e.target.value } : r))} className="text-right" />
                    <Input type="number" min="0" placeholder={`تكلفة إنتاج مخصصة (افتراضي: ${formData.wholesale_price || 0})`} value={row.wholesale_price_override} onChange={(e) => setScopeRows(prev => prev.map((r, i) => i === idx ? { ...r, wholesale_price_override: e.target.value } : r))} className="text-right" />
                    {formData.requires_deposit && (
                      <Input type="number" min="0" placeholder={`عربون مخصص (افتراضي: ${formData.deposit_price || 0})`} value={row.deposit_price_override} onChange={(e) => setScopeRows(prev => prev.map((r, i) => i === idx ? { ...r, deposit_price_override: e.target.value } : r))} className="text-right" />
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setScopeRows(prev => [...prev, { scope_type: 'category', target_id: '', price_override: '', wholesale_price_override: '', deposit_price_override: '' }])} className="w-full gap-1"><Plus className="w-4 h-4" /> إضافة صنف</Button>
              </TabsContent>
              <TabsContent value="product" className="space-y-2">
                {scopeRows.length === 0 && (
                  <p className="text-xs text-muted-foreground">اختر منتجاً واحداً أو أكثر تظهر فيه هذه الإضافة، مع إمكانية تخصيص السعر لكل منتج.</p>
                )}
                {scopeRows.map((row, idx) => (
                  <div key={idx} className="p-3 bg-muted/30 rounded-lg space-y-2">
                    <div className="flex gap-2">
                      <select value={row.target_id} onChange={(e) => setScopeRows(prev => prev.map((r, i) => i === idx ? { ...r, target_id: e.target.value } : r))} className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm">
                        <option value="">— اختر منتجاً —</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id} disabled={scopeRows.some((r, i) => i !== idx && r.target_id === p.id)}>{p.name}</option>
                        ))}
                      </select>
                      <Button type="button" variant="ghost" size="icon" onClick={() => setScopeRows(prev => prev.filter((_, i) => i !== idx))} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                    <Input type="number" min="0" placeholder={`سعر مخصص (افتراضي: ${formData.price || 0})`} value={row.price_override} onChange={(e) => setScopeRows(prev => prev.map((r, i) => i === idx ? { ...r, price_override: e.target.value } : r))} className="text-right" />
                    <Input type="number" min="0" placeholder={`تكلفة إنتاج مخصصة (افتراضي: ${formData.wholesale_price || 0})`} value={row.wholesale_price_override} onChange={(e) => setScopeRows(prev => prev.map((r, i) => i === idx ? { ...r, wholesale_price_override: e.target.value } : r))} className="text-right" />
                    {formData.requires_deposit && (
                      <Input type="number" min="0" placeholder={`عربون مخصص (افتراضي: ${formData.deposit_price || 0})`} value={row.deposit_price_override} onChange={(e) => setScopeRows(prev => prev.map((r, i) => i === idx ? { ...r, deposit_price_override: e.target.value } : r))} className="text-right" />
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setScopeRows(prev => [...prev, { scope_type: 'product', target_id: '', price_override: '', wholesale_price_override: '', deposit_price_override: '' }])} className="w-full gap-1"><Plus className="w-4 h-4" /> إضافة منتج</Button>
              </TabsContent>
            </Tabs>
          </div>
            </TabsContent>

            <TabsContent value="options" className="space-y-4 mt-4">
          {/* Sub-Options Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">الخيارات الفرعية</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddOption}
                className="gap-1"
              >
                <Plus className="w-4 h-4" />
                إضافة خيار
              </Button>
            </div>
            
            {activeOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
                لا توجد خيارات فرعية. أضف خيارات مثل A3، A4 للطباعة.
              </p>
            ) : (
              <div className="space-y-3">
                {localOptions.map((option, index) => {
                  if (option.isDeleted) return null;
                  
                  return (
                    <div key={option.id || `new-${index}`} className="p-3 bg-muted/30 rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={option.name}
                          onChange={(e) => handleOptionChange(index, 'name', e.target.value)}
                          placeholder="الاسم (مثل: A3)"
                          className="flex-1 text-right"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteOption(index)}
                          className="text-destructive hover:text-destructive shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={option.name_en}
                          onChange={(e) => handleOptionChange(index, 'name_en', e.target.value)}
                          placeholder="English name"
                          className="text-left"
                          dir="ltr"
                        />
                        <div className="relative">
                          <Input
                            type="number"
                            value={option.price}
                            onChange={(e) => handleOptionChange(index, 'price', e.target.value)}
                            placeholder="السعر (اختياري)"
                            className="text-right pr-3"
                            min="0"
                          />
                        </div>
                      </div>
                      <Input
                        type="number"
                        value={option.wholesale_price}
                        onChange={(e) => handleOptionChange(index, 'wholesale_price', e.target.value)}
                        placeholder="تكلفة الإنتاج (اختياري)"
                        className="text-right"
                        min="0"
                      />
                      {!option.price && (
                        <p className="text-xs text-muted-foreground">
                          سيستخدم السعر الافتراضي: {formData.price ? formatPrice(parseFloat(formData.price)) : '-'}
                        </p>
                      )}
                      {!option.wholesale_price && (
                        <p className="text-xs text-muted-foreground">
                          تكلفة الإنتاج الافتراضية: {formData.wholesale_price ? formatPrice(parseFloat(formData.wholesale_price)) : '0 د.ع'}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div ref={optionsEndRef} />
          </div>
            </TabsContent>
          </Tabs>

          {/* Submit Button */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isPending}
            >
              إلغاء
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              {isEditMode ? 'حفظ التغييرات' : 'إضافة'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddonModal;
