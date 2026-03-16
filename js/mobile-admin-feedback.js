/**
 * mobile-admin-feedback.js
 * Mobile Feedback & Messages for Admin.
 * Full parity: stats, search, filters (role/status/priority), message list, detail view, reply, status update.
 */
(function () {
    if (window.innerWidth > 768) return;
    const Nav = window.AdminMobileNav || window.MobileNav;
    if (!Nav) return;

    document.querySelectorAll('#navbar, .mesh-bg, .dashboard-container, #messageModal').forEach(el => el.style.display = 'none');
    let root = document.getElementById('mobile-root');
    if (!root) { root = document.createElement('div'); root.id = 'mobile-root'; document.body.prepend(root); }

    let allMessages = [], mobPage = 1;
    const PER_PAGE = 10;
    let filters = { status: '', role: '', priority: '', search: '' };

    async function init() {
        renderShell();
        await Promise.all([fetchStats(), fetchMessages()]);
    }

    function renderShell() {
        root.innerHTML = `
            ${Nav.renderHeader({})}
            <div class="mob-admin-welcome"><h1>Feedback & Messages</h1><p><i class="fas fa-comment-dots"></i> Manage user inquiries and support requests</p></div>
            <div class="mob-admin-stats" id="mob-fb-stats"></div>
            <div class="mob-admin-search"><i class="fas fa-search"></i><input type="text" id="mob-fb-search" placeholder="Search by name, email, subject…" /></div>
            <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
                <select class="mob-filter-select" id="mob-fb-role" onchange="window._fbFilter()"><option value="">All Roles</option><option value="student">Student</option><option value="alumni">Alumni</option><option value="recruiter">Recruiter</option><option value="guest">Guest</option></select>
                <select class="mob-filter-select" id="mob-fb-status" onchange="window._fbFilter()"><option value="">All Status</option><option value="new">New</option><option value="read">Read</option><option value="replied">Replied</option><option value="archived">Archived</option></select>
                <select class="mob-filter-select" id="mob-fb-priority" onchange="window._fbFilter()"><option value="">All Priority</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select>
            </div>
            <div id="mob-fb-list"><div class="mob-admin-loading"><i class="fas fa-spinner fa-spin"></i><p>Loading messages…</p></div></div>
            <div id="mob-fb-pagination"></div>
            <div id="mob-fb-modal" class="mob-fullscreen-modal" style="display:none;"></div>
            ${Nav.renderSidenav()}${Nav.renderBottomNav('')}
        `;
        if (Nav.initSidenavEvents) setTimeout(() => Nav.initSidenavEvents(), 100);
        const searchInput = document.getElementById('mob-fb-search');
        if (searchInput) { let t; searchInput.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { filters.search = searchInput.value; mobPage = 1; fetchMessages(); }, 400); }); }
    }

    async function fetchStats() {
        try {
            const res = await apiFetch('/api/contact/admin/stats');
            if (res.success) {
                const s = res.stats;
                document.getElementById('mob-fb-stats').innerHTML = `
                    <div class="mob-admin-stat-card"><div class="mob-admin-stat-icon"><i class="fas fa-inbox"></i></div><div class="mob-admin-stat-title">Total</div><div class="mob-admin-stat-value">${s.total}</div></div>
                    <div class="mob-admin-stat-card"><div class="mob-admin-stat-icon"><i class="fas fa-envelope"></i></div><div class="mob-admin-stat-title">Unread</div><div class="mob-admin-stat-value">${s.new}</div></div>
                    <div class="mob-admin-stat-card"><div class="mob-admin-stat-icon"><i class="fas fa-reply"></i></div><div class="mob-admin-stat-title">Replied</div><div class="mob-admin-stat-value">${s.replied}</div></div>
                    <div class="mob-admin-stat-card"><div class="mob-admin-stat-icon"><i class="fas fa-exclamation-triangle"></i></div><div class="mob-admin-stat-title">High Priority</div><div class="mob-admin-stat-value">${s.highPriority}</div></div>
                `;
            }
        } catch (e) { console.error('[feedback stats]', e); }
    }

    window._fbFilter = function () {
        filters.role = document.getElementById('mob-fb-role')?.value || '';
        filters.status = document.getElementById('mob-fb-status')?.value || '';
        filters.priority = document.getElementById('mob-fb-priority')?.value || '';
        mobPage = 1;
        fetchMessages();
    };

    async function fetchMessages() {
        const container = document.getElementById('mob-fb-list');
        try {
            const res = await apiFetch(`/api/contact/admin/list?page=${mobPage}&status=${filters.status}&role=${filters.role}&priority=${filters.priority}&search=${filters.search}`);
            if (res.success) {
                allMessages = res.messages || [];
                renderMessages(allMessages, res.pagination);
            }
        } catch (e) {
            container.innerHTML = '<div class="mob-admin-empty"><i class="fas fa-wifi"></i><h4>Connection Error</h4><p>Could not load messages.</p></div>';
        }
    }

    function renderMessages(messages, paging) {
        const container = document.getElementById('mob-fb-list');
        if (!messages.length) { container.innerHTML = '<div class="mob-admin-empty"><i class="fas fa-comment-slash"></i><h4>No Messages</h4><p>Try adjusting filters.</p></div>'; return; }

        container.innerHTML = messages.map(msg => {
            const date = new Date(msg.createdAt);
            const priorityColor = msg.priority === 'high' ? '#e74c3c' : msg.priority === 'medium' ? '#f39c12' : '#3498db';
            const statusClass = msg.status === 'new' ? 'status-pending' : msg.status === 'replied' ? 'status-approved' : 'role-student';
            return `
                <div class="mob-admin-user-card" onclick="window._fbView('${msg._id}')">
                    <div class="mob-admin-user-header">
                        <div class="mob-admin-user-avatar">${(msg.name || 'U').charAt(0).toUpperCase()}</div>
                        <div class="mob-admin-user-info">
                            <h3>${msg.name || 'Unknown'}</h3>
                            <p class="mob-admin-user-meta">${msg.email || ''}</p>
                        </div>
                    </div>
                    <p style="font-weight:600;font-size:0.88rem;margin:8px 0 4px;">${msg.subject || 'No Subject'}</p>
                    <p style="font-size:0.78rem;color:#5f6b7a;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${msg.message || ''}</p>
                    <div class="mob-admin-user-tags" style="margin-top:8px;">
                        <span class="mob-admin-tag ${statusClass}">${msg.status}</span>
                        <span class="mob-admin-tag">${msg.role || 'guest'}</span>
                        <span class="mob-admin-tag" style="background:${priorityColor}15;color:${priorityColor};"><i class="fas fa-circle" style="font-size:0.4rem;vertical-align:middle;"></i> ${msg.priority}</span>
                        <span class="mob-admin-tag">${date.toLocaleDateString()}</span>
                    </div>
                </div>
            `;
        }).join('');

        const pagContainer = document.getElementById('mob-fb-pagination');
        if (paging && paging.pages > 1) {
            pagContainer.innerHTML = `<div class="mob-admin-pagination"><button class="mob-admin-pag-btn" ${mobPage <= 1 ? 'disabled' : ''} onclick="window._fbPage(${mobPage - 1})"><i class="fas fa-chevron-left"></i></button><span class="mob-admin-pag-info">Page ${paging.page} / ${paging.pages}</span><button class="mob-admin-pag-btn" ${mobPage >= paging.pages ? 'disabled' : ''} onclick="window._fbPage(${mobPage + 1})"><i class="fas fa-chevron-right"></i></button></div>`;
        } else if (pagContainer) pagContainer.innerHTML = '';
    }

    window._fbPage = function (p) { mobPage = p; fetchMessages(); };

    /* ======= VIEW MESSAGE DETAIL (full-screen modal) ======= */
    window._fbView = async function (id) {
        const modal = document.getElementById('mob-fb-modal');
        if (!modal) return;
        modal.innerHTML = `<div class="mob-modal-header"><button class="mob-modal-back" onclick="window._fbCloseModal()"><i class="fas fa-arrow-left"></i></button><h2>Message Details</h2><div></div></div><div class="mob-modal-body"><div class="mob-admin-loading"><i class="fas fa-spinner fa-spin"></i></div></div>`;
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';

        try {
            const res = await apiFetch(`/api/contact/admin/${id}`);
            if (res.success) {
                const msg = res.message;
                modal.innerHTML = `
                    <div class="mob-modal-header">
                        <button class="mob-modal-back" onclick="window._fbCloseModal()"><i class="fas fa-arrow-left"></i></button>
                        <h2>Message Details</h2>
                        <div></div>
                    </div>
                    <div class="mob-modal-body">
                        <div class="mob-admin-info-list">
                            <div class="mob-admin-info-row"><span class="mob-admin-info-label">Sender</span><span class="mob-admin-info-value">${msg.name}</span></div>
                            <div class="mob-admin-info-row"><span class="mob-admin-info-label">Email</span><span class="mob-admin-info-value">${msg.email}</span></div>
                            <div class="mob-admin-info-row"><span class="mob-admin-info-label">Role</span><span class="mob-admin-info-value"><span class="mob-admin-tag">${msg.role}</span></span></div>
                            <div class="mob-admin-info-row"><span class="mob-admin-info-label">Date</span><span class="mob-admin-info-value">${new Date(msg.createdAt).toLocaleString()}</span></div>
                        </div>
                        <div style="margin:16px 0;">
                            <label style="font-size:0.7rem;font-weight:700;color:#5f6b7a;text-transform:uppercase;">Subject</label>
                            <h3 style="font-size:1.1rem;font-weight:700;margin:4px 0;">${msg.subject}</h3>
                        </div>
                        <div style="background:rgba(194,73,31,0.03);border-left:4px solid var(--ember,#C2491F);border-radius:12px;padding:16px;font-size:0.88rem;color:#444;line-height:1.7;">${msg.message}</div>
                        <div class="mob-form-group" style="margin-top:16px;">
                            <label>UPDATE STATUS</label>
                            <select id="mob-fb-status-update" style="width:100%;padding:12px 14px;border:1px solid rgba(10,26,47,0.1);border-radius:14px;font-size:0.88rem;background:rgba(255,255,255,0.7);">
                                <option value="new" ${msg.status === 'new' ? 'selected' : ''}>New</option>
                                <option value="read" ${msg.status === 'read' ? 'selected' : ''}>Read</option>
                                <option value="replied" ${msg.status === 'replied' ? 'selected' : ''}>Replied</option>
                                <option value="archived" ${msg.status === 'archived' ? 'selected' : ''}>Archived</option>
                            </select>
                            <button class="mob-admin-btn mob-admin-btn-view" style="margin-top:8px;" onclick="window._fbUpdateStatus('${id}')"><i class="fas fa-check"></i> Update Status</button>
                        </div>
                        ${msg.adminReply ? `
                            <div style="margin-top:16px;background:#f0fdf4;border-top:3px solid #0F7B3A;border-radius:12px;padding:16px;">
                                <label style="font-size:0.7rem;font-weight:700;color:#0F7B3A;text-transform:uppercase;"><i class="fas fa-check-double"></i> Admin Reply</label>
                                <p style="font-size:0.88rem;margin:8px 0 4px;">${msg.adminReply}</p>
                                <span style="font-size:0.75rem;color:#8b99a8;">Replied by ${msg.repliedBy?.name || 'Admin'} on ${new Date(msg.repliedAt).toLocaleString()}</span>
                            </div>
                        ` : `
                            <div class="mob-form-group" style="margin-top:16px;">
                                <label>REPLY</label>
                                <textarea id="mob-fb-reply" rows="4" placeholder="Write your reply…" style="width:100%;padding:12px 14px;border:1px solid rgba(10,26,47,0.1);border-radius:14px;font-size:0.88rem;background:rgba(255,255,255,0.7);resize:vertical;font-family:'Inter',sans-serif;"></textarea>
                                <button class="mob-admin-btn mob-admin-btn-primary" style="margin-top:8px;width:100%;padding:14px;" onclick="window._fbSendReply('${id}')"><i class="fas fa-paper-plane"></i> Send Reply</button>
                            </div>
                        `}
                    </div>
                `;
            }
        } catch (e) {
            modal.querySelector('.mob-modal-body').innerHTML = '<div class="mob-admin-empty"><i class="fas fa-wifi"></i><h4>Failed to load</h4></div>';
        }
    };

    window._fbCloseModal = function () { document.getElementById('mob-fb-modal').style.display = 'none'; document.body.style.overflow = ''; };

    window._fbUpdateStatus = async function (id) {
        const status = document.getElementById('mob-fb-status-update')?.value;
        try {
            await apiFetch(`/api/contact/admin/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
            if (typeof Swal !== 'undefined') Swal.fire({ icon: 'success', title: 'Status Updated', timer: 1500, showConfirmButton: false, background: '#FFF8F0' });
            window._fbCloseModal();
            fetchStats();
            fetchMessages();
        } catch (e) { if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Failed', background: '#FFF8F0' }); }
    };

    window._fbSendReply = async function (id) {
        const reply = document.getElementById('mob-fb-reply')?.value?.trim();
        if (!reply) { alert('Please enter a reply'); return; }
        try {
            await apiFetch(`/api/contact/admin/${id}/reply`, { method: 'POST', body: JSON.stringify({ reply }) });
            if (typeof Swal !== 'undefined') Swal.fire({ icon: 'success', title: 'Reply Sent!', timer: 1500, showConfirmButton: false, background: '#FFF8F0' });
            window._fbCloseModal();
            fetchStats();
            fetchMessages();
        } catch (e) { if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Failed to send', background: '#FFF8F0' }); }
    };

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
