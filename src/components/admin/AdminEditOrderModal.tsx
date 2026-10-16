import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Pencil } from 'lucide-react';
import { useAdminEditOrder } from '@/hooks/useAdminOrders';
import { useToast } from '@/hooks/use-toast';

interface EditableOrderData {
  customer_name: string;
  customer_phone: string;
  customer_phone2: string;
  governorate: string;
  region: string;
  landmark: string;
  final_retail_price: number;
}

interface AdminEditOrderModalProps {
  orderId: string;
  initialData: EditableOrderData;
  open: boolean;
  onClose: () => void;
}

const AdminEditOrderModal = ({ orderId, initialData, open, onClose }: AdminEditOrderModalProps) => {
  const [formData, setFormData] = useState<EditableOrderData>(initialData);
  const editOrder = useAdminEditOrder();
  const { toast } = useToast();

  useEffect(() => {
    if (open) setFormData(initialData);
  }, [open, initialData]);

  const handleSave = () => {
    const updates: Record<string, any> = {};
    if (formData.customer_name !== initialData.customer_name) updates.customer_name = formData.customer_name;
    if (formData.customer_phone !== initialData.customer_phone) updates.customer_phone = formData.customer_phone;
    if (formData.customer_phone2 !== initialData.customer_phone2) updates.customer_phone2 = formData.customer_phone2 || null;
    if (formData.governorate !== initialData.governorate) updates.governorate = formData.governorate;
    if (formData.region !== initialData.region) updates.region = formData.region || null;
    if (formData.landmark !== initialData.landmark) updates.landmark = formData.landmark || null;
    if (formData.final_retail_price !== initialData.final_retail_price) updates.final_retail_price = formData.final_retail_price;

    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }

    editOrder.mutate(
      { orderId, updates },
      {
        onSuccess: (result) => {
          let description = 'تم تحديث بيانات الطلب بنجاح';
          if (result?.receiptCleared) {
            description += ' — تم إلغاء التحقق من إيصال الدفع لأن المبلغ المطلوب تغيّر، يجب على التاجر رفع إيصال جديد';
          } else if (result?.paymentRequirementChanged) {
            description += ' — تم تحديث المبلغ المطلوب من التاجر';
          }
          toast({ title: 'تم التعديل', description });
          onClose();
        },
        onError: (error) => {
          toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
        },
      }
    );
  };

  const updateField = (field: keyof EditableOrderData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            تعديل بيانات الطلب
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>اسم الزبون</Label>
              <Input
                value={formData.customer_name}
                onChange={(e) => updateField('customer_name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>رقم الهاتف</Label>
              <Input
                value={formData.customer_phone}
                onChange={(e) => updateField('customer_phone', e.target.value)}
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>رقم هاتف إضافي</Label>
              <Input
                value={formData.customer_phone2}
                onChange={(e) => updateField('customer_phone2', e.target.value)}
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>المحافظة</Label>
              <Input
                value={formData.governorate}
                onChange={(e) => updateField('governorate', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>المنطقة</Label>
              <Input
                value={formData.region}
                onChange={(e) => updateField('region', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>أقرب نقطة دالة</Label>
              <Input
                value={formData.landmark}
                onChange={(e) => updateField('landmark', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>إجمالي ما يدفعه الزبون (شامل التوصيل، د.ع)</Label>
            <Input
              type="number"
              value={formData.final_retail_price}
              onChange={(e) => updateField('final_retail_price', parseFloat(e.target.value) || 0)}
              className="text-right"
            />
            <p className="text-xs text-muted-foreground">
              يشمل هذا المبلغ سعر المنتج + الإضافات + أجور التوصيل
            </p>
            {(formData.final_retail_price !== initialData.final_retail_price ||
              formData.governorate !== initialData.governorate) && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ⚠️ تغيير المبلغ أو المحافظة سيُعيد احتساب أجور التوصيل وربح التاجر، وقد يتطلّب من التاجر رفع إيصال دفع جديد
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSave} disabled={editOrder.isPending}>
            {editOrder.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
            حفظ التعديلات
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminEditOrderModal;
