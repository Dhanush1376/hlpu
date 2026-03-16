/**
 * Mobile Global Navigation Injector
 * Dynamically mounts the Mobile Top Header and Bottom Navigation bar onto any page.
 * Keeps desktop DOM untouched and wraps page content in layout safespace.
 */

const MobileGlobalNav = {
    state: {
        userInitials: 'U',
        notificationsCount: 0,
        role: 'student',
        currentPath: window.location.pathname.split('/').pop() || 'Dashboard.html'
    },

    // Navigation Configurations per Role
    configs: {
        student: {
            profileLink: 'Student-Profile.html',
            bottomNav: [
                { label: 'Dashboard', icon: 'fas fa-th-large', href: 'Dashboard.html' },
                { label: 'Jobs', icon: 'fas fa-briefcase', href: 'Direct-Job.html' },
                { label: 'Mentors', icon: 'fas fa-user-friends', href: 'Mentor-Requests.html' }
            ],
            sideNav: [
                { label: 'Dashboard', icon: 'fas fa-th-large', href: 'Dashboard.html' },
                { label: 'Jobs', icon: 'fas fa-briefcase', href: 'Direct-Job.html' },
                { label: 'Mentors', icon: 'fas fa-user-friends', href: 'Mentor-Requests.html' },
                { label: 'Mock Interviews', icon: 'fas fa-video', href: 'Mock-Application.html' },
                { label: 'Course Map', icon: 'fas fa-map-marked-alt', href: 'Course-Map.html' },
                { label: 'Messages', icon: 'fas fa-comment-dots', href: 'Messages.html' }
            ]
        },
        alumni: {
            profileLink: 'Alumini-Profile.html',
            bottomNav: [
                { label: 'Dashboard', icon: 'fas fa-th-large', href: 'Dashboard.html' },
                { label: 'Post Job', icon: 'fas fa-plus-circle', href: 'Post-job.html' },
                { label: 'Mentees', icon: 'fas fa-user-graduate', href: 'Mentor-Accepts.html' }
            ],
            sideNav: [
                { label: 'Dashboard', icon: 'fas fa-th-large', href: 'Dashboard.html' },
                { label: 'Post Job', icon: 'fas fa-plus-circle', href: 'Post-job.html' },
                { label: 'My Jobs', icon: 'fas fa-briefcase', href: 'Post-job.html#posted-jobs-section' },
                { label: 'Mentees', icon: 'fas fa-user-graduate', href: 'Mentor-Accepts.html' },
                { label: 'Mock Sessions', icon: 'fas fa-video', href: 'Mock-Interviews.html' },
                { label: 'Messages', icon: 'fas fa-comment-dots', href: 'Messages.html' }
            ]
        },
        admin: {
            profileLink: 'Profile.html',
            bottomNav: [
                { label: 'Command', icon: 'fas fa-shield-alt', href: 'Dashboard.html' },
                { label: 'Users', icon: 'fas fa-users', href: 'Users.html' },
                { label: 'Verify', icon: 'fas fa-check-double', href: 'Verify.html' }
            ],
            sideNav: [
                { label: 'Dashboard', icon: 'fas fa-th-large', href: 'Dashboard.html' },
                { label: 'User Management', icon: 'fas fa-users', href: 'Users.html' },
                { label: 'Verifications', icon: 'fas fa-id-card', href: 'Verify.html' },
                { label: 'Job Moderation', icon: 'fas fa-briefcase', href: 'Jobs.html' },
                { label: 'Launchpad', icon: 'fas fa-rocket', href: 'Launchpad-Applications.html' },
                { label: 'Reports', icon: 'fas fa-chart-line', href: 'Reports.html' }
            ]
        }
    },

    init: function () {
        if (window.innerWidth > 768) return;

        // Prevent double injection
        if (document.getElementById('mob-global-nav-injected')) return;

        this.fetchUserData();
        this.injectNavbars();
    },

    fetchUserData: function () {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const payload = JSON.parse(atob(token.split('.')[1]));
            this.state.userInitials = payload.name ? payload.name.charAt(0).toUpperCase() : 'U';
            this.state.role = payload.role || 'student';
            // Placeholder for notification count fetch if API exists globally
            this.state.notificationsCount = 0;
        } catch (e) {
            console.warn('[mobile-global-nav] Could not parse user token.');
        }
    },

    injectNavbars: function () {
        const body = document.body;
        const config = this.configs[this.state.role] || this.configs.student;

        // Ensure body has padding so content doesn't slip under fixed navbars
        body.style.paddingTop = '85px';
        body.style.paddingBottom = '110px';

        // 1. Top Header HTML
        const headerHTML = typeof MobileNav !== 'undefined'
            ? `<div id="mob-global-nav-injected" class="mobile-only">${MobileNav.renderHeader({ userInitial: this.state.userInitials, notificationCount: this.state.notificationsCount })}</div>`
            : `
            <div id="mob-global-nav-injected" class="mobile-only">
                <div class="mob-header">
                    <div class="mob-logo">
                        <img src="../assets/assets/images/hlpu logo.png" alt="hLPU Logo" onerror="this.src=''; this.alt='hlpu';">
                    </div>
                    <div class="mob-header-actions">
                        <a href="${config.profileLink}" style="text-decoration: none;">
                            <div class="mob-avatar">${this.state.userInitials}</div>
                        </a>
                        <a href="Notification.html" style="text-decoration: none;">
                            <div class="mob-notification">
                                <i class="fas fa-bell"></i>
                                ${this.state.notificationsCount > 0 ? `<div class="mob-badge">${this.state.notificationsCount}</div>` : ''}
                            </div>
                        </a>
                    </div>
                </div>
            </div>
        `;

        // 2. Bottom Nav HTML
        const isPath = (href) => this.state.currentPath === href ? 'active' : '';

        const bottomNavHTML = config.bottomNav.map(item => `
            <a href="${item.href}" class="mob-nav-item ${isPath(item.href)}">
                <div class="mob-nav-icon"><i class="${item.icon}"></i></div>
                <div class="mob-nav-label">${item.label}</div>
            </a>
        `).join('');

        const navHTML = `
            <div class="mobile-only">
                <div class="mob-bottom-nav-container">
                    ${bottomNavHTML}
                    <a href="#" class="mob-nav-item" onclick="MobileGlobalNav.toggleSideNav(); return false;">
                        <div class="mob-nav-icon"><i class="fas fa-ellipsis-h"></i></div>
                        <div class="mob-nav-label">More</div>
                    </a>
                </div>
                ${this.renderSideNav(config)}
            </div>
        `;

        // Inject Header at Top, Nav at Bottom
        body.insertAdjacentHTML('afterbegin', headerHTML);
        body.insertAdjacentHTML('beforeend', navHTML);
    },

    renderSideNav: function (config) {
        const sideNavItemsHTML = config.sideNav.map(item => `
            <a href="${item.href}" class="mob-side-nav-item"><i class="${item.icon}"></i> ${item.label}</a>
        `).join('');

        return `
            <div class="mob-side-nav-overlay" id="mob-side-nav-overlay" onclick="MobileGlobalNav.toggleSideNav()"></div>
            <div class="mob-side-nav" id="mob-side-nav">
                <div class="mob-side-nav-header">
                    <h2>Menu</h2>
                    <button class="mob-side-nav-close" onclick="MobileGlobalNav.toggleSideNav()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="mob-side-nav-content">
                    ${sideNavItemsHTML}
                    <a href="../Main/Landing-Page.html" class="mob-side-nav-item logout" style="margin-top: 20px;"><i class="fas fa-sign-out-alt"></i> Logout</a>
                </div>
            </div>
        `;
    },

    toggleSideNav: function () {
        const nav = document.getElementById('mob-side-nav');
        const overlay = document.getElementById('mob-side-nav-overlay');
        if (nav && overlay) {
            nav.classList.toggle('open');
            overlay.classList.toggle('open');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Only run if the page explicitly is NOT driving its own full mobile re-render
    // i.e Dashboard.html and Direct-Job.html handle their own injection entirely
    const path = window.location.pathname.split('/').pop();
    const excludedPages = ['Dashboard.html', 'Direct-Job.html'];

    if (!excludedPages.includes(path)) {
        setTimeout(() => MobileGlobalNav.init(), 100);
    }
});

window.addEventListener('resize', () => {
    const path = window.location.pathname.split('/').pop();
    const excludedPages = ['Dashboard.html', 'Direct-Job.html'];

    if (window.innerWidth <= 768 && !excludedPages.includes(path)) {
        MobileGlobalNav.init();
    }
});
