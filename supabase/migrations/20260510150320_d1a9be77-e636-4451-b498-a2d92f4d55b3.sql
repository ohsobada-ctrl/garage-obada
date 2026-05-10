
-- Create the cars table
CREATE TABLE public.cars (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    current_mileage INTEGER NOT NULL DEFAULT 0,
    last_mileage_update TIMESTAMP WITH TIME ZONE,
    mileage_history JSONB DEFAULT '[]'::jsonb,
    legal_docs JSONB DEFAULT '[]'::jsonb,
    oil_services JSONB DEFAULT '[]'::jsonb,
    brake_tire_services JSONB DEFAULT '[]'::jsonb,
    settings JSONB DEFAULT '{"oilExpiryMonths": 6, "oilRangeKm": 5000, "brakeReminderMonths": 6, "tireReminderMonths": 6}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;

-- Users can view their own cars
CREATE POLICY "Users can view their own cars"
ON public.cars
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own cars
CREATE POLICY "Users can insert their own cars"
ON public.cars
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own cars
CREATE POLICY "Users can update their own cars"
ON public.cars
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own cars
CREATE POLICY "Users can delete their own cars"
ON public.cars
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
