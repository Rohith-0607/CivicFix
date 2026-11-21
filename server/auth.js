// CivicFix AI — Admin Authentication Middleware
// Verifies Supabase Auth JWT token and checks admin authorization allowlist.

const crypto = require('crypto');
const { supabase, isConfigured } = require('./supabase');

// Strict environment separation: demo authentication is strictly disabled in production
const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
const isDemoAllowed = !isProduction;

// Dynamic cryptographically secure session token generated per server boot
// Prevents static predictable token replay or hardcoded token exposure
const DEMO_TOKEN = isDemoAllowed
  ? `demo_${crypto.randomBytes(24).toString('hex')}`
  : null;

async function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Missing Bearer token in Authorization header.',
    });
  }

  const token = authHeader.split(' ')[1];

  // Demo admin token accepted in development / hackathon demo mode only (never in production)
  if (isDemoAllowed && DEMO_TOKEN && token === DEMO_TOKEN) {
    req.adminUser = {
      id: 'demo-admin-user-id',
      email: 'admin@civicfix.local',
      role: 'admin',
    };
    return next();
  }

  // If Supabase is configured, verify with Supabase Auth
  if (isConfigured && supabase) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired authentication session. Please log in again.',
        });
      }

      // Check allowlisted ADMIN_USER_ID or server-controlled app_metadata
      const adminUserId = process.env.ADMIN_USER_ID;
      const isAdminRole = Boolean(user.app_metadata?.role === 'admin');
      const isAllowedId = Boolean(adminUserId && user.id === adminUserId);

      // Missing admin configuration denies access unless explicitly granted in app_metadata
      if (!isAllowedId && !isAdminRole) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Current user does not have administrative privileges.',
        });
      }

      req.adminUser = user;
      return next();
    } catch (err) {
      console.error('[Auth] Token verification exception:', err.message);
      return res.status(401).json({
        success: false,
        error: 'Authentication verification failed.',
      });
    }
  } else {
    return res.status(401).json({
      success: false,
      error: 'Invalid demo session token.',
    });
  }
}

module.exports = {
  requireAdminAuth,
  DEMO_TOKEN,
  isDemoAllowed,
};
