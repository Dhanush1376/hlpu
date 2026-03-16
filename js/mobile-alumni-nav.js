/**
 * mobile-alumni-nav.js
 * Alumni-specific mobile navbar wrapper.
 * Wraps MobileNav and overrides links for alumni context.
 * DOES NOT duplicate or fork MobileNav — extends it via role-based rendering.
 */

(function () {
    const baseNav = window.MobileNav;

    window.AlumniMobileNav = {
        _getInitials: function () {
            return baseNav ? baseNav._getInitials() : "U";
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
                    <a href="Alumini-Profile.html" class="mob-avatar" style="text-decoration: none;">${initials}</a>
                    <div class="mob-header-actions-divider"></div>
                    <a href="Notification.html" class="mob-notif-btn" style="text-decoration: none; border: none; outline: none;">
                        <i class="fas fa-bell"></i>
                        ${notificationBadge}
                    </a>
                </div>
            </div>
        `;
        },

        renderBottomNav: function (currentTab) {
            const navItems = [
                { id: "dashboard", icon: "fas fa-home", label: "Home", href: "Dashboard.html" },
                { id: "mentors", icon: "fas fa-handshake", label: "Mentors", href: "Mentor-Accepts.html" },
                { id: "jobs", icon: "fas fa-briefcase", label: "Jobs", href: "Post-job.html" },
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
            let fullName = localStorage.getItem('userName') || "Alumni";
            let userRole = "Alumni";

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
                        <div class="mob-sidenav-avatar">${initials}</div>
                        <div class="mob-sidenav-user-info">
                            <div class="mob-sidenav-user-name">${fullName}</div>
                            <div class="mob-sidenav-user-role">${userRole}</div>
                        </div>
                    </div>

                    <div class="mob-sidenav-links">
                        <a href="Dashboard.html" class="mob-sidenav-item"><i class="fas fa-home"></i> Home</a>
                        <a href="Alumini-Profile.html" class="mob-sidenav-item"><i class="fas fa-user-circle"></i> Profile</a>
                        <a href="Mentor-Accepts.html" class="mob-sidenav-item"><i class="fas fa-handshake"></i> Mentors</a>
                        <a href="Post-job.html" class="mob-sidenav-item"><i class="fas fa-briefcase"></i> Jobs</a>
                        <a href="Mock-Interviews.html" class="mob-sidenav-item"><i class="fas fa-video"></i> Mock Interviews</a>
                        <a href="Alumini-Circle.html" class="mob-sidenav-item"><i class="fas fa-users"></i> Networking</a>
                        <a href="Launch-Pad.html" class="mob-sidenav-item"><i class="fas fa-rocket"></i> LaunchPad</a>
                        <a href="Messages.html" class="mob-sidenav-item"><i class="fas fa-comment-dots"></i> Messages</a>
                        <a href="Contact-Us.html" class="mob-sidenav-item"><i class="fas fa-life-ring"></i> Help & Support</a>
                        <div style="flex: 1; min-height: 40px;"></div>
                        <a href="Settings.html" class="mob-sidenav-item"><i class="fas fa-cog"></i> Settings</a>
                        <a href="#" class="mob-sidenav-item logout-btn" style="color: #dc3545;" onclick="if(typeof window.handleLogout==='function'){window.handleLogout();}else{localStorage.clear();window.location.href='../Main/login.html';}"><i class="fas fa-sign-out-alt" style="color: #dc3545;"></i> Logout</a>
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
