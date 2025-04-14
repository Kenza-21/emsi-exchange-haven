
import { createClient } from '@supabase/supabase-js';

// Import from our auto-generated Supabase client
import { supabase as configuredSupabase } from '@/integrations/supabase/client';

// Use the properly configured client
export const supabase = configuredSupabase;

// Export a helper to check if Supabase is properly configured
export const isSupabaseConfigured = true;
