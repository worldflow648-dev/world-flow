import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ====== Types ======

export interface AttendanceShift {
  id: string;
  name: string;
  shift_start: string; // "HH:MM:SS" or "HH:MM"
  shift_end: string;
  grace_minutes: number;
  absent_after_minutes: number;
  overtime_enabled: boolean;
  overtime_rate_per_hour: number;
  overtime_min_minutes: number;
  is_active: boolean;
  created_at: string;
}

export interface AttendanceSettings {
  required: boolean;
}

export interface AttendanceRecord {
  id: string;
  staff_id: string;
  check_in_at: string;
  check_out_at: string | null;
  work_date: string;
  status: 'on_time' | 'late';
  shift_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OvertimePayment {
  id: string;
  attendance_id: string;
  staff_id: string;
  minutes: number;
  amount: number;
  note: string | null;
  paid_by: string;
  paid_at: string;
}

export interface AdminAttendanceRow {
  staff_id: string;
  staff_name: string;
  staff_phone: string | null;
  shift_id: string | null;
  shift_name: string | null;
  attendance: AttendanceRecord | null;
  derived_status: 'on_time' | 'late' | 'absent' | 'working' | 'pending_checkin' | 'no_shift';
  worked_minutes: number | null;
  overtime_minutes: number;
  overtime_amount: number;
  overtime_paid: boolean;
}

const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const normalizeTime = (t: string) => t.slice(0, 5); // "HH:MM:SS" -> "HH:MM"

/**
 * Compute overtime minutes & amount for a record given the shift it was checked into.
 */
export const computeOvertime = (
  record: AttendanceRecord | null,
  shift: AttendanceShift | null,
): { minutes: number; amount: number } => {
  if (!record || !record.check_out_at || !shift || !shift.overtime_enabled) {
    return { minutes: 0, amount: 0 };
  }
  const [h, m] = normalizeTime(shift.shift_end).split(':').map(Number);
  const [y, mo, d] = record.work_date.split('-').map(Number);
  const shiftEndDt = new Date(y, (mo || 1) - 1, d || 1, h || 0, m || 0, 0, 0);
  const checkOut = new Date(record.check_out_at);
  const diff = Math.round((checkOut.getTime() - shiftEndDt.getTime()) / 60000);
  if (diff < shift.overtime_min_minutes) return { minutes: 0, amount: 0 };
  const minutes = Math.max(0, diff);
  const amount = Math.round((minutes * shift.overtime_rate_per_hour) / 60);
  return { minutes, amount };
};

// ====== Global toggle (only `required` left in app_settings) ======

export const useAttendanceSettings = () => {
  return useQuery({
    queryKey: ['attendance-settings'],
    queryFn: async (): Promise<AttendanceSettings> => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .eq('key', 'attendance_required');
      if (error) throw error;
      const required = data?.[0]?.value !== 'false';
      return { required };
    },
  });
};

export const useUpdateAttendanceSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: AttendanceSettings) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('app_settings').upsert({
        key: 'attendance_required',
        value: settings.required ? 'true' : 'false',
        updated_at: new Date().toISOString(),
        updated_by: user?.id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance-settings'] });
    },
  });
};

// ====== Shifts CRUD ======

export const useAttendanceShifts = (includeInactive = false) => {
  return useQuery({
    queryKey: ['attendance-shifts', includeInactive],
    queryFn: async (): Promise<AttendanceShift[]> => {
      let q = supabase.from('attendance_shifts').select('*').order('shift_start', { ascending: true });
      if (!includeInactive) q = q.eq('is_active', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data as AttendanceShift[]) || [];
    },
  });
};

