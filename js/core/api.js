// api.js — Reusable fetch wrapper for hLPU frontend
// Automatically attaches JWT, handles 401 redirects, retries on failure, and parses JSON safely.

// detect if we are running in production or local
const PRODUCTION_BACKEND_URL = 'https://hlpu.onrender.com';
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : PRODUCTION_BACKEND_URL;

const API_TIMEOUT_MS = 15000; // 15 second timeout
const MAX_RETRIES = 1;        // 1 retry on network failure

/**
 * Authenticated fetch wrapper with timeout and retry.
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

    // Remove Content-Type for FormData (let browser set boundary)
    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
    }

    // Attach Bearer token when available
    if (token) {
        headers['Authorization'] = 'Bearer ' + token;
    }

    // Build full URL if a relative path was provided
    const fullUrl = url.startsWith('http') ? url : API_BASE + url;

    let lastError;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            // Create an AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

            const response = await fetch(fullUrl, Object.assign({}, options, {
                headers: headers,
                signal: controller.signal
            }));

            clearTimeout(timeoutId);

            // 401 Unauthorized → clear session and redirect to login
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('role');
                localStorage.removeItem('userName');
                const isDeep = window.location.pathname.toLowerCase().includes('/for-');
                window.location.replace(isDeep ? '../login.html' : './login.html');
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

        } catch (err) {
            lastError = err;

            // Don't retry on non-network errors (4xx, 5xx already handled above)
            if (err.name === 'AbortError') {
                lastError = new Error('Request timed out — please try again.');
                break;
            }

            if (attempt < MAX_RETRIES) {
                console.warn('[apiFetch] Retrying (' + (attempt + 1) + '/' + MAX_RETRIES + ')...');
                await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
            }
        }
    }

    console.error('[apiFetch] Request failed:', lastError.message);
    throw lastError;
}

/**
 * Check backend health — useful for showing connection status in UI.
 * @returns {Promise<{status: string, database: string}>}
 */
async function checkBackendHealth() {
    try {
        const data = await apiFetch('/api/health');
        return data;
    } catch (err) {
        return { status: 'UNREACHABLE', database: 'unknown' };
    }
}
