// CivicFix AI — Protected Admin Routes
const express = require('express');
const { requireAdminAuth } = require('../auth');
const {
  getAdminSummary,
  getAdminComplaints,
  getComplaintById,
  updateComplaint,
  getLocationAnalysis,
  getRealtimeMapPoints,
  getSignedPhotoUrl,
} = require('../supabase');
const { ALLOWED_CATEGORIES, ALLOWED_PRIORITIES, ALLOWED_DEPARTMENTS } = require('../ai');

const router = express.Router();

// Apply admin authentication to all routes in this router
router.use(requireAdminAuth);

/**
 * GET /api/admin/summary
 * Dashboard metrics, recent complaints, top areas, categories
 */
router.get('/summary', async (req, res) => {
  try {
    const summary = await getAdminSummary();

    // Populate photo URLs for recent list items
    if (summary && Array.isArray(summary.recent)) {
      summary.recent = await Promise.all(
        summary.recent.map(async (c) => ({
          ...c,
          photo_url: c.photo_path ? await getSignedPhotoUrl(c.photo_path, 300) : null,
          has_photo: Boolean(c.photo_path),
        }))
      );
    }

    return res.json({
      success: true,
      data: summary,
    });
  } catch (err) {
    console.error('[Admin Summary] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve admin summary.',
    });
  }
});

/**
 * GET /api/admin/complaints
 * Search and filterable complaints table
 */
router.get('/complaints', async (req, res) => {
  try {
    const { page = 1, limit = 20, category, status, search } = req.query;

    const data = await getAdminComplaints({
      page: parseInt(page, 10) || 1,
      limit: Math.min(parseInt(limit, 10) || 20, 100),
      category,
      status,
      search,
    });

    // Populate photo URLs and has_photo flags for table rendering
    if (data && Array.isArray(data.complaints)) {
      data.complaints = await Promise.all(
        data.complaints.map(async (c) => ({
          ...c,
          photo_url: c.photo_path ? await getSignedPhotoUrl(c.photo_path, 300) : null,
          has_photo: Boolean(c.photo_path),
        }))
      );
    }

    return res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error('[Admin Complaints List] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to load complaints.',
    });
  }
});

/**
 * GET /api/admin/complaints/:id
 * Detailed complaint inspection including time-limited signed photo URL
 */
router.get('/complaints/:id', async (req, res) => {
  try {
    const complaint = await getComplaintById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: 'Complaint not found.',
      });
    }

    let signedPhotoUrl = null;
    if (complaint.photo_path) {
      signedPhotoUrl = await getSignedPhotoUrl(complaint.photo_path, 300); // 5 min expiry
    }

    return res.json({
      success: true,
      data: {
        ...complaint,
        photo_url: signedPhotoUrl,
        has_photo: Boolean(complaint.photo_path),
      },
    });
  } catch (err) {
    console.error('[Admin Complaint Detail] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to load complaint details.',
    });
  }
});

/**
 * PATCH /api/admin/complaints/:id
 * Update status, category, priority, department, admin_note
 */
router.patch('/complaints/:id', async (req, res) => {
  try {
    const { category, priority, suggested_department, status, admin_note } = req.body;

    const updates = {};

    if (status !== undefined) {
      const validStatuses = ['Pending', 'In Progress', 'Resolved'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        });
      }
      updates.status = status;
    }

    if (category !== undefined) {
      if (!ALLOWED_CATEGORIES.includes(category)) {
        return res.status(400).json({
          success: false,
          error: `Invalid category. Must be one of: ${ALLOWED_CATEGORIES.join(', ')}`,
        });
      }
      updates.category = category;
    }

    if (priority !== undefined) {
      if (!ALLOWED_PRIORITIES.includes(priority)) {
        return res.status(400).json({
          success: false,
          error: `Invalid priority. Must be one of: ${ALLOWED_PRIORITIES.join(', ')}`,
        });
      }
      updates.priority = priority;
    }

    if (suggested_department !== undefined) {
      updates.suggested_department = suggested_department ? String(suggested_department).trim().slice(0, 100) : null;
    }

    if (admin_note !== undefined) {
      updates.admin_note = admin_note ? String(admin_note).trim().slice(0, 1000) : null;
    }

    const updated = await updateComplaint(req.params.id, updates);

    return res.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    console.error('[Admin Complaint Update] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: `Could not update complaint: ${err.message}`,
    });
  }
});

/**
 * GET /api/admin/locations
 * Location analysis with normalized area grouping
 */
router.get('/locations', async (req, res) => {
  try {
    const analysis = await getLocationAnalysis();
    return res.json({
      success: true,
      data: analysis,
    });
  } catch (err) {
    console.error('[Admin Location Analysis] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate location analysis.',
    });
  }
});

/**
 * GET /api/admin/map-locations
 * Real-time active complaint locations with coordinates for live mapping
 */
router.get('/map-locations', async (req, res) => {
  try {
    const points = await getRealtimeMapPoints();
    return res.json({
      success: true,
      data: {
        points,
        count: points.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[Admin Map Locations] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve real-time map locations.',
    });
  }
});

module.exports = router;
