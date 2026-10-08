const { supabaseClient, getUserSupabaseClient } = require('../supabase');

/**
 * Authentication middleware.
 * Verifies Supabase Bearer JWT token from the Authorization header.
 * Attaches user object and scoped Supabase client to the request.
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Missing Bearer token in Authorization header.'
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token format.'
      });
    }

    // Verify token with Supabase Auth
    const { data, error } = await supabaseClient.auth.getUser(token);

    if (error || !data || !data.user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session. Please log in again.'
      });
    }

    // Attach user and scoped Supabase client with user's JWT
    req.user = data.user;
    req.token = token;
    req.supabase = getUserSupabaseClient(token);

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({
      success: false,
      error: 'Authentication service error'
    });
  }
}

module.exports = {
  requireAuth
};
