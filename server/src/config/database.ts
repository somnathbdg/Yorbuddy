import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.js';

let supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabase) {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
      throw new Error('Supabase credentials not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env file.');
    }
    supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabase;
}

// Raw SQL helper (via Supabase RPC or direct postgres connection)
// For migrations and raw SQL, we'll use the Supabase dashboard SQL editor
// or a direct postgres connection in later steps
