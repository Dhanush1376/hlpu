// api.js — Reusable fetch wrapper for hLPU frontend
// Automatically attaches JWT, handles 401 redirects, and parses JSON safely.

// detect if we are running in production or local
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || !window.location.hostname)
    ? 'http://localhost:5000'
    : window.location.origin;

/**
 * Authenticated fetch wrapper.
 *
 * @param {string}  url      Absolute or relative API path (e.g. '/api/dashboard/student')
 * @param {object}  options  Standard fetch options (method, body, headers, etc.)
 * @returns {Promise<any>}   Parsed JSON response
 * @throws  Re-throws after logging network / parse errors
 */
async function apiFetch(url, options = {}) {
    const token = localStorage.getItem('token');

    // Merge caller headers with defaults
    const headers = Object.assign(
        {
            'Content-Type': 'application/json',
        },
        options.headers || {}
    );

    // Attach Bearer token when available
    if (token) {
        headers['Authorization'] = 'Bearer ' + token;
    }

    // Build full URL if a relative path was provided
    const fullUrl = url.startsWith('http') ? url : API_BASE + url;

    let response;
    try {
        response = await fetch(fullUrl, Object.assign({}, options, { headers: headers }));
    } catch (err) {
        console.error('[apiFetch] Network error:', err.message);
        throw new Error('Network error — please check your connection.');
    }

    // 401 Unauthorized → clear session and redirect to login
    if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('userName');
        window.location.replace('../Main/Login.html');
        return;
    }

    // Parse JSON safely
    let data;
    try {
        data = await response.json();
    } catch (err) {
        console.error('[apiFetch] JSON parse error:', err.message);
        throw new Error('Invalid server response.');
    }

    // Surface server-side errors
    if (!response.ok) {
        const msg = data.message || 'Request failed';
        console.error('[apiFetch] ' + response.status + ': ' + msg);
        throw new Error(msg);
    }

    return data;
}
