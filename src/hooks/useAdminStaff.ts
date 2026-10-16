import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminStaff {
  id: string;
  name: string;
  phone: string | null;
  status: 'active' | 'suspended';
  joinedAt: string;
  shiftId: string | null;
  shiftName: string | null;
}

export interface StaffCandidate {
  id: string;
  name: string;
  phone: string | null;
}

// Fetch all staff members
export const useAdminStaff = () => {
  return useQuery({
    queryKey: ['admin-staff'],
    queryFn: async (): Promise<AdminStaff[]> => {
      // Step 1: Get all staff from user_roles
      const { data: staffRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, created_at')
        .eq('role', 'staff');

      if (rolesError) throw rolesError;
      if (!staffRoles?.length) return [];

      const staffIds = staffRoles.map((s) => s.user_id);

      // Step 2: Fetch profiles for staff
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, phone, is_suspended, shift_id')
        .in('id', staffIds);

      if (profilesError) throw profilesError;

      // Step 3: Fetch active shifts for name resolution
      const { data: shifts, error: shiftsError } = await supabase
        .from('attendance_shifts')
        .select('id, name');

      if (shiftsError) throw shiftsError;

      const shiftMap = new Map((shifts || []).map((s) => [s.id, s.name]));

      // Combine data
      return staffIds.map((id) => {
        const profile = profiles?.find((p) => p.id === id);
        const roleData = staffRoles.find((r) => r.user_id === id);
        const shiftId = profile?.shift_id || null;

        return {
          id,
          name: profile?.full_name || 'غير معروف',
          phone: profile?.phone || null,
          status: profile?.is_suspended ? 'suspended' as const : 'active' as const,
          joinedAt: roleData?.created_at || '',
          shiftId,
          shiftName: shiftId ? (shiftMap.get(shiftId) || null) : null,
        };
      });
    },
  });
};

// Fetch users who can become staff (don't have staff role yet)
export const useStaffCandidates = () => {
  return useQuery({
    queryKey: ['staff-candidates'],
    queryFn: async (): Promise<StaffCandidate[]> => {
      // Get all profiles
      const { data: allProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, phone');

      if (profilesError) throw profilesError;
      if (!allProfiles?.length) return [];

      // Get existing staff
      const { data: staffRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'staff');

      if (rolesError) throw rolesError;

      const staffIds = new Set(staffRoles?.map((r) => r.user_id) || []);

      // Filter out existing staff
      return allProfiles
        .filter((p) => !staffIds.has(p.id))
        .map((p) => ({
          id: p.id,
          name: p.full_name || 'غير معروف',
          phone: p.phone,
        }));
    },
  });
};

// Add staff role to a user
export const useAddStaffRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'staff' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
      queryClient.invalidateQueries({ queryKey: ['staff-candidates'] });
    },
  });
};

// Remove staff role from a user
export const useRemoveStaffRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'staff');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
      queryClient.invalidateQueries({ queryKey: ['staff-candidates'] });
    },
  });
};

// Toggle staff suspension status
export const useToggleStaffSuspension = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ staffId, suspend }: { staffId: string; suspend: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_suspended: suspend })
        .eq('id', staffId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
    },
  });
};
