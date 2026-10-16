import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sparkles, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useCreateShift, useUpdateShift, type AttendanceShift,
} from '@/hooks/useAttendance';

interface ShiftFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  shift?: AttendanceShift | null;
}

const ShiftFormDialog = ({ open, onOpenChange, shift }: ShiftFormDialogProps) => {
  const isEdit = !!shift;
  const createShift = useCreateShift();
  const updateShift = useUpdateShift();

  const [name, setName] = useState('');
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('13:00');
  const [grace, setGrace] = useState(15);
  const [absentAfter, setAbsentAfter] = useState(60);
  const [otEnabled, setOtEnabled] = useState(true);
  const [otRate, setOtRate] = useState(5000);
  const [otMin, setOtMin] = useState(15);

  useEffect(() => {
    if (open) {
      if (shift) {
        setName(shift.name);
        setStart(shift.shift_start.slice(0, 5));
        setEnd(shift.shift_end.slice(0, 5));
        setGrace(shift.grace_minutes);
        setAbsentAfter(shift.absent_after_minutes);
        setOtEnabled(shift.overtime_enabled);
        setOtRate(Number(shift.overtime_rate_per_hour));
        setOtMin(shift.overtime_min_minutes);
      } else {
        setName('');
        setStart('08:00');
        setEnd('13:00');
        setGrace(15);
        setAbsentAfter(60);
        setOtEnabled(true);
        setOtRate(5000);
        setOtMin(15);
      }
    }
  }, [open, shift]);

  const isPending = createShift.isPending || updateShift.isPending;

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('اسم الدوام مطلوب');
      return;
    }
    if (start >= end) {
      toast.error('بداية الدوام يجب أن تكون قبل نهايته');
      return;
    }

    const payload = {
      name: name.trim(),
      shift_start: start,
      shift_end: end,
      grace_minutes: grace,
      absent_after_minutes: absentAfter,
      overtime_enabled: otEnabled,
      overtime_rate_per_hour: otRate,
      overtime_min_minutes: otMin,
    };

    if (isEdit && shift) {
      updateShift.mutate(
        { id: shift.id, ...payload },
        {
          onSuccess: () => {
            toast.success('تم تحديث الدوام');
            onOpenChange(false);
          },
          onError: () => toast.error('فشل تحديث الدوام'),
        },
      );
    } else {
      createShift.mutate(payload, {
        onSuccess: () => {
          toast.success('تم إنشاء الدوام');
          onOpenChange(false);
        },
        onError: () => toast.error('فشل إنشاء الدوام'),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'تعديل الدوام' : 'إضافة دوام جديد'}</DialogTitle>
          <DialogDescription>
            حدد ساعات العمل وقواعد التأخير والوقت الإضافي لهذا الدوام.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shift-name">اسم الدوام</Label>
            <Input
              id="shift-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="مثال: الدوام الصباحي"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="shift-start">بداية الدوام</Label>
              <Input id="shift-start" type="time" value={start} onChange={e => setStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift-end">نهاية الدوام</Label>
              <Input id="shift-end" type="time" value={end} onChange={e => setEnd(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="grace">فترة السماح للتأخير (دقيقة)</Label>
            <Input
              id="grace"
              type="number"
              min={0}
              max={120}
              value={grace}
              onChange={e => setGrace(Math.max(0, parseInt(e.target.value || '0', 10)))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="absent-after">اعتبار الموظف غائباً بعد (دقيقة)</Label>
            <Input
              id="absent-after"
              type="number"
              min={1}
              max={480}
              value={absentAfter}
              onChange={e => setAbsentAfter(Math.max(1, parseInt(e.target.value || '1', 10)))}
            />
          </div>

          <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-500" />
                <Label className="text-sm font-semibold">احتساب الوقت الإضافي</Label>
              </div>
              <Switch checked={otEnabled} onCheckedChange={setOtEnabled} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ot-rate" className="text-xs">أجر الساعة (د.ع)</Label>
              <Input
                id="ot-rate"
                type="number"
                min={0}
                step={500}
                value={otRate}
                onChange={e => setOtRate(Math.max(0, parseInt(e.target.value || '0', 10)))}
                disabled={!otEnabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ot-min" className="text-xs">الحد الأدنى (دقيقة)</Label>
              <Input
                id="ot-min"
                type="number"
                min={1}
                max={120}
                value={otMin}
                onChange={e => setOtMin(Math.max(1, parseInt(e.target.value || '1', 10)))}
                disabled={!otEnabled}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row-reverse gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button disabled={isPending} onClick={handleSave} className="gap-2">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'حفظ التعديلات' : 'إنشاء الدوام'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShiftFormDialog;
