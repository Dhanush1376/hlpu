/**
 * ui-helpers.js
 * Centralized UX micro-interaction helpers for hLPU.
 * Includes loaders, disabled states, and toasts.
 */

const UIHelper = {
    /**
     * Shows a non-blocking toast notification across the app
     */
    showToast: (message, type = 'success') => {
        let toastContainer = document.getElementById('hlpu-toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'hlpu-toast-container';
            toastContainer.style.cssText = `
                position: fixed;
                bottom: 30px;
                right: 30px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 12px;
                pointer-events: none;
            `;
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');
        const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
        const bgColor = type === 'success' ? '#fff' : type === 'error' ? '#fff' : '#fff';
        const color = type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#C2491F';

        toast.style.cssText = `
            background: ${bgColor};
            color: #0A1A2F;
            border-left: 4px solid ${color};
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 15px 35px rgba(10, 26, 47, 0.15);
            font-family: 'Inter', sans-serif;
            font-weight: 600;
            font-size: 0.9rem;
            display: flex;
            align-items: center;
            gap: 12px;
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        `;

        toast.innerHTML = `<i class="fas ${icon}" style="color: ${color}; font-size: 1.2rem;"></i> <span>${message}</span>`;
        toastContainer.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        // Animate out
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 400);
        }, 3500);
    },

    /**
     * Adds a loading spinner to a button and disables it
     * @param {HTMLElement} btn - The button element
     * @returns {function} - Call this to reset the button
     */
    setButtonLoading: (btn) => {
        if (!btn || btn.disabled) return () => { };

        const originalHtml = btn.innerHTML;
        const originalWidth = btn.offsetWidth;

        btn.disabled = true;
        btn.style.width = `${originalWidth}px`; // Maintain width
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
        btn.style.opacity = '0.8';
        btn.style.cursor = 'not-allowed';

        return () => {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
            btn.style.width = '';
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        };
    },

    /**
     * Generates a generic empty state HTML block
     */
    getEmptyStateHTML: (title, message, icon = 'fa-folder-open') => {
        return `
        <div class="empty-state text-center py-5" style="animation: fadeIn 0.5s ease forwards; width: 100%;">
            <div style="background: rgba(194, 73, 31, 0.05); width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                <i class="fas ${icon}" style="font-size: 2.2rem; color: #C2491F; opacity: 0.8;"></i>
            </div>
            <h4 style="font-weight: 700; color: #0A1A2F; margin-bottom: 8px;">${title}</h4>
            <p style="color: #6c757d; font-size: 0.95rem; max-width: 400px; margin: 0 auto;">${message}</p>
        </div>
        `;
    }
};

window.UIHelper = UIHelper;