export const useCreateShift = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<AttendanceShift, 'id' | 'created_at' | 'is_active'> & { is_active?: boolean }) => {
      const { error } = await supabase.from('attendance_shifts').insert({
        name: input.name,
        shift_start: input.shift_start,
        shift_end: input.shift_end,
        grace_minutes: input.grace_minutes,
        absent_after_minutes: input.absent_after_minutes,
        overtime_enabled: input.overtime_enabled,
        overtime_rate_per_hour: input.overtime_rate_per_hour,
        overtime_min_minutes: input.overtime_min_minutes,
        is_active: input.is_active ?? true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance-shifts'] });
    },
  });
};

export const useUpdateShift = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<AttendanceShift> & { id: string }) => {
      const { id, ...rest } = input;
      const { error } = await supabase.from('attendance_shifts').update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance-shifts'] });
      qc.invalidateQueries({ queryKey: ['my-shift'] });
      qc.invalidateQueries({ queryKey: ['admin-attendance'] });
      qc.invalidateQueries({ queryKey: ['overtime-range'] });
    },
  });
};

export const useDeactivateShift = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('attendance_shifts').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance-shifts'] });
    },
  });
};

// ====== Per-staff shift assignment ======

export const useMyShift = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-shift', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<AttendanceShift | null> => {
      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('shift_id')
        .eq('id', user!.id)
        .maybeSingle();
      if (pErr) throw pErr;
      const shiftId = profile?.shift_id as string | null | undefined;
      if (!shiftId) return null;
      const { data: shift, error: sErr } = await supabase
        .from('attendance_shifts')
        .select('*')
        .eq('id', shiftId)
        .maybeSingle();
      if (sErr) throw sErr;
      return (shift as AttendanceShift | null) || null;
    },
  });
};

export const useAssignStaffShift = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ staffId, shiftId }: { staffId: string; shiftId: string | null }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ shift_id: shiftId })
        .eq('id', staffId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-staff'] });
      qc.invalidateQueries({ queryKey: ['my-shift'] });
      qc.invalidateQueries({ queryKey: ['admin-attendance'] });
      qc.invalidateQueries({ queryKey: ['overtime-range'] });
    },
  });
};

// ====== Staff: today + history ======

export const useMyAttendanceToday = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-attendance-today', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<AttendanceRecord | null> => {
      const { data, error } = await supabase
        .from('staff_attendance')
        .select('*')
        .eq('staff_id', user!.id)
        .eq('work_date', todayStr())
        .maybeSingle();
      if (error) throw error;
      return (data as AttendanceRecord | null) || null;
    },
  });
};

const computeStatusForShift = (shift: AttendanceShift): 'on_time' | 'late' => {
  const now = new Date();
  const [h, m] = normalizeTime(shift.shift_start).split(':').map(Number);
  const cutoff = new Date(now);
  cutoff.setHours(h, m + shift.grace_minutes, 0, 0);
  return now.getTime() <= cutoff.getTime() ? 'on_time' : 'late';
};

export const useCheckIn = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: myShift } = useMyShift();
  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('NOT_AUTHENTICATED');
      if (!myShift) throw new Error('NO_SHIFT_ASSIGNED');
      const status = computeStatusForShift(myShift);
      const { data, error } = await supabase
        .from('staff_attendance')
        .insert({
          staff_id: user.id,
          check_in_at: new Date().toISOString(),
          work_date: todayStr(),
          status,
          shift_id: myShift.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-attendance-today'] });
      qc.invalidateQueries({ queryKey: ['my-attendance-history'] });
      qc.invalidateQueries({ queryKey: ['admin-attendance'] });
    },
  });
};

export const useCheckOut = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (recordId: string) => {
      const { error } = await supabase
        .from('staff_attendance')
        .update({ check_out_at: new Date().toISOString() })
        .eq('id', recordId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-attendance-today'] });
      qc.invalidateQueries({ queryKey: ['my-attendance-history'] });
      qc.invalidateQueries({ queryKey: ['admin-attendance'] });
    },
  });
};

