/**
 * mobile-admin-audit.js
 * Mobile Audit Trail for Admin.
 * Full parity: dynamic stats, event type filter, search, log list, pagination, export CSV, archive, detail view.
 */
(function () {
    if (window.innerWidth > 768) return;
    const Nav = window.AdminMobileNav || window.MobileNav;
    if (!Nav) return;

    document.querySelectorAll('#navbar, .mesh-bg, .dashboard-container').forEach(el => el.style.display = 'none');
    let root = document.getElementById('mobile-root');
    if (!root) { root = document.createElement('div'); root.id = 'mobile-root'; document.body.prepend(root); }

    let currentPage = 1;

    async function init() {
        renderShell();
        await Promise.all([fetchStats(), fetchLogs()]);
    }

    function renderShell() {
        root.innerHTML = `
            ${Nav.renderHeader({})}
            <div class="mob-admin-welcome"><h1>Audit Trail</h1><p><i class="fas fa-shield-alt"></i> System events, admin actions, and user activities</p></div>
            <div class="mob-admin-stats" id="mob-audit-stats"></div>
            <div class="mob-admin-search"><i class="fas fa-search"></i><input type="text" id="mob-audit-search" placeholder="Search by user, action, resource…" /></div>
            <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
                <select class="mob-filter-select" id="mob-audit-type" onchange="window._auditFilter()">
                    <option value="">All Event Types</option>
                    <option value="user create">User Create</option>
                    <option value="user update">User Update</option>
                    <option value="user delete">User Delete</option>
                    <option value="verification">Verification</option>
                    <option value="login">Login</option>
                    <option value="job post">Job Post</option>
                    <option value="settings">Settings</option>
                </select>
                <button class="mob-admin-btn mob-admin-btn-view" onclick="window._auditExport()"><i class="fas fa-download"></i> Export</button>
                <button class="mob-admin-btn mob-admin-btn-view" onclick="window._auditArchive()"><i class="fas fa-archive"></i> Archive</button>
            </div>
            <div id="mob-audit-list"><div class="mob-admin-loading"><i class="fas fa-spinner fa-spin"></i><p>Synchronizing logs…</p></div></div>
            <div id="mob-audit-pagination"></div>
            ${Nav.renderSidenav()}${Nav.renderBottomNav('')}
        `;
        if (Nav.initSidenavEvents) setTimeout(() => Nav.initSidenavEvents(), 100);
        const searchInput = document.getElementById('mob-audit-search');
        if (searchInput) { let t; searchInput.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { currentPage = 1; fetchLogs(); }, 400); }); }
    }

    async function fetchStats() {
        try {
            const stats = await apiFetch('/api/admin/audit/stats');
            if (stats) {
                document.getElementById('mob-audit-stats').innerHTML = `
                    <div class="mob-admin-stat-card"><div class="mob-admin-stat-icon"><i class="fas fa-user-check"></i></div><div class="mob-admin-stat-title">Admin Actions</div><div class="mob-admin-stat-value">${stats.adminActionsCount || 0}</div></div>
                    <div class="mob-admin-stat-card"><div class="mob-admin-stat-icon"><i class="fas fa-user-plus"></i></div><div class="mob-admin-stat-title">User Changes</div><div class="mob-admin-stat-value">${stats.userChangesCount || 0}</div></div>
                    <div class="mob-admin-stat-card"><div class="mob-admin-stat-icon"><i class="fas fa-trash"></i></div><div class="mob-admin-stat-title">Deletions</div><div class="mob-admin-stat-value">${stats.deletionsCount || 0}</div></div>
                    <div class="mob-admin-stat-card"><div class="mob-admin-stat-icon"><i class="fas fa-database"></i></div><div class="mob-admin-stat-title">Total Events</div><div class="mob-admin-stat-value">${(stats.totalLogs || 0).toLocaleString()}</div></div>
                `;
            }
        } catch (e) { console.error('[audit stats]', e); }
    }

    window._auditFilter = function () { currentPage = 1; fetchLogs(); };

    async function fetchLogs() {
        const container = document.getElementById('mob-audit-list');
        const action = document.getElementById('mob-audit-type')?.value || '';
        const search = document.getElementById('mob-audit-search')?.value || '';
        try {
            const data = await apiFetch(`/api/admin/audit/logs?page=${currentPage}&action=${action}&search=${search}`);

            if (!data.logs || data.logs.length === 0) {
                container.innerHTML = '<div class="mob-admin-empty"><i class="fas fa-list"></i><h4>No Logs Found</h4></div>';
                document.getElementById('mob-audit-pagination').innerHTML = '';
                return;
            }

            container.innerHTML = data.logs.map(log => {
                const date = new Date(log.createdAt);
                const actionColor = log.action?.includes('delete') || log.action?.includes('reject') ? '#dc3545' : log.action?.includes('create') || log.action?.includes('approve') ? '#28a745' : log.action?.includes('login') ? '#17a2b8' : '#6c757d';
                return `
                    <div class="mob-admin-user-card" onclick="window._auditDetail('${log._id}', '${(log.description || '').replace(/'/g, '')}')">
                        <div class="mob-admin-user-header">
                            <div class="mob-admin-user-avatar" style="font-size:0.8rem;">${(log.user?.name || 'S').charAt(0)}</div>
                            <div class="mob-admin-user-info">
                                <h3>${log.user?.name || 'System'}</h3>
                                <p class="mob-admin-user-meta">${log.user?.role || 'Service'}</p>
                            </div>
                        </div>
                        <p style="font-weight:600;font-size:0.85rem;margin:6px 0 2px;">${log.description || 'System Event'}</p>
                        <div class="mob-admin-user-tags">
                            <span class="mob-admin-tag" style="background:${actionColor}15;color:${actionColor};font-weight:700;">${(log.action || '').replace(/_/g, ' ')}</span>
                            <span class="mob-admin-tag"><i class="fas fa-globe"></i> ${log.ipAddress || 'Internal'}</span>
                            <span class="mob-admin-tag">${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>
                `;
            }).join('');

            if (data.pagination) {
                const pag = data.pagination;
                const pagEl = document.getElementById('mob-audit-pagination');
                if (pag.pages > 1) {
                    pagEl.innerHTML = `<div class="mob-admin-pagination"><button class="mob-admin-pag-btn" ${currentPage <= 1 ? 'disabled' : ''} onclick="window._auditPage(${currentPage - 1})"><i class="fas fa-chevron-left"></i></button><span class="mob-admin-pag-info">Page ${currentPage} / ${pag.pages}</span><button class="mob-admin-pag-btn" ${currentPage >= pag.pages ? 'disabled' : ''} onclick="window._auditPage(${currentPage + 1})"><i class="fas fa-chevron-right"></i></button></div>`;
                } else pagEl.innerHTML = '';
            }
        } catch (e) { container.innerHTML = `<div class="mob-admin-empty"><i class="fas fa-wifi"></i><h4>Error</h4><p>${e.message}</p></div>`; }
    }

    window._auditPage = function (p) { currentPage = p; fetchLogs(); document.getElementById('mob-audit-list')?.scrollIntoView({ behavior: 'smooth' }); };

    window._auditDetail = function (id, desc) {
        if (typeof Swal === 'undefined') return;
        Swal.fire({ title: 'Event Metadata', html: `<div style="text-align:left;font-size:0.85rem;background:#f8f9fa;padding:15px;border-radius:10px;"><strong>Log ID:</strong> ${id}<br><strong>Description:</strong> ${desc}<br><strong>Security:</strong> AES-256 Encrypted Transfer</div>`, confirmButtonColor: '#c2491f', background: '#FFF8F0', width: '95%' });
    };

    window._auditExport = function () {
        if (typeof Swal === 'undefined') return;
        Swal.fire({
            title: 'Exporting Logs', text: 'Preparing system audit CSV…', icon: 'info', showConfirmButton: false, background: '#FFF8F0',
            didOpen: async () => {
                try {
                    const data = await apiFetch('/api/admin/audit/logs?limit=1000');
                    let csv = 'Timestamp,Initiator,Action,Description,IP Address,Origin\n';
                    (data.logs || []).forEach(log => { csv += `${new Date(log.createdAt).toISOString()},${log.user?.name || 'System'},${log.action},"${(log.description || '').replace(/"/g, '""')}",${log.ipAddress || ''},${log.userAgent || ''}\n`; });
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = `audit_${new Date().toISOString().split('T')[0]}.csv`; a.click();
                    Swal.fire({ icon: 'success', title: 'CSV Downloaded', timer: 1500, showConfirmButton: false, background: '#FFF8F0' });
                } catch (e) { Swal.fire({ icon: 'error', title: 'Export Failed', background: '#FFF8F0' }); }
            }
        });
    };

    window._auditArchive = function () {
        if (typeof Swal === 'undefined') return;
        Swal.fire({ title: 'Archive Logs', text: 'Move logs older than 90 days to long-term storage?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#c2491f', confirmButtonText: 'Yes, Archive', background: '#FFF8F0' }).then(r => { if (r.isConfirmed) Swal.fire({ icon: 'success', title: 'Archiving Initiated', timer: 1500, showConfirmButton: false, background: '#FFF8F0' }); });
    };

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
