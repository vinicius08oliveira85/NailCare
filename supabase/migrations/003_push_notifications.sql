-- Inscrições push para Web Push (notificações com app fechado)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_push_subscriptions" ON public.push_subscriptions FOR ALL TO anon USING (true) WITH CHECK (true);

-- Controle de notificações já enviadas por agendamento
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS notified_1day_at timestamptz,
  ADD COLUMN IF NOT EXISTS notified_1h_at timestamptz;

COMMENT ON COLUMN public.appointments.notified_1day_at IS 'Quando foi enviada a notificação "1 dia antes".';
COMMENT ON COLUMN public.appointments.notified_1h_at IS 'Quando foi enviada a notificação "1 hora antes".';
