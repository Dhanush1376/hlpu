window.MobileNav = {
    // Helper: Dynamic Initials
    _getInitials: function () {
        try {
            const token = localStorage.getItem('token');
            const storedName = localStorage.getItem('userName');

            let fullName = storedName || "User";
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    fullName = payload.fullName || payload.name || payload.userName || fullName;
                } catch (e) { }
            }

            const names = fullName.trim().split(/\s+/);
            if (names.length === 0) return "U";
            if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
            return (names[0][0] + names[names.length - 1][0]).toUpperCase();
        } catch (e) {
            return "U";
        }
    },

    renderHeader: function (data = {}) {
        const initials = data.userInitial || this._getInitials();
        const notificationBadge = data.notificationCount > 0
            ? `<div class="mob-notif-badge">${data.notificationCount}</div>`
            : '';

        return `
        <div class="mob-header">
            <div class="mob-header-logo">
                <img src="../assets/images/hlpu-logo.png" alt="hLPU" />
            </div>
            <div class="mob-header-actions">
                <a href="Student-Profile.html" class="mob-avatar" style="text-decoration: none;">${initials}</a>
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
            { id: "dashboard", icon: "fas fa-home", label: "Dashboard", href: "Dashboard.html" },
            { id: "jobs", icon: "fas fa-user-tie", label: "Jobs", href: "Direct-Job.html" },
            { id: "mentors", icon: "fas fa-chalkboard-teacher", label: "Mentors", href: "Mentor-Requests.html" },
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
        let fullName = localStorage.getItem('userName') || "User";
        let userRole = "Member";

        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                fullName = payload.fullName || payload.name || payload.userName || fullName;
                userRole = payload.role || userRole;
                // Capitalize role
                userRole = userRole.charAt(0).toUpperCase() + userRole.slice(1);
            } catch (e) { }
        }

        return `
            <div id="mob-sidenav-overlay" class="mob-sidenav-overlay"></div>
            <div id="mob-sidenav" class="mob-sidenav">
                <div class="mob-sidenav-header">
                    <img src="../assets/images/hlpu-logo.png" alt="hLPU" class="mob-sidenav-logo" />
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
                    <a href="Student-Profile.html" class="mob-sidenav-item"><i class="fas fa-user-circle"></i> Profile</a>
                    <a href="Mentor-Requests.html" class="mob-sidenav-item"><i class="fas fa-chalkboard-teacher"></i> Mentors</a>
                    <a href="Direct-Job.html" class="mob-sidenav-item"><i class="fas fa-briefcase"></i> Jobs</a>
                    <a href="Mock-Application.html" class="mob-sidenav-item"><i class="fas fa-video"></i> Mock Interviews</a>
                    <a href="Course-Map.html" class="mob-sidenav-item"><i class="fas fa-map"></i> Course Map</a>
                    <a href="Launch-Pad.html" class="mob-sidenav-item"><i class="fas fa-rocket"></i> LaunchPad</a>
                    <a href="Contact-Us.html" class="mob-sidenav-item"><i class="fas fa-life-ring"></i> Help & Support</a>
                    <div style="flex: 1; min-height: 40px;"></div>
                    <a href="Settings.html" class="mob-sidenav-item"><i class="fas fa-cog"></i> Settings</a>
                    <a href="#" class="mob-sidenav-item logout-btn" style="color: #dc3545;" onclick="if(typeof window.handleLogout==='function'){window.handleLogout();}else{localStorage.clear();window.location.href='../login.html';}"><i class="fas fa-sign-out-alt" style="color: #dc3545;"></i> Logout</a>
                </div>
            </div>
        `;
    },

    initSidenavEvents: function () {
        const moreBtn = document.getElementById('mob-nav-more');
        const sidenav = document.getElementById('mob-sidenav');
        const overlay = document.getElementById('mob-sidenav-overlay');
        const closeBtn = document.getElementById('mob-sidenav-close');

        if (!moreBtn || !sidenav || !overlay) return;

        // Prevent duplicate listeners by removing old ones first
        const newMoreBtn = moreBtn.cloneNode(true);
        moreBtn.parentNode.replaceChild(newMoreBtn, moreBtn);

        const newCloseBtn = closeBtn ? closeBtn.cloneNode(true) : null;
        if (closeBtn && newCloseBtn) closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);

        const newOverlay = overlay.cloneNode(true);
        overlay.parentNode.replaceChild(newOverlay, overlay);

        newMoreBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sidenav.classList.add('active');
            newOverlay.classList.add('active');
        });

        if (newCloseBtn) {
            newCloseBtn.addEventListener('click', () => {
                sidenav.classList.remove('active');
                newOverlay.classList.remove('active');
            });
        }

        newOverlay.addEventListener('click', () => {
            sidenav.classList.remove('active');
            newOverlay.classList.remove('active');
        });

        // Swipe to close
        let startX = 0;
        sidenav.removeEventListener('touchstart', sidenav._touchstart);
        sidenav.removeEventListener('touchmove', sidenav._touchmove);

        sidenav._touchstart = e => startX = e.touches[0].clientX;
        sidenav._touchmove = e => {
            if (e.touches[0].clientX > startX + 50) {
                sidenav.classList.remove('active');
                newOverlay.classList.remove('active');
            }
        };

        sidenav.addEventListener('touchstart', sidenav._touchstart);
        sidenav.addEventListener('touchmove', sidenav._touchmove);
    }
};
