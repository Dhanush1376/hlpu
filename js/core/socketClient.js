/**
 * socketClient.js — hLPU Real-Time Notification Client
 * Handles Socket.io connection, live bell updates, and toast popups.
 */

(function () {
    let socket;
    const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || !window.location.hostname)
        ? API_BASE
        : window.location.origin;

    // Initialize Notification System
    async function initNotifications() {
        const token = localStorage.getItem('token');
        if (!token) return;

        // 1. Connect to Socket.io
        connectSocket(token);

        // 2. Initial Fetch of Notifications
        await fetchInitialNotifications();

        // 3. Bind UI Events
        bindUIEvents();
    }

    function connectSocket(token) {
        if (typeof io === 'undefined') {
            console.error('[socket] Socket.io library not loaded. Ensure CDN script is included.');
            return;
        }

        socket = io(API_URL, {
            auth: { token },
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        socket.on('connect', () => {
            console.log('[socket] Connected to notification server');
        });

        socket.on('notification:new', (notification) => {
            console.log('[socket] New notification received:', notification);
            addNotificationToUI(notification, true);
            showToast(notification);

            // Refresh items if on dashboard
            if (typeof renderRecentActivity === 'function') renderRecentActivity();
            if (typeof fetchDashboardStats === 'function') fetchDashboardStats();
            if (typeof fetchMenteeRequests === 'function') fetchMenteeRequests();
        });

        socket.on('job:new', (job) => {
            console.log('[socket] New job posted:', job);
            showToast({ title: 'New Job Opportunity', message: `${job.title} at ${job.company}` });

            // Refresh components if on dashboard
            if (typeof fetchRecentJobs === 'function') fetchRecentJobs();
            if (typeof fetchDashboardStats === 'function') fetchDashboardStats();
        });

        socket.on('mentor:update', (data) => {
            console.log('[socket] Mentor availability updated:', data);
            if (typeof fetchAvailableMentors === 'function') fetchAvailableMentors();
        });

        socket.on('mock:update', (data) => {
            console.log('[socket] Mock interview update:', data);
            if (typeof fetchUpcomingMocks === 'function') fetchUpcomingMocks();
            if (typeof fetchDashboardStats === 'function') fetchDashboardStats();
        });

        socket.on('connect_error', (err) => {
            console.warn('[socket] Connection error:', err.message);
        });
    }

    async function fetchInitialNotifications() {
        try {
            const data = await apiFetch('/api/notifications?limit=5');
            if (data && data.notifications) {
                renderNotificationList(data.notifications);
                updateBadge(data.unreadCount);
            }
        } catch (err) {
            console.error('[notif] Failed to fetch initial notifications:', err);
        }
    }

    function renderNotificationList(notifications) {
        const list = document.getElementById('notification-list');
        if (!list) return;

        if (notifications.length === 0) {
            list.innerHTML = '<div class="text-center py-3 text-muted small">No notifications yet.</div>';
            return;
        }

        list.innerHTML = notifications.map(n => createNotifHtml(n)).join('');
    }

    function addNotificationToUI(notification, isNew = false) {
        const list = document.getElementById('notification-list');
        if (!list) return;

        // Remove "No notifications" message if it exists
        if (list.querySelector('.text-muted')) {
            list.innerHTML = '';
        }

        const html = createNotifHtml(notification);
        list.insertAdjacentHTML('afterbegin', html);

        // Limit list to 5 items in dropdown
        if (list.children.length > 5) {
            list.lastElementChild.remove();
        }

        if (isNew) {
            incrementBadge();
        }
    }

    function createNotifHtml(n) {
        const timeAgo = formatTimeAgo(new Date(n.createdAt));
        return `
            <div class="notif-item ${n.isRead ? '' : 'unread'}" onclick="markAsRead('${n._id}', this)">
                <div class="notif-title">${n.title}</div>
                <div class="notif-message">${n.message}</div>
                <div class="notif-time">${timeAgo}</div>
            </div>
        `;
    }

    function updateBadge(count) {
        const badges = document.querySelectorAll('#notif-badge, #notif-badge-mobile, .notification-badge');
        badges.forEach(badge => {
            if (count > 0) {
                badge.textContent = count > 9 ? '9+' : count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        });
    }

    function incrementBadge() {
        const badge = document.getElementById('notif-badge') || document.getElementById('notif-badge-mobile');
        if (!badge) return;

        let countString = badge.textContent;
        let count = parseInt(countString) || 0;
        count++;
        updateBadge(count);
    }

    window.markAsRead = async function (id, element) {
        try {
            await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
            element.classList.remove('unread');

            // Decrement badge
            const badge = document.getElementById('notif-badge');
            let count = parseInt(badge.textContent) || 0;
            if (count > 0) updateBadge(count - 1);
        } catch (err) {
            console.error('[notif] Failed to mark as read:', err);
        }
    };

    function bindUIEvents() {
        const markAllBtn = document.getElementById('mark-all-read');
        if (markAllBtn) {
            markAllBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                    await apiFetch('/api/notifications/read-all', { method: 'PATCH' });
                    document.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
                    updateBadge(0);
                } catch (err) {
                    console.error('[notif] Failed to mark all read:', err);
                }
            });
        }
    }

    function showToast(n) {
        if (typeof Swal !== 'undefined') {
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
                didOpen: (toast) => {
                    toast.addEventListener('mouseenter', Swal.stopTimer)
                    toast.addEventListener('mouseleave', Swal.resumeTimer)
                }
            });

            Toast.fire({
                icon: 'info',
                title: n.title,
                text: n.message
            });
        }
    }

    function formatTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        return "Just now";
    }

    // Auto-init on DOM load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNotifications);
    } else {
        initNotifications();
    }
})();
