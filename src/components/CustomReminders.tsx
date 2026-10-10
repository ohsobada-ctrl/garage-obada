import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellPlus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { isBackendSetupError, shouldRetryBackend } from '@/lib/backendError';
import { saveReminder } from '@/lib/reminderData';

type Reminder = { id: string; name: string; part_year: number; notes: string; remind_at: string; repeat_days: number; enabled: boolean };
const blank = () => ({ name: '', part_year: new Date().getFullYear(), notes: '', remind_at: '', repeat_days: 0 });
const localDateTime = (iso: string) => {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export function CustomReminders({ carId }: { carId: string }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const key = ['reminders', user?.uid, carId];
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(blank);
  const draftId = useRef<string>();
  const query = useQuery({ queryKey: key, enabled: !!user?.uid, queryFn: async () => {
    const { data, error } = await supabase.from('maintenance_reminders').select('*').eq('car_id', carId).order('remind_at');
    if (error) throw error;
    return data as Reminder[];
  }, retry: shouldRetryBackend, refetchInterval: query => isBackendSetupError(query.state.error) ? false : 60000 });
  const save = useMutation({ mutationFn: async () => {
    if (!draftId.current) draftId.current = crypto.randomUUID();
    return saveReminder(supabase, user?.uid, carId, editing || draftId.current, form, !!editing);
  }, onSuccess: () => { void client.invalidateQueries({ queryKey: key }); setOpen(false); toast.success('تم حفظ التذكير'); }, onError: (e: Error) => toast.error(e.message) });
  const remove = useMutation({ mutationFn: async (id: string) => {
    const { error } = await supabase.from('maintenance_reminders').delete().eq('id', id);
    if (error) throw error;
  }, onSuccess: () => { void client.invalidateQueries({ queryKey: key }); }, onError: (e: Error) => toast.error(e.message) });
  return <Card dir="rtl">
    <CardHeader><CardTitle className="flex items-center gap-2"><BellPlus className="w-5 h-5 text-primary" />قطع وصيانة إضافية</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm text-muted-foreground">ذكّرني بتغيير البطارية أو أي قطعة أخرى، في الوقت اللي نختاره.</p>
      {query.isLoading && <p role="status">جاري تحميل التذكيرات...</p>}
      {query.isError && <p role="alert" className="text-muted-foreground">تعذر تحميل التذكيرات حالياً. <Button variant="ghost" disabled={query.isFetching} onClick={() => query.refetch()}>إعادة المحاولة</Button></p>}
      {query.data?.map(item => <div key={item.id} className="rounded-xl border p-4 space-y-2">
        <div className="flex justify-between gap-2"><strong>{item.name} · {item.part_year}</strong><span className="text-xs">{item.enabled ? 'مفعّل' : 'تم التنبيه'}</span></div>
        <p className="text-sm">{new Date(item.remind_at).toLocaleString('ar-LY')} {item.repeat_days > 0 && `· كل ${item.repeat_days} يوم`}</p>
        {item.notes && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.notes}</p>}
        <div className="flex gap-2"><Button variant="outline" size="sm" disabled={save.isPending} onClick={() => { setEditing(item.id); setForm({ ...item, remind_at: localDateTime(item.remind_at) }); setOpen(true); }}><Pencil className="w-4 h-4 ml-1" />تعديل</Button>
          <Button variant="ghost" size="sm" disabled={remove.isPending} onClick={() => { if (window.confirm(`حذف تذكير ${item.name}؟`)) remove.mutate(item.id); }}><Trash2 className="w-4 h-4 ml-1" />حذف</Button></div>
      </div>)}
      <Button variant="gold" className="w-full" disabled={query.isError || query.isLoading || save.isPending || !user} onClick={() => { draftId.current = crypto.randomUUID(); setEditing(null); setForm(blank()); setOpen(true); }}>إضافة قطعة / تذكير</Button>
      <Dialog open={open} onOpenChange={value => { if (!save.isPending) setOpen(value); }}><DialogContent dir="rtl"><DialogHeader><DialogTitle>{editing ? 'تعديل التذكير' : 'إضافة تذكير تغيير قطعة'}</DialogTitle><DialogDescription>حدد القطعة وموعد تذكيرك حسب توقيت جهازك.</DialogDescription></DialogHeader>
        <form className="space-y-4" onSubmit={e => { e.preventDefault(); if (!save.isPending) save.mutate(); }}>
          <fieldset disabled={save.isPending} className="contents">
          <div><Label htmlFor="part-name">اسم القطعة</Label><Input id="part-name" placeholder="مثلاً: البطارية" required maxLength={100} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label htmlFor="part-year">سنة القطعة / التركيب</Label><Input id="part-year" type="number" required min={1900} max={2200} value={form.part_year} onChange={e => setForm({ ...form, part_year: Number(e.target.value) })} /></div>
          <div><Label htmlFor="part-notes">ملاحظات</Label><Textarea id="part-notes" maxLength={2000} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          <div><Label htmlFor="part-time">تاريخ ووقت التنبيه (بتوقيت جهازك)</Label><Input id="part-time" type="datetime-local" required value={form.remind_at} onChange={e => setForm({ ...form, remind_at: e.target.value })} /></div>
          <div><Label htmlFor="part-repeat">تكرار التنبيه كل كم يوم؟ (0 = مرة واحدة)</Label><Input id="part-repeat" type="number" required min={0} max={3650} value={form.repeat_days} onChange={e => setForm({ ...form, repeat_days: Number(e.target.value) })} /></div>
          <Button type="submit" disabled={save.isPending} className="w-full">{save.isPending ? 'جاري الحفظ...' : 'حفظ التذكير'}</Button>
          </fieldset>
        </form>
      </DialogContent></Dialog>
    </CardContent>
  </Card>;
}
