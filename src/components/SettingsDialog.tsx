import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { NotificationService } from '@/services/notificationService';
import { toast } from 'sonner';

export function SettingsDialog({ children }: { children?: React.ReactNode }) {
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(localStorage.getItem('garage_push_enabled') === 'true');
  useEffect(() => {
    const update = () => setEnabled(localStorage.getItem('garage_push_enabled') === 'true');
    window.addEventListener('garage_push_changed', update);
    return () => window.removeEventListener('garage_push_changed', update);
  }, []);
  const change = async (enable: boolean) => {
    setBusy(true);
    try {
      if (enable) await NotificationService.enable(); else await NotificationService.disable();
      toast.success(enable ? 'تم تسجيل الجهاز لاستقبال الإشعارات' : 'تم إيقاف إشعارات هذا الجهاز');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر تحديث الإشعارات'); }
    finally { setBusy(false); }
  };
  return <Dialog><DialogTrigger asChild>{children || <Button variant="ghost">الإعدادات</Button>}</DialogTrigger>
    <DialogContent dir="rtl"><DialogHeader><DialogTitle>إعدادات الإشعارات</DialogTitle></DialogHeader>
      <p>{enabled ? 'هذا الجهاز مسجّل لاستقبال الإشعارات' : 'إشعارات هذا الجهاز غير مفعّلة'}</p>
      <p className="text-sm text-muted-foreground">فعّل الإشعارات على كل جهاز تستعمله. على آيفون: أضف الموقع للشاشة الرئيسية وافتحه منها، ثم فعّل الإشعارات. التحكم بالصوت من إعدادات النظام.</p>
      <Button disabled={busy} onClick={() => change(true)}>{busy ? 'جاري التحديث...' : enabled ? 'إعادة فحص وتسجيل الجهاز' : 'تفعيل إشعارات هذا الجهاز'}</Button>
      {enabled && <Button variant="outline" disabled={busy} onClick={() => change(false)}>إيقاف إشعارات هذا الجهاز</Button>}
      <p className="text-xs text-muted-foreground">تصل الإشعارات عبر الخادم حتى والتطبيق مغلق. الاتصال بالإنترنت وصلاحيات الجهاز مطلوبة. التنبيهات محفوظة أيضاً في مركز التنبيهات.</p>
    </DialogContent>
  </Dialog>;
}
