import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn('NailCare: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY devem estar definidos em .env.local para sincronização com Supabase.');
}

export const supabase = createClient(url || '', anonKey || '');
