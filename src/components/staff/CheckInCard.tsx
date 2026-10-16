import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, LogIn, LogOut, CheckCircle2, Sparkles, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  useAttendanceSettings,
  useMyAttendanceToday,
  useMyShift,
  useCheckIn,
  useCheckOut,
  computeOvertime,
} from '@/hooks/useAttendance';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });
};

const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} د`;
  return `${h} س ${m} د`;
};

const formatTime12 = (hhmmss: string) => {
  const [h, m] = hhmmss.split(':').map(Number);
  const ampm = h >= 12 ? 'م' : 'ص';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
};

export const CheckInCard = () => {
  const { t } = useLanguage();
  const { data: settings, isLoading: settingsLoading } = useAttendanceSettings();
  const { data: today, isLoading: todayLoading } = useMyAttendanceToday();
  const { data: myShift, isLoading: shiftLoading } = useMyShift();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (settingsLoading || todayLoading || shiftLoading) {
    return <Skeleton className="h-32 w-full rounded-lg" />;
  }

  if (settings && !settings.required) return null;

  // No shift assigned → warn the user
  if (!myShift) {
    return (
      <Card className="p-4 border-2 border-amber-500/50 bg-amber-500/10">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-amber-900 dark:text-amber-200">
              لم يتم تعيين دوام لك
            </p>
            <p className="text-sm text-amber-800/90 dark:text-amber-200/80 mt-1">
              تواصل مع الإدارة لتعيين دوامك حتى تتمكن من تسجيل الحضور.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const shiftLabel = `${formatTime12(myShift.shift_start)} – ${formatTime12(myShift.shift_end)}`;

  // Not checked in
  if (!today) {
    return (
      <Card className="p-4 bg-gradient-to-l from-primary/95 to-primary text-primary-foreground border-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm opacity-90">
              <Clock className="w-4 h-4" />
              <span className="truncate">{myShift.name}: {shiftLabel}</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {now.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <Button
            size="lg"
            variant="secondary"
            disabled={checkIn.isPending}
            onClick={() => {
              checkIn.mutate(undefined, {
                onSuccess: () => toast.success(t('attendance.checkedIn') || 'تم تسجيل الحضور'),
                onError: (e: unknown) => {
                  const msg = (e as Error)?.message || '';
                  if (msg === 'NO_SHIFT_ASSIGNED') {
                    toast.error('لم يتم تعيين دوام لك');
                  } else {
                    toast.error(msg.includes('duplicate') ? 'مسجّل مسبقاً اليوم' : 'فشل تسجيل الحضور');
                  }
                },
              });
            }}
            className="gap-2 font-bold"
          >
            <LogIn className="w-5 h-5" />
            {t('attendance.checkIn') || 'تسجيل الحضور'}
          </Button>
        </div>
      </Card>
    );
  }

  // Checked in but not checked out
  if (!today.check_out_at) {
    const elapsed = Math.round((now.getTime() - new Date(today.check_in_at).getTime()) / 60000);
    const liveOt = computeOvertime({ ...today, check_out_at: now.toISOString() }, myShift);
    const showOt = myShift.overtime_enabled && liveOt.minutes > 0;
    return (
      <Card className={cn(
        'p-4 border-2 bg-card',
        showOt ? 'border-violet-500/50 bg-violet-500/5' : 'border-primary/30'
      )}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>{t('attendance.checkedInAt') || 'حضرت في'} {formatTime(today.check_in_at)}</span>
              {today.status === 'late' && (
                <span className="text-destructive font-medium">• {t('attendance.late') || 'متأخر'}</span>
              )}
            </div>
            <p className="text-xl font-bold mt-1">
              {formatDuration(elapsed)} <span className="text-sm font-normal text-muted-foreground">{t('attendance.worked') || 'دوام'}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{myShift.name}</p>
            {showOt && (
              <div className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-violet-700 dark:text-violet-300">
                <Sparkles className="w-4 h-4" />
                <span>
                  {t('attendance.overtimeAccruing') || 'وقت إضافي'}: {formatDuration(liveOt.minutes)} — {liveOt.amount.toLocaleString('ar-IQ')} د.ع
                </span>
              </div>
            )}
          </div>
          <Button
            size="lg"
            variant="outline"
            disabled={checkOut.isPending}
            onClick={() => {
              checkOut.mutate(today.id, {
                onSuccess: () => toast.success(t('attendance.checkedOut') || 'تم تسجيل الانصراف'),
                onError: () => toast.error('فشل تسجيل الانصراف'),
              });
            }}
            className="gap-2 font-bold"
          >
            <LogOut className="w-5 h-5" />
            {t('attendance.checkOut') || 'انتهى عملي'}
          </Button>
        </div>
      </Card>
    );
  }

  // Checked out — summary
  const worked = Math.round(
    (new Date(today.check_out_at).getTime() - new Date(today.check_in_at).getTime()) / 60000
  );
  return (
    <Card className="p-4 bg-muted/40">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium">
            {t('attendance.dayComplete') || 'اكتمل دوام اليوم'}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatTime(today.check_in_at)} – {formatTime(today.check_out_at)} • {formatDuration(worked)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{myShift.name}</p>
        </div>
      </div>
    </Card>
  );
};
