import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type IssueStatus =
  | 'new'
  | 'in_progress'
  | 'waiting_merchant'
  | 'declined'
  | 'duplicate'
  | 'postponed'
  | 'solved';

export const TERMINAL_STATUSES: IssueStatus[] = ['solved', 'declined', 'duplicate'];
export const OPEN_STATUSES: IssueStatus[] = [
  'new',
  'in_progress',
  'waiting_merchant',
  'postponed',
];

export type IssueUrgency = 'low' | 'medium' | 'high';

export interface AdminIssue {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  orderStatus: string | null;
  issueType: string;
  reportedBy: string;
  reportedAt: string;
  status: IssueStatus;
  urgency: IssueUrgency;
  adminNotes: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  duplicateOf: string | null;
}

export const useAdminIssues = () => {
  return useQuery({
    queryKey: ['admin-issues'],
    queryFn: async (): Promise<AdminIssue[]> => {
      const { data: issues, error } = await supabase
        .from('issue_reports')
        .select('id, order_id, issue_type, reported_by, reported_at, status, urgency, admin_notes, duplicate_of, resolved_by, resolved_at')
        .order('reported_at', { ascending: false });

      if (error) throw error;
      if (!issues || issues.length === 0) return [];

      const orderIds = [...new Set(issues.map(i => i.order_id))];
      const userIds = [
        ...new Set([
          ...issues.map(i => i.reported_by).filter(Boolean),
          ...issues.map(i => i.resolved_by).filter(Boolean),
        ]),
      ] as string[];

      const [ordersRes, profilesRes] = await Promise.all([
        supabase.from('orders').select('id, order_number, customer_name, status').in('id', orderIds),
        userIds.length > 0
          ? supabase.from('profiles').select('id, full_name').in('id', userIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const ordersMap = new Map((ordersRes.data || []).map(o => [o.id, o]));
      const profilesMap = new Map((profilesRes.data || []).map(p => [p.id, p]));

      return issues.map(issue => {
        const order = ordersMap.get(issue.order_id);
        const reporter = issue.reported_by ? profilesMap.get(issue.reported_by) : null;
        return {
          id: issue.id,
          orderId: issue.order_id,
          orderNumber: order?.order_number || '-',
          customerName: order?.customer_name || '-',
          orderStatus: order?.status || null,
          issueType: issue.issue_type || 'غير محدد',
          reportedBy: reporter?.full_name || 'غير معروف',
          reportedAt: issue.reported_at,
          status: issue.status as IssueStatus,
          urgency: ((issue as { urgency?: string }).urgency as IssueUrgency) || 'medium',
          adminNotes: issue.admin_notes,
          resolvedBy: issue.resolved_by,
          resolvedAt: issue.resolved_at,
          duplicateOf: issue.duplicate_of,
        };
      });
    },
  });
};

/** Returns count of open issues only (for sidebar badge). */
export const useOpenIssuesCount = () => {
  const { data } = useAdminIssues();
  return (data || []).filter(i => OPEN_STATUSES.includes(i.status)).length;
};

interface UpdateIssueParams {
  id: string;
  status: IssueStatus;
  adminNotes?: string | null;
  duplicateOf?: string | null;
}

export const useUpdateIssueStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, adminNotes, duplicateOf }: UpdateIssueParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      const isTerminal = TERMINAL_STATUSES.includes(status);
      const update: Record<string, unknown> = {
        status,
        resolved_by: isTerminal ? user?.id ?? null : null,
        resolved_at: isTerminal ? new Date().toISOString() : null,
      };
      if (adminNotes !== undefined) update.admin_notes = adminNotes;
      if (duplicateOf !== undefined) update.duplicate_of = duplicateOf;

      const { error } = await supabase.from('issue_reports').update(update).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-issues'] }),
  });
};

export const useUpdateIssueNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, adminNotes }: { id: string; adminNotes: string | null }) => {
      const { error } = await supabase
        .from('issue_reports')
        .update({ admin_notes: adminNotes })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-issues'] }),
  });
};

export const useBulkUpdateIssueStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: IssueStatus }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const isTerminal = TERMINAL_STATUSES.includes(status);
      const { error } = await supabase
        .from('issue_reports')
        .update({
          status,
          resolved_by: isTerminal ? user?.id ?? null : null,
          resolved_at: isTerminal ? new Date().toISOString() : null,
        })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-issues'] }),
  });
};

export const useDeleteIssue = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('issue_reports').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-issues'] }),
  });
};

export const useUpdateIssueUrgency = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, urgency }: { id: string; urgency: IssueUrgency }) => {
      const { error } = await supabase
        .from('issue_reports')
        .update({ urgency } as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-issues'] }),
  });
};

export const useBulkUpdateIssueUrgency = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, urgency }: { ids: string[]; urgency: IssueUrgency }) => {
      const { error } = await supabase
        .from('issue_reports')
        .update({ urgency } as never)
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-issues'] }),
  });
};
