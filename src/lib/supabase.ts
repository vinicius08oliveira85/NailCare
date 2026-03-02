import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const urlStr = typeof url === 'string' ? url.trim() : '';
const keyStr = typeof anonKey === 'string' ? anonKey.trim() : '';
const hasConfig = urlStr.length > 0 && keyStr.length > 0;

if (!hasConfig) {
  console.warn('NailCare: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY devem estar definidos (ex.: no Vercel) para sincronização com Supabase.');
}

// Nunca passar string vazia ao Supabase (evita "supabaseUrl is required" e página em branco)
const supabase: SupabaseClient = createClient(
  hasConfig ? urlStr : 'https://placeholder.supabase.co',
  hasConfig ? keyStr : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDB9.placeholder'
);
export { supabase };
