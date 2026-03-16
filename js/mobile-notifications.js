/**
 * mobile-notifications.js
 * Mobile-first logic for Notifications page.
 * Reuses /api/notifications data pipeline.
 */

window.MobileNotifications = (function () {
    let allNotifications = [];
    let currentFilter = 'all'; // all | application | referral | system | chat

    const typeFilters = [
        { key: 'all', label: 'All', icon: 'fas fa-th-large' },
        { key: 'application', label: 'Jobs' },
        { key: 'referral', label: 'Mentors' },
        { key: 'chat', label: 'Interviews' },
        { key: 'system', label: 'System' }
    ];

    async function run() {
        const root = document.getElementById('mobile-root');
        if (!root) return;

        root.innerHTML = `
            ${MobileNav.renderHeader({ userInitial: getInitials() })}
            <div style="text-align:center;padding:80px 0;">
                <i class="fas fa-spinner fa-spin fa-2x" style="color:#C2491F;"></i>
                <p style="margin-top:12px;color:#5f6b7a;font-size:0.85rem;">Loading notifications...</p>
            </div>
            ${MobileNav.renderBottomNav("more")}
            ${MobileNav.renderSidenav()}
        `;
        setTimeout(() => MobileNav.initSidenavEvents(), 100);

        try {
            const data = await apiFetch('/api/notifications?page=1&limit=50');
            if (data && data.notifications) {
                allNotifications = data.notifications;
            }
        } catch (err) {
            console.error('[MobileNotifications] Fetch error:', err);
        }

        renderPage(root);
    }

    function getInitials() {
        try {
            return (localStorage.getItem('userName') || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        } catch (e) { return 'U'; }
    }

    function renderPage(root) {
        const unreadCount = allNotifications.filter(n => !n.isRead).length;

        root.innerHTML = `
            ${MobileNav.renderHeader({ userInitial: getInitials() })}

            <div class="mob-notif-page-header">
                <div>
                    <h1>Notifications</h1>
                    <p>Stay connected with your hLPU community</p>
                </div>
                ${unreadCount > 0 ? `<span class="mob-unread-count">${unreadCount} unread</span>` : ''}
            </div>

            ${unreadCount > 0 ? `
                <div class="mob-mark-all-read">
                    <button class="mob-mark-all-btn" id="mob-mark-all-btn">
                        <i class="fas fa-check-double"></i> Mark all read
                    </button>
                </div>
            ` : ''}

            <div class="mob-notif-filter-row" id="mob-notif-filters">
                ${typeFilters.map(f => `
                    <button class="mob-notif-chip ${f.key === currentFilter ? 'active' : ''}" data-filter="${f.key}">
                        ${f.icon ? `<i class="${f.icon}"></i>` : ''}${f.label}
                    </button>
                `).join('')}
            </div>

            <div id="mob-notif-list"></div>

            ${MobileNav.renderBottomNav("more")}
            ${MobileNav.renderSidenav()}
        `;

        setTimeout(() => MobileNav.initSidenavEvents(), 100);
        bindFilterEvents();
        bindMarkAllRead();
        renderNotifications();
    }

    function bindFilterEvents() {
        document.querySelectorAll('#mob-notif-filters .mob-notif-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#mob-notif-filters .mob-notif-chip').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.dataset.filter;
                renderNotifications();
            });
        });
    }

    function bindMarkAllRead() {
        const btn = document.getElementById('mob-mark-all-btn');
        if (btn) {
            btn.addEventListener('click', async () => {
                try {
                    // Mark each unread as read
                    const unread = allNotifications.filter(n => !n.isRead);
                    for (const n of unread) {
                        await apiFetch(`/api/notifications/${n._id}/read`, { method: 'PATCH' });
                        n.isRead = true;
                    }
                    renderPage(document.getElementById('mobile-root'));
                } catch (err) {
                    console.error('[notif] Mark all read error:', err);
                }
            });
        }
    }

    function filterByType(notifications) {
        if (currentFilter === 'all') return notifications;
        return notifications.filter(n => {
            if (currentFilter === 'application') return ['job_applied', 'application_accepted', 'application_rejected'].includes(n.type);
            if (currentFilter === 'referral') return n.type === 'mentor_request' || n.type === 'mentor_accepted';
            if (currentFilter === 'chat') return n.type === 'mock_requested' || n.type === 'mock_accepted';
            if (currentFilter === 'system') return n.type === 'system';
            return true;
        });
    }

    // ========== SMART GROUPING ==========
    function groupByDate(notifications) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

        const groups = { today: [], yesterday: [], earlier: [] };

        notifications.forEach(n => {
            const d = new Date(n.createdAt);
            const nd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            if (nd.getTime() === today.getTime()) groups.today.push(n);
            else if (nd.getTime() === yesterday.getTime()) groups.yesterday.push(n);
            else groups.earlier.push(n);
        });

        return groups;
    }

    // ========== RENDER ==========
    function renderNotifications() {
        const list = document.getElementById('mob-notif-list');
        if (!list) return;

        const filtered = filterByType(allNotifications);

        if (filtered.length === 0) {
            list.innerHTML = `
                <div class="mob-notif-empty">
                    <i class="fas fa-bell-slash"></i>
                    <h3>No notifications</h3>
                    <p>Try adjusting your filters or check back later</p>
                </div>
            `;
            return;
        }

        const groups = groupByDate(filtered);
        let html = '';

        if (groups.today.length) {
            html += `<div class="mob-notif-group-label">Today</div>`;
            html += groups.today.map(renderCard).join('');
        }
        if (groups.yesterday.length) {
            html += `<div class="mob-notif-group-label">Yesterday</div>`;
            html += groups.yesterday.map(renderCard).join('');
        }
        if (groups.earlier.length) {
            html += `<div class="mob-notif-group-label">Earlier</div>`;
            html += groups.earlier.map(renderCard).join('');
        }

        list.innerHTML = html;
    }

    function renderCard(n) {
        const iconClass = getIconBubbleClass(n.type);
        const icon = getTypeIcon(n.type);
        const typeLabel = getTypeLabel(n.type);
        const typeClass = getTypeLabelClass(n.type);
        const timeStr = timeAgo(n.createdAt);

        return `
            <div class="mob-notif-card ${n.isRead ? '' : 'unread'}" data-id="${n._id}">
                <div class="mob-notif-icon-bubble ${iconClass}">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="mob-notif-body">
                    <div class="mob-notif-type-label ${typeClass}">${typeLabel}</div>
                    <div class="mob-notif-title">${n.title}</div>
                    <div class="mob-notif-msg">${n.message}</div>
                    <div class="mob-notif-time"><i class="far fa-clock"></i> ${timeStr}</div>
                    <div class="mob-notif-actions-row">
                        <button class="mob-notif-action-btn" onclick="viewMessage('${n._id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="mob-notif-action-btn" onclick="toggleReadStatus('${n._id}', ${!n.isRead})">
                            <i class="fas ${n.isRead ? 'fa-envelope-open' : 'fa-envelope'}"></i> ${n.isRead ? 'Unread' : 'Read'}
                        </button>
                        <button class="mob-notif-action-btn delete" onclick="deleteMessage('${n._id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
                ${!n.isRead ? '<div class="mob-notif-unread-dot"></div>' : ''}
            </div>
        `;
    }

    // ========== HELPERS ==========
    function getTypeLabel(type) {
        if (type.includes('job') || type.includes('application')) return 'Application';
        if (type.includes('mentor')) return 'Mentorship';
        if (type.includes('mock')) return 'Mock Interview';
        return 'System';
    }

    function getTypeLabelClass(type) {
        if (type.includes('job') || type.includes('application')) return 'mob-type-application';
        if (type.includes('mentor')) return 'mob-type-mentorship';
        if (type.includes('mock')) return 'mob-type-interview';
        return 'mob-type-system';
    }

    function getIconBubbleClass(type) {
        if (type.includes('accepted')) return 'type-accepted';
        if (type.includes('rejected')) return 'type-rejected';
        if (type.includes('job') || type.includes('application')) return 'type-job';
        if (type.includes('mentor')) return 'type-mentor';
        if (type.includes('mock')) return 'type-interview';
        return 'type-system';
    }

    function getTypeIcon(type) {
        if (type.includes('job') || type.includes('application')) return 'fa-briefcase';
        if (type.includes('accepted')) return 'fa-check-circle';
        if (type.includes('rejected')) return 'fa-times-circle';
        if (type.includes('mentor')) return 'fa-handshake';
        if (type.includes('mock')) return 'fa-comment-dots';
        return 'fa-bell';
    }

    function timeAgo(dateStr) {
        const now = new Date();
        const d = new Date(dateStr);
        const diff = Math.floor((now - d) / 1000);

        if (diff < 60) return 'Just now';
        if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
        if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
        if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    }

    return { run };
})();

// Auto-init on mobile when script loads
if (window.innerWidth <= 768 && document.getElementById('mobile-root')) {
    MobileNotifications.run();
}
