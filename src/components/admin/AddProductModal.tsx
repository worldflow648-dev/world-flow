import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCategories, useAddons } from '@/hooks/useCatalogData';
import { useCreateProduct, useUpdateProduct, useUpdateProductVariants, AdminProduct } from '@/hooks/useAdminProducts';
import { useAllAddonScopes, useSyncProductAddonScopes } from '@/hooks/useAddonScopes';
import { Plus, X, Loader2, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ImageUploader } from './ImageUploader';

interface AddProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editProduct?: AdminProduct | null;
}

const AddProductModal = ({ open, onOpenChange, editProduct }: AddProductModalProps) => {
  const { toast } = useToast();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: addons, isLoading: addonsLoading } = useAddons();
  const { data: allScopes = [] } = useAllAddonScopes();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const updateVariants = useUpdateProductVariants();
  const syncProductScopes = useSyncProductAddonScopes();

  // Group addons by whether they're "general" (no scope rows) or "scoped"
  const { generalAddonIds, scopedAddons } = (() => {
    const scopedSet = new Set<string>();
    for (const s of allScopes) scopedSet.add(s.addon_id);
    const general: string[] = [];
    const scoped: typeof addons = [] as any;
    (addons || []).forEach(a => {
      if (scopedSet.has(a.id)) (scoped as any).push(a);
      else general.push(a.id);
    });
    return { generalAddonIds: general, scopedAddons: scoped || [] };
  })();

  const isEditMode = !!editProduct;

  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    wholesalePrice: '',
    merchantPrice: '',
    defaultStock: '0',
    enabledAddons: [] as string[],
    images: [] as string[],
  });
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<{ name: string; hex: string }[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, string>>({});
  const [newSize, setNewSize] = useState('');
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#000000');

  const stockKey = (size: string, color: string) => `${size}||${color}`;

  // Populate form when editing
  useEffect(() => {
    if (editProduct && categories) {
      const matchedCategory = categories.find(c => c.name === editProduct.category?.name);

      const enabledScopedIds = allScopes
        .filter(s => s.scope_type === 'product' && s.product_id === editProduct.id)
        .map(s => s.addon_id);

      const allVariants = editProduct.variants || [];
      const isSimple = allVariants.length === 1 && allVariants[0].size === 'واحد' && !allVariants[0].color;

      const sizeSet = new Set<string>();
      const colorMap = new Map<string, string>();
      const map: Record<string, string> = {};
      allVariants.forEach(v => {
        if (v.size && v.size !== 'واحد') sizeSet.add(v.size);
        if (v.color) colorMap.set(v.color, v.color_hex || '#000000');
        map[stockKey(v.size || 'واحد', v.color || '')] = String(v.stock_level ?? 0);
      });

      setFormData({
        name: editProduct.name,
        categoryId: matchedCategory?.id || '',
        wholesalePrice: editProduct.wholesale_price.toString(),
        merchantPrice: editProduct.merchant_price.toString(),
        defaultStock: isSimple ? String(allVariants[0].stock_level ?? 0) : '0',
        enabledAddons: enabledScopedIds,
        images: editProduct.images || [],
      });
      setSizes(Array.from(sizeSet));
      setColors(Array.from(colorMap.entries()).map(([name, hex]) => ({ name, hex })));
      setStockMap(map);
    } else if (!editProduct) {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editProduct, categories, allScopes.length]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addSize = () => {
    const name = newSize.trim();
    if (name && !sizes.includes(name)) {
      setSizes(prev => [...prev, name]);
      setNewSize('');
    }
  };
  const removeSize = (s: string) => setSizes(prev => prev.filter(x => x !== s));

  const addColor = () => {
    const name = newColorName.trim();
    if (name && !colors.some(c => c.name === name)) {
      setColors(prev => [...prev, { name, hex: newColorHex }]);
      setNewColorName('');
      setNewColorHex('#000000');
    }
  };
  const removeColor = (name: string) => setColors(prev => prev.filter(c => c.name !== name));

  const setStock = (size: string, color: string, val: string) => {
    setStockMap(prev => ({ ...prev, [stockKey(size, color)]: val }));
  };

  const toggleAddon = (addonId: string) => {
    setFormData((prev) => ({
      ...prev,
      enabledAddons: prev.enabledAddons.includes(addonId)
        ? prev.enabledAddons.filter((id) => id !== addonId)
        : [...prev.enabledAddons, addonId],
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      categoryId: '',
      wholesalePrice: '',
      merchantPrice: '',
      defaultStock: '0',
      enabledAddons: [],
      images: [],
    });
    setSizes([]);
    setColors([]);
    setStockMap({});
    setNewSize('');
    setNewColorName('');
    setNewColorHex('#000000');
  };

  const handleImagesChange = (images: string[]) => {
    setFormData((prev) => ({ ...prev, images }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.categoryId || !formData.wholesalePrice || !formData.merchantPrice) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء جميع الحقول المطلوبة',
        variant: 'destructive',
      });
      return;
    }

    // Build variant matrix from sizes × colors
    const effectiveSizes = sizes.length > 0 ? sizes : ['واحد'];
    const effectiveColors: ({ name: string; hex: string } | null)[] =
      colors.length > 0 ? colors : [null];
    const hasAnyVariant = sizes.length > 0 || colors.length > 0;

    const variants = hasAnyVariant
      ? effectiveSizes.flatMap(size =>
          effectiveColors.map(c => ({
            size,
            stock_level: parseInt(stockMap[stockKey(size, c?.name || '')] || '0') || 0,
            color: c?.name,
            color_hex: c?.hex,
          }))
        )
      : [{ size: 'واحد', stock_level: parseInt(formData.defaultStock) || 0 }];

    const syncScopes = async (productId: string) => {
      try {
        await syncProductScopes.mutateAsync({ productId, addonIds: formData.enabledAddons });
      } catch (err: any) {
        toast({
          title: 'تنبيه',
          description: 'تم حفظ المنتج لكن فشل تحديث الإضافات: ' + (err?.message || ''),
          variant: 'destructive',
        });
      }
    };

    if (isEditMode && editProduct) {
      // Update existing product including images
      updateProduct.mutate(
        {
          id: editProduct.id,
          name: formData.name,
          category_id: formData.categoryId,
          merchant_price: parseFloat(formData.merchantPrice),
          wholesale_price: parseFloat(formData.wholesalePrice),
          images: formData.images.length > 0 ? formData.images : undefined,
        },
        {
          onSuccess: () => {
            // Also update variants
            updateVariants.mutate(
              {
                product_id: editProduct.id,
                variants,
              },
              {
                onSuccess: async () => {
                  await syncScopes(editProduct.id);
                  toast({
                    title: 'تم بنجاح',
                    description: 'تم تحديث المنتج بنجاح',
                  });
                  resetForm();
                  onOpenChange(false);
                },
                onError: (error) => {
                  toast({
                    title: 'خطأ في تحديث المتغيرات',
                    description: error.message,
                    variant: 'destructive',
                  });
                },
              }
            );
          },
          onError: (error) => {
            toast({
              title: 'خطأ',
              description: error.message,
              variant: 'destructive',
            });
          },
        }
      );
    } else {
      // Create new product
      createProduct.mutate(
        {
          name: formData.name,
          category_id: formData.categoryId,
          merchant_price: parseFloat(formData.merchantPrice),
          wholesale_price: parseFloat(formData.wholesalePrice),
          images: formData.images.length > 0 ? formData.images : undefined,
          variants,
        },
        {
          onSuccess: async (created: any) => {
            if (created?.id) await syncScopes(created.id);
            toast({
              title: 'تم بنجاح',
              description: 'تمت إضافة المنتج بنجاح',
            });
            resetForm();
            onOpenChange(false);
          },
          onError: (error) => {
            toast({
              title: 'خطأ',
              description: error.message,
              variant: 'destructive',
            });
          },
        }
      );
    }
  };

  const isPending = createProduct.isPending || updateProduct.isPending || updateVariants.isPending || syncProductScopes.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isEditMode ? 'تعديل المنتج' : 'إضافة منتج جديد'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Product Name */}
          <div className="space-y-2">
            <Label htmlFor="name">اسم المنتج</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="أدخل اسم المنتج"
              className="text-right"
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>صور المنتج</Label>
            <ImageUploader
              images={formData.images}
              onImagesChange={handleImagesChange}
              maxImages={5}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>الفئة</Label>
            <Select
              value={formData.categoryId}
              onValueChange={(value) => handleInputChange('categoryId', value)}
              disabled={categoriesLoading}
            >
              <SelectTrigger className="text-right">
                {categoriesLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري التحميل...</span>
                  </div>
                ) : (
                  <SelectValue placeholder="اختر الفئة" />
                )}
              </SelectTrigger>
              <SelectContent>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
                {!categoriesLoading && (!categories || categories.length === 0) && (
                  <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                    لا توجد فئات متاحة
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Prices Section */}
          <div className="border border-border rounded-xl p-4 space-y-4">
            <h4 className="font-semibold text-foreground">الأسعار</h4>
            
            {/* Wholesale Price - Gray background to indicate internal */}
            <div className="space-y-2">
              <Label htmlFor="wholesalePrice" className="flex items-center gap-2">
                سعر الجملة (التكلفة)
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">داخلي</span>
              </Label>
              <Input
                id="wholesalePrice"
                type="number"
                value={formData.wholesalePrice}
                onChange={(e) => handleInputChange('wholesalePrice', e.target.value)}
                placeholder="0"
                className="text-right bg-muted/50"
              />
            </div>

            {/* Merchant Price */}
            <div className="space-y-2">
              <Label htmlFor="merchantPrice">سعر التاجر</Label>
              <Input
                id="merchantPrice"
                type="number"
                value={formData.merchantPrice}
                onChange={(e) => handleInputChange('merchantPrice', e.target.value)}
                placeholder="0"
                className="text-right"
              />
            </div>
          </div>

          {/* Variants & Stock */}
          <div className="space-y-4">
            <Label>المتغيرات والمخزون</Label>

            {/* Sizes */}
            <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/20">
              <div className="text-sm font-medium text-foreground">المقاسات (اختياري)</div>
              {sizes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {sizes.map(s => (
                    <span key={s} className="inline-flex items-center gap-1 bg-secondary rounded-full px-3 py-1 text-sm">
                      {s}
                      <button type="button" onClick={() => removeSize(s)} className="text-muted-foreground hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={newSize}
                  onChange={(e) => setNewSize(e.target.value)}
                  placeholder="مثال: S أو M أو XL"
                  className="text-right flex-1 h-9"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSize())}
                />
                <Button type="button" variant="outline" size="icon" onClick={addSize} className="h-9 w-9">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Colors */}
            <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/20">
              <div className="text-sm font-medium text-foreground">الألوان (اختياري)</div>
              {colors.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {colors.map(c => (
                    <span key={c.name} className="inline-flex items-center gap-2 bg-secondary rounded-full px-3 py-1 text-sm">
                      <span className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: c.hex }} />
                      {c.name}
                      <button type="button" onClick={() => removeColor(c.name)} className="text-muted-foreground hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={newColorName}
                  onChange={(e) => setNewColorName(e.target.value)}
                  placeholder="اسم اللون (مثال: أبيض)"
                  className="text-right flex-1 h-9"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addColor())}
                />
                <input
                  type="color"
                  value={newColorHex}
                  onChange={(e) => setNewColorHex(e.target.value)}
                  className="h-9 w-12 rounded cursor-pointer border border-border bg-transparent"
                />
                <Button type="button" variant="outline" size="icon" onClick={addColor} className="h-9 w-9">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Stock matrix or default stock */}
            {sizes.length === 0 && colors.length === 0 ? (
              <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  هذا المنتج بدون مقاسات أو ألوان — أدخل الكمية المتوفرة.
                </p>
                <div className="space-y-1">
                  <Label htmlFor="defaultStock" className="text-sm">الكمية المتوفرة</Label>
                  <Input
                    id="defaultStock"
                    type="number"
                    min="0"
                    value={formData.defaultStock}
                    onChange={(e) => handleInputChange('defaultStock', e.target.value)}
                    placeholder="0"
                    className="text-right h-9"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground">المخزون لكل تركيبة</div>
                <div className="space-y-2">
                  {(sizes.length > 0 ? sizes : ['واحد']).flatMap(size =>
                    (colors.length > 0 ? colors : [null]).map(c => {
                      const key = stockKey(size, c?.name || '');
                      const label = [
                        sizes.length > 0 ? size : null,
                        c?.name,
                      ].filter(Boolean).join(' • ');
                      return (
                        <div key={key} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30">
                          {c?.hex && (
                            <span className="w-5 h-5 rounded-full border border-border shrink-0" style={{ backgroundColor: c.hex }} />
                          )}
                          <span className="flex-1 px-2 py-1 text-sm font-medium text-foreground truncate">
                            {label || 'واحد'}
                          </span>
                          <Input
                            type="number"
                            min="0"
                            value={stockMap[key] ?? '0'}
                            onChange={(e) => setStock(size, c?.name || '', e.target.value)}
                            placeholder="0"
                            className="w-24 text-right h-9"
                          />
                        </div>
                      );
                    })
                  )}
                </div>
                <p className="text-sm text-muted-foreground text-right">
                  إجمالي المخزون:{' '}
                  <span className="font-semibold text-foreground">
                    {(sizes.length > 0 ? sizes : ['واحد']).flatMap(size =>
                      (colors.length > 0 ? colors : [null]).map(c =>
                        parseInt(stockMap[stockKey(size, c?.name || '')] || '0') || 0
                      )
                    ).reduce((a, b) => a + b, 0)}
                  </span>
                </p>
              </div>
            )}
          </div>


          {/* Add-ons */}
          <div className="space-y-3">
            <Label>الإضافات المتاحة</Label>
            {addonsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">جاري تحميل الإضافات...</span>
              </div>
            ) : addons && addons.length > 0 ? (
              <div className="space-y-2">
                {scopedAddons.map((addon: any) => (
                  <div key={addon.id} className="flex items-center gap-3">
                    <Checkbox
                      id={addon.id}
                      checked={formData.enabledAddons.includes(addon.id)}
                      onCheckedChange={() => toggleAddon(addon.id)}
                    />
                    <label
                      htmlFor={addon.id}
                      className="text-sm font-medium leading-none cursor-pointer flex-1"
                    >
                      {addon.name}
                    </label>
                  </div>
                ))}
                {generalAddonIds.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border space-y-2">
                    <p className="text-xs text-muted-foreground">
                      إضافات عامة (تظهر تلقائياً على كل المنتجات — تُدار من صفحة الإضافات)
                    </p>
                    {(addons || []).filter(a => generalAddonIds.includes(a.id)).map((addon) => (
                      <div key={addon.id} className="flex items-center gap-3 opacity-70">
                        <Checkbox checked disabled />
                        <label className="text-sm font-medium leading-none flex-1">{addon.name}</label>
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          <Globe className="w-3 h-3" /> عامة
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {scopedAddons.length === 0 && generalAddonIds.length === addons.length && (
                  <p className="text-xs text-muted-foreground mt-2">
                    كل الإضافات الحالية عامة. لجعل إضافة خاصة بمنتجات محددة، حدد ظهورها من صفحة الإضافات.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">لا توجد إضافات متاحة</p>
            )}
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
            {isEditMode ? 'حفظ التغييرات' : 'إضافة المنتج'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddProductModal;
