// ui-loading.js — Reusable loading, error, empty state, and toast components
// Works with ui-loading.css for styling.

(function () {
    'use strict';

    // ========== TOAST NOTIFICATIONS ==========

    let toastContainer = null;

    function ensureToastContainer() {
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            toastContainer.id = 'hlpu-toast-container';
            document.body.appendChild(toastContainer);
        }
        return toastContainer;
    }

    const TOAST_ICONS = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    /**
     * Show a toast notification.
     * @param {string} message  Text to display
     * @param {'success'|'error'|'warning'|'info'} type  Toast type
     * @param {number} duration  Auto-dismiss in ms (default 4000, 0 = never)
     */
    function showToast(message, type, duration) {
        if (type === undefined) type = 'info';
        if (duration === undefined) duration = 4000;

        var container = ensureToastContainer();

        var toast = document.createElement('div');
        toast.className = 'toast ' + type;
        toast.innerHTML =
            '<span class="toast-icon">' + (TOAST_ICONS[type] || 'ℹ') + '</span>' +
            '<span class="toast-text">' + escapeHtml(message) + '</span>';

        container.appendChild(toast);

        if (duration > 0) {
            setTimeout(function () { dismissToast(toast); }, duration);
        }

        return toast;
    }

    function dismissToast(toast) {
        if (!toast || !toast.parentNode) return;
        toast.classList.add('toast-exit');
        setTimeout(function () {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    }

    // ========== LOADING OVERLAY ==========

    var activeOverlay = null;

    /**
     * Show a full-screen loading overlay.
     * @param {string} text  Optional loading message (default 'Loading...')
     * @returns {HTMLElement}
     */
    function showLoading(text) {
        if (text === undefined) text = 'Loading...';
        hideLoading(); // remove any existing
        var overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.id = 'hlpu-loading-overlay';
        overlay.innerHTML = '<div class="spinner lg"></div><span>' + escapeHtml(text) + '</span>';
        document.body.appendChild(overlay);
        activeOverlay = overlay;
        return overlay;
    }

    /** Remove the loading overlay. */
    function hideLoading() {
        if (activeOverlay && activeOverlay.parentNode) {
            activeOverlay.parentNode.removeChild(activeOverlay);
        }
        activeOverlay = null;
        // Also try by ID in case of orphaned overlays
        var el = document.getElementById('hlpu-loading-overlay');
        if (el && el.parentNode) el.parentNode.removeChild(el);
    }

    // ========== SKELETON SCREENS ==========

    /**
     * Render skeleton loading cards inside a container.
     * @param {string|HTMLElement} container  CSS selector or DOM element
     * @param {number} count  Number of skeleton cards (default 3)
     */
    function showSkeletons(container, count) {
        if (count === undefined) count = 3;
        var el = typeof container === 'string' ? document.querySelector(container) : container;
        if (!el) return;

        var html = '';
        for (var i = 0; i < count; i++) {
            html +=
                '<div class="skeleton skeleton-card">' +
                    '<div class="skeleton-row">' +
                        '<div class="skeleton skeleton-avatar"></div>' +
                        '<div style="flex:1">' +
                            '<div class="skeleton skeleton-text medium"></div>' +
                            '<div class="skeleton skeleton-text short"></div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="skeleton skeleton-text long"></div>' +
                    '<div class="skeleton skeleton-text medium"></div>' +
                '</div>';
        }
        el.innerHTML = html;
    }

    // ========== ERROR STATE ==========

    /**
     * Render an error state inside a container.
     * @param {string|HTMLElement} container  CSS selector or DOM element
     * @param {string} message  Error message
     * @param {Function} [onRetry]  Retry callback (shows retry button if provided)
     */
    function showError(container, message, onRetry) {
        var el = typeof container === 'string' ? document.querySelector(container) : container;
        if (!el) return;

        el.innerHTML =
            '<div class="error-state">' +
                '<div class="error-icon">✕</div>' +
                '<div class="error-title">Something went wrong</div>' +
                '<div class="error-message">' + escapeHtml(message) + '</div>' +
                (onRetry ? '<button class="retry-btn" id="hlpu-retry-btn">Try Again</button>' : '') +
            '</div>';

        if (onRetry) {
            var retryBtn = el.querySelector('#hlpu-retry-btn');
            if (retryBtn) {
                retryBtn.addEventListener('click', function () {
                    retryBtn.disabled = true;
                    retryBtn.textContent = 'Retrying...';
                    onRetry();
                });
            }
        }
    }

    // ========== EMPTY STATE ==========

    /**
     * Render an empty state inside a container.
     * @param {string|HTMLElement} container  CSS selector or DOM element
     * @param {string} title  Title text
     * @param {string} message  Description text
     * @param {string} [icon]  Emoji or icon character (default '📭')
     */
    function showEmpty(container, title, message, icon) {
        if (icon === undefined) icon = '📭';
        var el = typeof container === 'string' ? document.querySelector(container) : container;
        if (!el) return;

        el.innerHTML =
            '<div class="empty-state">' +
                '<div class="empty-icon">' + icon + '</div>' +
                '<div class="empty-title">' + escapeHtml(title) + '</div>' +
                '<div class="empty-message">' + escapeHtml(message) + '</div>' +
            '</div>';
    }

    // ========== UTILITIES ==========

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ========== EXPOSE GLOBALLY ==========

    window.hlpuUI = {
        showToast: showToast,
        dismissToast: dismissToast,
        showLoading: showLoading,
        hideLoading: hideLoading,
        showSkeletons: showSkeletons,
        showError: showError,
        showEmpty: showEmpty,
    };

})();
