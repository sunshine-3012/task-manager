const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('\x1b[33m%s\x1b[0m', '⚠️  Warning: SUPABASE_URL and SUPABASE_ANON_KEY are not set in .env. Please configure them to connect to your Supabase project.');
}

// Base Supabase client with Anon Key
const supabaseClient = createClient(SUPABASE_URL || 'https://placeholder.supabase.co', SUPABASE_ANON_KEY || 'placeholder');

// Admin Supabase client with Service Role Key (Server-side only)
const adminSupabase = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

/**
 * Creates a scoped Supabase client for a specific user request using their JWT.
 * This ensures PostgreSQL Row Level Security (RLS) is automatically enforced
 * for all database queries executed by this client.
 */
function getUserSupabaseClient(jwtToken) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${jwtToken}`
      }
    }
  });
}

module.exports = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  supabaseClient,
  adminSupabase,
  getUserSupabaseClient
};
