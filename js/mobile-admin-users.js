/**
 * mobile-admin-users.js
 * Mobile user management for Admin.
 * Fetches /api/admin/users with search, role filter, and pagination.
 */
(function () {
    if (window.innerWidth > 768) return;

    const Nav = window.AdminMobileNav || window.MobileNav;
    if (!Nav) return;

    document.querySelectorAll('#navbar, .mesh-bg, .dashboard-container').forEach(el => el.style.display = 'none');

    let root = document.getElementById('mobile-root');
    if (!root) { root = document.createElement('div'); root.id = 'mobile-root'; document.body.prepend(root); }

    let allUsers = [];
    let filtered = [];
    let currentFilter = 'all';
    let mobPage = 1;
    const PER_PAGE = 10;

    async function init() {
        renderShell();
        try {
            const res = await apiFetch('/api/admin/users');
            allUsers = res?.users || res?.data || res || [];
            if (!Array.isArray(allUsers)) allUsers = [];
            filtered = [...allUsers];
            renderContent();
        } catch (err) {
            console.error('[admin-users]', err);
            document.getElementById('mob-admin-users-list').innerHTML = '<div class="mob-admin-empty"><i class="fas fa-wifi"></i><h4>Connection Error</h4><p>Could not load users.</p></div>';
        }
    }

    function renderShell() {
        root.innerHTML = `
            ${Nav.renderHeader({})}
            <div class="mob-admin-welcome">
                <h1>User Management</h1>
                <p><i class="fas fa-users"></i> Manage all platform members</p>
                <button class="mob-admin-btn mob-admin-btn-view mt-2" onclick="window._adminExportUsers()"><i class="fas fa-download"></i> Export Users</button>
            </div>
            <div class="mob-admin-search">
                <i class="fas fa-search"></i>
                <input type="text" id="mob-admin-user-search" placeholder="Search name, email, role…" />
            </div>
            <div class="mob-admin-filters" id="mob-admin-user-filters">
                <button class="mob-admin-filter-chip active" data-filter="all">All Users</button>
                <button class="mob-admin-filter-chip" data-filter="student">Students</button>
                <button class="mob-admin-filter-chip" data-filter="alumni">Alumni</button>
                <button class="mob-admin-filter-chip" data-filter="admin">Admins</button>
            </div>
            <div class="mob-admin-stats" id="mob-admin-user-stats"></div>
            <div id="mob-admin-users-list">
                <div class="mob-admin-loading"><i class="fas fa-spinner fa-spin"></i><p>Loading users…</p></div>
            </div>
            <div id="mob-admin-users-pagination"></div>
            ${Nav.renderSidenav()}
            ${Nav.renderBottomNav('users')}
        `;
        if (Nav.initSidenavEvents) setTimeout(() => Nav.initSidenavEvents(), 100);
        bindEvents();
    }

    function bindEvents() {
        document.querySelectorAll('#mob-admin-user-filters .mob-admin-filter-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#mob-admin-user-filters .mob-admin-filter-chip').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.dataset.filter;
                mobPage = 1;
                applyFilter();
            });
        });

        const searchInput = document.getElementById('mob-admin-user-search');
        if (searchInput) {
            let debounce;
            searchInput.addEventListener('input', () => {
                clearTimeout(debounce);
                debounce = setTimeout(() => { mobPage = 1; applyFilter(); }, 350);
            });
        }
    }

    function applyFilter() {
        const query = (document.getElementById('mob-admin-user-search')?.value || '').toLowerCase();
        filtered = allUsers.filter(u => {
            const matchRole = currentFilter === 'all' || u.role === currentFilter;
            const matchSearch = !query || (u.name || '').toLowerCase().includes(query) || (u.email || '').toLowerCase().includes(query) || (u.role || '').toLowerCase().includes(query);
            return matchRole && matchSearch;
        });
        renderContent();
    }

    function renderContent() {
        // Stats
        const statsEl = document.getElementById('mob-admin-user-stats');
        if (statsEl) {
            const total = allUsers.length;
            const students = allUsers.filter(u => u.role === 'student').length;
            const alumni = allUsers.filter(u => u.role === 'alumni').length;
            statsEl.innerHTML = `
                <div class="mob-admin-stat-card"><div class="mob-admin-stat-icon"><i class="fas fa-users"></i></div><div class="mob-admin-stat-title">Total</div><div class="mob-admin-stat-value">${total}</div></div>
                <div class="mob-admin-stat-card"><div class="mob-admin-stat-icon"><i class="fas fa-user-graduate"></i></div><div class="mob-admin-stat-title">Students</div><div class="mob-admin-stat-value">${students}</div></div>
            `;
        }

        // User cards
        const container = document.getElementById('mob-admin-users-list');
        if (!container) return;

        if (filtered.length === 0) {
            container.innerHTML = '<div class="mob-admin-empty"><i class="fas fa-search"></i><h4>No Users Found</h4><p>Try a different search or filter.</p></div>';
            renderPagination(0);
            return;
        }

        const totalPages = Math.ceil(filtered.length / PER_PAGE);
        const start = (mobPage - 1) * PER_PAGE;
        const paged = filtered.slice(start, start + PER_PAGE);

        container.innerHTML = paged.map(u => {
            const initials = (u.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            const roleClass = u.role === 'student' ? 'role-student' : u.role === 'alumni' ? 'role-alumni' : '';
            const roleLabel = (u.role || 'User').charAt(0).toUpperCase() + (u.role || 'user').slice(1);
            const statusClass = u.verificationStatus === 'approved' ? 'status-approved' : u.verificationStatus === 'rejected' ? 'status-rejected' : 'status-pending';
            const statusLabel = u.verificationStatus || 'pending';
            return `
                <div class="mob-admin-user-card">
                    <div class="mob-admin-user-header">
                        <div class="mob-admin-user-avatar">${initials}</div>
                        <div class="mob-admin-user-info">
                            <h3>${u.name || 'Unknown'}</h3>
                            <p class="mob-admin-user-meta">${u.email || ''}</p>
                        </div>
                    </div>
                    <div class="mob-admin-user-tags">
                        <span class="mob-admin-tag ${roleClass}"><i class="fas fa-circle"></i> ${roleLabel}</span>
                        <span class="mob-admin-tag ${statusClass}">${statusLabel}</span>
                        ${u.registrationNumber ? `<span class="mob-admin-tag"><i class="fas fa-id-badge"></i> ${u.registrationNumber}</span>` : ''}
                    </div>
                    <div class="mob-admin-actions">
                        <button class="mob-admin-btn mob-admin-btn-view" onclick="window._adminViewUser('${u._id}')"><i class="fas fa-eye"></i> View</button>
                        <button class="mob-admin-btn mob-admin-btn-primary" onclick="window._adminMessageUser('${u._id}', '${(u.name || '').replace(/'/g, '')}')"><i class="fas fa-comment"></i> Message</button>
                    </div>
                </div>
            `;
        }).join('');

        renderPagination(totalPages);
    }

    function renderPagination(totalPages) {
        const container = document.getElementById('mob-admin-users-pagination');
        if (!container) return;
        if (!totalPages || totalPages <= 1) { container.innerHTML = ''; return; }
        container.innerHTML = `
            <div class="mob-admin-pagination">
                <button class="mob-admin-pag-btn" ${mobPage <= 1 ? 'disabled' : ''} onclick="window._adminUsersPage(${mobPage - 1})"><i class="fas fa-chevron-left"></i></button>
                <span class="mob-admin-pag-info">Page ${mobPage} / ${totalPages}</span>
                <button class="mob-admin-pag-btn" ${mobPage >= totalPages ? 'disabled' : ''} onclick="window._adminUsersPage(${mobPage + 1})"><i class="fas fa-chevron-right"></i></button>
            </div>
        `;
    }

    window._adminUsersPage = function (page) { mobPage = page; renderContent(); document.getElementById('mob-admin-users-list')?.scrollIntoView({ behavior: 'smooth' }); };

    window._adminViewUser = function (id) {
        const user = allUsers.find(u => u._id === id);
        if (!user || typeof Swal === 'undefined') return;
        Swal.fire({
            title: user.name, html: `
                <div style="text-align:left; font-size:0.85rem; color:#3f4d5e; line-height:1.8;">
                    <p><i class="fas fa-envelope" style="color:#C2491F; width:20px;"></i> ${user.email || 'N/A'}</p>
                    <p><i class="fas fa-user-tag" style="color:#C2491F; width:20px;"></i> ${user.role || 'N/A'}</p>
                    <p><i class="fas fa-id-badge" style="color:#C2491F; width:20px;"></i> ${user.registrationNumber || 'N/A'}</p>
                    <p><i class="fas fa-check-circle" style="color:#C2491F; width:20px;"></i> ${user.verificationStatus || 'pending'}</p>
                </div>
            `, confirmButtonColor: '#C2491F', background: '#FFF8F0'
        });
    };

    window._adminMessageUser = async function (id, name) {
        if (typeof Swal === 'undefined') return;
        const { value: msg } = await Swal.fire({ title: `Message ${name}`, input: 'textarea', inputPlaceholder: 'Type your message…', confirmButtonText: 'Send', confirmButtonColor: '#C2491F', background: '#FFF8F0', showCancelButton: true });
        if (msg) {
            try { await apiFetch(`/api/admin/users/${id}/message`, { method: 'POST', body: JSON.stringify({ message: msg }) }); Swal.fire({ icon: 'success', title: 'Sent!', timer: 1500, showConfirmButton: false, background: '#FFF8F0' }); } catch (e) { Swal.fire({ icon: 'error', title: 'Failed', text: 'Could not send message.', background: '#FFF8F0' }); }
        }
    };

    window._adminExportUsers = function () {
        if (typeof Swal === 'undefined') return;
        Swal.fire({
            title: 'Exporting Users', text: 'Preparing Excel report…', icon: 'info', showConfirmButton: false, background: '#FFF8F0',
            didOpen: async () => {
                try {
                    const res = await fetch(API_BASE + '/api/admin/export-users', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
                    if (!res.ok) throw new Error('Export failed');
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = `users_${new Date().toISOString().split('T')[0]}.xlsx`; a.click();
                    Swal.fire({ icon: 'success', title: 'Export Complete', timer: 1500, showConfirmButton: false, background: '#FFF8F0' });
                } catch (e) { Swal.fire({ icon: 'error', title: 'Export Failed', text: e.message, background: '#FFF8F0' }); }
            }
        });
    };

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
