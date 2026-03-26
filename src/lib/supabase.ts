import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Variáveis VITE_SUPABASE_URL ou VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY não estão definidas. Configure no arquivo .env.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
