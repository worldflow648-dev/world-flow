 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { useToast } from '@/hooks/use-toast';
 
export interface DiscountCodeProductRef {
  id: string;
  name: string;
  images: string[] | null;
  merchant_price: number;
}

export interface DiscountCode {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  scope: 'store' | 'product';
  product_id: string | null;
  min_order_value: number | null;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  product?: DiscountCodeProductRef;
  products?: DiscountCodeProductRef[];
}

export interface CreateDiscountCodeData {
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  scope: 'store' | 'product';
  product_ids?: string[];
  min_order_value?: number | null;
  max_uses?: number | null;
  expires_at?: string | null;
}
 
 export const useDiscountCodes = () => {
   const queryClient = useQueryClient();
   const { toast } = useToast();
 
   const { data: discountCodes = [], isLoading, error } = useQuery({
     queryKey: ['discount-codes'],
     queryFn: async () => {
        const { data, error } = await supabase
          .from('discount_codes')
          .select(`
            *,
            product:products(id, name, images, merchant_price),
            discount_code_products(product:products(id, name, images, merchant_price))
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map((row: any) => ({
          ...row,
          products: (row.discount_code_products || [])
            .map((dcp: any) => dcp.product)
            .filter(Boolean),
        })) as DiscountCode[];
      },
    });

    const createMutation = useMutation({
      mutationFn: async (newCode: CreateDiscountCodeData) => {
        const { data: user } = await supabase.auth.getUser();
        const { product_ids, ...rest } = newCode;
        const singleId = product_ids && product_ids.length === 1 ? product_ids[0] : null;

        const { data, error } = await supabase
          .from('discount_codes')
          .insert({
            ...rest,
            product_id: rest.scope === 'product' ? singleId : null,
            created_by: user.user?.id,
          })
          .select()
          .single();

        if (error) throw error;

        if (rest.scope === 'product' && product_ids && product_ids.length > 0) {
          const rows = product_ids.map(pid => ({
            discount_code_id: data.id,
            product_id: pid,
          }));
          const { error: linkErr } = await supabase
            .from('discount_code_products')
            .insert(rows);
          if (linkErr) {
            await supabase.from('discount_codes').delete().eq('id', data.id);
            throw linkErr;
          }
        }
        return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['discount-codes'] });
        toast({
          title: 'تم الإنشاء',
          description: 'تم إنشاء كود الخصم بنجاح',
        });
      },
      onError: (error: Error) => {
        toast({
          title: 'خطأ',
          description: error.message.includes('duplicate') 
            ? 'هذا الكود موجود مسبقاً' 
            : 'حدث خطأ أثناء إنشاء الكود',
          variant: 'destructive',
        });
      },
    });
 
   const toggleMutation = useMutation({
     mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
       const { error } = await supabase
         .from('discount_codes')
         .update({ is_active })
         .eq('id', id);
 
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['discount-codes'] });
     },
   });
 
  const extendMutation = useMutation({
    mutationFn: async ({ id, expires_at, max_uses }: { id: string; expires_at?: string | null; max_uses?: number | null }) => {
      const updates: { is_active: boolean; expires_at?: string | null; max_uses?: number | null } = { is_active: true };
      if (expires_at !== undefined) updates.expires_at = expires_at;
      if (max_uses !== undefined) updates.max_uses = max_uses;

      const { error } = await supabase
        .from('discount_codes')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discount-codes'] });
      toast({
        title: 'تم التمديد',
        description: 'تم تمديد كود الخصم وإعادة تفعيله',
      });
    },
    onError: () => {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تمديد الكود',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
     mutationFn: async (id: string) => {
       const { error } = await supabase
         .from('discount_codes')
         .delete()
         .eq('id', id);
 
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['discount-codes'] });
       toast({
         title: 'تم الحذف',
         description: 'تم حذف كود الخصم بنجاح',
       });
     },
     onError: () => {
       toast({
         title: 'خطأ',
         description: 'حدث خطأ أثناء حذف الكود',
         variant: 'destructive',
       });
     },
   });
 
   // Stats calculations
   const stats = {
     total: discountCodes.length,
     active: discountCodes.filter(c => c.is_active && (!c.expires_at || new Date(c.expires_at) > new Date())).length,
     totalUsed: discountCodes.reduce((sum, c) => sum + c.used_count, 0),
     expired: discountCodes.filter(c => c.expires_at && new Date(c.expires_at) <= new Date()).length,
   };
 
   return {
     discountCodes,
     isLoading,
     error,
     stats,
     createCode: createMutation.mutateAsync,
     isCreating: createMutation.isPending,
      toggleCode: toggleMutation.mutate,
      deleteCode: deleteMutation.mutate,
      isDeleting: deleteMutation.isPending,
      extendCode: extendMutation.mutateAsync,
      isExtending: extendMutation.isPending,
    };
  };
 
 // Generate random code
 export const generateRandomCode = (length = 8): string => {
   const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
   return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
 };