/**
 * mobile-admin-nav.js
 * Admin-specific mobile navbar wrapper.
 * Wraps MobileNav and overrides links for admin context.
 * DOES NOT duplicate or fork MobileNav — extends it via role-based rendering.
 * Same pattern as mobile-alumni-nav.js.
 */

(function () {
    const baseNav = window.MobileNav;

    window.AdminMobileNav = {
        _getInitials: function () {
            return baseNav ? baseNav._getInitials() : "A";
        },

        renderHeader: function (data = {}) {
            const initials = data.userInitial || this._getInitials();
            const notificationBadge = data.notificationCount > 0
                ? `<div class="mob-notif-badge">${data.notificationCount}</div>`
                : '';

            return `
            <div class="mob-header">
                <div class="mob-header-logo">
                    <img src="../Images/hlpu-logo.png" alt="hLPU" />
                </div>
                <div class="mob-header-actions">
                    <a href="Profile.html" class="mob-avatar" style="text-decoration: none; background: linear-gradient(135deg, #0A1A2F, #1c3a63);">${initials}</a>
                    <div class="mob-header-actions-divider"></div>
                    <a href="#" class="mob-notif-btn" style="text-decoration: none; border: none; outline: none;">
                        <i class="fas fa-bell"></i>
                        ${notificationBadge}
                    </a>
                </div>
            </div>
        `;
        },

        renderBottomNav: function (currentTab) {
            const navItems = [
                { id: "dashboard", icon: "fas fa-shield-alt", label: "Command", href: "Dashboard.html" },
                { id: "users", icon: "fas fa-users", label: "Users", href: "Users.html" },
                { id: "verify", icon: "fas fa-check-double", label: "Verify", href: "Verify.html" },
                { id: "more", icon: "fas fa-ellipsis-h", label: "More", href: "#" }
            ];

            const navHTML = navItems.map(item => {
                const isActive = item.id === currentTab ? 'active' : '';
                const idAttr = item.id === 'more' ? `id="mob-nav-more"` : '';
                return `
                <a href="${item.href}" class="mob-nav-item ${isActive}" ${idAttr}>
                    <div class="mob-nav-icon"><i class="${item.icon}"></i></div>
                    <span class="mob-nav-label">${item.label}</span>
                </a>
            `;
            }).join('');

            return `
            <div class="mob-bottom-nav">
                ${navHTML}
            </div>
        `;
        },

        renderSidenav: function () {
            const initials = this._getInitials();
            let fullName = localStorage.getItem('userName') || "Admin";
            let userRole = "Administrator";

            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    fullName = payload.fullName || payload.name || payload.userName || fullName;
                    userRole = payload.role || userRole;
                    userRole = userRole.charAt(0).toUpperCase() + userRole.slice(1);
                } catch (e) { }
            }

            return `
                <div id="mob-sidenav-overlay" class="mob-sidenav-overlay"></div>
                <div id="mob-sidenav" class="mob-sidenav">
                    <div class="mob-sidenav-header">
                        <img src="../Images/hlpu-logo.png" alt="hLPU" class="mob-sidenav-logo" />
                        <button id="mob-sidenav-close" class="mob-sidenav-close"><i class="fas fa-times"></i></button>
                    </div>

                    <div class="mob-sidenav-profile">
                        <div class="mob-sidenav-avatar" style="background: linear-gradient(135deg, #0A1A2F, #1c3a63);">${initials}</div>
                        <div class="mob-sidenav-user-info">
                            <div class="mob-sidenav-user-name">${fullName}</div>
                            <div class="mob-sidenav-user-role"><i class="fas fa-crown" style="color: var(--gilt); font-size: 0.65rem;"></i> ${userRole}</div>
                        </div>
                    </div>

                    <div class="mob-sidenav-links">
                        <a href="Dashboard.html" class="mob-sidenav-item"><i class="fas fa-shield-alt"></i> Command Center</a>
                        <a href="Users.html" class="mob-sidenav-item"><i class="fas fa-users"></i> User Management</a>
                        <a href="Verify.html" class="mob-sidenav-item"><i class="fas fa-id-card"></i> Verifications</a>
                        <a href="Jobs.html" class="mob-sidenav-item"><i class="fas fa-briefcase"></i> Job Moderation</a>
                        <a href="Reports.html" class="mob-sidenav-item"><i class="fas fa-chart-line"></i> Reports</a>
                        <a href="Courses.html" class="mob-sidenav-item"><i class="fas fa-book"></i> Courses</a>
                        <a href="Launchpad-Applications.html" class="mob-sidenav-item"><i class="fas fa-rocket"></i> Launchpad</a>
                        <a href="System-prefs.html" class="mob-sidenav-item"><i class="fas fa-cog"></i> System Prefs</a>
                        <a href="Audit-trails.html" class="mob-sidenav-item"><i class="fas fa-clipboard-list"></i> Audit Trails</a>
                        <div style="flex: 1; min-height: 40px;"></div>
                        <a href="#" class="mob-sidenav-item logout-btn" style="color: #dc3545;" onclick="if(typeof window.handleLogout==='function'){window.handleLogout();}else{localStorage.clear();window.location.href='../Main/Login.html';}"><i class="fas fa-sign-out-alt" style="color: #dc3545;"></i> Logout</a>
                    </div>
                </div>
            `;
        },

        initSidenavEvents: function () {
            if (baseNav && baseNav.initSidenavEvents) {
                baseNav.initSidenavEvents();
            }
        }
    };
})();