export const useMyAttendanceHistory = (days = 30) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-attendance-history', user?.id, days],
    enabled: !!user?.id,
    queryFn: async (): Promise<AttendanceRecord[]> => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const sinceStr = since.toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('staff_attendance')
        .select('*')
        .eq('staff_id', user!.id)
        .gte('work_date', sinceStr)
        .order('work_date', { ascending: false });
      if (error) throw error;
      return (data as AttendanceRecord[]) || [];
    },
  });
};

export const useMyOvertimePaymentsForRecords = (recordIds: string[]) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-overtime-payments', user?.id, recordIds.sort().join(',')],
    enabled: !!user?.id && recordIds.length > 0,
    queryFn: async (): Promise<Record<string, OvertimePayment>> => {
      const { data, error } = await supabase
        .from('attendance_overtime_payments')
        .select('*')
        .eq('staff_id', user!.id)
        .in('attendance_id', recordIds);
      if (error) throw error;
      const map: Record<string, OvertimePayment> = {};
      (data as OvertimePayment[] | null)?.forEach((p) => { map[p.attendance_id] = p; });
      return map;
    },
  });
};

// ====== Admin: daily log ======

export const useAdminAttendance = (date: string, shiftIdFilter?: string | 'all') => {
  const { data: shifts } = useAttendanceShifts(true);
  return useQuery({
    queryKey: ['admin-attendance', date, shiftIdFilter || 'all', shifts?.length || 0],
    enabled: !!shifts,
    queryFn: async (): Promise<AdminAttendanceRow[]> => {
      const shiftMap = new Map<string, AttendanceShift>();
      (shifts || []).forEach(s => shiftMap.set(s.id, s));

      // 1. Fetch all staff
      const { data: roles, error: rolesErr } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'staff');
      if (rolesErr) throw rolesErr;
      const staffIds = (roles || []).map(r => r.user_id);
      if (staffIds.length === 0) return [];

      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, full_name, phone, shift_id')
        .in('id', staffIds);
      if (profErr) throw profErr;

      // 2. Fetch attendance for that date
      const { data: attendance, error: attErr } = await supabase
        .from('staff_attendance')
        .select('*')
        .eq('work_date', date)
        .in('staff_id', staffIds);
      if (attErr) throw attErr;

      const attMap = new Map<string, AttendanceRecord>();
      (attendance as AttendanceRecord[] | null)?.forEach(a => attMap.set(a.staff_id, a));

      // 3. Fetch overtime payments
      const attIds = (attendance as AttendanceRecord[] | null)?.map(a => a.id) || [];
      const paidSet = new Set<string>();
      if (attIds.length > 0) {
        const { data: payments, error: payErr } = await supabase
          .from('attendance_overtime_payments')
          .select('attendance_id')
          .in('attendance_id', attIds);
        if (payErr) throw payErr;
        (payments as { attendance_id: string }[] | null)?.forEach(p => paidSet.add(p.attendance_id));
      }

      const today = todayStr();
      const isToday = date === today;
      const isFuture = date > today;
      const now = new Date();

      const rows: AdminAttendanceRow[] = (profiles || []).map((p) => {
        const profileShiftId = (p.shift_id as string | null) || null;
        const profileShift = profileShiftId ? shiftMap.get(profileShiftId) || null : null;
        const att = attMap.get(p.id) || null;
        // Use the attendance row's captured shift for OT/status of past data; fall back to profile shift for "today"/future
        const recordShiftId = att?.shift_id || profileShiftId;
        const recordShift = recordShiftId ? shiftMap.get(recordShiftId) || null : null;

        let derived: AdminAttendanceRow['derived_status'] = 'absent';
        let workedMinutes: number | null = null;

        if (att) {
          if (att.check_out_at) {
            workedMinutes = Math.round(
              (new Date(att.check_out_at).getTime() - new Date(att.check_in_at).getTime()) / 60000
            );
            derived = att.status === 'late' ? 'late' : 'on_time';
          } else {
            derived = 'working';
          }
        } else if (!profileShift) {
          derived = 'no_shift';
        } else if (isFuture) {
          derived = 'pending_checkin';
        } else if (isToday) {
          // Past absent threshold (relative to assigned shift)?
          const [h, m] = normalizeTime(profileShift.shift_start).split(':').map(Number);
          const threshold = new Date();
          threshold.setHours(h, m + profileShift.absent_after_minutes, 0, 0);
          derived = now.getTime() >= threshold.getTime() ? 'absent' : 'pending_checkin';
        } else {
          derived = 'absent';
        }

        const ot = computeOvertime(att, recordShift);

        return {
          staff_id: p.id,
          staff_name: p.full_name || 'غير معروف',
          staff_phone: p.phone,
          shift_id: profileShiftId,
          shift_name: profileShift?.name || null,
          attendance: att,
          derived_status: derived,
          worked_minutes: workedMinutes,
          overtime_minutes: ot.minutes,
          overtime_amount: ot.amount,
          overtime_paid: att ? paidSet.has(att.id) : false,
        };
      });

      if (shiftIdFilter && shiftIdFilter !== 'all') {
        return rows.filter(r => r.shift_id === shiftIdFilter);
      }
      return rows;
    },
  });
};

