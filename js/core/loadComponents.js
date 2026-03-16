// loadComponents.js
// Provides loadComponent(id, path) to fetch and insert HTML snippets.

async function loadComponent(id, path) {
  try {
    const container = document.getElementById(id);
    if (!container) {
      console.error(`loadComponent: element with id "${id}" not found`);
      return;
    }

    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) {
      console.error(`loadComponent: failed to fetch ${path} — ${res.status} ${res.statusText}`);
      return;
    }

    const html = await res.text();
    container.innerHTML = html;

    // Post-injection hooks for navbar
    if (id === 'navbar') {
      highlightActiveNav(container);
      populateNavUser(container);
      bindLogout(container);
      loadNotificationSystem();
    }
  } catch (err) {
    console.error(`loadComponent: unexpected error while loading ${path}:`, err);
  }
}

/**
 * Loads Socket.io and our notification client dynamically.
 */
function loadNotificationSystem() {
  if (window.location.pathname.includes('Login.html')) return;

  // Load socket.io-client via CDN
  const socketScript = document.createElement('script');
  socketScript.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
  socketScript.onload = () => {
    // Once socket.io is loaded, load our custom client
    const clientScript = document.createElement('script');
    clientScript.src = '../js/core/socketClient.js';
    document.head.appendChild(clientScript);
  };
  document.head.appendChild(socketScript);
}

/**
 * Highlights the nav-item whose link matches the current page filename.
 * Works for student, alumni, and admin navbars.
 * Handles both top-level nav-links and dropdown-items.
 */
function highlightActiveNav(navContainer) {
  // Extract current filename, e.g. "Dashboard.html"
  const path = window.location.pathname;
  const currentPage = path.substring(path.lastIndexOf('/') + 1).toLowerCase() || 'index.html';

  // Check all nav-links (top-level items)
  const navLinks = navContainer.querySelectorAll('.nav-item > a.nav-link');
  for (const link of navLinks) {
    const href = link.getAttribute('href');
    if (!href) continue;
    const linkPage = href.substring(href.lastIndexOf('/') + 1).toLowerCase();
    if (linkPage && linkPage === currentPage) {
      link.closest('.nav-item').classList.add('active');
      return; // Only one active item at a time
    }
  }

  // Fallback: check dropdown-items (profile menu pages like Settings, Profile, etc.)
  const dropdownLinks = navContainer.querySelectorAll('.dropdown-item');
  for (const link of dropdownLinks) {
    const href = link.getAttribute('href');
    if (!href) continue;
    const linkPage = href.substring(href.lastIndexOf('/') + 1).toLowerCase();
    if (linkPage && linkPage === currentPage) {
      // Highlight the profile-dropdown parent nav-item
      const parentNavItem = link.closest('.nav-item');
      if (parentNavItem) parentNavItem.classList.add('active');
      return;
    }
  }
}

/**
 * Populates the navbar profile name and avatar.
 * Tries localStorage first, then fetches from API if needed.
 */
async function populateNavUser(navContainer = document) {
  let name = localStorage.getItem('userName');

  // If name is missing, try to fetch from API
  if (!name && typeof apiFetch === 'function') {
    try {
      const user = await apiFetch('/api/settings/me');
      if (user && user.name) {
        name = user.name;
        localStorage.setItem('userName', name);
      }
    } catch (err) {
      console.warn('[populateNavUser] Failed to fetch user data:', err);
    }
  }

  if (!name) return;

  // Update display names
  const nameSpans = navContainer.querySelectorAll('.user-name-display, .profile-dropdown-toggle span');
  nameSpans.forEach(span => {
    span.textContent = name;
  });

  // Update avatar letters
  const avatars = navContainer.querySelectorAll('.profile-avatar-small');
  avatars.forEach(avatar => {
    avatar.textContent = name.charAt(0).toUpperCase();
  });
}

/**
 * Cross-tab synchronization listener
 */
window.addEventListener('storage', (e) => {
  if (e.key === 'userName') {
    populateNavUser();
  }
});

/**
 * Global logout handler — clears localStorage and redirects to login.
 */
function handleLogout() {
  localStorage.clear();
  console.log('[logout] Storage cleared — redirecting to login');
  window.location.replace('../Main/login.html');
}

/**
 * Binds click handler to any .logout-btn inside the navbar.
 */
function bindLogout(navContainer) {
  var btns = navContainer.querySelectorAll('.logout-btn');
  btns.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      handleLogout();
    });
  });
}

// Expose handleLogout globally for inline usage if needed
if (typeof window !== 'undefined') window.handleLogout = handleLogout;

// Auto-load navbar based on current pathname
(function () {
  try {
    const pathname = window.location.pathname;
    let navbarPath = null;

    if (pathname.includes('For-Student')) {
      navbarPath = '/shared/navbar-student.html';
    } else if (pathname.includes('For-Alumini')) {
      navbarPath = '/shared/navbar-alumni.html';
    } else if (pathname.includes('For-Admin')) {
      navbarPath = '/shared/navbar-admin.html';
    }

    if (!navbarPath) {
      console.warn('loadComponents: current path does not match any known user area');
      return;
    }

    // Defer until DOM is ready, otherwise load immediately
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        loadComponent('navbar', navbarPath);
      });
    } else {
      loadComponent('navbar', navbarPath);
    }
  } catch (err) {
    console.error('loadComponents: error while deciding navbar to load', err);
  }
})();

// export for modules or tests
if (typeof window !== 'undefined') window.loadComponent = loadComponent;
