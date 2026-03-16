/**
 * mobile-login.js
 * Mobile-specific enhancements for hLPU Login Page.
 */

function initMobileLogin() {
    // 1. Detect Screen Size
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) return;

    console.log("🚀 hLPU Mobile Login Initialized");

    // 2. Dynamic Content Bindings (Premium Feel)
    const loginBranding = {
        appLogo: "../Images/hlpu logo.png",
        welcomeText: "Welcome back!",
        subtitle: "Sign in to continue your legacy journey."
    };

    // Update branding if elements exist
    const logoImg = document.getElementById('appLogo');
    const tagline = document.getElementById('logoSubtitle');

    // We can add a more prominent welcome text for mobile
    if (tagline) {
        tagline.textContent = loginBranding.subtitle;
    }

    // Handle Input Focus for better Mobile UX
    const focusHelper = (e) => {
        if (isMobile) {
            setTimeout(() => {
                e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    };
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('focus', focusHelper);
    });

    // 3. Navbar Mobile Behavior - Cleanup (Hamburger menu removed per user request)
    // Direct back arrow handles navigation now.

    // 4. Password Visibility Toggle (Mobile Requirement)
    setupPasswordToggle('loginPassword');
    setupPasswordToggle('registerPassword');
    setupPasswordToggle('adminPassword');

    // 4. Keyboard Layout Safety
    // Ensure the viewport height doesn't break when keyboard is present
    const setVh = () => {
        let vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    window.addEventListener('resize', setVh);
    setVh();

    // 5. Enhanced Validation UX
    // Hook into existing form submissions for mobile feedback
    // Note: We wrap existing logic without breaking it.

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        // We'll let the existing script handle the submission, but we add a wrapper for scrolling to error
        const originalAlert = window.showAlert;
        window.showAlert = function (message, type = 'danger') {
            originalAlert(message, type);
            if (type === 'danger' && isMobile) {
                const alertDiv = document.getElementById('alertMessage');
                if (alertDiv) {
                    alertDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        };
    }
}

/**
 * Helper to add password visibility toggle
 */
function setupPasswordToggle(inputId) {
    const input = document.getElementById(inputId);
    if (!input || input.parentNode.querySelector('.password-toggle')) return;

    const wrapper = input.parentNode;
    const toggle = document.createElement('i');
    toggle.className = 'fas fa-eye password-toggle';
    wrapper.appendChild(toggle);

    toggle.addEventListener('click', () => {
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        toggle.className = `fas fa-eye${type === 'password' ? '' : '-slash'} password-toggle`;
    });
}

// Initialize on Load
window.addEventListener('load', initMobileLogin);
// Also re-init on resize if crossing breakpoint
let resizeTimer;
let wasMobile = window.innerWidth <= 768;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        const isCurrentlyMobile = window.innerWidth <= 768;
        if (isCurrentlyMobile && !wasMobile) {
            initMobileLogin();
        }
        wasMobile = isCurrentlyMobile;
    }, 250);
});
