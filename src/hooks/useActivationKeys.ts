import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface ActivationKey {
  id: string;
  code: string;
  role: AppRole;
  label: string | null;
  expires_at: string;
  is_used: boolean | null;
  used_by: string | null;
  used_at: string | null;
  created_by: string | null;
  created_at: string;
  used_by_profile?: {
    full_name: string;
  } | null;
}

interface CreateKeyInput {
  role: AppRole;
  label?: string;
  expiresInDays: number;
  merchantTier?: 'basic' | 'professional';
}

// Generate a random key code with role prefix
function generateKeyCode(role: AppRole): string {
  const prefix = {
    admin: 'ADMIN',
    staff: 'STAFF',
    merchant: 'MERCH',
    guest: 'GUEST'
  }[role];
  
  const randomPart = () => 
    Math.random().toString(36).substring(2, 6).toUpperCase();
  
  return `${prefix}-${randomPart()}-${randomPart()}`;
}

export const useActivationKeys = () => {
  return useQuery({
    queryKey: ['activation-keys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activation_keys')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch profiles for used keys
      const usedByIds = data
        .filter(key => key.used_by)
        .map(key => key.used_by as string);
      
      let profiles: Record<string, { full_name: string }> = {};
      
      if (usedByIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', usedByIds);
        
        if (profilesData) {
          profiles = profilesData.reduce((acc, p) => {
            acc[p.id] = { full_name: p.full_name };
            return acc;
          }, {} as Record<string, { full_name: string }>);
        }
      }
      
      return data.map(key => ({
        ...key,
        used_by_profile: key.used_by ? profiles[key.used_by] : null
      })) as ActivationKey[];
    }
  });
};

export const useCreateActivationKey = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateKeyInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('غير مصرح');
      
      const code = generateKeyCode(input.role);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);
      
      const { data, error } = await supabase
        .from('activation_keys')
        .insert({
          code,
          role: input.role,
          label: input.label || null,
          expires_at: expiresAt.toISOString(),
          created_by: user.id,
          merchant_tier: input.merchantTier || 'basic',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activation-keys'] });
    }
  });
};

export const useDeleteActivationKey = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (keyId: string) => {
      const { error } = await supabase
        .from('activation_keys')
        .delete()
        .eq('id', keyId)
        .eq('is_used', false); // Only delete unused keys
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activation-keys'] });
    }
  });
};

export const useUserActivationKey = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['user-activation-key', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('activation_keys')
        .select('*')
        .eq('used_by', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // No rows found
        throw error;
      }
      
      return data;
    },
    enabled: !!userId
  });
};

export const useChangeActivationKey = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, newKeyCode }: { userId: string; newKeyCode: string }) => {
      // 1. Validate the new key
      const { data: isValid } = await supabase.rpc('validate_activation_key', {
        key_code: newKeyCode
      });
      
      if (!isValid) {
        throw new Error('مفتاح التفعيل غير صالح أو منتهي الصلاحية');
      }
      
      // 2. Get the new key's role
      const { data: newKey } = await supabase
        .from('activation_keys')
        .select('role')
        .eq('code', newKeyCode)
        .eq('is_used', false)
        .single();
      
      if (!newKey) {
        throw new Error('مفتاح التفعيل غير صالح');
      }
      
      // 3. Mark the new key as used
      await supabase.rpc('use_activation_key', {
        key_code: newKeyCode,
        p_user_id: userId
      });
      
      // 4. Update user's role
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: newKey.role })
        .eq('user_id', userId);
      
      if (roleError) throw roleError;
      
      // 5. Handle wallet based on new role
      if (newKey.role === 'merchant') {
        // Create wallet if doesn't exist
        const { data: existingWallet } = await supabase
          .from('wallets')
          .select('id')
          .eq('merchant_id', userId)
          .single();
        
        if (!existingWallet) {
          await supabase.from('wallets').insert({
            merchant_id: userId,
            balance: 0,
            total_earned: 0,
            total_withdrawn: 0
          });
        }
      }
      
      return newKey.role;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-activation-key', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['activation-keys'] });
    }
  });
};
