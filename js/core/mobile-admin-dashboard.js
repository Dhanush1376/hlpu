/**
 * mobile-admin-dashboard.js
 * Mobile-first logic for Admin Dashboard (Command Center).
 * Uses AdminMobileNav for navigation.
 * Fetches data from /api/dashboard/admin.
 */
(function () {
    if (window.innerWidth > 768) return;

    const Nav = window.AdminMobileNav || window.MobileNav;
    if (!Nav) return;

    // Hide desktop elements
    document.querySelectorAll('#navbar, .mesh-bg, .dashboard-container').forEach(el => {
        el.style.display = 'none';
    });

    let root = document.getElementById('mobile-root');
    if (!root) {
        root = document.createElement('div');
        root.id = 'mobile-root';
        document.body.prepend(root);
    }

    async function init() {
        root.innerHTML = `
            ${Nav.renderHeader({})}
            <div class="mob-admin-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading command center…</p>
            </div>
            ${Nav.renderSidenav()}
            ${Nav.renderBottomNav('dashboard')}
        `;
        if (Nav.initSidenavEvents) setTimeout(() => Nav.initSidenavEvents(), 100);

        try {
            const data = await apiFetch('/api/dashboard/admin');
            renderDashboard(data || {});
        } catch (err) {
            console.error('[admin-mob] Dashboard error:', err);
            renderError();
        }
    }

    function renderDashboard(data) {
        const userName = data.adminName || localStorage.getItem('userName') || 'Admin';
        const firstName = userName.split(' ')[0];
        const initials = userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

        const totalMembers = (data.totalStudents || 0) + (data.totalAlumni || 0);
        const pendingVerifications = data.pendingVerificationsCount || 0;
        const totalJobs = data.totalJobs || 0;
        const totalStudents = data.totalStudents || 0;

        root.innerHTML = `
            ${Nav.renderHeader({})}

            <div class="mob-admin-welcome">
                <h1><i class="fas fa-crown" style="color: var(--gilt); font-size: 1.1rem;"></i> Command Center</h1>
                <p><i class="fas fa-shield-alt"></i> Welcome back, ${firstName}! System is healthy.</p>
            </div>

            <div class="mob-admin-profile">
                <div class="mob-admin-profile-avatar">${initials}</div>
                <div class="mob-admin-profile-info">
                    <h2>${userName}</h2>
                    <p><i class="fas fa-crown" style="color: var(--gilt);"></i> System Administrator</p>
                    <div class="mob-admin-badges">
                        <span class="mob-admin-badge"><i class="fas fa-shield-alt"></i> Admin</span>
                        <span class="mob-admin-badge"><i class="fas fa-server"></i> Health: OK</span>
                    </div>
                </div>
            </div>

            <div class="mob-admin-quick-links">
                <a href="Verify.html" class="mob-admin-quick-link">
                    <div class="mob-admin-quick-icon"><i class="fas fa-id-card"></i></div>
                    <div class="mob-admin-quick-label">Verify</div>
                </a>
                <a href="Users.html" class="mob-admin-quick-link">
                    <div class="mob-admin-quick-icon"><i class="fas fa-users"></i></div>
                    <div class="mob-admin-quick-label">Users</div>
                </a>
                <a href="Jobs.html" class="mob-admin-quick-link">
                    <div class="mob-admin-quick-icon"><i class="fas fa-briefcase"></i></div>
                    <div class="mob-admin-quick-label">Jobs</div>
                </a>
                <a href="Reports.html" class="mob-admin-quick-link">
                    <div class="mob-admin-quick-icon"><i class="fas fa-chart-line"></i></div>
                    <div class="mob-admin-quick-label">Reports</div>
                </a>
            </div>

            <div class="mob-admin-stats">
                <div class="mob-admin-stat-card">
                    <div class="mob-admin-stat-icon"><i class="fas fa-user-friends"></i></div>
                    <div class="mob-admin-stat-title">Total Members</div>
                    <div class="mob-admin-stat-value">${totalMembers.toLocaleString()}</div>
                    <div class="mob-admin-stat-footer"><i class="fas fa-arrow-up"></i> Alumni + Students</div>
                </div>
                <div class="mob-admin-stat-card">
                    ${pendingVerifications > 0 ? `<div class="mob-admin-stat-badge">${pendingVerifications}</div>` : ''}
                    <div class="mob-admin-stat-icon"><i class="fas fa-check-double"></i></div>
                    <div class="mob-admin-stat-title">Verifications</div>
                    <div class="mob-admin-stat-value">${pendingVerifications}</div>
                    <div class="mob-admin-stat-footer" style="background: #e8f4fd; color: #0d47a1; cursor: pointer;" onclick="window.location.href='Verify.html'"><i class="fas fa-arrow-right"></i> Review queue</div>
                </div>
                <div class="mob-admin-stat-card">
                    <div class="mob-admin-stat-icon"><i class="fas fa-briefcase"></i></div>
                    <div class="mob-admin-stat-title">Total Jobs</div>
                    <div class="mob-admin-stat-value">${totalJobs.toLocaleString()}</div>
                    <div class="mob-admin-stat-footer" style="background: #fde3d8; color: #b23c1a;"><i class="fas fa-exclamation-circle"></i> Live postings</div>
                </div>
                <div class="mob-admin-stat-card">
                    <div class="mob-admin-stat-icon"><i class="fas fa-user-graduate"></i></div>
                    <div class="mob-admin-stat-title">Active Students</div>
                    <div class="mob-admin-stat-value">${totalStudents.toLocaleString()}</div>
                    <div class="mob-admin-stat-footer"><i class="fas fa-calendar-plus"></i> Registered</div>
                </div>
            </div>

            <div class="mob-admin-section">
                <div class="mob-admin-section-header">
                    <div class="mob-admin-section-title"><i class="fas fa-user-plus"></i> Recent Signups</div>
                    <a href="Users.html" class="mob-admin-section-link">View all →</a>
                </div>
                <div id="mob-admin-recent-users">
                    ${renderRecentUsers(data.recentUsers)}
                </div>
            </div>

            <div class="mob-admin-section">
                <div class="mob-admin-section-header">
                    <div class="mob-admin-section-title"><i class="fas fa-shield-alt"></i> Priority Flags</div>
                    <a href="Reports.html" class="mob-admin-section-link">Resolve</a>
                </div>
                <div id="mob-admin-alerts">
                    ${renderAlerts(data.systemAlerts)}
                </div>
            </div>

            <div class="mob-admin-system-chips">
                <div class="mob-admin-system-chip" onclick="window._adminAction('cache')"><i class="fas fa-broom"></i> Clear Cache</div>
                <div class="mob-admin-system-chip" onclick="window._adminAction('export')"><i class="fas fa-file-export"></i> Export CSV</div>
                <div class="mob-admin-system-chip" onclick="window._adminAction('backup')"><i class="fas fa-database"></i> Backup</div>
            </div>

            ${Nav.renderSidenav()}
            ${Nav.renderBottomNav('dashboard')}
        `;
        if (Nav.initSidenavEvents) setTimeout(() => Nav.initSidenavEvents(), 100);
    }

    function renderRecentUsers(users) {
        if (!users || users.length === 0) {
            return '<div class="mob-admin-empty"><i class="fas fa-users"></i><h4>No Recent Signups</h4><p>New registrations will appear here.</p></div>';
        }
        return users.slice(0, 5).map(u => {
            const roleClass = u.role === 'student' ? 'role-student' : 'role-alumni';
            const roleLabel = (u.role || 'user').charAt(0).toUpperCase() + (u.role || 'user').slice(1);
            const initials = (u.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            return `
                <div class="mob-admin-activity">
                    <div class="mob-admin-activity-icon">${initials}</div>
                    <div style="flex:1;">
                        <div class="mob-admin-activity-title">${u.name}</div>
                        <div class="mob-admin-activity-desc">
                            <span class="mob-admin-tag ${roleClass}"><i class="fas fa-circle"></i> ${roleLabel}</span>
                        </div>
                        <div class="mob-admin-activity-time"><i class="far fa-clock"></i> ${formatTimeAgo(u.createdAt)}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderAlerts(alerts) {
        if (!alerts || alerts.length === 0) {
            return '<div class="mob-admin-empty"><i class="fas fa-shield-alt"></i><h4>No Active Flags</h4><p>All clear — no outstanding alerts.</p></div>';
        }
        return alerts.map(a => `
            <div class="mob-admin-activity ${a.priority === 'urgent' ? 'urgent' : 'warning'}">
                <div class="mob-admin-activity-icon"><i class="fas ${a.priority === 'urgent' ? 'fa-ban' : 'fa-flag'}"></i></div>
                <div style="flex:1;">
                    <div class="mob-admin-activity-title">${a.title}</div>
                    <div class="mob-admin-activity-desc">${a.message}</div>
                    <div class="mob-admin-activity-time"><i class="far fa-clock"></i> ${a.time || 'Recently'} · ${a.priority}</div>
                </div>
            </div>
        `).join('');
    }

    function renderError() {
        root.innerHTML = `
            ${Nav.renderHeader({})}
            <div class="mob-admin-empty">
                <i class="fas fa-wifi"></i>
                <h4>Connection Issue</h4>
                <p>Could not load dashboard data. Please reload.</p>
            </div>
            ${Nav.renderSidenav()}
            ${Nav.renderBottomNav('dashboard')}
        `;
        if (Nav.initSidenavEvents) setTimeout(() => Nav.initSidenavEvents(), 100);
    }

    function formatTimeAgo(dateStr) {
        if (!dateStr) return 'Recently';
        const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
        if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
        if (seconds < 2592000) return Math.floor(seconds / 86400) + 'd ago';
        return Math.floor(seconds / 2592000) + 'mo ago';
    }

    // Global admin action handlers
    window._adminAction = function (cmd) {
        if (typeof Swal !== 'undefined') {
            if (cmd === 'cache') Swal.fire({ title: 'Cache Cleared', text: 'Temporary files cleaned.', icon: 'success', confirmButtonColor: '#C2491F', background: '#FFF8F0' });
            if (cmd === 'export') Swal.fire({ title: 'Export Started', text: 'Metrics downloading…', icon: 'info', confirmButtonColor: '#C2491F', background: '#FFF8F0' });
            if (cmd === 'backup') Swal.fire({ title: 'Backup Running', text: 'Snapshot in progress…', icon: 'info', confirmButtonColor: '#C2491F', background: '#FFF8F0' });
        }
    };

    // Init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
