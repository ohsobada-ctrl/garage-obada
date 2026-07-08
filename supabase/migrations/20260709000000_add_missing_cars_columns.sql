-- Add missing JSONB columns to the cars table that were lost after schema recreation in Supabase dashboard

ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS current_mileage INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_mileage_update TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS mileage_history JSONB DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS legal_docs JSONB DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS oil_services JSONB DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS brake_tire_services JSONB DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{
    "oilRangeKm": 10000,
    "oilExpiryMonths": 12,
    "brakeReminderMonths": 6,
    "tireReminderMonths": 12
  }'::JSONB;
