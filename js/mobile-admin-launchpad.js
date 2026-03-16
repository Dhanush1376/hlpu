/**
 * mobile-admin-launchpad.js
 * Mobile launchpad administration for Admin.
 * Full feature parity: stats, applications, project details, approve/reject, project approval.
 */
(function () {
    if (window.innerWidth > 768) return;

    const Nav = window.AdminMobileNav || window.MobileNav;
    if (!Nav) return;

    document.querySelectorAll('#navbar, .mesh-bg, .dashboard-container').forEach(el => el.style.display = 'none');

    let root = document.getElementById('mobile-root');
    if (!root) { root = document.createElement('div'); root.id = 'mobile-root'; document.body.prepend(root); }

    let allApps = [];

    async function init() {
        root.innerHTML = `
            ${Nav.renderHeader({})}
            <div class="mob-admin-loading"><i class="fas fa-spinner fa-spin"></i><p>Loading LaunchPad…</p></div>
            ${Nav.renderSidenav()}
            ${Nav.renderBottomNav('')}
        `;
        if (Nav.initSidenavEvents) setTimeout(() => Nav.initSidenavEvents(), 100);

        try {
            const [statsRes, appsRes, projectsRes] = await Promise.all([
                apiFetch('/api/launchpad/applications/stats').catch(() => null),
                apiFetch('/api/launchpad/applications/admin/all').catch(() => null),
                apiFetch('/api/launchpad/projects').catch(() => null)
            ]);

            const stats = statsRes?.data?.admin || {};
            const totalProjects = projectsRes?.total || projectsRes?.data?.length || 0;
            allApps = appsRes?.data || [];

            renderPage(stats, totalProjects);
        } catch (err) {
            console.error('[admin-launchpad]', err);
            root.innerHTML = `${Nav.renderHeader({})}<div class="mob-admin-empty"><i class="fas fa-wifi"></i><h4>Connection Error</h4><p>Could not load LaunchPad data.</p></div>${Nav.renderSidenav()}${Nav.renderBottomNav('')}`;
            if (Nav.initSidenavEvents) setTimeout(() => Nav.initSidenavEvents(), 100);
        }
    }

    function renderPage(stats, totalProjects) {
        root.innerHTML = `
            ${Nav.renderHeader({})}

            <div class="mob-admin-welcome">
                <h1>LaunchPad Operations</h1>
                <p><i class="fas fa-rocket"></i> Global oversight of collaboration requests</p>
            </div>

            <div style="margin-bottom:12px;">
                <button class="mob-admin-btn mob-admin-btn-view" style="width:100%;padding:12px;" onclick="window._lpRefresh()">
                    <i class="fas fa-sync-alt"></i> Refresh Data
                </button>
            </div>

            <div class="mob-admin-stats">
                <div class="mob-admin-stat-card"><div class="mob-admin-stat-icon"><i class="fas fa-file-alt"></i></div><div class="mob-admin-stat-title">Applications</div><div class="mob-admin-stat-value">${stats.total || 0}</div></div>
                <div class="mob-admin-stat-card"><div class="mob-admin-stat-icon"><i class="fas fa-clock"></i></div><div class="mob-admin-stat-title">Pending</div><div class="mob-admin-stat-value">${stats.pending || 0}</div></div>
                <div class="mob-admin-stat-card"><div class="mob-admin-stat-icon"><i class="fas fa-check-circle"></i></div><div class="mob-admin-stat-title">Matched</div><div class="mob-admin-stat-value">${stats.accepted || 0}</div></div>
                <div class="mob-admin-stat-card"><div class="mob-admin-stat-icon"><i class="fas fa-project-diagram"></i></div><div class="mob-admin-stat-title">Projects</div><div class="mob-admin-stat-value">${totalProjects}</div></div>
            </div>

            <div class="mob-admin-section">
                <div class="mob-admin-section-header">
                    <div class="mob-admin-section-title"><i class="fas fa-list"></i> All Applications</div>
                </div>
                <div id="mob-launchpad-apps"></div>
            </div>

            ${Nav.renderSidenav()}
            ${Nav.renderBottomNav('')}
        `;
        if (Nav.initSidenavEvents) setTimeout(() => Nav.initSidenavEvents(), 100);

        renderApps();
    }

    function renderApps() {
        const container = document.getElementById('mob-launchpad-apps');
        if (!container) return;

        if (!allApps || allApps.length === 0) {
            container.innerHTML = '<p style="text-align:center; padding:16px 0; color:#8b99a8; font-size:0.82rem;">No activity recorded on LaunchPad yet.</p>';
            return;
        }

        container.innerHTML = allApps.map(app => {
            const initials = (app.applicant?.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            const statusClass = app.status === 'accepted' ? 'status-approved' : app.status === 'rejected' ? 'status-rejected' : 'status-pending';
            const dateStr = app.createdAt ? new Date(app.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
            const timeStr = app.createdAt ? new Date(app.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

            return `
                <div class="mob-admin-user-card">
                    <div class="mob-admin-user-header">
                        <div class="mob-admin-user-avatar">${initials}</div>
                        <div class="mob-admin-user-info">
                            <h3>${app.applicant?.name || 'Unknown'}</h3>
                            <p class="mob-admin-user-meta">${app.project?.title || 'Unknown Project'} · ${app.project?.domain || ''}</p>
                        </div>
                    </div>
                    <div class="mob-admin-user-tags">
                        <span class="mob-admin-tag tag-${app.applicant?.role || 'student'}">${app.applicant?.role || 'student'}</span>
                        <span class="mob-admin-tag ${statusClass}">${(app.status || 'pending').toUpperCase()}</span>
                        ${app.project && !app.project.isApproved ? '<span class="mob-admin-tag" style="background:#fff3e0;color:#c2410c;">NOT APPROVED</span>' : (app.project ? '<span class="mob-admin-tag status-approved">APPROVED</span>' : '')}
                        <span class="mob-admin-tag"><i class="fas fa-calendar"></i> ${dateStr}</span>
                    </div>
                    <div class="mob-admin-actions">
                        ${app.project ? `<button class="mob-admin-btn mob-admin-btn-view" onclick="window._lpViewProject('${app.project?._id}')"><i class="fas fa-eye"></i> Details</button>` : ''}
                        ${app.project?.startupPitchDeck ? `<button class="mob-admin-btn mob-admin-btn-view" onclick="window.open('${app.project.startupPitchDeck}','_blank')"><i class="fas fa-file-pdf"></i> Pitch</button>` : ''}
                        ${app.project && !app.project.isApproved ? `<button class="mob-admin-btn mob-admin-btn-primary" onclick="window._lpApproveProject('${app.project._id}')"><i class="fas fa-rocket"></i> Approve</button>` : ''}
                        ${app.status === 'pending' ? `
                            <button class="mob-admin-btn mob-admin-btn-primary" style="background:linear-gradient(135deg,#059669,#10b981);" onclick="window._lpAction('${app._id}', 'accepted')"><i class="fas fa-check"></i></button>
                            <button class="mob-admin-btn mob-admin-btn-view" style="background:#fef2f2;color:#dc2626;border-color:#fee2e2;" onclick="window._lpAction('${app._id}', 'rejected')"><i class="fas fa-times"></i></button>
                        ` : '<span class="mob-admin-tag" style="margin-left:auto;">Processed</span>'}
                    </div>
                </div>
            `;
        }).join('');
    }

    window._lpRefresh = function () { init(); };

    window._lpViewProject = async function (id) {
        if (typeof Swal === 'undefined') return;
        try {
            const res = await apiFetch(`/api/launchpad/projects/${id}`);
            if (res.success) {
                const p = res.data;
                Swal.fire({
                    title: p.title, html: `
                        <div style="text-align:left; font-size:0.85rem; color:#3f4d5e; line-height:1.6;">
                            <p><strong>Domain:</strong> ${p.domain || 'N/A'}</p>
                            <p><strong>Type:</strong> ${p.projectType || 'Standard'}</p>
                            <p><strong>Status:</strong> ${p.isApproved ? '✅ Approved' : '⏳ Not Approved'}</p>
                            <div style="background:#f8f9fa;padding:12px;border-radius:12px;margin-top:8px;max-height:200px;overflow-y:auto;">${p.description || 'No description'}</div>
                        </div>
                    `, confirmButtonColor: '#C2491F', background: '#FFF8F0', width: '95%'
                });
            }
        } catch (err) { Swal.fire('Error', 'Failed to fetch project details', 'error'); }
    };

    window._lpApproveProject = async function (id) {
        if (typeof Swal === 'undefined') return;
        const confirm = await Swal.fire({
            title: 'Approve Project?', text: 'This will approve the project for the platform.', icon: 'question',
            showCancelButton: true, confirmButtonColor: '#C2491F', confirmButtonText: 'Yes, Approve', background: '#FFF8F0'
        });
        if (confirm.isConfirmed) {
            try {
                await apiFetch(`/api/launchpad/projects/${id}/approve`, { method: 'PATCH', body: JSON.stringify({ isApproved: true }) });
                Swal.fire({ icon: 'success', title: 'Project Approved!', timer: 1500, showConfirmButton: false, background: '#FFF8F0' });
                init();
            } catch (e) { Swal.fire({ icon: 'error', title: 'Failed', background: '#FFF8F0' }); }
        }
    };

    window._lpAction = async function (id, status) {
        if (typeof Swal === 'undefined') return;
        const confirm = await Swal.fire({
            title: `${status === 'accepted' ? 'Approve' : 'Reject'} Application?`,
            text: `Are you sure you want to ${status} this collaboration request?`,
            icon: 'warning', showCancelButton: true,
            confirmButtonColor: status === 'accepted' ? '#059669' : '#dc2626',
            confirmButtonText: `Yes, ${status}`, background: '#FFF8F0'
        });
        if (confirm.isConfirmed) {
            try {
                await apiFetch(`/api/launchpad/applications/${id}/respond`, { method: 'PATCH', body: JSON.stringify({ status }) });
                Swal.fire({ icon: 'success', title: `Application ${status}!`, timer: 1500, showConfirmButton: false, background: '#FFF8F0' });
                init();
            } catch (e) { Swal.fire({ icon: 'error', title: 'Failed to update', background: '#FFF8F0' }); }
        }
    };

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
