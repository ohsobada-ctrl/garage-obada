import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, BellOff, CheckCircle2, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { NotificationService } from '@/services/notificationService';
import { useAuth } from '@/lib/auth';

export function SettingsDialog({ children }: { children?: React.ReactNode }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { data: status, refetch, isFetching } = useQuery({ queryKey: ['push-status', user?.uid], enabled: open && !!user, queryFn: NotificationService.getStatus, retry: 1 });
  useEffect(() => {
    if (!open) return;
    const update = () => { void refetch(); };
    window.addEventListener('garage_push_changed', update);
    window.addEventListener('focus', update);
    return () => { window.removeEventListener('garage_push_changed', update); window.removeEventListener('focus', update); };
  }, [open, refetch]);
  const change = async (enable: boolean) => {
    setBusy(true); setError('');
    try {
      if (enable) await NotificationService.enable(); else await NotificationService.disable();
    } catch (error) { setError(error instanceof Error ? error.message : 'تعذر تحديث الإشعارات. حاول مجدداً.'); }
    finally { setBusy(false); void refetch(); }
  };
  const Icon = status?.active ? CheckCircle2 : Bell;
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild>{children || <Button variant="ghost">الإعدادات</Button>}</DialogTrigger>
    <DialogContent dir="rtl" className="sm:max-w-md"><DialogHeader><DialogTitle>إشعارات كراج</DialogTitle><DialogDescription>تذكيرات الصيانة ورسائل الإدارة على هذا الجهاز.</DialogDescription></DialogHeader>
      <div className="rounded-2xl bg-secondary/30 border p-5 space-y-3 text-center">
        <div className="mx-auto w-fit rounded-full bg-primary/10 p-4"><Icon className="h-7 w-7 text-primary" /></div>
        <h3 className="font-bold">{status?.title || (isFetching ? 'جاري التحقق...' : 'تعذر التحقق من حالة الإشعارات')}</h3>
        <p className="text-sm text-muted-foreground leading-6">{status?.detail || 'أعد المحاولة بعد التأكد من الاتصال.'}</p>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {status?.canEnable && !status.active && <Button disabled={busy} onClick={() => change(true)} className="h-12 rounded-xl">{busy ? 'جاري التفعيل...' : 'تفعيل الإشعارات'}</Button>}
      <Button variant="outline" disabled={busy || isFetching} onClick={() => { setError(''); void refetch(); }}><RefreshCw className="w-4 h-4 ml-2" />إعادة التحقق</Button>
      {status?.active && <Button variant="ghost" disabled={busy} onClick={() => change(false)}><BellOff className="w-4 h-4 ml-2" />إيقاف إشعارات هذا الجهاز</Button>}
      <p className="text-xs text-muted-foreground leading-6">فعّل الإشعارات على كل جهاز تستعمله. تبقى التنبيهات محفوظة داخل التطبيق حتى لو أوقفت إشعارات الجهاز.</p>
    </DialogContent>
  </Dialog>;
}
