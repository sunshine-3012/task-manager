/**
 * TaskFlow Configuration & Supabase Initialization Module
 */

const DEFAULT_SUPABASE_URL = 'https://trngsyiefgsglysdawld.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRybmdzeWllZmdzZ2x5c2Rhd2xkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NTMxMzYsImV4cCI6MjEwNzAyOTEzNn0.5RvR69SzsLmhX8Tmij-EtJTEivIHclBmvLfyttlqXAI';

let supabaseInstance = null;
let configPromise = null;

/**
 * Ensures window.supabase is available from CDN
 */
async function waitForSupabaseLibrary() {
  if (window.supabase) return true;

  // Poll for up to 3 seconds in case CDN script is still loading
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 100));
    if (window.supabase) return true;
  }

  // Fallback: Dynamically inject unpkg CDN if jsdelivr was blocked
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@supabase/supabase-js@2';
    script.onload = () => resolve(Boolean(window.supabase));
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

/**
 * Initializes and retrieves the Supabase client
 */
async function getSupabase() {
  if (supabaseInstance) return supabaseInstance;

  if (!configPromise) {
    configPromise = (async () => {
      try {
        let supabaseUrl = DEFAULT_SUPABASE_URL;
        let supabaseAnonKey = DEFAULT_SUPABASE_ANON_KEY;

        // Try to fetch server-provided config if available
        try {
          const res = await fetch('/api/config');
          if (res.ok) {
            const config = await res.json();
            if (config.supabaseUrl && !config.supabaseUrl.includes('your-project-id')) {
              supabaseUrl = config.supabaseUrl;
            }
            if (config.supabaseAnonKey && !config.supabaseAnonKey.includes('your_supabase_anon_key')) {
              supabaseAnonKey = config.supabaseAnonKey;
            }
          }
        } catch (apiErr) {
          console.warn('API /api/config unavailable, using default Supabase project credentials.');
        }

        // Check local override if any
        const storedOverride = localStorage.getItem('taskflow_supabase_config');
        if (storedOverride) {
          try {
            const parsed = JSON.parse(storedOverride);
            if (parsed.url && parsed.anonKey) {
              supabaseUrl = parsed.url;
              supabaseAnonKey = parsed.anonKey;
            }
          } catch (e) {
            console.error('Failed to parse stored Supabase config override:', e);
          }
        }

        const libraryReady = await waitForSupabaseLibrary();
        if (!libraryReady || !window.supabase) {
          console.error('Supabase client library failed to load.');
          return null;
        }

        supabaseInstance = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
        return supabaseInstance;
      } catch (err) {
        console.error('Failed to initialize Supabase client:', err);
        return null;
      }
    })();
  }

  return configPromise;
}

/**
 * Retrieves the current user's JWT access token
 */
async function getAuthToken() {
  const client = await getSupabase();
  if (!client) return null;
  const { data: { session } } = await client.auth.getSession();
  return session ? session.access_token : null;
}

/**
 * Retrieves the current session user object
 */
async function getAuthUser() {
  const client = await getSupabase();
  if (!client) return null;
  const { data: { user } } = await client.auth.getUser();
  return user || null;
}

/**
 * Theme Manager: Dark / Light mode with localStorage persistence
 */
function initTheme() {
  const savedTheme = localStorage.getItem('taskflow_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const newTheme = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('taskflow_theme', newTheme);
  updateThemeIcon(newTheme);

  if (window.API && window.API.updateProfile) {
    window.API.updateProfile({ theme_preference: newTheme }).catch(() => {});
  }
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('theme-toggle-btn');
  if (!btn) return;

  if (theme === 'light') {
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
    `;
    btn.setAttribute('title', 'Switch to Dark Mode');
  } else {
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="12" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
    `;
    btn.setAttribute('title', 'Switch to Light Mode');
  }
}

initTheme();
