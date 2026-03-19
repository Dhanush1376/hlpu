// api.js — Production-ready fetch wrapper for hLPU

// 🌐 Backend URLs
const PRODUCTION_BACKEND_URL = 'https://hlpu.onrender.com';
const LOCAL_BACKEND_URL = 'http://localhost:5000';

// Detect environment safely
const isLocalhost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

// Final API base
const API_BASE = isLocalhost ? LOCAL_BACKEND_URL : PRODUCTION_BACKEND_URL;

// ⚙️ Config
const API_TIMEOUT_MS = 15000;
const MAX_RETRIES = 1;

/**
 * Main API Fetch Wrapper
 */
async function apiFetch(url, options = {}) {
    const token = localStorage.getItem('token');

    const headers = {
        ...(options.headers || {}),
    };

    // Set JSON header only if not FormData
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    // Attach token
    if (token) {
        headers['Authorization'] = 'Bearer ' + token;
    }

    const fullUrl = url.startsWith('http') ? url : API_BASE + url;

    let lastError;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

            const response = await fetch(fullUrl, {
                ...options,
                headers,
                signal: controller.signal,
                credentials: 'include' // 🔥 IMPORTANT for cookies
            });

            clearTimeout(timeoutId);

            // 🔐 Handle auth failure
            if (response.status === 401) {
                console.warn('[Auth] Session expired');

                localStorage.clear();

                const isDeep = window.location.pathname.toLowerCase().includes('/for-');
                window.location.replace(isDeep ? '../login.html' : './login.html');
                return;
            }

            let data;

            try {
                data = await response.json();
            } catch (err) {
                throw new Error('Invalid server response');
            }

            if (!response.ok) {
                throw new Error(data.message || 'Request failed');
            }

            return data;

        } catch (err) {
            lastError = err;

            // 🚨 Detect YOUR EXACT ISSUE
            if (err.name === 'TypeError') {
                lastError = new Error(
                    'Cannot reach server. Backend may be down or blocked (CORS/network issue).'
                );
            }

            if (err.name === 'AbortError') {
                lastError = new Error('Request timed out — server is slow or sleeping.');
                break;
            }

            if (attempt < MAX_RETRIES) {
                console.warn(`[apiFetch] Retry ${attempt + 1}/${MAX_RETRIES}`);
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    }

    console.error('[apiFetch ERROR]:', lastError.message);
    throw lastError;
}

/**
 * Backend Health Check
 */
async function checkBackendHealth() {
    try {
        return await apiFetch('/api/health');
    } catch (err) {
        return {
            status: 'UNREACHABLE',
            database: 'unknown',
            error: err.message
        };
    }
}