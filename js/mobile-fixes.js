/**
 * mobile-fixes.js
 * Implements strict navbar isolation classes and restores 
 * mobile safe spacing without touching desktop HTML files.
 */
document.addEventListener("DOMContentLoaded", function () {
    // 1. Add required isolation classes to navbars
    // Apply .desktop-navbar to all existing desktop navs (avoiding any mobile-specific navs)
    const desktopNavSelectors = [
        '#navbar',
        '.navbar:not(.mob-header):not(.mob-bottom-nav-container)'
    ];

    desktopNavSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            el.classList.add('desktop-navbar');
        });
    });

    // Apply .mobile-navbar to any mobile nav elements (so they don't appear on desktop)
    const mobileNavSelectors = [
        '.mob-header',
        '.mob-bottom-nav-container',
        '#mobile-dashboard-root .navbar'
    ];

    mobileNavSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            el.classList.add('mobile-navbar');
        });
    });

    // 2. Add Safe Spacing Class to main content
    // Target the dashboard container to prevent overlap from fixed mobile navbars
    const mainContainers = document.querySelectorAll('.dashboard-container');
    mainContainers.forEach(container => {
        container.classList.add('mobile-safe-area');
    });

    // 3. Ensure body scroll is enabled on mobile (in case inline JS disabled it)
    if (window.innerWidth <= 770) {
        document.body.style.overflow = "auto";
        document.documentElement.style.overflow = "auto";

        // Also ensure specific desktop wrappers that hide content are un-hidden
        const desktopOnlyWrappers = document.querySelectorAll('.desktop-only');
        desktopOnlyWrappers.forEach(wrapper => {
            wrapper.style.display = 'block';
        });
    }
});
