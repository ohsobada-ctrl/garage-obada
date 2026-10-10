import type { SupabaseClient } from '@supabase/supabase-js';

export type ReminderForm = { name: string; part_year: number; notes: string; remind_at: string; repeat_days: number };

export async function saveReminder(client: SupabaseClient, userId: string, carId: string, id: string, form: ReminderForm, editing: boolean) {
  if (!userId) throw new Error('سجّل الدخول لحفظ التذكير');
  const when = new Date(form.remind_at);
  if (!form.name.trim() || form.name.trim().length > 100 || !Number.isFinite(when.getTime()) || when.getTime() <= Date.now()) throw new Error('اختار اسم وموعد تنبيه في المستقبل');
  if (!Number.isInteger(form.part_year) || form.part_year < 1900 || form.part_year > 2200 || !Number.isInteger(form.repeat_days) || form.repeat_days < 0 || form.repeat_days > 3650 || form.notes.length > 2000) throw new Error('راجع السنة وفترة التكرار والملاحظات');
  const values = { name: form.name.trim(), part_year: form.part_year, notes: form.notes,
    remind_at: when.toISOString(), repeat_days: form.repeat_days, enabled: true, car_id: carId };
  // Keep one ID for the draft so a lost response and retry cannot create two reminders.
  const request = editing
    ? client.from('maintenance_reminders').update(values).eq('id', id).eq('user_id', userId)
    : client.from('maintenance_reminders').upsert({ ...values, id, user_id: userId }, { onConflict: 'id' });
  const { data, error } = await request.select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('التذكير لم يعد متاحاً. حدّث القائمة وحاول مجدداً');
  return data;
}
