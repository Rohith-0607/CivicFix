// CivicFix AI — Unified Authentication & Security Middleware
// Supports Supabase Auth JWT verification for both Citizens and Administrators.

const crypto = require('crypto');
const { supabase, isConfigured } = require('./supabase');

// Strict environment separation: demo authentication is strictly disabled in production
const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
const isDemoAllowed = !isProduction;

// Dynamic cryptographically secure session tokens generated per server boot for local testing only
const DEMO_TOKEN = isDemoAllowed
  ? `demo_admin_${crypto.randomBytes(24).toString('hex')}`
  : null;

// In-memory demo citizen store for offline local testing
const DEMO_CITIZEN_TOKENS = new Map();

/**
 * Register a demo citizen token in local development mode
 */
function registerDemoCitizenToken(token, user) {
  if (isDemoAllowed) {
    DEMO_CITIZEN_TOKENS.set(token, user);
  }
}

/**
 * Verify a citizen or admin JWT token
 */
async function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;

  // Local development demo tokens
  if (isDemoAllowed) {
    if (DEMO_TOKEN && token === DEMO_TOKEN) {
      return {
        id: 'demo-admin-user-id',
        email: 'admin@civicfix.local',
        role: 'admin',
        app_metadata: { role: 'admin' },
      };
    }
    if (DEMO_CITIZEN_TOKENS.has(token)) {
      return DEMO_CITIZEN_TOKENS.get(token);
    }
  }

  // Production / Connected Supabase JWT verification
  if (isConfigured && supabase) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) return null;
      return user;
    } catch {
      return null;
    }
  }

  return null;
}

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
  if (isDemoAllowed) {
    if (DEMO_TOKEN && token === DEMO_TOKEN) {
      req.adminUser = {
        id: 'demo-admin-user-id',
        email: 'admin@civicfix.local',
        role: 'admin',
      };
      return next();
    }
    // Security check: Authenticated citizen attempting to access admin route
    if (DEMO_CITIZEN_TOKENS.has(token)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Current user account does not have administrative privileges.',
      });
    }
  }

  // Security requirement 8: Fail closed in production if ADMIN_USER_ID is not configured
  const adminUserId = process.env.ADMIN_USER_ID;
  if (isProduction && !adminUserId) {
    console.error('[Security] ADMIN_USER_ID is missing in production. Failing closed.');
    return res.status(500).json({
      success: false,
      error: 'Administrator access is disabled: ADMIN_USER_ID configuration is missing.',
    });
  }

  // Verify Supabase Auth token
  if (isConfigured && supabase) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired administrative session. Please log in again.',
        });
      }

      // Check allowlisted ADMIN_USER_ID or server-controlled app_metadata
      const isAdminRole = Boolean(user.app_metadata?.role === 'admin');
      const isAllowedId = Boolean(adminUserId && user.id === adminUserId);

      // Security requirement 7: Regular citizens cannot access admin endpoints
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

/**
 * Middleware: Strictly requires Citizen authentication (e.g. for "My Complaints" dashboard)
 */
async function requireCitizenAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Please sign in to view your complaints.',
    });
  }

  const token = authHeader.split(' ')[1];
  const user = await verifyToken(token);

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Your session has expired or is invalid. Please sign in again.',
    });
  }

  req.user = user;
  return next();
}

/**
 * Middleware: Optional Citizen authentication for reporting
 * - If NO Authorization header is sent -> guest reporting allowed (req.user = null).
 * - If an Authorization header IS sent -> token must be valid! If invalid/expired, reject with 401.
 */
async function optionalCitizenAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  // Case 1: Anonymous / Guest submission (no auth header provided)
  if (!authHeader) {
    req.user = null;
    return next();
  }

  // Case 2: Auth header provided -> validate strictly
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Invalid Authorization header format. Expected Bearer token.',
    });
  }

  const token = authHeader.split(' ')[1];
  const user = await verifyToken(token);

  // Security requirement 5: Reject invalid or expired supplied tokens rather than silently treating as guest
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired login session. Please sign in again or submit without an account.',
    });
  }

  req.user = user;
  return next();
}

module.exports = {
  requireAdminAuth,
  requireCitizenAuth,
  optionalCitizenAuth,
  verifyToken,
  registerDemoCitizenToken,
  DEMO_TOKEN,
  isDemoAllowed,
  isProduction,
};
