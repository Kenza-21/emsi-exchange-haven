
import { createClient } from '@supabase/supabase-js';

// Validate environment variables
if (!import.meta.env.VITE_SUPABASE_URL) {
  console.error('Supabase URL is missing. Please set VITE_SUPABASE_URL');
  throw new Error('Supabase URL is required');
}

if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.error('Supabase Anon Key is missing. Please set VITE_SUPABASE_ANON_KEY');
  throw new Error('Supabase Anon Key is required');
}

// Create a single supabase client for the entire app
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
