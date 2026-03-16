/**
 * mobile-admin-verify.js
 * Mobile verification queue for Admin.
 * Fetches /api/admin/pending-verifications.
 * Approve/reject via PATCH /api/admin/verify/:id.
 */
(function () {
    if (window.innerWidth > 768) return;

    const Nav = window.AdminMobileNav || window.MobileNav;
    if (!Nav) return;

    document.querySelectorAll('#navbar, .mesh-bg, .dashboard-container').forEach(el => el.style.display = 'none');

    let root = document.getElementById('mobile-root');
    if (!root) { root = document.createElement('div'); root.id = 'mobile-root'; document.body.prepend(root); }

    let allRequests = [];
    let filtered = [];
    let currentFilter = 'all';

    async function init() {
        renderShell();
        try {
            const res = await apiFetch('/api/admin/pending-verifications');
            allRequests = res?.pendingRequests || res?.requests || res?.data || res || [];
            if (!Array.isArray(allRequests)) allRequests = [];
            filtered = [...allRequests];
            renderCards();
            renderStats();
        } catch (err) {
            console.error('[admin-verify]', err);
            document.getElementById('mob-admin-verify-list').innerHTML = '<div class="mob-admin-empty"><i class="fas fa-wifi"></i><h4>Connection Error</h4><p>Could not load verifications.</p></div>';
        }
    }

    function renderShell() {
        root.innerHTML = `
            ${Nav.renderHeader({})}
            <div class="mob-admin-welcome">
                <h1>Verification Queue</h1>
                <p><i class="fas fa-id-card"></i> Review pending identity verifications</p>
            </div>
            <div class="mob-admin-stats" id="mob-admin-verify-stats"></div>
            <div class="mob-admin-filters" id="mob-admin-verify-filters">
                <button class="mob-admin-filter-chip active" data-filter="all">All Pending</button>
                <button class="mob-admin-filter-chip" data-filter="alumni">Alumni</button>
                <button class="mob-admin-filter-chip" data-filter="student">Students</button>
            </div>
            <div id="mob-admin-verify-list">
                <div class="mob-admin-loading"><i class="fas fa-spinner fa-spin"></i><p>Loading verifications…</p></div>
            </div>
            ${Nav.renderSidenav()}
            ${Nav.renderBottomNav('verify')}
        `;
        if (Nav.initSidenavEvents) setTimeout(() => Nav.initSidenavEvents(), 100);

        document.querySelectorAll('#mob-admin-verify-filters .mob-admin-filter-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#mob-admin-verify-filters .mob-admin-filter-chip').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.dataset.filter;
                applyFilter();
            });
        });
    }

    function applyFilter() {
        filtered = currentFilter === 'all' ? [...allRequests] : allRequests.filter(r => (r.user?.role || r.role) === currentFilter);
        renderCards();
    }

    function renderStats() {
        const statsEl = document.getElementById('mob-admin-verify-stats');
        if (!statsEl) return;
        const total = allRequests.length;
        const alumni = allRequests.filter(r => (r.user?.role || r.role) === 'alumni').length;
        statsEl.innerHTML = `
            <div class="mob-admin-stat-card">${total > 0 ? `<div class="mob-admin-stat-badge">${total}</div>` : ''}<div class="mob-admin-stat-icon"><i class="fas fa-hourglass-half"></i></div><div class="mob-admin-stat-title">Pending</div><div class="mob-admin-stat-value">${total}</div></div>
            <div class="mob-admin-stat-card"><div class="mob-admin-stat-icon"><i class="fas fa-user-graduate"></i></div><div class="mob-admin-stat-title">Alumni</div><div class="mob-admin-stat-value">${alumni}</div></div>
        `;
    }

    function renderCards() {
        const container = document.getElementById('mob-admin-verify-list');
        if (!container) return;

        if (filtered.length === 0) {
            container.innerHTML = '<div class="mob-admin-empty"><i class="fas fa-check-double"></i><h4>Queue Empty</h4><p>No pending verifications. All caught up!</p></div>';
            return;
        }

        container.innerHTML = filtered.map(req => {
            const user = req.user || req;
            const name = user.name || 'Unknown';
            const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            const role = (user.role || 'user').charAt(0).toUpperCase() + (user.role || 'user').slice(1);
            const roleClass = user.role === 'student' ? 'role-student' : 'role-alumni';
            const regNum = user.registrationNumber || req.registrationNumber || '';
            const email = user.email || '';
            const docName = req.documentName || req.document?.name || 'ID Document';
            const reqId = req._id || req.id;

            return `
                <div class="mob-admin-user-card" id="verify-card-${reqId}">
                    <div class="mob-admin-user-header">
                        <div class="mob-admin-user-avatar">${initials}</div>
                        <div class="mob-admin-user-info">
                            <h3>${name}</h3>
                            <p class="mob-admin-user-meta">${email}</p>
                        </div>
                    </div>
                    <div class="mob-admin-user-tags">
                        <span class="mob-admin-tag ${roleClass}"><i class="fas fa-circle"></i> ${role}</span>
                        <span class="mob-admin-tag status-pending"><i class="fas fa-hourglass-half"></i> Pending</span>
                        ${regNum ? `<span class="mob-admin-tag"><i class="fas fa-id-badge"></i> ${regNum}</span>` : ''}
                    </div>
                    <div class="mob-admin-doc-preview">
                        <div class="mob-admin-doc-icon"><i class="fas fa-file-alt"></i></div>
                        <div class="mob-admin-doc-info">
                            <div class="mob-admin-doc-name">${docName}</div>
                            <div class="mob-admin-doc-size">Submitted for review</div>
                        </div>
                    </div>
                    <div class="mob-admin-actions">
                        <button class="mob-admin-btn mob-admin-btn-approve" onclick="window._adminVerify('${reqId}', 'approved', '${name.replace(/'/g, '')}', this)"><i class="fas fa-check"></i> Approve</button>
                        <button class="mob-admin-btn mob-admin-btn-reject" onclick="window._adminVerify('${reqId}', 'rejected', '${name.replace(/'/g, '')}', this)"><i class="fas fa-times"></i> Reject</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    window._adminVerify = async function (reqId, status, name, btn) {
        try {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btn.disabled = true;
            await apiFetch(`/api/admin/verify/${reqId}`, { method: 'PATCH', body: JSON.stringify({ status }) });

            const card = document.getElementById(`verify-card-${reqId}`);
            if (card) {
                card.style.opacity = '0.5';
                card.style.transform = 'scale(0.95)';
                setTimeout(() => card.remove(), 300);
            }
            allRequests = allRequests.filter(r => (r._id || r.id) !== reqId);
            filtered = filtered.filter(r => (r._id || r.id) !== reqId);
            renderStats();

            if (typeof Swal !== 'undefined') {
                Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, icon: status === 'approved' ? 'success' : 'info', title: `${name} ${status}`, background: '#FFF8F0' });
            }
        } catch (err) {
            btn.innerHTML = status === 'approved' ? '<i class="fas fa-check"></i> Approve' : '<i class="fas fa-times"></i> Reject';
            btn.disabled = false;
            console.error('Verify error:', err);
        }
    };

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
