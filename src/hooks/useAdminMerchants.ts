import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminMerchant {
  id: string;
  name: string;
  phone: string | null;
  ordersCount: number;
  walletBalance: number;
  status: 'active' | 'suspended';
  joinedAt: string;
  merchantTier: string | null;
  isHidden: boolean;
  avatarUrl: string | null;
  storeName: string | null;
  storeLink: string | null;
}

export const useAdminMerchants = () => {
  return useQuery({
    queryKey: ['admin-merchants'],
    queryFn: async (): Promise<AdminMerchant[]> => {
      // Step 1: Get all merchants from user_roles
      const { data: merchantRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'merchant');

      if (rolesError) throw rolesError;
      if (!merchantRoles?.length) return [];

      const merchantIds = merchantRoles.map((m) => m.user_id);

      // Step 2: Fetch profiles, wallets, and orders in parallel
      const [profilesResult, walletsResult, ordersResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, phone, created_at, is_suspended, merchant_tier, is_hidden, avatar_url, store_name, store_link')
          .in('id', merchantIds),
        supabase
          .from('wallets')
          .select('merchant_id, balance')
          .in('merchant_id', merchantIds),
        supabase
          .from('orders')
          .select('merchant_id')
          .in('merchant_id', merchantIds),
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (walletsResult.error) throw walletsResult.error;
      if (ordersResult.error) throw ordersResult.error;

      const profiles = profilesResult.data || [];
      const wallets = walletsResult.data || [];
      const orders = ordersResult.data || [];

      // Combine data
      return merchantIds.map((id) => {
        const profile = profiles.find((p) => p.id === id);
        const wallet = wallets.find((w) => w.merchant_id === id);
        const orderCount = orders.filter((o) => o.merchant_id === id).length;

        return {
          id,
          name: profile?.full_name || 'غير معروف',
          phone: profile?.phone || null,
          walletBalance: wallet?.balance || 0,
          ordersCount: orderCount,
          status: (profile as any)?.is_suspended ? 'suspended' as const : 'active' as const,
          joinedAt: profile?.created_at || '',
          merchantTier: profile?.merchant_tier || null,
          isHidden: Boolean((profile as any)?.is_hidden),
          avatarUrl: (profile as any)?.avatar_url || null,
          storeName: (profile as any)?.store_name || null,
          storeLink: (profile as any)?.store_link || null,
        };
      });
    },
  });
};

// Format wallet balance in IQD
export const formatWalletBalance = (balance: number): string => {
  const formatted = Math.abs(balance).toLocaleString('ar-IQ');
  return balance >= 0 ? `${formatted} د.ع` : `-${formatted} د.ع`;
};

// Mutation to suspend/activate a merchant
export const useToggleMerchantSuspension = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ merchantId, suspend }: { merchantId: string; suspend: boolean }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ is_suspended: suspend } as any)
        .eq('id', merchantId)
        .select('id');

      if (error) throw error;
      if (!data || data.length === 0) throw new Error('لم يتم تحديث الحساب. تأكد من صلاحياتك.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-merchants'] });
    },
  });
};

// Mutation to hide/unhide a merchant from the default admin list
export const useToggleMerchantHidden = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ merchantId, hide }: { merchantId: string; hide: boolean }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ is_hidden: hide } as any)
        .eq('id', merchantId)
        .select('id');

      if (error) throw error;
      if (!data || data.length === 0) throw new Error('لم يتم تحديث الحساب. تأكد من صلاحياتك.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-merchants'] });
    },
  });
};


// Mutation to permanently delete a merchant account via edge function
export const useDeleteMerchant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (merchantId: string) => {
      const { data, error } = await supabase.functions.invoke('admin-delete-merchant', {
        body: { merchantId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-merchants'] });
    },
  });
};

// Mutation to update merchant tier
export const useUpdateMerchantTier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ merchantId, tier }: { merchantId: string; tier: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ merchant_tier: tier })
        .eq('id', merchantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-merchants'] });
    },
  });
};

// Mutation to settle merchant balance (create withdrawal transaction)
export const useSettleMerchantBalance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ merchantId, amount }: { merchantId: string; amount: number }) => {
      // Get wallet ID
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('id, balance, total_withdrawn')
        .eq('merchant_id', merchantId)
        .single();

      if (walletError) throw walletError;
      if (!wallet) throw new Error('المحفظة غير موجودة');
      if ((wallet.balance || 0) < amount) throw new Error('الرصيد غير كافٍ');

      // Update wallet balance (RLS allows admin to update)
      const { error: updateError } = await supabase
        .from('wallets')
        .update({
          balance: (wallet.balance || 0) - amount,
          total_withdrawn: (wallet.total_withdrawn || 0) + amount,
        })
        .eq('id', wallet.id);

      if (updateError) throw updateError;

      // Record the withdrawal transaction in the ledger
      const { data: txData, error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          wallet_id: wallet.id,
          amount: -amount,
          type: 'debit',
          description: `تسوية رصيد: ${amount.toLocaleString('ar-IQ')} د.ع`,
        })
        .select('id')
        .single();

      if (txError) throw txError;

      // Create settlement receipt
      const { data: { user } } = await supabase.auth.getUser();
      const { data: receiptData, error: receiptError } = await supabase
        .from('settlement_receipts' as any)
        .insert({
          merchant_id: merchantId,
          wallet_transaction_id: txData.id,
          amount,
          description: `تسوية رصيد: ${amount.toLocaleString('ar-IQ')} د.ع`,
          settled_by: user?.id,
        })
        .select('id')
        .single();

      if (receiptError) throw receiptError;

      // Link delivered + unpaid orders to this settlement (per-order mapping)
      const { data: unpaidOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('merchant_id', merchantId)
        .eq('status', 'delivered');

      if (unpaidOrders && unpaidOrders.length > 0) {
        const orderIds = unpaidOrders.map((o: any) => o.id);
        const { data: alreadyLinked } = await supabase
          .from('settlement_order_links' as any)
          .select('order_id')
          .in('order_id', orderIds);

        const linkedIds = new Set((alreadyLinked || []).map((l: any) => l.order_id));
        const toLink = orderIds.filter((id: string) => !linkedIds.has(id));

        if (toLink.length > 0) {
          const settlementId = (receiptData as any).id;
          await supabase
            .from('settlement_order_links' as any)
            .insert(toLink.map((order_id: string) => ({ settlement_id: settlementId, order_id })));
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-merchants'] });
      queryClient.invalidateQueries({ queryKey: ['settlement-receipts'] });
    },
  });
};
