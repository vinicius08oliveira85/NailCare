import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const hasConfig = Boolean(url && anonKey);

if (!hasConfig) {
  console.warn('NailCare: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY devem estar definidos (ex.: no Vercel) para sincronização com Supabase.');
}

// Evita createClient('', '') que pode lançar e deixar a página em branco no deploy
const supabase: SupabaseClient = hasConfig
  ? createClient(url!, anonKey!)
  : createClient('https://placeholder.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDB9.placeholder');
export { supabase };
