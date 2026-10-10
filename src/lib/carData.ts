import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/integrations/supabase/types';
import { defaultCarSettings, type Car } from '@/types/car';
import { z } from 'zod';

type CarRow = Database['public']['Tables']['cars']['Row'];
type CarUpdate = Database['public']['Tables']['cars']['Update'];
const date = z.string().refine(value => value.length > 0 && Number.isFinite(Date.parse(value)));
const id = z.string().min(1);
const lists = {
  legal_docs: z.object({ id, type: z.enum(['insurance', 'roadTax', 'technicalInspection']), expiryDate: date, notes: z.string().optional() }).passthrough(),
  oil_services: z.object({ id, dateOfChange: date, mileageAtChange: z.number().nonnegative(), stationName: z.string().default(''), oilBrand: z.string().default(''), filterChanged: z.boolean().default(false) }).passthrough(),
  brake_tire_services: z.object({ id, type: z.enum(['brakes', 'tires']), lastChangeDate: date, notes: z.string().optional() }).passthrough(),
  mileage_history: z.object({ id, mileage: z.number().nonnegative(), date }).passthrough(),
};
function readList(value: Json, schema: z.ZodTypeAny) {
  const rows = Array.isArray(value) ? value : [];
  const results = rows.map(row => schema.safeParse(row));
  return { rows: results.flatMap(result => result.success ? [result.data] : []), invalid: value != null && (!Array.isArray(value) || results.some(result => !result.success)) };
}

export function carFromRow(record: CarRow): Car {
  const docs = readList(record.legal_docs, lists.legal_docs);
  const oils = readList(record.oil_services, lists.oil_services);
  const services = readList(record.brake_tire_services, lists.brake_tire_services);
  const mileage = readList(record.mileage_history, lists.mileage_history);
  const settings = { ...defaultCarSettings };
  const rawSettings = record.settings;
  if (rawSettings && typeof rawSettings === 'object' && !Array.isArray(rawSettings)) {
    for (const name of Object.keys(settings) as (keyof typeof settings)[]) {
      const value = rawSettings[name];
      if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) settings[name] = value;
    }
  }
  return {
    id: record.id, make: record.make, model: record.model, year: record.year,
    currentMileage: record.current_mileage,
    lastMileageUpdate: record.last_mileage_update || record.created_at,
    settings,
    legalDocs: docs.rows as Car['legalDocs'],
    oilServices: (oils.rows as Car['oilServices']).sort((a, b) => Date.parse(a.dateOfChange) - Date.parse(b.dateOfChange)),
    brakeTireServices: services.rows as Car['brakeTireServices'],
    mileageHistory: mileage.rows as Car['mileageHistory'],
    hasIncompleteRecords: docs.invalid || oils.invalid || services.invalid || mileage.invalid,
  };
}

function carToUpdate(updates: Partial<Car>): CarUpdate {
  const fields = {
    make: 'make', model: 'model', year: 'year', currentMileage: 'current_mileage',
    lastMileageUpdate: 'last_mileage_update', settings: 'settings', legalDocs: 'legal_docs',
    oilServices: 'oil_services', brakeTireServices: 'brake_tire_services', mileageHistory: 'mileage_history',
  } as const;
  const values: Record<string, Json> = {};
  for (const [local, column] of Object.entries(fields)) {
    const value = updates[local as keyof typeof fields];
    if (value !== undefined) values[column] = value as unknown as Json;
  }
  return values as CarUpdate;
}

export async function updateOwnedCar(
  client: SupabaseClient<Database>, userId: string, id: string,
  buildUpdates: Partial<Car> | ((car: Car) => Partial<Car>),
) {
  // Read the latest values and compare the changed columns. A second device must
  // not silently overwrite a document, service history or settings change.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: current, error: readError } = await client.from('cars').select('*').eq('id', id).eq('user_id', userId).maybeSingle();
    if (readError) throw readError;
    if (!current) throw new Error('السيارة لم تعد متاحة. حدّث قائمة سياراتك وحاول مجدداً.');
    const updates = carToUpdate(typeof buildUpdates === 'function' ? buildUpdates(carFromRow(current)) : buildUpdates);
    for (const name of Object.keys(lists) as (keyof typeof lists)[]) {
      // Do not silently replace legacy records we could not display or interpret.
      if (name in updates && readList(current[name], lists[name]).invalid) throw new Error('يوجد سجل قديم غير مكتمل في هذه الصيانة. يلزم مراجعته قبل حفظ تغيير عليه. بياناتك الأصلية محفوظة.');
    }
    let request = client.from('cars').update(updates).eq('id', id).eq('user_id', userId);
    for (const column of Object.keys(updates) as (keyof CarUpdate)[]) {
      const previous = current[column];
      request = previous == null ? request.is(column, null) : request.eq(column, typeof previous === 'object' ? JSON.stringify(previous) : previous);
    }
    const { data, error } = await request.select('*').maybeSingle();
    if (error) throw error;
    if (data) return carFromRow(data);
  }
  throw new Error('تغيرت بيانات السيارة أثناء الحفظ. أعد المحاولة لتحميل آخر تعديل.');
}
