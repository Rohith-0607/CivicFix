// CivicFix AI — Vercel Serverless Catch-All API Handler
// Matches all /api/* requests (e.g., /api/system-status, /api/issues, /api/complaints, /api/track)
const app = require('../server/index');

module.exports = (req, res) => {
  try {
    const originalUrlObj = new URL(req.url, 'http://localhost');
    let pathname = originalUrlObj.pathname;

    // If Vercel rewrote the path to /api or /, restore the original subpath from x-matched-path
    const matchedPath = req.headers['x-matched-path'];
    if (matchedPath && (pathname === '/api' || pathname === '/' || pathname === '')) {
      const matchedObj = new URL(matchedPath, 'http://localhost');
      pathname = matchedObj.pathname;
    }

    // Ensure pathname begins with /api for Express router matching
    if (!pathname.startsWith('/api')) {
      pathname = `/api${pathname.startsWith('/') ? '' : '/'}${pathname}`;
    }

    // Strip internal slug parameter injected by Vercel dynamic routing
    originalUrlObj.searchParams.delete('slug');
    originalUrlObj.searchParams.delete('...slug');
    const search = originalUrlObj.searchParams.toString();
    req.url = pathname + (search ? `?${search}` : '');
  } catch {
    // If URL parsing fails, ensure basic fallback prefix
    if (req.url && !req.url.startsWith('/api')) {
      req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
    }
  }

  return app(req, res);
};
