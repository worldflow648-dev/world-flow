import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  expense_date: string;
  created_at: string;
  created_by: string | null;
}

export interface CreateExpenseData {
  category: string;
  amount: number;
  description?: string;
  expense_date?: string;
}

const categoryLabels: Record<string, string> = {
  ads: 'إعلانات',
  rent: 'إيجار',
  salaries: 'رواتب',
  other: 'أخرى',
};

export const getCategoryLabel = (category: string) => categoryLabels[category] || category;

export const useExpenses = (filters?: { category?: string }) => {
  return useQuery({
    queryKey: ['expenses', filters],
    queryFn: async () => {
      let query = supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      if (filters?.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Expense[];
    },
  });
};

export const useTotalExpenses = () => {
  return useQuery({
    queryKey: ['total-expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('amount');
      if (error) throw error;
      return data?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
    },
  });
};

export const useCreateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expense: CreateExpenseData) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('expenses')
        .insert({
          category: expense.category,
          amount: expense.amount,
          description: expense.description || null,
          expense_date: expense.expense_date || new Date().toISOString().split('T')[0],
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['total-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['admin-financial-overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
    },
  });
};

export const useDeleteExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['total-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['admin-financial-overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
    },
  });
};
