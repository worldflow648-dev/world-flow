import { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Clock, Save, Download, Calendar, AlertTriangle, Sparkles, Wallet, Plus, Pencil, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  useAttendanceSettings,
  useUpdateAttendanceSettings,
  useAttendanceShifts,
  useDeactivateShift,
  useAdminAttendance,
  useOvertimeRange,
  useMarkOvertimePaid,
  useMarkOvertimePaidBulk,
  type AdminAttendanceRow,
  type OvertimeRangeRow,
  type AttendanceShift,
} from '@/hooks/useAttendance';
import { exportToCSV, formatDateForExport } from '@/lib/exportUtils';
import ShiftFormDialog from '@/components/admin/ShiftFormDialog';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const firstOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const formatTime = (iso: string | null) => iso
  ? new Date(iso).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })
  : '—';

const formatDuration = (mins: number | null) => {
  if (mins === null || mins === 0) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h} س ${m} د` : `${m} د`;
};

const formatIQD = (n: number) => `${n.toLocaleString('ar-IQ')} د.ع`;

const StatusBadge = ({ status }: { status: AdminAttendanceRow['derived_status'] }) => {
  if (status === 'pending_checkin') {
    return <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400">لم يسجّل بعد</Badge>;
  }
  if (status === 'no_shift') {
    return <Badge variant="outline" className="border-muted-foreground/50 text-muted-foreground">بدون دوام</Badge>;
  }
  const map = {
    on_time: { label: 'في الوقت', variant: 'secondary' as const },
    late: { label: 'متأخر', variant: 'destructive' as const },
    absent: { label: 'غائب', variant: 'outline' as const },
    working: { label: 'يعمل الآن', variant: 'default' as const },
  };
  const c = map[status as keyof typeof map];
  return <Badge variant={c.variant}>{c.label}</Badge>;
};

const OvertimeBadge = ({ row, onPay }: { row: AdminAttendanceRow; onPay: () => void }) => {
  if (row.overtime_minutes <= 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
      <Badge className="bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30 hover:bg-violet-500/20 gap-1">
        <Sparkles className="w-3 h-3" />
        وقت إضافي: {formatDuration(row.overtime_minutes)} — {formatIQD(row.overtime_amount)}
      </Badge>
      {row.overtime_paid ? (
        <Badge variant="secondary" className="text-xs">مدفوع</Badge>
      ) : (
        <Button size="sm" variant="outline" className="h-6 px-2 text-xs gap-1" onClick={onPay}>
          <Wallet className="w-3 h-3" />
          تسجيل الدفع
        </Button>
      )}
    </div>
  );
};

// ====== Shifts Manager ======
const ShiftsManager = () => {
  const { data: shifts, isLoading } = useAttendanceShifts(true);
  const deactivate = useDeactivateShift();
  const [editing, setEditing] = useState<AttendanceShift | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDeactivate, setToDeactivate] = useState<AttendanceShift | null>(null);

  return (
    <Card className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-lg">إدارة الورديات</h3>
          <p className="text-xs text-muted-foreground mt-1">
            أنشئ ورديات متعددة وعيّن كل موظف لوردية واحدة من صفحة الموظفين.
          </p>
        </div>
        <Button onClick={() => setCreating(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          إضافة دوام
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !shifts || shifts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg">
          لا توجد ورديات بعد. ابدأ بإضافة دوام.
        </div>
      ) : (
        <div className="space-y-2">
          {shifts.map(s => (
            <div
              key={s.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 ${
                s.is_active ? 'bg-card' : 'bg-muted/40 opacity-70'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold">{s.name}</p>
                  {!s.is_active && <Badge variant="outline" className="text-xs">معطل</Badge>}
                  {s.overtime_enabled && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Sparkles className="w-3 h-3" />
                      وقت إضافي
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {s.shift_start.slice(0, 5)} – {s.shift_end.slice(0, 5)}
                  {' • '}سماح: {s.grace_minutes} د
                  {' • '}غياب بعد: {s.absent_after_minutes} د
                  {s.overtime_enabled && ` • أجر/س: ${formatIQD(Number(s.overtime_rate_per_hour))}`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => setEditing(s)} title="تعديل">
                  <Pencil className="w-4 h-4" />
                </Button>
                {s.is_active && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setToDeactivate(s)}
                    title="تعطيل"
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ShiftFormDialog
        open={creating}
        onOpenChange={setCreating}
        shift={null}
      />
      <ShiftFormDialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        shift={editing}
      />

      <AlertDialog open={!!toDeactivate} onOpenChange={(v) => !v && setToDeactivate(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تعطيل الدوام</AlertDialogTitle>
            <AlertDialogDescription>
              سيختفي <strong>{toDeactivate?.name}</strong> من قوائم الاختيار، لكن السجلات السابقة المرتبطة به ستبقى.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!toDeactivate) return;
                deactivate.mutate(toDeactivate.id, {
                  onSuccess: () => {
                    toast.success('تم تعطيل الدوام');
                    setToDeactivate(null);
                  },
                  onError: () => toast.error('فشل تعطيل الدوام'),
                });
              }}
            >
              تعطيل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

// ====== Settings tab ======
const SettingsTab = () => {
  const { data, isLoading } = useAttendanceSettings();
  const update = useUpdateAttendanceSettings();
  const [required, setRequired] = useState(true);

  useEffect(() => {
    if (data) setRequired(data.required);
  }, [data]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <Card className="p-4 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label className="text-base">تفعيل تسجيل الحضور</Label>
            <p className="text-xs text-muted-foreground mt-1">
              عند الإيقاف، لن يظهر زر تسجيل الحضور للموظفين.
            </p>
          </div>
          <Switch checked={required} onCheckedChange={setRequired} />
        </div>
        <Button
          className="w-full mt-4 gap-2"
          disabled={update.isPending || required === data?.required}
          onClick={() => {
            update.mutate(
              { required },
              {
                onSuccess: () => toast.success('تم حفظ الإعدادات'),
                onError: () => toast.error('فشل حفظ الإعدادات'),
              },
            );
          }}
        >
          <Save className="w-4 h-4" />
          حفظ
        </Button>
      </Card>

      <ShiftsManager />
    </div>
  );
};

// ====== Pay Overtime Dialog ======
const PayOvertimeDialog = ({
  row, open, onOpenChange,
}: {
  row: AdminAttendanceRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) => {
  const mark = useMarkOvertimePaid();
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (row) {
      setAmount(row.overtime_amount);
      setNote('');
    }
  }, [row]);

  if (!row || !row.attendance) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>تسجيل دفع الوقت الإضافي</DialogTitle>
          <DialogDescription>
            {row.staff_name} • {row.attendance.work_date}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-violet-500/10 border border-violet-500/30 p-3 text-sm">
            <p>المدة: <strong>{formatDuration(row.overtime_minutes)}</strong></p>
            <p className="mt-1">المقترح: <strong>{formatIQD(row.overtime_amount)}</strong></p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ot-amount">المبلغ المدفوع (د.ع)</Label>
            <Input
              id="ot-amount"
              type="number"
              min={0}
              value={amount}
              onChange={e => setAmount(Math.max(0, parseInt(e.target.value || '0', 10)))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ot-note">ملاحظة (اختياري)</Label>
            <Textarea id="ot-note" value={note} onChange={e => setNote(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button
            disabled={mark.isPending || amount <= 0}
            onClick={() => {
              mark.mutate(
                {
                  attendance_id: row.attendance!.id,
                  staff_id: row.staff_id,
                  minutes: row.overtime_minutes,
                  amount,
                  note,
                },
                {
                  onSuccess: () => {
                    toast.success('تم تسجيل الدفع');
                    onOpenChange(false);
                  },
                  onError: (err: Error) => toast.error(err.message || 'فشل تسجيل الدفع'),
                },
              );
            }}
          >
            تأكيد الدفع
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ALL_SHIFTS = 'all';

const LogTab = () => {
  const isMobile = useIsMobile();
  const [date, setDate] = useState(todayStr());
  const [shiftFilter, setShiftFilter] = useState<string>(ALL_SHIFTS);
  const { data: shifts } = useAttendanceShifts();
  const { data, isLoading } = useAdminAttendance(date, shiftFilter);
  const [payRow, setPayRow] = useState<AdminAttendanceRow | null>(null);

  const summary = useMemo(() => {
    const empty = { onTime: 0, late: 0, absent: 0, working: 0, pending_checkin: 0, no_shift: 0, otMinutes: 0, otAmount: 0 };
    if (!data) return empty;
    return data.reduce((acc, r) => {
      const key = r.derived_status === 'on_time' ? 'onTime' : r.derived_status;
      if (key in acc) acc[key as keyof typeof empty]++;
      acc.otMinutes += r.overtime_minutes;
      acc.otAmount += r.overtime_amount;
      return acc;
    }, { ...empty });
  }, [data]);

  const isToday = date === todayStr();
  // Show OT column if any active shift uses overtime
  const otOn = (shifts || []).some(s => s.overtime_enabled);

  const handleExport = () => {
    if (!data || data.length === 0) {
      toast.error('لا يوجد بيانات للتصدير');
      return;
    }
    const rows = data.map(r => ({
      name: r.staff_name,
      phone: r.staff_phone || '',
      shift: r.shift_name || 'بدون دوام',
      status: r.derived_status,
      checkIn: formatTime(r.attendance?.check_in_at || null),
      checkOut: formatTime(r.attendance?.check_out_at || null),
      worked: formatDuration(r.worked_minutes),
      overtime: r.overtime_minutes > 0 ? formatDuration(r.overtime_minutes) : '',
      overtimeAmount: r.overtime_amount || '',
      overtimePaid: r.overtime_minutes > 0 ? (r.overtime_paid ? 'مدفوع' : 'غير مدفوع') : '',
      date: formatDateForExport(date),
    }));
    exportToCSV(rows, `attendance-${date}`, [
      { key: 'name', label: 'الاسم' },
      { key: 'phone', label: 'الهاتف' },
      { key: 'shift', label: 'الدوام' },
      { key: 'status', label: 'الحالة' },
      { key: 'checkIn', label: 'الحضور' },
      { key: 'checkOut', label: 'الانصراف' },
      { key: 'worked', label: 'مدة العمل' },
      { key: 'overtime', label: 'الوقت الإضافي' },
      { key: 'overtimeAmount', label: 'مبلغ الوقت الإضافي' },
      { key: 'overtimePaid', label: 'حالة الدفع' },
      { key: 'date', label: 'التاريخ' },
    ]);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[180px]">
          <Label htmlFor="date">التاريخ</Label>
          <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="flex-1 min-w-[180px]">
          <Label>الدوام</Label>
          <Select value={shiftFilter} onValueChange={setShiftFilter}>
            <SelectTrigger>
              <SelectValue placeholder="كل الورديات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SHIFTS}>كل الورديات</SelectItem>
              {(shifts || []).map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={handleExport} className="gap-2">
          <Download className="w-4 h-4" />
          تصدير CSV
        </Button>
      </Card>

      {isToday && (summary.pending_checkin > 0 || summary.absent > 0) && (
        <Alert variant={summary.absent > 0 ? 'destructive' : 'default'} className={summary.absent === 0 ? 'border-amber-500/50 bg-amber-50 dark:bg-amber-950/20' : ''}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="font-bold">تنبيه الحضور</AlertTitle>
          <AlertDescription className="mt-2 space-y-1">
            {summary.pending_checkin > 0 && (
              <p>⚠️ {summary.pending_checkin} موظفون لم يسجّلوا حضورهم بعد</p>
            )}
            {summary.absent > 0 && (
              <p>⛔ {summary.absent} موظفون غائبون اليوم</p>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className={`grid grid-cols-2 gap-3 ${otOn ? 'md:grid-cols-6' : 'md:grid-cols-5'}`}>
        <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">في الوقت</p><p className="text-2xl font-bold">{summary.onTime}</p></Card>
        <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">متأخر</p><p className="text-2xl font-bold text-destructive">{summary.late}</p></Card>
        <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">يعمل الآن</p><p className="text-2xl font-bold text-primary">{summary.working}</p></Card>
        <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">لم يسجّل بعد</p><p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{summary.pending_checkin}</p></Card>
        <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">غائب</p><p className="text-2xl font-bold text-muted-foreground">{summary.absent}</p></Card>
        {otOn && (
          <Card className="p-3 text-center border-violet-500/30">
            <p className="text-xs text-muted-foreground">وقت إضافي اليوم</p>
            <p className="text-lg font-bold text-violet-600 dark:text-violet-400">
              {summary.otMinutes > 0 ? formatDuration(summary.otMinutes) : '—'}
            </p>
            {summary.otAmount > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">{formatIQD(summary.otAmount)}</p>
            )}
          </Card>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">لا يوجد موظفون مسجّلون</Card>
      ) : isMobile ? (
        <div className="space-y-2">
          {data.map(r => (
            <Card key={r.staff_id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{r.staff_name}</p>
                  <p className="text-xs text-muted-foreground">{r.staff_phone || '—'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <Clock className="w-3 h-3 inline ml-1" />
                    {r.shift_name || 'بدون دوام'}
                  </p>
                  <p className="text-xs mt-2">
                    {formatTime(r.attendance?.check_in_at || null)} – {formatTime(r.attendance?.check_out_at || null)}
                    {r.worked_minutes !== null && ` • ${formatDuration(r.worked_minutes)}`}
                  </p>
                  {otOn && <OvertimeBadge row={r} onPay={() => setPayRow(r)} />}
                </div>
                <StatusBadge status={r.derived_status} />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">الهاتف</TableHead>
                <TableHead className="text-right">الدوام</TableHead>
                <TableHead className="text-right">الحضور</TableHead>
                <TableHead className="text-right">الانصراف</TableHead>
                <TableHead className="text-right">المدة</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                {otOn && <TableHead className="text-right">الوقت الإضافي</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(r => (
                <TableRow key={r.staff_id}>
                  <TableCell className="text-right font-medium">{r.staff_name}</TableCell>
                  <TableCell className="text-right">{r.staff_phone || '—'}</TableCell>
                  <TableCell className="text-right">{r.shift_name || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-right">{formatTime(r.attendance?.check_in_at || null)}</TableCell>
                  <TableCell className="text-right">{formatTime(r.attendance?.check_out_at || null)}</TableCell>
                  <TableCell className="text-right">{formatDuration(r.worked_minutes)}</TableCell>
                  <TableCell className="text-right"><StatusBadge status={r.derived_status} /></TableCell>
                  {otOn && (
                    <TableCell className="text-right">
                      {r.overtime_minutes > 0 ? <OvertimeBadge row={r} onPay={() => setPayRow(r)} /> : '—'}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <PayOvertimeDialog row={payRow} open={!!payRow} onOpenChange={(v) => !v && setPayRow(null)} />
    </div>
  );
};

// ====== Overtime range tab ======
const OvertimeTab = () => {
  const isMobile = useIsMobile();
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(todayStr());
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'paid'>('unpaid');
  const [shiftFilter, setShiftFilter] = useState<string>(ALL_SHIFTS);
  const { data: shifts } = useAttendanceShifts();
  const { data, isLoading } = useOvertimeRange(from, to, shiftFilter);
  const bulkPay = useMarkOvertimePaidBulk();

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filter === 'unpaid') return data.filter(r => r.unpaid_minutes > 0);
    if (filter === 'paid') return data.filter(r => r.paid_minutes > 0);
    return data;
  }, [data, filter]);

  const totals = useMemo(() => {
    return (data || []).reduce(
      (acc, r) => {
        acc.total += r.total_amount;
        acc.paid += r.paid_amount;
        acc.unpaid += r.unpaid_amount;
        return acc;
      },
      { total: 0, paid: 0, unpaid: 0 },
    );
  }, [data]);

  const handleBulkPay = (row: OvertimeRangeRow) => {
    if (row.unpaid_attendance_ids.length === 0) return;
    const shiftsToPay = row.shifts.filter(s => !s.paid).map(s => ({
      attendance_id: s.attendance_id,
      minutes: s.minutes,
      amount: s.amount,
    }));
    bulkPay.mutate(
      { staff_id: row.staff_id, shifts: shiftsToPay },
      {
        onSuccess: () => toast.success(`تم دفع ${shiftsToPay.length} وردية`),
        onError: (err: Error) => toast.error(err.message || 'فشل تسجيل الدفع'),
      },
    );
  };

  const handleExport = () => {
    if (!data || data.length === 0) {
      toast.error('لا يوجد بيانات للتصدير');
      return;
    }
    const rows = data.map(r => ({
      name: r.staff_name,
      phone: r.staff_phone || '',
      shift: r.shift_name || 'بدون دوام',
      total: formatDuration(r.total_minutes),
      totalAmount: r.total_amount,
      paidAmount: r.paid_amount,
      unpaidAmount: r.unpaid_amount,
    }));
    exportToCSV(rows, `overtime-${from}-to-${to}`, [
      { key: 'name', label: 'الاسم' },
      { key: 'phone', label: 'الهاتف' },
      { key: 'shift', label: 'الدوام' },
      { key: 'total', label: 'إجمالي الوقت الإضافي' },
      { key: 'totalAmount', label: 'الإجمالي (د.ع)' },
      { key: 'paidAmount', label: 'المدفوع (د.ع)' },
      { key: 'unpaidAmount', label: 'غير المدفوع (د.ع)' },
    ]);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[140px]">
          <Label htmlFor="ot-from">من تاريخ</Label>
          <Input id="ot-from" type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div className="flex-1 min-w-[140px]">
          <Label htmlFor="ot-to">إلى تاريخ</Label>
          <Input id="ot-to" type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <div className="flex-1 min-w-[160px]">
          <Label>الدوام</Label>
          <Select value={shiftFilter} onValueChange={setShiftFilter}>
            <SelectTrigger>
              <SelectValue placeholder="كل الورديات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SHIFTS}>كل الورديات</SelectItem>
              {(shifts || []).map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={handleExport} className="gap-2">
          <Download className="w-4 h-4" />
          تصدير
        </Button>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <p className="text-xs text-muted-foreground">الإجمالي</p>
          <p className="text-lg font-bold">{formatIQD(totals.total)}</p>
        </Card>
        <Card className="p-3 text-center border-emerald-500/30">
          <p className="text-xs text-muted-foreground">المدفوع</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatIQD(totals.paid)}</p>
        </Card>
        <Card className="p-3 text-center border-violet-500/30">
          <p className="text-xs text-muted-foreground">غير المدفوع</p>
          <p className="text-lg font-bold text-violet-600 dark:text-violet-400">{formatIQD(totals.unpaid)}</p>
        </Card>
      </div>

      <div className="flex gap-2">
        {(['all', 'unpaid', 'paid'] as const).map(f => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'الكل' : f === 'unpaid' ? 'غير مدفوع' : 'مدفوع'}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">لا يوجد وقت إضافي في هذه الفترة</Card>
      ) : isMobile ? (
        <div className="space-y-2">
          {filtered.map(r => (
            <Card key={r.staff_id} className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{r.staff_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.shift_name || 'بدون دوام'} • {formatDuration(r.total_minutes)}
                  </p>
                </div>
                <p className="font-bold text-violet-600 dark:text-violet-400">{formatIQD(r.unpaid_amount)}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded bg-muted p-2">
                  <p className="text-muted-foreground">مدفوع</p>
                  <p className="font-semibold">{formatIQD(r.paid_amount)}</p>
                </div>
                <div className="rounded bg-violet-500/10 p-2">
                  <p className="text-muted-foreground">غير مدفوع</p>
                  <p className="font-semibold">{formatIQD(r.unpaid_amount)}</p>
                </div>
              </div>
              {r.unpaid_attendance_ids.length > 0 && (
                <Button
                  size="sm"
                  className="w-full gap-1"
                  disabled={bulkPay.isPending}
                  onClick={() => handleBulkPay(r)}
                >
                  <Wallet className="w-3 h-3" />
                  دفع كل غير المدفوع ({r.unpaid_attendance_ids.length} وردية)
                </Button>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">الدوام</TableHead>
                <TableHead className="text-right">إجمالي الوقت</TableHead>
                <TableHead className="text-right">الإجمالي</TableHead>
                <TableHead className="text-right">المدفوع</TableHead>
                <TableHead className="text-right">غير المدفوع</TableHead>
                <TableHead className="text-right">إجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.staff_id}>
                  <TableCell className="text-right font-medium">{r.staff_name}</TableCell>
                  <TableCell className="text-right">{r.shift_name || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-right">{formatDuration(r.total_minutes)}</TableCell>
                  <TableCell className="text-right">{formatIQD(r.total_amount)}</TableCell>
                  <TableCell className="text-right text-emerald-600 dark:text-emerald-400">{formatIQD(r.paid_amount)}</TableCell>
                  <TableCell className="text-right text-violet-600 dark:text-violet-400 font-bold">{formatIQD(r.unpaid_amount)}</TableCell>
                  <TableCell className="text-right">
                    {r.unpaid_attendance_ids.length > 0 ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        disabled={bulkPay.isPending}
                        onClick={() => handleBulkPay(r)}
                      >
                        <Wallet className="w-3 h-3" />
                        دفع ({r.unpaid_attendance_ids.length})
                      </Button>
                    ) : (
                      <Badge variant="secondary">مكتمل</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

const AdminAttendance = () => {
  const { data: shifts } = useAttendanceShifts();
  const otOn = (shifts || []).some(s => s.overtime_enabled);

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Clock className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">الحضور والانصراف</h1>
      </div>

      <Tabs defaultValue="log" className="w-full">
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="log" className="gap-2"><Calendar className="w-4 h-4" />سجل الحضور</TabsTrigger>
          {otOn && (
            <TabsTrigger value="overtime" className="gap-2"><Sparkles className="w-4 h-4" />الوقت الإضافي</TabsTrigger>
          )}
          <TabsTrigger value="settings" className="gap-2"><Clock className="w-4 h-4" />الورديات والإعدادات</TabsTrigger>
        </TabsList>
        <TabsContent value="log" className="mt-4">
          <LogTab />
        </TabsContent>
        {otOn && (
          <TabsContent value="overtime" className="mt-4">
            <OvertimeTab />
          </TabsContent>
        )}
        <TabsContent value="settings" className="mt-4">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAttendance;
