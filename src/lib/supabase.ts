
import { createClient } from '@supabase/supabase-js';

// Get environment variables with fallbacks for development
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if we're missing configuration
const isMissingConfig = !supabaseUrl || !supabaseAnonKey;

// Log warning for developers
if (isMissingConfig) {
  console.warn(
    'Supabase configuration is missing. Please set the following environment variables:\n' +
    '- VITE_SUPABASE_URL\n' +
    '- VITE_SUPABASE_ANON_KEY\n\n' +
    'For Lovable projects, connect to Supabase using the green Supabase button in the top right corner.'
  );
}

// Create a mock client for development when not configured
export const supabase = isMissingConfig 
  ? createClient('https://example.supabase.co', 'fake-key', {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : createClient(supabaseUrl, supabaseAnonKey);

// Export a helper to check if Supabase is properly configured
export const isSupabaseConfigured = !isMissingConfig;
