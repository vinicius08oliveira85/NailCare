-- Taxa de deslocamento (R$ 10,00) opcional por agendamento
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS travel_fee numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.appointments.travel_fee IS 'Taxa de deslocamento em reais (ex.: 10.00). Zero quando não aplicável.';
