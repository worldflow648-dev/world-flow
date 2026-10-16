import { useState } from 'react';
import { UserPlus, Search, Loader2, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useStaffCandidates, useAddStaffRole, StaffCandidate } from '@/hooks/useAdminStaff';
import { useAttendanceShifts, useAssignStaffShift } from '@/hooks/useAttendance';
import { toast } from 'sonner';

interface AddStaffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AddStaffModal = ({ open, onOpenChange }: AddStaffModalProps) => {
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<StaffCandidate | null>(null);
  const [selectedShift, setSelectedShift] = useState<string>('');

  const { data: candidates, isLoading } = useStaffCandidates();
  const { data: shifts, isLoading: isShiftsLoading } = useAttendanceShifts();
  const addStaffRole = useAddStaffRole();
  const assignShift = useAssignStaffShift();

  const filteredCandidates = candidates?.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
  );

  const reset = () => {
    setSelectedUser(null);
    setSelectedShift('');
    setSearch('');
  };

  const handleAddStaff = async () => {
    if (!selectedUser || !selectedShift) return;

    try {
      await addStaffRole.mutateAsync(selectedUser.id);
      await assignShift.mutateAsync({ staffId: selectedUser.id, shiftId: selectedShift });
      toast.success(`تمت إضافة ${selectedUser.name} كموظف`);
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error('فشل في إضافة الموظف');
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const isPending = addStaffRole.isPending || assignShift.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            إضافة موظف جديد
          </DialogTitle>
          <DialogDescription>
            اختر مستخدم وعيّن له دواماً
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ابحث بالاسم أو رقم الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>

          {/* Candidates List */}
          <div className="max-h-48 overflow-y-auto border rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCandidates?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا يوجد مستخدمين متاحين
              </div>
            ) : (
              <div className="divide-y">
                {filteredCandidates?.map((candidate) => (
                  <button
                    key={candidate.id}
                    onClick={() => setSelectedUser(candidate)}
                    className={`w-full px-4 py-3 text-right transition-colors hover:bg-muted/50 ${
                      selectedUser?.id === candidate.id
                        ? 'bg-primary/10 border-r-2 border-primary'
                        : ''
                    }`}
                  >
                    <div className="font-medium">{candidate.name}</div>
                    {candidate.phone && (
                      <div className="text-sm text-muted-foreground">
                        {candidate.phone}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Shift Selector */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4" />
              الدوام
            </Label>
            <Select value={selectedShift} onValueChange={setSelectedShift} disabled={isShiftsLoading}>
              <SelectTrigger>
                <SelectValue placeholder={isShiftsLoading ? 'جارٍ التحميل...' : 'اختر دواماً'} />
              </SelectTrigger>
              <SelectContent>
                {shifts?.length === 0 ? (
                  <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                    لا توجد دوامات. أنشئ دواماً من إعدادات الحضور.
                  </div>
                ) : (
                  shifts?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.shift_start.slice(0, 5)} - {s.shift_end.slice(0, 5)})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleAddStaff}
              disabled={!selectedUser || !selectedShift || isPending}
              className="flex-1"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <UserPlus className="w-4 h-4 ml-2" />
              )}
              إضافة كموظف
            </Button>
            <Button variant="outline" onClick={handleClose}>
              إلغاء
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddStaffModal;
