/**
 * mobile-alumni-dashboard.js
 * Mobile adaptation for Alumni Dashboard.
 * Reuses ALL existing data pipelines: /api/dashboard/alumni, /api/profile/me,
 * /api/notifications, /api/mentorship/alumni
 * Zero desktop impact. Mobile-only rendering.
 */
(function () {
    if (window.innerWidth > 768) return;

    function isMobile() { return window.innerWidth <= 768; }
    if (!isMobile()) return;

    // === HIDE DESKTOP ===
    const desktopContainer = document.querySelector('.dashboard-container');
    if (desktopContainer) desktopContainer.classList.add('desktop-only');
    const desktopNav = document.querySelector('.navbar-hlpu');
    if (desktopNav) desktopNav.classList.add('desktop-only');

    // === CREATE MOBILE ROOT ===
    let root = document.getElementById('mobile-root');
    if (!root) {
        root = document.createElement('div');
        root.id = 'mobile-root';
        document.body.appendChild(root);
    }

    // === INITIAL SKELETON ===
    root.innerHTML = `
        ${window.AlumniMobileNav ? AlumniMobileNav.renderHeader({}) : ''}
        <div id="mob-dashboard-content">
            <div class="mob-page-header">
                <h1 id="mob-welcome">Welcome back!</h1>
                <p>Track your contributions & stay connected.</p>
            </div>

            <!-- PROFILE CARD -->
            <div class="mob-profile-card" id="mob-profile-summary">
                <div class="mob-profile-avatar" id="mob-avatar">A</div>
                <div class="mob-profile-info">
                    <h2 id="mob-profile-name">Alumni</h2>
                    <p id="mob-profile-detail">Loading...</p>
                    <div class="mob-profile-tags" id="mob-profile-tags"></div>
                </div>
            </div>

            <!-- STATS -->
            <div class="mob-stats-row" id="mob-stats-grid">
                <div class="mob-stat-card"><div class="mob-stat-value" id="mob-stat-jobs">-</div><div class="mob-stat-label">Jobs</div></div>
                <div class="mob-stat-card"><div class="mob-stat-value" id="mob-stat-mentees">-</div><div class="mob-stat-label">Mentees</div></div>
                <div class="mob-stat-card"><div class="mob-stat-value" id="mob-stat-mocks">-</div><div class="mob-stat-label">Sessions</div></div>
            </div>

            <!-- ENGAGEMENT -->
            <div class="mob-section-card">
                <div class="mob-section-title"><h3><i class="fas fa-chart-line"></i> Engagement</h3></div>
                <div id="mob-engagement-content">
                    <div class="mob-progress-item">
                        <div class="mob-progress-header"><span class="mob-progress-label">Mentoring</span><span class="mob-progress-pct" id="mob-mentor-pct">78%</span></div>
                        <div class="mob-progress-bar-bg"><div class="mob-progress-fill" id="mob-mentor-fill" style="width:78%"></div></div>
                    </div>
                    <div class="mob-progress-item">
                        <div class="mob-progress-header"><span class="mob-progress-label">Network</span><span class="mob-progress-pct" id="mob-network-pct">65%</span></div>
                        <div class="mob-progress-bar-bg"><div class="mob-progress-fill" id="mob-network-fill" style="width:65%"></div></div>
                    </div>
                </div>
            </div>

            <!-- RECENT ACTIVITY -->
            <div class="mob-section-card">
                <div class="mob-section-title">
                    <h3><i class="fas fa-bolt"></i> Recent Activity</h3>
                    <a href="Notification.html">View All</a>
                </div>
                <div id="mob-activity-list"><p style="color:#8f9aaa;text-align:center;padding:15px 0;font-size:0.78rem;">Loading activity...</p></div>
            </div>

            <!-- UPCOMING MOCKS -->
            <div class="mob-section-card">
                <div class="mob-section-title">
                    <h3><i class="fas fa-calendar-alt"></i> Mock Interviews</h3>
                    <a href="Mock-Interviews.html">Schedule</a>
                </div>
                <div id="mob-mocks-list"><p style="color:#8f9aaa;text-align:center;padding:15px 0;font-size:0.78rem;">Loading sessions...</p></div>
            </div>

            <!-- MENTEE REQUESTS PREVIEW -->
            <div class="mob-section-card">
                <div class="mob-section-title">
                    <h3><i class="fas fa-user-graduate"></i> Guidance</h3>
                    <a href="Mentor-Accepts.html">View All</a>
                </div>
                <div id="mob-mentee-list"><p style="color:#8f9aaa;text-align:center;padding:15px 0;font-size:0.78rem;">Finding students...</p></div>
            </div>

            <!-- QUICK ACTIONS -->
            <div class="mob-section-card">
                <div class="mob-section-title"><h3><i class="fas fa-rocket"></i> Quick Actions</h3></div>
                <div class="mob-actions-grid">
                    <a href="Messages.html" class="mob-action-btn"><i class="fas fa-comment-dots"></i><span>Messages</span></a>
                    <a href="Messages.html?focusSearch=true" class="mob-action-btn"><i class="fas fa-search"></i><span>Search People</span></a>
                    <a href="Alumini-Profile.html" class="mob-action-btn"><i class="fas fa-user-edit"></i><span>Profile</span></a>
                    <a href="Post-job.html" class="mob-action-btn"><i class="fas fa-plus"></i><span>Post Job</span></a>
                </div>
            </div>
        </div>
        ${window.AlumniMobileNav ? AlumniMobileNav.renderSidenav() : ''}
        ${window.AlumniMobileNav ? AlumniMobileNav.renderBottomNav('dashboard') : ''}
    `;

    // Init sidenav events
    if (window.AlumniMobileNav) AlumniMobileNav.initSidenavEvents();

    // === DATA BINDING ===

    // 1. Profile
    function bindProfile(data) {
        if (!data) return;
        const initials = data.name ? data.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'A';
        const el = id => document.getElementById(id);

        el('mob-welcome').textContent = `Welcome back, ${data.name ? data.name.split(' ')[0] : 'Alumni'}!`;
        el('mob-avatar').textContent = initials;
        el('mob-profile-name').textContent = data.name || 'Alumni';

        const company = data.company || 'LPU Alumni';
        const title = data.title || 'Mentor';
        const batch = data.education && data.education.length > 0 ? ` · Batch ${data.education[0].period.split('-')[1].trim()}` : '';
        el('mob-profile-detail').textContent = `${title} @ ${company}${batch}`;

        const tagsEl = el('mob-profile-tags');
        if (tagsEl) {
            let tags = `<span class="mob-profile-tag">Alumni</span><span class="mob-profile-tag">Mentor</span>`;
            if (data.skills) {
                data.skills.slice(0, 2).forEach(s => {
                    tags += `<span class="mob-profile-tag">${s}</span>`;
                });
            }
            tagsEl.innerHTML = tags;
        }
    }

    // 2. Stats
    function bindStats(data) {
        if (!data) return;
        const el = id => document.getElementById(id);
        if (el('mob-stat-jobs')) el('mob-stat-jobs').textContent = data.totalJobsPosted || 0;
        if (el('mob-stat-mentees')) el('mob-stat-mentees').textContent = data.totalMenteesConnected || 0;
        if (el('mob-stat-mocks')) el('mob-stat-mocks').textContent = data.totalMockSessions || 0;

        // Render upcoming mocks
        renderUpcomingMocks(data.upcomingMocks || []);
    }

    // 3. Activity
    function renderActivity(notifications) {
        const container = document.getElementById('mob-activity-list');
        if (!container) return;

        if (!notifications || notifications.length === 0) {
            container.innerHTML = '<div class="mob-empty-state"><i class="fas fa-inbox"></i><p>No recent activity</p></div>';
            return;
        }

        container.innerHTML = notifications.slice(0, 5).map(n => {
            const ico = n.type.includes('job') ? 'fa-briefcase' : n.type.includes('mentor') ? 'fa-handshake' : n.type.includes('mock') ? 'fa-video' : 'fa-bell';
            return `
                <div class="mob-activity-item">
                    <div class="mob-activity-icon"><i class="fas ${ico}"></i></div>
                    <div>
                        <div class="mob-activity-title">${n.title}</div>
                        <div class="mob-activity-desc">${n.message}</div>
                        <div class="mob-activity-time"><i class="far fa-clock"></i> ${_timeAgo(n.createdAt)}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 4. Upcoming mocks
    function renderUpcomingMocks(mocks) {
        const container = document.getElementById('mob-mocks-list');
        if (!container) return;

        if (!mocks || mocks.length === 0) {
            container.innerHTML = '<div class="mob-empty-state"><i class="fas fa-calendar"></i><p>No upcoming sessions</p></div>';
            return;
        }

        container.innerHTML = mocks.map(m => {
            const d = new Date(m.scheduledDate);
            return `
                <div class="mob-event-item">
                    <div class="mob-event-date">
                        <div class="mob-event-day">${d.getDate()}</div>
                        <div class="mob-event-month">${d.toLocaleString('default', { month: 'short' }).toUpperCase()}</div>
                    </div>
                    <div class="mob-event-info">
                        <h4>${m.roleRequested} Mock</h4>
                        <p><i class="fas fa-user-graduate"></i> ${m.student ? m.student.name : 'Student'} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 5. Mentee requests (preview 3)
    function renderMenteeRequests(requests) {
        const container = document.getElementById('mob-mentee-list');
        if (!container) return;

        if (!requests || requests.length === 0) {
            container.innerHTML = '<div class="mob-empty-state"><i class="fas fa-inbox"></i><p>No pending requests</p></div>';
            return;
        }

        const pending = requests.filter(r => (r.status || '').toLowerCase() === 'pending').slice(0, 3);
        if (pending.length === 0) {
            container.innerHTML = '<div class="mob-empty-state"><i class="fas fa-check-circle"></i><p>All caught up!</p></div>';
            return;
        }

        container.innerHTML = pending.map(r => {
            const initials = r.student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            return `
                <div class="mob-request-card" id="mob-req-${r._id}">
                    <div class="mob-request-header">
                        <div class="mob-request-avatar">${initials}</div>
                        <div>
                            <div class="mob-request-name">${r.student.name}</div>
                            <div class="mob-request-dept">${r.preferredDomain || r.student.department || 'Student'}</div>
                        </div>
                    </div>
                    <div class="mob-request-meta">
                        <span class="mob-meta-pill"><i class="fas fa-headset"></i> ${r.preferredMode}</span>
                    </div>
                    <div class="mob-request-actions">
                        <button class="mob-btn-accept" onclick="window.handleMenteeRequest('${r._id}','${r.student.name}','accepted');document.getElementById('mob-req-${r._id}')?.remove();">
                            <i class="fas fa-check-circle"></i> Accept
                        </button>
                        <button class="mob-btn-dismiss" onclick="window.handleMenteeRequest('${r._id}','${r.student.name}','rejected');document.getElementById('mob-req-${r._id}')?.remove();">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // === TIME AGO HELPER ===
    function _timeAgo(dateStr) {
        const s = Math.floor((new Date() - new Date(dateStr)) / 1000);
        if (s < 60) return 'Just now';
        if (s < 3600) return Math.floor(s / 60) + 'm ago';
        if (s < 86400) return Math.floor(s / 3600) + 'h ago';
        if (s < 2592000) return Math.floor(s / 86400) + 'd ago';
        return Math.floor(s / 2592000) + 'mo ago';
    }

    // === FETCH & BIND ===
    async function initMobileDashboard() {
        if (typeof apiFetch !== 'function') {
            setTimeout(initMobileDashboard, 200);
            return;
        }

        try {
            const [profile, stats, notifData, requests] = await Promise.allSettled([
                apiFetch('/api/profile/me'),
                apiFetch('/api/dashboard/alumni'),
                apiFetch('/api/notifications?limit=5'),
                apiFetch('/api/mentorship/alumni')
            ]);

            if (profile.status === 'fulfilled') bindProfile(profile.value);
            if (stats.status === 'fulfilled') bindStats(stats.value);
            if (notifData.status === 'fulfilled' && notifData.value && notifData.value.notifications) {
                renderActivity(notifData.value.notifications);
            }
            if (requests.status === 'fulfilled') renderMenteeRequests(requests.value);
        } catch (err) {
            console.error('[mob-alumni-dash] init error:', err);
        }
    }

    // Wait for DOM + apiFetch
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(initMobileDashboard, 100));
    } else {
        setTimeout(initMobileDashboard, 100);
    }
})();
