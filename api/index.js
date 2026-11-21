// CivicFix AI — Vercel Serverless Function Entry Point
// Adapts the existing Express application from server/index.js for Vercel
const app = require('../server/index');

module.exports = (req, res) => {
  // Ensure the /api prefix is preserved for Express router resolution
  if (req.url && !req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }
  if (req.originalUrl && !req.originalUrl.startsWith('/api')) {
    req.originalUrl = `/api${req.originalUrl.startsWith('/') ? '' : '/'}${req.originalUrl}`;
  }
  return app(req, res);
};
