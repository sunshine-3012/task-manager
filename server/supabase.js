const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const DEFAULT_SUPABASE_URL = 'https://trngsyiefgsglysdawld.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRybmdzeWllZmdzZ2x5c2Rhd2xkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NTMxMzYsImV4cCI6MjEwNzAyOTEzNn0.5RvR69SzsLmhX8Tmij-EtJTEivIHclBmvLfyttlqXAI';
const DEFAULT_SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRybmdzeWllZmdzZ2x5c2Rhd2xkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTQ1MzEzNiwiZXhwIjoyMTA3MDI5MTM2fQ.T2SbeeWIe79pyMncq6KVzMrIZB1ZC_yxsHwFtsQ9zZc';

const SUPABASE_URL = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || DEFAULT_SUPABASE_SERVICE_ROLE_KEY;

// Base Supabase client with Anon Key
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
