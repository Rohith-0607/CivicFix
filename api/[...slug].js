// CivicFix AI — Vercel Serverless Catch-All API Handler
// Matches all /api/* requests (e.g., /api/system-status, /api/issues, /api/complaints)
const app = require('../server/index');

module.exports = (req, res) => {
  try {
    const urlObj = new URL(req.url, 'http://localhost');
    let pathname = urlObj.pathname;

    // Ensure pathname begins with /api for Express router matching
    if (!pathname.startsWith('/api')) {
      pathname = `/api${pathname.startsWith('/') ? '' : '/'}${pathname}`;
    }

    // Strip internal slug parameter injected by Vercel dynamic routing
    urlObj.searchParams.delete('slug');
    const search = urlObj.searchParams.toString();
    req.url = pathname + (search ? `?${search}` : '');
  } catch {
    // If URL parsing fails, ensure basic fallback prefix
    if (req.url && !req.url.startsWith('/api')) {
      req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
    }
  }

  return app(req, res);
};
