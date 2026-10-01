import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellPlus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

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
  const query = useQuery({ queryKey: key, queryFn: async () => {
    const { data, error } = await supabase.from('maintenance_reminders').select('*').eq('car_id', carId).order('remind_at');
    if (error) throw error;
    return data as Reminder[];
  }, refetchInterval: 60000 });
  const save = useMutation({ mutationFn: async () => {
    if (!form.name.trim() || !Number.isFinite(new Date(form.remind_at).getTime()) || new Date(form.remind_at).getTime() <= Date.now()) throw new Error('اختار اسم وموعد تنبيه في المستقبل');
    const values = { ...form, name: form.name.trim(), remind_at: new Date(form.remind_at).toISOString(), enabled: true, car_id: carId };
    const result = editing ? await supabase.from('maintenance_reminders').update(values).eq('id', editing) : await supabase.from('maintenance_reminders').insert(values);
    if (result.error) throw result.error;
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
      {query.isError && <p role="alert" className="text-destructive">تعذر تحميل التذكيرات. تأكد من الاتصال وتحديث قاعدة البيانات. <Button variant="ghost" onClick={() => query.refetch()}>إعادة المحاولة</Button></p>}
      {query.data?.map(item => <div key={item.id} className="rounded-xl border p-4 space-y-2">
        <div className="flex justify-between gap-2"><strong>{item.name} · {item.part_year}</strong><span className="text-xs">{item.enabled ? 'مفعّل' : 'تم التنبيه'}</span></div>
        <p className="text-sm">{new Date(item.remind_at).toLocaleString('ar-LY')} {item.repeat_days > 0 && `· كل ${item.repeat_days} يوم`}</p>
        {item.notes && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.notes}</p>}
        <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => { setEditing(item.id); setForm({ ...item, remind_at: localDateTime(item.remind_at) }); setOpen(true); }}><Pencil className="w-4 h-4 ml-1" />تعديل</Button>
          <Button variant="ghost" size="sm" disabled={remove.isPending} onClick={() => { if (window.confirm(`حذف تذكير ${item.name}؟`)) remove.mutate(item.id); }}><Trash2 className="w-4 h-4 ml-1" />حذف</Button></div>
      </div>)}
      <Button variant="gold" className="w-full" onClick={() => { setEditing(null); setForm(blank()); setOpen(true); }}>إضافة قطعة / تذكير</Button>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent dir="rtl"><DialogHeader><DialogTitle>{editing ? 'تعديل التذكير' : 'إضافة تذكير تغيير قطعة'}</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={e => { e.preventDefault(); save.mutate(); }}>
          <div><Label htmlFor="part-name">اسم القطعة</Label><Input id="part-name" placeholder="مثلاً: البطارية" required maxLength={100} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label htmlFor="part-year">سنة القطعة / التركيب</Label><Input id="part-year" type="number" required min={1900} max={2200} value={form.part_year} onChange={e => setForm({ ...form, part_year: Number(e.target.value) })} /></div>
          <div><Label htmlFor="part-notes">ملاحظات</Label><Textarea id="part-notes" maxLength={2000} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          <div><Label htmlFor="part-time">تاريخ ووقت التنبيه (بتوقيت جهازك)</Label><Input id="part-time" type="datetime-local" required value={form.remind_at} onChange={e => setForm({ ...form, remind_at: e.target.value })} /></div>
          <div><Label htmlFor="part-repeat">تكرار التنبيه كل كم يوم؟ (0 = مرة واحدة)</Label><Input id="part-repeat" type="number" required min={0} max={3650} value={form.repeat_days} onChange={e => setForm({ ...form, repeat_days: Number(e.target.value) })} /></div>
          <Button type="submit" disabled={save.isPending} className="w-full">{save.isPending ? 'جاري الحفظ...' : 'حفظ التذكير'}</Button>
        </form>
      </DialogContent></Dialog>
    </CardContent>
  </Card>;
}
