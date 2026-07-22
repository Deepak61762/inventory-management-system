// Central helper for all API calls.
// Automatically attaches the JWT token (stored after login) to every request,
// and redirects to login if the token is missing or the server says it's invalid.

const API_BASE = 'http://localhost:5000/api';

// Log the user out on a hard refresh (F5 / reload button), but NOT on normal
// navigation between pages - e.g. login.html redirecting to index.html right
// after a successful login is also a full page load, so we can't just clear
// the token on every page load or you'd get logged out immediately after
// logging in. Instead we check the browser's navigation "type": it tells us
// whether this page load was a "reload" specifically, versus a "navigate"
// (clicking a link, following a redirect) or "back_forward" (using the
// browser's back/forward buttons).
(function logoutOnHardRefresh() {
  const navEntries = performance.getEntriesByType('navigation');
  const navigationType = navEntries.length > 0 ? navEntries[0].type : null;

  if (navigationType === 'reload') {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
  }
})();

function getToken() {
  return localStorage.getItem('token');
}

function requireAuth() {
  if (!getToken()) {
    window.location.href = 'login.html';
  }
}

async function apiRequest(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${API_BASE}${endpoint}`, options);

  if (response.status === 401 || response.status === 403) {
    // Token missing/expired/invalid - send user back to login
    localStorage.removeItem('token');
    window.location.href = 'login.html';
    return null;
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}
