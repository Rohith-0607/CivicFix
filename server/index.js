require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const { isConfigured } = require('./supabase');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust reverse proxy (Vercel Edge, Cloudflare) for client IP detection & rate limiting
app.set('trust proxy', 1);

// Security and CORS middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Rate limiters for public endpoints
const publicAnalyzeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many analysis requests. Please wait a moment.' },
});

const publicReportLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Submission limit reached. Please wait before submitting again.' },
});

const publicTrackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many tracking requests. Please slow down.' },
});

// Apply rate limiters to specific endpoints
app.use('/api/analyze', publicAnalyzeLimiter);
app.use('/api/complaints', publicReportLimiter);
app.use('/api/track', publicTrackLimiter);

// API routes
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

// API root info endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'CivicFix AI API is running',
    version: '1.0.0',
    endpoints: {
      systemStatus: '/api/system-status',
      issues: '/api/issues',
      analyze: '/api/analyze',
      complaints: '/api/complaints',
      track: '/api/track/:code',
      adminLogin: '/api/admin/login',
      adminSummary: '/api/admin/summary',
    },
  });
});

// Config status endpoint for frontend banner
app.get(['/api/system-status', '/system-status'], (req, res) => {
  res.json({
    success: true,
    data: {
      supabaseConnected: isConfigured,
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('your_gemini')),
      environment: process.env.NODE_ENV || (process.env.VERCEL ? 'production' : 'development'),
    },
  });
});

// Serve static assets from public/ and uploads/
const publicDir = path.join(__dirname, '..', 'public');
const uploadsDir = path.join(publicDir, 'uploads');
if (!process.env.VERCEL) {
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  } catch (err) {
    // Graceful handling for read-only environments
  }
}

app.use('/uploads', express.static(uploadsDir));
app.use(express.static(publicDir));

// Clean URL Page Routes
app.get('/', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));
app.get('/report', (req, res) => res.sendFile(path.join(publicDir, 'report.html')));
app.get('/issues', (req, res) => res.sendFile(path.join(publicDir, 'issues.html')));
app.get('/track', (req, res) => res.sendFile(path.join(publicDir, 'track.html')));
app.get('/admin/login', (req, res) => res.sendFile(path.join(publicDir, 'admin-login.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(publicDir, 'admin.html')));
app.get('/admin/complaints', (req, res) => res.sendFile(path.join(publicDir, 'admin.html')));
app.get('/admin/locations', (req, res) => res.sendFile(path.join(publicDir, 'admin.html')));

// 404 handler for unknown routes
app.use((req, res) => {
  if (req.path.startsWith('/api') || !req.accepts('html')) {
    return res.status(404).json({ success: false, error: `Endpoint not found: ${req.method} ${req.originalUrl || req.url}` });
  }
  return res.status(404).sendFile(path.join(publicDir, 'index.html'));
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: err.message || 'Internal server error occurred.',
  });
});

if (require.main === module && !process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(` CivicFix AI Server running on http://localhost:${PORT}`);
    console.log(` Mode: ${isConfigured ? 'Connected to Supabase' : 'Offline In-Memory Demo Mode'}`);
    console.log(` Disclaimer: Independent student hackathon prototype.`);
    console.log(`====================================================`);
  });
}

module.exports = app;