// ====== Warnings (cross-shift aggregate) ======

export const useAttendanceWarnings = () => {
  const today = todayStr();
  const { data: shifts } = useAttendanceShifts();
  const { data } = useAdminAttendance(today);

  // Past any shift's start?
  let pastAnyShiftStart = false;
  if (shifts && shifts.length > 0) {
    const now = new Date();
    pastAnyShiftStart = shifts.some(s => {
      const [h, m] = normalizeTime(s.shift_start).split(':').map(Number);
      const start = new Date();
      start.setHours(h, m, 0, 0);
      return now.getTime() >= start.getTime();
    });
  }

  const pendingCount = data?.filter(r => r.derived_status === 'pending_checkin').length || 0;
  const absentCount = data?.filter(r => r.derived_status === 'absent').length || 0;

  return {
    pendingCount: pastAnyShiftStart ? pendingCount : 0,
    absentCount: pastAnyShiftStart ? absentCount : 0,
    pastShiftStart: pastAnyShiftStart,
  };
};

// ====== Overtime range view ======

export interface OvertimeRangeRow {
  staff_id: string;
  staff_name: string;
  staff_phone: string | null;
  shift_id: string | null;
  shift_name: string | null;
  total_minutes: number;
  total_amount: number;
  paid_minutes: number;
  paid_amount: number;
  unpaid_minutes: number;
  unpaid_amount: number;
  unpaid_attendance_ids: string[];
  shifts: Array<{
    attendance_id: string;
    work_date: string;
    minutes: number;
    amount: number;
    paid: boolean;
  }>;
}

