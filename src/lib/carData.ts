import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/integrations/supabase/types';
import { defaultCarSettings, type Car } from '@/types/car';

type CarRow = Database['public']['Tables']['cars']['Row'];
type CarUpdate = Database['public']['Tables']['cars']['Update'];

export function carFromRow(record: CarRow): Car {
  return {
    id: record.id, make: record.make, model: record.model, year: record.year,
    currentMileage: record.current_mileage,
    lastMileageUpdate: record.last_mileage_update || record.created_at,
    settings: { ...defaultCarSettings, ...(record.settings as Partial<Car['settings']> || {}) },
    legalDocs: (record.legal_docs || []) as unknown as Car['legalDocs'],
    oilServices: (record.oil_services || []) as unknown as Car['oilServices'],
    brakeTireServices: (record.brake_tire_services || []) as unknown as Car['brakeTireServices'],
    mileageHistory: (record.mileage_history || []) as unknown as Car['mileageHistory'],
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
