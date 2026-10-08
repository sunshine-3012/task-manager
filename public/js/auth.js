/**
 * Supabase Authentication Controller
 * Handles Login, Registration, Logout, Password Reset, and Session Protection
 */

const Auth = {
  async requireAuth() {
    const client = await getSupabase();
    if (!client) return null;

    const { data: { session } } = await client.auth.getSession();
    if (!session) {
      window.location.href = '/login.html';
      return null;
    }
    return session.user;
  },

  async redirectIfAuthenticated() {
    const client = await getSupabase();
    if (!client) return;

    const { data: { session } } = await client.auth.getSession();
    if (session) {
      window.location.href = '/dashboard.html';
    }
  },

  async register(email, password, fullName) {
    const client = await getSupabase();
    if (!client) throw new Error('Supabase client unavailable');

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    if (error) {
      throw error;
    }

    return data;
  },

  async login(email, password) {
    const client = await getSupabase();
    if (!client) throw new Error('Supabase client unavailable');

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }

    return data;
  },

  async logout() {
    try {
      const client = await getSupabase();
      if (client) {
        await client.auth.signOut();
      }
    } catch (e) {
      console.warn('Sign out error:', e);
    } finally {
      window.location.href = '/login.html';
    }
  },

  async resetPassword(email) {
    const client = await getSupabase();
    if (!client) throw new Error('Supabase client unavailable');

    const { data, error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login.html`
    });

    if (error) {
      throw error;
    }

    return data;
  }
};

window.Auth = Auth;