export const useOvertimeRange = (from: string, to: string, shiftIdFilter?: string | 'all') => {
  const { data: shifts } = useAttendanceShifts(true);
  return useQuery({
    queryKey: ['overtime-range', from, to, shiftIdFilter || 'all', shifts?.length || 0],
    enabled: !!shifts,
    queryFn: async (): Promise<OvertimeRangeRow[]> => {
      const shiftMap = new Map<string, AttendanceShift>();
      (shifts || []).forEach(s => shiftMap.set(s.id, s));

      // 1. All staff
      const { data: roles, error: rolesErr } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'staff');
      if (rolesErr) throw rolesErr;
      const staffIds = (roles || []).map(r => r.user_id);
      if (staffIds.length === 0) return [];

      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, full_name, phone, shift_id')
        .in('id', staffIds);
      if (profErr) throw profErr;

      // 2. All attendance with check_out in range
      const { data: attendance, error: attErr } = await supabase
        .from('staff_attendance')
        .select('*')
        .gte('work_date', from)
        .lte('work_date', to)
        .in('staff_id', staffIds)
        .not('check_out_at', 'is', null);
      if (attErr) throw attErr;

      const attRows = (attendance as AttendanceRecord[] | null) || [];
      const attIds = attRows.map(a => a.id);

      // 3. Payments
      const paidSet = new Set<string>();
      if (attIds.length > 0) {
        const { data: payments, error: payErr } = await supabase
          .from('attendance_overtime_payments')
          .select('attendance_id')
          .in('attendance_id', attIds);
        if (payErr) throw payErr;
        (payments as { attendance_id: string }[] | null)?.forEach(p => paidSet.add(p.attendance_id));
      }

      // 4. Build per-staff map
      const byStaff = new Map<string, OvertimeRangeRow>();
      (profiles || []).forEach(p => {
        const profileShiftId = (p.shift_id as string | null) || null;
        const profileShift = profileShiftId ? shiftMap.get(profileShiftId) || null : null;
        byStaff.set(p.id, {
          staff_id: p.id,
          staff_name: p.full_name || 'غير معروف',
          staff_phone: p.phone,
          shift_id: profileShiftId,
          shift_name: profileShift?.name || null,
          total_minutes: 0,
          total_amount: 0,
          paid_minutes: 0,
          paid_amount: 0,
          unpaid_minutes: 0,
          unpaid_amount: 0,
          unpaid_attendance_ids: [],
          shifts: [],
        });
      });

      attRows.forEach(rec => {
        const recordShift = rec.shift_id ? shiftMap.get(rec.shift_id) || null : null;
        const ot = computeOvertime(rec, recordShift);
        if (ot.minutes <= 0) return;
        const row = byStaff.get(rec.staff_id);
        if (!row) return;
        const paid = paidSet.has(rec.id);
        row.total_minutes += ot.minutes;
        row.total_amount += ot.amount;
        if (paid) {
          row.paid_minutes += ot.minutes;
          row.paid_amount += ot.amount;
        } else {
          row.unpaid_minutes += ot.minutes;
          row.unpaid_amount += ot.amount;
          row.unpaid_attendance_ids.push(rec.id);
        }
        row.shifts.push({
          attendance_id: rec.id,
          work_date: rec.work_date,
          minutes: ot.minutes,
          amount: ot.amount,
          paid,
        });
      });

      let result = Array.from(byStaff.values()).filter(r => r.total_minutes > 0);
      if (shiftIdFilter && shiftIdFilter !== 'all') {
        result = result.filter(r => r.shift_id === shiftIdFilter);
      }
      return result;
    },
  });
};

export const useMarkOvertimePaid = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      attendance_id: string;
      staff_id: string;
      minutes: number;
      amount: number;
      note?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error('NOT_AUTHENTICATED');
      const { error } = await supabase
        .from('attendance_overtime_payments')
        .insert({
          attendance_id: input.attendance_id,
          staff_id: input.staff_id,
          minutes: input.minutes,
          amount: input.amount,
          note: input.note || null,
          paid_by: user.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-attendance'] });
      qc.invalidateQueries({ queryKey: ['overtime-range'] });
      qc.invalidateQueries({ queryKey: ['my-overtime-payments'] });
    },
  });
};

export const useMarkOvertimePaidBulk = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      staff_id: string;
      shifts: Array<{ attendance_id: string; minutes: number; amount: number }>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error('NOT_AUTHENTICATED');
      if (input.shifts.length === 0) return;
      const rows = input.shifts.map(s => ({
        attendance_id: s.attendance_id,
        staff_id: input.staff_id,
        minutes: s.minutes,
        amount: s.amount,
        paid_by: user.id,
      }));
      const { error } = await supabase
        .from('attendance_overtime_payments')
        .insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-attendance'] });
      qc.invalidateQueries({ queryKey: ['overtime-range'] });
      qc.invalidateQueries({ queryKey: ['my-overtime-payments'] });
    },
  });
};
