import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { backendError, isBackendSetupError, shouldRetryBackend } from '@/lib/backendError';

type Report = { users: number; cars: number; devices: number; broadcasts: { id: string; title: string; body: string; created_at: string; recipients: number; opened: number; accepted: number; pending: number; failed: number }[] };
export function AdminDashboard({ children }: { carsCount?: number; children?: React.ReactNode }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [severity, setSeverity] = useState('info');
  const [error, setError] = useState('');
  // Keep the request ID after a network failure so retry cannot duplicate a broadcast.
  const request = useRef<{ id: string; content: string }>();
  const { data: report, error: reportError, isFetching, refetch } = useQuery({
    queryKey: ['admin-report', user?.uid], enabled: open && !!user?.isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('garage_admin_report');
      if (error) throw error;
      return data as Report;
    },
    retry: shouldRetryBackend,
    refetchInterval: query => isBackendSetupError(query.state.error) ? false : 15000,
  });
  const refresh = async () => { setError(''); await refetch(); };
  if (!user?.isAdmin) return null;
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild>{children || <Button variant="outline"><ShieldCheck className="w-4 h-4 ml-2" />لوحة الأدمن</Button>}</DialogTrigger>
    <DialogContent dir="rtl" className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>لوحة تحكم المسؤول</DialogTitle></DialogHeader>
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {reportError && <p role="alert" className="text-destructive">{backendError(reportError, 'تعذر تحميل الإحصائيات')}</p>}
      <Button variant="outline" disabled={isFetching} onClick={refresh}>{isFetching ? 'جاري فحص الخدمة...' : 'تحديث الإحصائيات والتسليم'}</Button>
      {report && <div className="grid grid-cols-3 gap-3 text-center text-sm"><p>المستخدمون<br /><strong>{report.users}</strong></p><p>السيارات<br /><strong>{report.cars}</strong></p><p>الأجهزة المسجلة للإشعارات<br /><strong>{report.devices}</strong></p></div>}
      <form className="space-y-3 border rounded-xl p-4" onSubmit={async e => {
        e.preventDefault();
        if (sending || !report || reportError || !title.trim() || !body.trim()) return;
        setSending(true);
        const content = JSON.stringify([title.trim(), body.trim(), severity]);
        if (request.current?.content !== content) request.current = { id: crypto.randomUUID(), content };
        try {
          const { error } = await supabase.rpc('send_garage_broadcast', { p_id: request.current.id, p_title: title.trim(), p_body: body.trim(), p_severity: severity });
          if (error) throw error;
          toast.success('تم حفظ الإشعار لكل الحسابات وإضافته لطابور إرسال الأجهزة');
          request.current = undefined; setTitle(''); setBody(''); await refresh();
        } catch (e) {
          const detail = backendError(e as { code?: string; message?: string }, 'تعذر إرسال الإشعار');
          setError(detail); toast.error(detail);
        }
        finally { setSending(false); }
      }}>
        <Label htmlFor="broadcast-title">عنوان الإشعار</Label><Input id="broadcast-title" required maxLength={120} value={title} onChange={e => setTitle(e.target.value)} />
        <Label htmlFor="broadcast-body">نص الإشعار</Label><Textarea id="broadcast-body" required maxLength={2000} value={body} onChange={e => setBody(e.target.value)} />
        <Label htmlFor="broadcast-severity">الأهمية</Label><select id="broadcast-severity" className="w-full bg-background border rounded-md p-2" value={severity} onChange={e => setSeverity(e.target.value)}><option value="info">عادي</option><option value="warning">مهم</option><option value="danger">عاجل</option></select>
        <Button type="submit" disabled={sending || !report || !!reportError} className="w-full">{sending ? 'جاري الحفظ...' : 'إرسال لجميع المستخدمين المسجلين'}</Button>
        {(!report || reportError) && <p className="text-xs text-muted-foreground">الإرسال متوقف حتى ينجح فحص خدمة الإشعارات.</p>}
      </form>
      <p className="text-xs text-muted-foreground">كل حساب يستلم نسخة في مركز التنبيهات. «قبله مزوّد Push» هو عدد الأجهزة المقبولة للإرسال، ولا يثبت عرض الإشعار على الجهاز. صلاحيات الأدمن تُدار بأمان في الخادم.</p>
      <div className="space-y-3">{report?.broadcasts.map(item => <div key={item.id} className="rounded-xl border p-3 space-y-2">
        <strong>{item.title}</strong><p className="text-sm whitespace-pre-wrap">{item.body}</p><p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString('ar-LY')}</p>
        <div className="flex flex-wrap gap-3 text-xs"><span>حسابات مستهدفة: {item.recipients}</span><span>فُتح داخل التطبيق: {item.opened}</span><span>قبله مزوّد Push: {item.accepted}</span><span>أجهزة قيد الإرسال: {item.pending}</span><span>فشل: {item.failed}</span></div>
      </div>)}</div>
    </DialogContent>
  </Dialog>;
}
