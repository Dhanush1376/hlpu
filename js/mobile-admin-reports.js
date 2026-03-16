/**
 * mobile-admin-reports.js
 * Mobile reports/analytics for Admin.
 * Fetches /api/admin/stats or /api/dashboard/admin.
 */
(function () {
    if (window.innerWidth > 768) return;

    const Nav = window.AdminMobileNav || window.MobileNav;
    if (!Nav) return;

    document.querySelectorAll('#navbar, .mesh-bg, .dashboard-container').forEach(el => el.style.display = 'none');

    let root = document.getElementById('mobile-root');
    if (!root) { root = document.createElement('div'); root.id = 'mobile-root'; document.body.prepend(root); }

    async function init() {
        root.innerHTML = `
            ${Nav.renderHeader({})}
            <div class="mob-admin-loading"><i class="fas fa-spinner fa-spin"></i><p>Loading reports…</p></div>
            ${Nav.renderSidenav()}
            ${Nav.renderBottomNav('')}
        `;
        if (Nav.initSidenavEvents) setTimeout(() => Nav.initSidenavEvents(), 100);

        try {
            const data = await apiFetch('/api/dashboard/admin');
            renderReports(data || {});
        } catch (err) {
            console.error('[admin-reports]', err);
            root.innerHTML = `${Nav.renderHeader({})}<div class="mob-admin-empty"><i class="fas fa-wifi"></i><h4>Connection Error</h4><p>Could not load reports data.</p></div>${Nav.renderSidenav()}${Nav.renderBottomNav('')}`;
            if (Nav.initSidenavEvents) setTimeout(() => Nav.initSidenavEvents(), 100);
        }
    }

    function renderReports(data) {
        const totalMembers = (data.totalStudents || 0) + (data.totalAlumni || 0);

        root.innerHTML = `
            ${Nav.renderHeader({})}

            <div class="mob-admin-welcome">
                <h1>Reports & Analytics</h1>
                <p><i class="fas fa-chart-line"></i> Platform insights and metrics</p>
            </div>

            <div class="mob-admin-stats">
                <div class="mob-admin-stat-card">
                    <div class="mob-admin-stat-icon"><i class="fas fa-users"></i></div>
                    <div class="mob-admin-stat-title">Total Users</div>
                    <div class="mob-admin-stat-value">${totalMembers.toLocaleString()}</div>
                    <div class="mob-admin-stat-footer"><i class="fas fa-arrow-up"></i> All members</div>
                </div>
                <div class="mob-admin-stat-card">
                    <div class="mob-admin-stat-icon"><i class="fas fa-user-graduate"></i></div>
                    <div class="mob-admin-stat-title">Students</div>
                    <div class="mob-admin-stat-value">${(data.totalStudents || 0).toLocaleString()}</div>
                </div>
                <div class="mob-admin-stat-card">
                    <div class="mob-admin-stat-icon"><i class="fas fa-user-tie"></i></div>
                    <div class="mob-admin-stat-title">Alumni</div>
                    <div class="mob-admin-stat-value">${(data.totalAlumni || 0).toLocaleString()}</div>
                </div>
                <div class="mob-admin-stat-card">
                    <div class="mob-admin-stat-icon"><i class="fas fa-briefcase"></i></div>
                    <div class="mob-admin-stat-title">Jobs</div>
                    <div class="mob-admin-stat-value">${(data.totalJobs || 0).toLocaleString()}</div>
                </div>
            </div>

            <div class="mob-admin-section">
                <div class="mob-admin-section-header">
                    <div class="mob-admin-section-title"><i class="fas fa-shield-alt"></i> System Alerts</div>
                </div>
                ${renderAlerts(data.systemAlerts)}
            </div>

            <div class="mob-admin-section">
                <div class="mob-admin-section-header">
                    <div class="mob-admin-section-title"><i class="fas fa-user-plus"></i> Recent Activity</div>
                </div>
                ${renderRecentActivity(data.recentUsers)}
            </div>

            <div class="mob-admin-export-row">
                <div class="mob-admin-export-btn" onclick="window._adminExport('csv')"><i class="fas fa-file-csv"></i> Export CSV</div>
                <div class="mob-admin-export-btn" onclick="window._adminExport('pdf')"><i class="fas fa-file-pdf"></i> Export PDF</div>
            </div>

            ${Nav.renderSidenav()}
            ${Nav.renderBottomNav('')}
        `;
        if (Nav.initSidenavEvents) setTimeout(() => Nav.initSidenavEvents(), 100);
    }

    function renderAlerts(alerts) {
        if (!alerts || alerts.length === 0) return '<p style="text-align:center; padding:16px 0; color:#8b99a8; font-size:0.82rem;">No active alerts</p>';
        return alerts.map(a => `
            <div class="mob-admin-activity ${a.priority === 'urgent' ? 'urgent' : 'warning'}">
                <div class="mob-admin-activity-icon"><i class="fas ${a.priority === 'urgent' ? 'fa-ban' : 'fa-flag'}"></i></div>
                <div style="flex:1;">
                    <div class="mob-admin-activity-title">${a.title}</div>
                    <div class="mob-admin-activity-desc">${a.message}</div>
                    <div class="mob-admin-activity-time">${a.time || 'Recently'} · ${a.priority}</div>
                </div>
            </div>
        `).join('');
    }

    function renderRecentActivity(users) {
        if (!users || users.length === 0) return '<p style="text-align:center; padding:16px 0; color:#8b99a8; font-size:0.82rem;">No recent activity</p>';
        return users.slice(0, 5).map(u => {
            const initials = (u.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            return `
                <div class="mob-admin-activity">
                    <div class="mob-admin-activity-icon" style="font-weight:800; font-size:0.7rem;">${initials}</div>
                    <div style="flex:1;">
                        <div class="mob-admin-activity-title">New ${u.role || 'user'}: ${u.name}</div>
                        <div class="mob-admin-activity-desc">${u.email || ''}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    window._adminExport = function (format) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({ title: `Export ${format.toUpperCase()}`, text: `${format.toUpperCase()} report will be generated.`, icon: 'info', confirmButtonColor: '#C2491F', background: '#FFF8F0' });
        }
    };

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
