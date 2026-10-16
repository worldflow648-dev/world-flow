import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Save, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useAttendanceShifts, useAssignStaffShift } from '@/hooks/useAttendance';

interface AssignShiftDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  staffId: string | null;
  staffName: string | null;
  currentShiftId: string | null;
}

const NONE_VALUE = '__none__';

const AssignShiftDialog = ({
  open, onOpenChange, staffId, staffName, currentShiftId,
}: AssignShiftDialogProps) => {
  const { data: shifts, isLoading } = useAttendanceShifts();
  const assign = useAssignStaffShift();
  const [selected, setSelected] = useState<string>(NONE_VALUE);

  useEffect(() => {
    if (open) {
      setSelected(currentShiftId || NONE_VALUE);
    }
  }, [open, currentShiftId]);

  const handleSave = () => {
    if (!staffId) return;
    const shiftId = selected === NONE_VALUE ? null : selected;
    assign.mutate(
      { staffId, shiftId },
      {
        onSuccess: () => {
          toast.success('تم تحديث الدوام');
          onOpenChange(false);
        },
        onError: () => toast.error('فشل تحديث الدوام'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            تعيين دوام
          </DialogTitle>
          <DialogDescription>
            اختر الدوام الذي سيُعيَّن إلى {staffName || 'الموظف'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Label>الدوام</Label>
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : !shifts || shifts.length === 0 ? (
            <p className="text-sm text-muted-foreground bg-muted rounded-lg p-3 text-center">
              لا توجد ورديات نشطة. أنشئ دواماً من إعدادات الحضور أولاً.
            </p>
          ) : (
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger>
                <SelectValue placeholder="اختر الدوام" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>
                  <span className="text-muted-foreground">— بدون دوام —</span>
                </SelectItem>
                {shifts.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.shift_start.slice(0, 5)} – {s.shift_end.slice(0, 5)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <DialogFooter className="flex-row-reverse gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button disabled={assign.isPending || !staffId} onClick={handleSave} className="gap-2">
            {assign.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignShiftDialog;
