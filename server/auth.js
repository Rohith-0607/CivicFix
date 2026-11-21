// CivicFix AI — Administrator Authentication & Security Middleware
// Supports Supabase Auth JWT verification for municipal administrators.

const crypto = require('crypto');
const { createAuthClient, isConfigured } = require('./supabase');

// Strict environment separation: demo authentication is strictly disabled in production
const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
const isDemoAllowed = !isProduction;

// Dynamic cryptographically secure session tokens generated per server boot for local testing only
const DEMO_TOKEN = isDemoAllowed
  ? `demo_admin_${crypto.randomBytes(24).toString('hex')}`
  : null;

/**
 * Middleware: Strictly requires Admin authentication
 * Enforces production fail-closed if ADMIN_USER_ID is missing.
 */
async function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Missing Bearer token in Authorization header.',
    });
  }

  const token = authHeader.split(' ')[1];

  // Local demo admin bypass (strictly disabled in production)
  if (isDemoAllowed && DEMO_TOKEN && token === DEMO_TOKEN) {
    req.adminUser = {
      id: 'demo-admin-user-id',
      email: 'admin@civicfix.local',
      role: 'admin',
    };
    return next();
  }

  // Security requirement: Fail closed in production if ADMIN_USER_ID is not configured
  const adminUserId = process.env.ADMIN_USER_ID;
  if (isProduction && !adminUserId) {
    console.error('[Security] ADMIN_USER_ID is missing in production. Failing closed.');
    return res.status(500).json({
      success: false,
      error: 'Administrator access is disabled: ADMIN_USER_ID configuration is missing.',
    });
  }

  // Verify Supabase Auth token using an isolated auth client
  if (isConfigured) {
    try {
      const authClient = createAuthClient();
      if (!authClient) {
        return res.status(500).json({
          success: false,
          error: 'Authentication service is not configured.',
        });
      }

      const { data: { user }, error } = await authClient.auth.getUser(token);

      if (error || !user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired administrative session. Please log in again.',
        });
      }

      // Check allowlisted ADMIN_USER_ID or server-controlled app_metadata
      const isAdminRole = Boolean(user.app_metadata?.role === 'admin');
      const isAllowedId = Boolean(adminUserId && user.id === adminUserId);

      // Non-admin accounts cannot access admin endpoints
      if (!isAllowedId && !isAdminRole) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Current user account does not have administrative privileges.',
        });
      }

      req.adminUser = user;
      return next();
    } catch (err) {
      console.error('[Auth] Admin token verification error:', err.message);
      return res.status(401).json({
        success: false,
        error: 'Authentication verification failed.',
      });
    }
  }

  return res.status(401).json({
    success: false,
    error: 'Invalid authentication session.',
  });
}

module.exports = {
  requireAdminAuth,
  DEMO_TOKEN,
  isDemoAllowed,
  isProduction,
};
