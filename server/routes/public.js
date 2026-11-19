// CivicFix AI — Public Routes
const express = require('express');
const multer = require('multer');
const {
  createComplaint,
  getPublicIssues,
  getComplaintByTrackingCode,
  uploadPhoto,
  deletePhoto,
  isConfigured,
  supabase,
} = require('../supabase');
const { analyzeComplaint, ALLOWED_CATEGORIES, ALLOWED_PRIORITIES } = require('../ai');
const { DEMO_TOKEN } = require('../auth');

const router = express.Router();

// Multer in-memory storage for handling optional photo upload (max 5MB, JPG/PNG/WebP)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMime.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Only JPG, PNG, and WebP images up to 5 MB are allowed.'));
    }
  },
});

/**
 * POST /api/analyze
 * Body: { description, location_area }
 * Rate-limited public endpoint
 */
router.post('/analyze', async (req, res) => {
  try {
    const { description, location_area } = req.body;

    if (!description || typeof description !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Issue description is required.',
      });
    }

    const trimmedDesc = description.trim();
    if (trimmedDesc.length < 10 || trimmedDesc.length > 2000) {
      return res.status(400).json({
        success: false,
        error: 'Description must be between 10 and 2000 characters.',
      });
    }

    const trimmedArea = (location_area || '').trim().slice(0, 100);

    const suggestions = await analyzeComplaint(trimmedDesc, trimmedArea);

    return res.json({
      success: true,
      data: suggestions,
    });
  } catch (err) {
    console.error('[Route /api/analyze] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to analyze description. You can still submit manually.',
    });
  }
});

/**
 * POST /api/complaints
 * Multipart form submission (photo optional)
 */
router.post('/complaints', upload.single('photo'), async (req, res) => {
  let uploadedPhotoPath = null;

  try {
    const {
      description,
      location_area,
      landmark,
      reporter_name,
      category,
      priority,
      suggested_department,
      ai_reason,
      english_summary,
      latitude,
      longitude,
    } = req.body;

    // Validation
    if (!description || description.trim().length < 15 || description.trim().length > 2000) {
      return res.status(400).json({
        success: false,
        error: 'Description must be between 15 and 2000 characters.',
      });
    }

    if (!location_area || location_area.trim().length < 2 || location_area.trim().length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Location area must be between 2 and 100 characters.',
      });
    }

    // Handle photo upload if present
    if (req.file) {
      try {
        uploadedPhotoPath = await uploadPhoto(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype
        );
      } catch (uploadErr) {
        return res.status(500).json({
          success: false,
          error: `Photo upload failed: ${uploadErr.message}`,
        });
      }
    }

    // Ensure category and priority conform to allowed values
    const safeCategory = ALLOWED_CATEGORIES.includes(category) ? category : 'Unclassified';
    const safePriority = ALLOWED_PRIORITIES.includes(priority) ? priority : 'Needs review';

    const complaintData = {
      description: description.trim(),
      location_area: location_area.trim(),
      landmark: landmark ? landmark.trim().slice(0, 120) : null,
      reporter_name: reporter_name ? reporter_name.trim().slice(0, 80) : null,
      photo_path: uploadedPhotoPath,
      category: safeCategory,
      priority: safePriority,
      suggested_department: suggested_department ? suggested_department.trim().slice(0, 80) : 'Municipal Services',
      ai_reason: ai_reason ? ai_reason.trim().slice(0, 300) : null,
      english_summary: english_summary ? english_summary.trim().slice(0, 250) : null,
      latitude: latitude && !isNaN(Number(latitude)) ? Number(latitude) : undefined,
      longitude: longitude && !isNaN(Number(longitude)) ? Number(longitude) : undefined,
    };

    const result = await createComplaint(complaintData);

    return res.status(201).json({
      success: true,
      data: {
        tracking_code: result.tracking_code,
        status: result.status,
      },
    });
  } catch (err) {
    console.error('[Route /api/complaints] Error:', err.message);

    // Clean up uploaded photo if DB insert failed
    if (uploadedPhotoPath) {
      await deletePhoto(uploadedPhotoPath);
    }

    return res.status(500).json({
      success: false,
      error: 'Unable to save complaint. Please try again.',
    });
  }
});

/**
 * GET /api/issues
 * Public list with counters and filters
 */
router.get('/issues', async (req, res) => {
  try {
    const { page = 1, limit = 15, category, status, search } = req.query;

    const data = await getPublicIssues({
      page: parseInt(page, 10) || 1,
      limit: Math.min(parseInt(limit, 10) || 15, 50),
      category,
      status,
      search,
    });

    return res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error('[Route /api/issues] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Could not fetch public issues list.',
    });
  }
});

/**
 * GET /api/track/:code
 * Public tracking endpoint
 */
router.get('/track/:code', async (req, res) => {
  try {
    const code = req.params.code;
    if (!code || code.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid tracking code.',
      });
    }

    const complaint = await getComplaintByTrackingCode(code);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: "We couldn't find a complaint with that ID.",
      });
    }

    return res.json({
      success: true,
      data: complaint,
    });
  } catch (err) {
    console.error('[Route /api/track] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Server error while looking up complaint.',
    });
  }
});

/**
 * POST /api/admin/login
 * Helper endpoint for authenticating demo admin or Supabase user
 */
router.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required.',
    });
  }

  const cleanEmail = String(email).toLowerCase().trim();
  const cleanPass = String(password).trim();

  const isProduction = process.env.NODE_ENV === 'production';
  const isDemoAllowed = !isProduction || process.env.ALLOW_DEMO_LOGIN === 'true';

  // 1. Built-in Demo Administrator Login (configurable for local dev / evaluation, disabled in strict prod)
  if (
    isDemoAllowed &&
    (cleanEmail === 'admin@civicfix.local' || cleanEmail === 'admin' || cleanEmail === 'admin@civicfix.com') &&
    cleanPass === 'admin123'
  ) {
    return res.json({
      success: true,
      data: {
        token: DEMO_TOKEN,
        user: {
          id: 'demo-admin-user-id',
          email: 'admin@civicfix.local',
        },
        isDemoMode: true,
      },
    });
  }

  // 2. Supabase Auth Login if configured in environment
  if (isConfigured && supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPass,
      });

      if (error || !data.session) {
        return res.status(401).json({
          success: false,
          error: error ? error.message : 'Invalid credentials. For demo mode, use admin@civicfix.local / admin123',
        });
      }

      // Check admin authorization
      const adminUserId = process.env.ADMIN_USER_ID;
      const isAdminRole = data.user.user_metadata?.role === 'admin' || data.user.app_metadata?.role === 'admin';
      const isAllowedId = adminUserId ? data.user.id === adminUserId : true;

      if (!isAllowedId && !isAdminRole) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Account is not registered as an administrator.',
        });
      }

      return res.json({
        success: true,
        data: {
          token: data.session.access_token,
          user: {
            id: data.user.id,
            email: data.user.email,
          },
        },
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  } else {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials. For offline demo mode, use admin@civicfix.local / admin123',
    });
  }
});

module.exports = router;
