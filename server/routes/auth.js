// CivicFix AI — Citizen & Admin Authentication Endpoints
const express = require('express');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const { supabase, isConfigured } = require('../supabase');
const {
  requireCitizenAuth,
  registerDemoCitizenToken,
  isDemoAllowed,
  DEMO_TOKEN,
} = require('../auth');

const router = express.Router();

// Rate limiting for auth endpoints to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many authentication requests. Please try again in 15 minutes.' },
});

router.use(authLimiter);

/**
 * Helper: Basic email validation
 */
function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Helper: Derive exact site origin for auth email redirects
 */
function getAppOrigin(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const reqOrigin = req.get('origin');
  if (reqOrigin && reqOrigin.startsWith('http')) return reqOrigin.replace(/\/$/, '');
  const host = req.get('host');
  if (host) {
    const proto = req.get('x-forwarded-proto') || (process.env.VERCEL ? 'https' : 'http');
    return `${proto}://${host}`.replace(/\/$/, '');
  }
  return 'https://civicfix-seven-eosin.vercel.app';
}

/**
 * POST /api/auth/signup
 * Citizen Registration via Supabase Auth
 */
router.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid email address.',
    });
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 6 characters long.',
    });
  }

  const cleanEmail = email.toLowerCase().trim();

  if (isConfigured && supabase) {
    try {
      const origin = getAppOrigin(req);
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${origin}/login`,
        },
      });

      if (error) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      // Check if email confirmation is required by Supabase project settings
      const requiresEmailConfirmation = Boolean(!data.session && data.user && data.user.identities && data.user.identities.length > 0);

      return res.status(201).json({
        success: true,
        message: requiresEmailConfirmation
          ? 'Registration successful! A verification link has been sent to your email. Please verify before signing in.'
          : 'Registration successful! You can now log in.',
        data: {
          user: data.user ? { id: data.user.id, email: data.user.email } : null,
          requiresEmailConfirmation,
          token: data.session ? data.session.access_token : null,
        },
      });
    } catch (err) {
      console.error('[Auth /signup] Error:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Unable to complete registration. Please try again.',
      });
    }
  } else {
    // Local offline demo mode for hackathon testing
    if (isDemoAllowed) {
      const demoId = `demo-citizen-${crypto.randomBytes(6).toString('hex')}`;
      const demoToken = `demo_citizen_${crypto.randomBytes(24).toString('hex')}`;
      const demoUser = { id: demoId, email: cleanEmail, role: 'citizen' };
      registerDemoCitizenToken(demoToken, demoUser);

      return res.status(201).json({
        success: true,
        message: 'Account created successfully (Local Demo Mode).',
        data: {
          user: demoUser,
          requiresEmailConfirmation: false,
          token: demoToken,
        },
      });
    }

    return res.status(503).json({
      success: false,
      error: 'Authentication service is not configured in production.',
    });
  }
});

/**
 * POST /api/auth/login
 * Citizen & Admin Authentication
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required.',
    });
  }

  const cleanEmail = String(email).toLowerCase().trim();
  const cleanPass = String(password).trim();

  // Local demo admin bypass (strictly forbidden in production)
  if (
    isDemoAllowed &&
    DEMO_TOKEN &&
    (cleanEmail === 'admin@civicfix.local' || cleanEmail === 'admin@civicfix.com') &&
    cleanPass === 'admin123'
  ) {
    return res.json({
      success: true,
      data: {
        token: DEMO_TOKEN,
        user: { id: 'demo-admin-user-id', email: cleanEmail, role: 'admin' },
        isAdmin: true,
      },
    });
  }

  // Local demo citizen test user
  if (isDemoAllowed && cleanEmail === 'citizen@civicfix.local' && cleanPass === 'citizen123') {
    const demoId = 'demo-citizen-id-1';
    const demoToken = `demo_citizen_${crypto.randomBytes(24).toString('hex')}`;
    const demoUser = { id: demoId, email: cleanEmail, role: 'citizen' };
    registerDemoCitizenToken(demoToken, demoUser);

    return res.json({
      success: true,
      data: {
        token: demoToken,
        user: demoUser,
        isAdmin: false,
      },
    });
  }

  if (isConfigured && supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPass,
      });

      if (error || !data.session) {
        return res.status(401).json({
          success: false,
          error: error ? error.message : 'Invalid login credentials.',
        });
      }

      const adminUserId = process.env.ADMIN_USER_ID;
      const isAdmin = Boolean(
        (adminUserId && data.user.id === adminUserId) ||
        data.user.app_metadata?.role === 'admin'
      );

      return res.json({
        success: true,
        data: {
          token: data.session.access_token,
          user: {
            id: data.user.id,
            email: data.user.email,
          },
          isAdmin,
        },
      });
    } catch (err) {
      console.error('[Auth /login] Error:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Login service encountered an unexpected error.',
      });
    }
  }

  return res.status(401).json({
    success: false,
    error: 'Invalid email or password.',
  });
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ') && isConfigured && supabase) {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore cleanup error
    }
  }

  return res.json({
    success: true,
    message: 'Signed out successfully.',
  });
});

/**
 * POST /api/auth/forgot-password
 * Send password reset email
 */
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      error: 'Please enter a valid email address.',
    });
  }

  const cleanEmail = email.toLowerCase().trim();

  if (isConfigured && supabase) {
    try {
      const origin = getAppOrigin(req);
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${origin}/reset-password`,
      });

      if (error) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    } catch (err) {
      console.error('[Auth /forgot-password] Error:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Unable to send reset email at this time.',
      });
    }
  } else {
    // Demo response
    return res.json({
      success: true,
      message: 'Password reset link simulated in local demo mode.',
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Update password using verified recovery session Bearer token
 */
router.post('/reset-password', requireCitizenAuth, async (req, res) => {
  const { password } = req.body;

  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 6 characters long.',
    });
  }

  if (isConfigured && supabase) {
    try {
      // Supabase client uses the active user's session
      const authHeader = req.headers.authorization;
      const token = authHeader.split(' ')[1];

      // Update password for user identified by recovery token
      const { data, error } = await supabase.auth.admin.updateUserById(req.user.id, {
        password,
      });

      if (error) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      return res.json({
        success: true,
        message: 'Your password has been updated successfully. You can now sign in.',
      });
    } catch (err) {
      console.error('[Auth /reset-password] Error:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to update password.',
      });
    }
  } else {
    return res.json({
      success: true,
      message: 'Password updated successfully (Local Demo Mode).',
    });
  }
});

/**
 * GET /api/auth/me
 * Validate current session and retrieve profile
 */
router.get('/me', requireCitizenAuth, (req, res) => {
  const adminUserId = process.env.ADMIN_USER_ID;
  const isAdmin = Boolean(
    (adminUserId && req.user.id === adminUserId) ||
    req.user.app_metadata?.role === 'admin'
  );

  return res.json({
    success: true,
    data: {
      user: {
        id: req.user.id,
        email: req.user.email,
        isAdmin,
      },
    },
  });
});

module.exports = router;
