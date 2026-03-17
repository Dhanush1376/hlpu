// authGuard.js — Frontend authentication & role-based route guard
// Reads `token` and `role` from localStorage.
// Redirects to login if unauthenticated or role-mismatched.

(function () {
    'use strict';

    var pathname = window.location.pathname.toLowerCase();

    // Public pages — never guard these
    if (
        pathname.indexOf('login.html') !== -1 ||
        pathname.indexOf('register.html') !== -1 ||
        pathname.indexOf('landing-page.html') !== -1
    ) {
        return;
    }

    var token = localStorage.getItem('token');
    var role = localStorage.getItem('role');

    // Build login redirect path relative to the current page
    var loginPath = '../login.html';

    // No token → redirect to login
    if (!token) {
        console.warn('[authGuard] No token found — redirecting to login');
        window.location.replace(loginPath);
        return;
    }

    // Role-based access control
    var allowed = true;
    var userRole = (role || '').toLowerCase();

    if (pathname.indexOf('for-student') !== -1) {
        allowed = userRole === 'student';
    } else if (pathname.indexOf('for-alumini') !== -1) {
        allowed = userRole === 'alumni';
    } else if (pathname.indexOf('for-recruiter') !== -1) {
        allowed = userRole === 'recruiter';
    } else if (pathname.indexOf('for-admin') !== -1) {
        allowed = userRole === 'admin';
    }

    if (!allowed) {
        console.warn('[authGuard] Role "' + userRole + '" not permitted for this section — redirecting');
        // If they are logged in but in the wrong place, send them to their own dashboard
        if (userRole === 'student') window.location.replace('../For-Student/Dashboard.html');
        else if (userRole === 'alumni') window.location.replace('../For-Alumini/Dashboard.html');
        else if (userRole === 'recruiter') window.location.replace('../For-Recruiter/Dashboard.html');
        else if (userRole === 'admin') window.location.replace('../For-Admin/Dashboard.html');
        else window.location.replace(loginPath);
        return;
    }

    console.log('[authGuard] Access granted — role: ' + userRole);
})();
