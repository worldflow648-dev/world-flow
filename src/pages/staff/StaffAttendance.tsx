import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Clock, CalendarDays, Sparkles, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckInCard } from '@/components/staff/CheckInCard';
import {
  useMyAttendanceHistory,
  useMyShift,
  useMyOvertimePaymentsForRecords,
  computeOvertime,
} from '@/hooks/useAttendance';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMemo } from 'react';

const formatTime = (iso: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (d: string) => new Date(d).toLocaleDateString('ar-IQ', {
  weekday: 'long', day: 'numeric', month: 'long',
});

const formatDuration = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h} س ${m} د` : `${m} د`;
};

const formatIQD = (n: number) => `${n.toLocaleString('ar-IQ')} د.ع`;

const StaffAttendance = () => {
  const { t } = useLanguage();
  const { data: history, isLoading } = useMyAttendanceHistory(30);
  const { data: myShift } = useMyShift();

  const recordIds = useMemo(() => (history || []).map(r => r.id), [history]);
  const { data: paymentsMap } = useMyOvertimePaymentsForRecords(recordIds);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="px-4 py-4 flex items-center gap-3">
          <Link to="/staff">
            <Button variant="ghost" size="icon">
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <h1 className="font-bold text-lg">{t('attendance.myHistory') || 'سجل حضوري'}</h1>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-3">
        <CheckInCard />

        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
        ) : !history || history.length === 0 ? (
          <Card className="p-8 text-center">
            <CalendarDays className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">{t('attendance.noHistory') || 'لا يوجد سجل حضور بعد'}</p>
          </Card>
        ) : (
          history.map((rec) => {
            const worked = rec.check_out_at
              ? Math.round((new Date(rec.check_out_at).getTime() - new Date(rec.check_in_at).getTime()) / 60000)
              : null;
            const ot = myShift ? computeOvertime(rec, myShift) : { minutes: 0, amount: 0 };
            const payment = paymentsMap?.[rec.id];
            const showOt = (myShift?.overtime_enabled ?? false) && ot.minutes > 0;
            return (
              <Card key={rec.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{formatDate(rec.work_date)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTime(rec.check_in_at)} – {formatTime(rec.check_out_at)}
                      {worked !== null && ` • ${formatDuration(worked)}`}
                    </p>
                    {showOt && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <Badge className="bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30 hover:bg-violet-500/20 gap-1">
                          <Sparkles className="w-3 h-3" />
                          وقت إضافي: {formatDuration(ot.minutes)} — {formatIQD(payment?.amount ?? ot.amount)}
                        </Badge>
                        {payment ? (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <Check className="w-3 h-3" />
                            تم الدفع
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">قيد الانتظار</Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <Badge variant={rec.status === 'late' ? 'destructive' : 'secondary'}>
                    {rec.status === 'late' ? (t('attendance.late') || 'متأخر') : (t('attendance.onTime') || 'في الوقت')}
                  </Badge>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default StaffAttendance;
