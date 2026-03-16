/**
 * mobile-notifications.js (Alumni)
 * Mobile-first logic for Alumni Notifications.
 * Mirrors Student UI while handling Alumni context.
 */

window.MobileNotifications = (function () {
    let allNotifications = [];
    let currentFilter = 'all';

    const typeFilters = [
        { key: 'all', label: 'All', icon: 'fas fa-th-large' },
        { key: 'application', label: 'Jobs' },
        { key: 'referral', label: 'Mentors' },
        { key: 'chat', label: 'Interviews' },
        { key: 'system', label: 'System' }
    ];

    async function init() {
        const root = document.getElementById('mobile-root');
        if (!root) return;

        // Header and Loader
        root.innerHTML = `
            ${window.AlumniMobileNav.renderHeader({ userInitial: getInitials() })}
            <div style="text-align:center; padding:100px 20px;">
                <i class="fas fa-spinner fa-spin fa-2x" style="color:#C2491F;"></i>
                <p style="margin-top:15px; color:#5f6b7a; font-size:0.9rem;">Fetching alerts...</p>
            </div>
            ${window.AlumniMobileNav.renderBottomNav("more")}
            ${window.AlumniMobileNav.renderSidenav()}
        `;

        try {
            const data = await apiFetch('/api/notifications?page=1&limit=50');
            if (data && data.notifications) {
                allNotifications = data.notifications;
            }
        } catch (err) {
            console.error('[AlumniNotif] Error:', err);
        }

        render(root);
    }

    function getInitials() {
        return (localStorage.getItem('userName') || 'A').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }

    function render(root) {
        const unreadCount = allNotifications.filter(n => !n.isRead).length;

        root.innerHTML = `
            ${window.AlumniMobileNav.renderHeader({ userInitial: getInitials() })}

            <div class="mob-notif-head">
                <div>
                    <h1>My Messages</h1>
                    <p>Alumni alerts & community updates</p>
                </div>
                ${unreadCount > 0 ? `<span class="mob-unread-pill">${unreadCount} Unread</span>` : ''}
            </div>

            <div class="mob-notif-tabs">
                ${typeFilters.map(f => `
                    <button class="mob-notif-tab ${currentFilter === f.key ? 'active' : ''}" data-filter="${f.key}">
                        ${f.label}
                    </button>
                `).join('')}
            </div>

            <div id="mob-notif-feed"></div>

            ${window.AlumniMobileNav.renderBottomNav("more")}
            ${window.AlumniMobileNav.renderSidenav()}
        `;

        setTimeout(() => {
            window.AlumniMobileNav.initSidenavEvents();
            bindEvents();
            renderFeed();
        }, 100);
    }

    function bindEvents() {
        document.querySelectorAll('.mob-notif-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                currentFilter = btn.dataset.filter;
                document.querySelectorAll('.mob-notif-tab').forEach(b => b.classList.toggle('active', b === btn));
                renderFeed();
            });
        });
    }

    function renderFeed() {
        const feed = document.getElementById('mob-notif-feed');
        if (!feed) return;

        let filtered = allNotifications;
        if (currentFilter !== 'all') {
            filtered = allNotifications.filter(n => {
                if (currentFilter === 'application') return n.type.includes('job') || n.type.includes('application');
                if (currentFilter === 'referral') return n.type.includes('mentor');
                if (currentFilter === 'chat') return n.type.includes('mock') || n.type.includes('chat');
                if (currentFilter === 'system') return n.type === 'system';
                return true;
            });
        }

        if (filtered.length === 0) {
            feed.innerHTML = `
                <div class="mob-empty-box">
                    <i class="fas fa-bell-slash"></i>
                    <h3>Clear Inbox</h3>
                    <p>No new alerts in this category.</p>
                </div>
            `;
            return;
        }

        feed.innerHTML = filtered.map(n => {
            const typeLabel = getTypeLabel(n.type);
            const typeClass = getTypeLabelClass(n.type);
            const icon = getTypeIcon(n.type);
            const iconBoxClass = getIconBoxClass(n.type);

            return `
                <div class="mob-notif-item ${n.isRead ? '' : 'unread'}" onclick="viewMessage('${n._id}')">
                    <div class="mob-notif-icon-box ${iconBoxClass}">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="mob-notif-content">
                        <div class="mob-notif-title">${n.title}</div>
                        <div class="mob-notif-preview">${n.message}</div>
                        <div class="mob-notif-footer">
                            <span class="mob-notif-time">${timeAgo(n.createdAt)}</span>
                            <div class="mob-notif-actions">
                                <button class="mob-notif-btn" onclick="event.stopPropagation(); toggleReadStatus('${n._id}', ${!n.isRead})">
                                    <i class="fas ${n.isRead ? 'fa-envelope-open' : 'fa-envelope'}"></i>
                                </button>
                                <button class="mob-notif-btn delete" onclick="event.stopPropagation(); deleteMessage('${n._id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Reuse Helpers
    function getTypeLabel(type) {
        if (type.includes('job') || type.includes('application')) return 'Job';
        if (type.includes('mentor')) return 'Mentor';
        if (type.includes('mock')) return 'Mock';
        return 'Alert';
    }

    function getTypeLabelClass(type) {
        if (type.includes('job') || type.includes('application')) return 'mob-type-job';
        if (type.includes('mentor')) return 'mob-type-mentor';
        return 'mob-type-system';
    }

    function getTypeIcon(type) {
        if (type.includes('job')) return 'fa-briefcase';
        if (type.includes('mentor')) return 'fa-handshake';
        if (type.includes('mock')) return 'fa-comment-dots';
        return 'fa-bell';
    }

    function getIconBoxClass(type) {
        if (type.includes('job')) return 'mob-type-job';
        if (type.includes('mentor')) return 'mob-type-mentor';
        return 'mob-type-system';
    }

    function timeAgo(dateStr) {
        const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
        if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
        return Math.floor(seconds / 86400) + 'd ago';
    }

    return { init };
})();

// Auto-run if mobile
if (window.innerWidth <= 768) {
    MobileNotifications.init();
}
