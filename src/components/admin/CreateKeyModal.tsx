import { useState } from 'react';
import { Copy, Check, Key } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateActivationKey } from '@/hooks/useActivationKeys';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type AppRole = Database['public']['Enums']['app_role'];

interface CreateKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const roleLabels: Record<AppRole, string> = {
  admin: 'مدير',
  staff: 'موظف',
  merchant: 'تاجر',
  guest: 'زائر'
};


export function CreateKeyModal({ open, onOpenChange }: CreateKeyModalProps) {
  const [role, setRole] = useState<AppRole>('merchant');
  const [merchantTier, setMerchantTier] = useState<'basic' | 'professional'>('basic');
  const [label, setLabel] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const createKey = useCreateActivationKey();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const result = await createKey.mutateAsync({
        role,
        label: label.trim() || undefined,
        expiresInDays,
        merchantTier: role === 'merchant' ? merchantTier : undefined,
      });
      
      setCreatedCode(result.code);
      toast.success('تم إنشاء المفتاح بنجاح');
    } catch (error) {
      toast.error('فشل في إنشاء المفتاح');
    }
  };
  
  const handleCopy = async () => {
    if (createdCode) {
      await navigator.clipboard.writeText(createdCode);
      setCopied(true);
      toast.success('تم نسخ المفتاح');
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const handleClose = () => {
    setRole('merchant');
    setMerchantTier('basic');
    setLabel('');
    setExpiresInDays(30);
    setCreatedCode(null);
    setCopied(false);
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {createdCode ? 'تم إنشاء المفتاح!' : 'إنشاء مفتاح تفعيل جديد'}
          </DialogTitle>
        </DialogHeader>
        
        {createdCode ? (
          <div className="space-y-4 py-4">
            <div className="bg-muted rounded-lg p-4 text-center">
              <p className="font-mono text-lg font-bold tracking-wider">
                {createdCode}
              </p>
            </div>
            
            <Button
              onClick={handleCopy}
              className="w-full"
              variant={copied ? 'secondary' : 'default'}
            >
              {copied ? (
                <>
                  <Check className="ml-2 h-4 w-4" />
                  تم النسخ
                </>
              ) : (
                <>
                  <Copy className="ml-2 h-4 w-4" />
                  نسخ المفتاح
                </>
              )}
            </Button>
            
            <p className="text-sm text-muted-foreground text-center">
              شارك هذا المفتاح مع المستخدم الجديد لإنشاء حسابه
            </p>
            
            <Button variant="outline" onClick={handleClose} className="w-full">
              إغلاق
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>الدور *</Label>
              <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="merchant">{roleLabels.merchant}</SelectItem>
                  <SelectItem value="staff">{roleLabels.staff}</SelectItem>
                  <SelectItem value="admin">{roleLabels.admin}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {role === 'merchant' && (
              <div className="space-y-2">
                <Label>مستوى الحساب *</Label>
                <Select value={merchantTier} onValueChange={(v) => setMerchantTier(v as 'basic' | 'professional')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">أساسي (Basic)</SelectItem>
                    <SelectItem value="professional">احترافي (Professional)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>اسم وصفي (اختياري)</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="مثال: لموظف المبيعات الجديد"
              />
            </div>
            
            <div className="space-y-2">
              <Label>صلاحية المفتاح (بالأيام)</Label>
              <Input
                type="number"
                min={1}
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Math.max(1, Number(e.target.value) || 1))}
                placeholder="مثال: 30"
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createKey.isPending}
              >
                {createKey.isPending ? 'جاري الإنشاء...' : 'إنشاء المفتاح'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
