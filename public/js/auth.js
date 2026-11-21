// CivicFix AI — Client-Side Authentication Helper
const AUTH_TOKEN_KEY = 'civicfix_citizen_token';
const AUTH_USER_KEY = 'civicfix_citizen_user';

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function getAuthUser() {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setAuthSession(token, user) {
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
  if (user) localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new CustomEvent('authChanged', { detail: { isLoggedIn: true, user } }));
}

function clearAuthSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  window.dispatchEvent(new CustomEvent('authChanged', { detail: { isLoggedIn: false } }));
}

function isLoggedIn() {
  return Boolean(getAuthToken());
}

/**
 * Helper to make authenticated fetch requests
 */
async function authFetch(url, options = {}) {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle expired session
  if (response.status === 401 && !url.includes('/api/auth/login')) {
    clearAuthSession();
    if (window.location.pathname === '/my-complaints') {
      window.location.href = '/login?msg=session_expired';
    }
  }

  return response;
}
