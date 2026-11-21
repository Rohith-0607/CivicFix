// CivicFix AI — Protected Citizen Endpoints ("My Complaints" Dashboard)
const express = require('express');
const { requireCitizenAuth } = require('../auth');
const { getCitizenComplaints, getCitizenComplaintById } = require('../supabase');

const router = express.Router();

// Enforce citizen authentication on all endpoints in this router
router.use(requireCitizenAuth);

/**
 * GET /api/citizen/complaints
 * Retrieves only the complaints submitted by the authenticated citizen
 */
router.get('/complaints', async (req, res) => {
  try {
    const complaints = await getCitizenComplaints(req.user.id);

    return res.json({
      success: true,
      data: {
        complaints,
        total: complaints.length,
      },
    });
  } catch (err) {
    console.error('[Citizen /complaints] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Unable to load your complaints.',
    });
  }
});

/**
 * GET /api/citizen/complaints/:id
 * Retrieves full details for a single complaint owned by the citizen
 * Enforces ownership: cannot view another citizen's private complaint!
 */
router.get('/complaints/:id', async (req, res) => {
  try {
    const complaint = await getCitizenComplaintById(req.user.id, req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: 'Complaint not found.',
      });
    }

    return res.json({
      success: true,
      data: complaint,
    });
  } catch (err) {
    console.error('[Citizen /complaints/:id] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve complaint details.',
    });
  }
});

module.exports = router;
