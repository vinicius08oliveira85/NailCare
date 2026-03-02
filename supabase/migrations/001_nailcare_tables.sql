-- NailCare: tabelas, RLS, Realtime e seed
-- Executar no SQL Editor do projeto Supabase: https://supabase.com/dashboard/project/dfsgxqwqhmgziziaabch

-- Tabela clients
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Tabela services
CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Tabela appointments
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name text,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  date timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('Pendente', 'Pago', 'Cancelado')),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- RLS: ativar em todas as tabelas
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Políticas anon (acesso total para single-tenant; troque por auth.uid() quando adicionar login)
CREATE POLICY "anon_all_clients" ON public.clients FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_services" ON public.services FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_appointments" ON public.appointments FOR ALL TO anon USING (true) WITH CHECK (true);

-- Realtime: incluir tabelas na publicação
ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.services;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;

-- Seed: serviços padrão apenas se a tabela estiver vazia
DO $$
BEGIN
  IF (SELECT count(*) FROM public.services) = 0 THEN
    INSERT INTO public.services (name, price) VALUES
      ('Manicure', 35),
      ('Pedicure', 40),
      ('Combo (Mão e Pé)', 70);
  END IF;
END $$;
