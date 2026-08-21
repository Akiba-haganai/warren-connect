-- Create table for landlord offline tenant records (replaces localStorage)
CREATE TABLE IF NOT EXISTS public.offline_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  accommodation_id UUID NOT NULL REFERENCES public.accommodations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.offline_tenants ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Landlords can view own offline tenants" 
ON public.offline_tenants
FOR SELECT 
USING (landlord_id = auth.uid());

CREATE POLICY "Landlords can insert own offline tenants" 
ON public.offline_tenants
FOR INSERT 
WITH CHECK (landlord_id = auth.uid());

CREATE POLICY "Landlords can delete own offline tenants" 
ON public.offline_tenants
FOR DELETE 
USING (landlord_id = auth.uid());

-- Optional: Grant permissions if needed depending on your setup
GRANT ALL ON public.offline_tenants TO authenticated;
GRANT ALL ON public.offline_tenants TO service_role;
