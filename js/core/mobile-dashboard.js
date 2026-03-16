/* Mobile Dashboard Logic - js/core/mobile-dashboard.js */

const MobileDashboard = {
    init: async function () {
        if (window.innerWidth > 768) return;

        const root = document.getElementById('mobile-dashboard-root');
        if (!root) return;

        // Show loading state
        root.innerHTML = `<div style="display:flex; justify-content:center; align-items:center; height: 50vh;">
            <div class="spinner-border text-primary" role="status" style="color: var(--ember) !important;">
                <span class="sr-only">Loading...</span>
            </div>
        </div>`;

        const data = await this.fetchDynamicData();
        if (!data) {
            root.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--ember);">Failed to load dashboard data. Please check your connection.</div>`;
            return;
        }

        this.render(root, data);
        this.bindEvents();
    },

    fetchDynamicData: async function () {
        try {
            // Helper function to safely fetch data
            const safeFetch = async (url, fallback = {}) => {
                try {
                    const res = await (typeof apiFetch === 'function' ? apiFetch(url) : null);
                    return res || fallback;
                } catch (e) {
                    console.error(`Failed to fetch ${url}`, e);
                    return fallback;
                }
            };

            const [profile, dashboardStats, profileStrength, notificationsData, careerInsights] = await Promise.all([
                safeFetch('/api/profile/me', { name: localStorage.getItem('userName') || "Student", stream: "", department: "", skills: [] }),
                safeFetch('/api/dashboard/student', { totalApplications: 0, totalMentorsConnected: 0, totalMockInterviews: 0, totalSavedJobs: 0 }),
                safeFetch('/api/profile/strength', { percentage: 0, missingFields: [] }),
                safeFetch('/api/notifications?limit=5', { notifications: [] }),
                safeFetch('/api/ai/career-insights', { bestSuitedRoles: [] })
            ]);

            const userName = profile.name || localStorage.getItem('userName') || "Student";
            const initials = userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            const firstName = userName.split(' ')[0];
            const dept = profile.department || 'Student';
            const stream = profile.stream || '';
            const degree = `${dept} ${stream ? '· ' + stream : ''}`;

            let skills = [{ icon: "fas fa-user-graduate", text: "Student" }];
            if (profile.skills && profile.skills.length > 0) {
                profile.skills.slice(0, 2).forEach(s => skills.push({ icon: "fas fa-star", text: s }));
            }

            let careerInsight = {
                title: "Best Career Path",
                tag: "AI INSIGHT",
                desc: "Update your skills to unlock career predictions.",
                actionText: "Update Profile"
            };

            if (careerInsights && careerInsights.bestSuitedRoles && careerInsights.bestSuitedRoles.length > 0) {
                const topRole = careerInsights.bestSuitedRoles[0];
                careerInsight.desc = `${topRole.role} is your highest match (${topRole.score}%). Explore related opportunities.`;
                careerInsight.actionText = "View Insights";
            }

            const unreadCount = notificationsData.notifications.filter(n => !n.read).length;

            return {
                user: {
                    initials: initials,
                    firstName: firstName,
                    fullName: userName,
                    notifications: unreadCount,
                    opportunities: dashboardStats.totalJobsAvailable || 0,
                    degree: degree,
                    skills: skills
                },
                quickLinks: [
                    { icon: "fas fa-briefcase", label: "Jobs", href: "Direct-Job.html" },
                    { icon: "fas fa-user-friends", label: "Mentors", href: "Mentor-Requests.html" },
                    { icon: "fas fa-map", label: "Course Map", href: "Course-Map.html" },
                    { icon: "fas fa-video", label: "Mock Interviews", href: "Mock-Application.html" }
                ],
                features: [
                    {
                        title: "Mentors<br/>Connected",
                        subtitle: "Accepted connections",
                        value: dashboardStats.totalMentorsConnected || 0,
                        valueSuffix: "Accepted connections",
                        iconClass: "far fa-handshake",
                        badge: null
                    },
                    {
                        title: "Mock<br/>Interviews",
                        subtitle: "Total submitted",
                        value: dashboardStats.totalMockInterviews || 0,
                        valueSuffix: "Total submitted",
                        iconClass: "fas fa-video",
                        badge: dashboardStats.upcomingMocks ? dashboardStats.upcomingMocks.length : null
                    },
                    {
                        title: "Profile Tasks",
                        subtitle: "Completed items",
                        value: profileStrength.percentage ? `${Math.round((profileStrength.percentage / 100) * 10)}/10` : "0/10",
                        valueSuffix: "Completed items",
                        iconClass: "fas fa-list-ul",
                        badge: null
                    },
                    {
                        title: "Saved Jobs",
                        subtitle: "Tracked opportunities",
                        value: dashboardStats.totalSavedJobs || 0,
                        valueSuffix: "Tracked opportunities",
                        iconClass: "fas fa-bookmark",
                        badge: null
                    }
                ],
                activities: notificationsData.notifications.map(n => ({
                    iconImg: n.iconUrl || "../assets/assets/images/hlpu-logo-small.png",
                    fallbackIcon: n.type.includes('job') ? 'fas fa-briefcase' : (n.type.includes('mentor') ? 'fas fa-handshake' : 'fas fa-bell'),
                    title: n.title,
                    desc: n.message,
                    badge: "Recent",
                    timeLabel: this.formatTimeAgo(new Date(n.createdAt))
                })),
                careerInsight: careerInsight,
                tabs: [
                    { id: "dashboard", label: "Dashboard", icon: "fas fa-th-large", active: true, href: "Dashboard.html" },
                    { id: "jobs", label: "Jobs", icon: "fas fa-user", active: false, href: "Direct-Job.html" },
                    { id: "mentors", label: "Mentors", icon: "fas fa-inbox", active: false, href: "Mentor-Requests.html" },
                    { id: "more", label: "More", icon: "fas fa-ellipsis-h", active: false, href: "#" }
                ]
            };
        } catch (e) {
            console.error("Error building dynamic data for mobile:", e);
            return null;
        }
    },

    formatTimeAgo: function (date) {
        if (!date || isNaN(date.getTime())) return "Recently";
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "mo ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m ago";
        return "Just now";
    },

    render: function (root, data) {

        const headerHTML = typeof MobileNav !== 'undefined'
            ? MobileNav.renderHeader({ userInitial: data.user.initials.charAt(0), notificationCount: data.user.notifications })
            : `
            <div class="mob-header">
                <div class="mob-logo">
                    <img src="../assets/assets/images/hlpu-logo.png" alt="hLPU Logo" onerror="this.src=''; this.alt='hlpu';">
                </div>
                <div class="mob-header-actions">
                    <a href="Student-Profile.html" style="text-decoration: none;">
                        <div class="mob-avatar">${data.user.initials.charAt(0)}</div>
                    </a>
                    <a href="Notification.html" style="text-decoration: none;">
                        <div class="mob-notification">
                            <i class="fas fa-bell"></i>
                            ${data.user.notifications > 0 ? `<div class="mob-badge">${data.user.notifications}</div>` : ''}
                        </div>
                    </a>
                </div>
            </div>
        `;

        const welcomeHTML = `
            <div class="mob-welcome">
                <h1>Welcome back, ${data.user.firstName}</h1>
                <p>Your heritage network is active • ${data.user.opportunities} new opportunities available</p>
            </div>
        `;

        const skillsHTML = data.user.skills.map(skill => `
            <div class="mob-tag">
                <i class="${skill.icon}"></i> ${skill.text}
            </div>
        `).join('');

        const profileHTML = `
            <div class="mob-profile-card">
                <div class="mob-profile-avatar">${data.user.initials}</div>
                <div class="mob-profile-info">
                    <h2>${data.user.fullName}</h2>
                    <p><i class="fas fa-rocket"></i> ${data.user.degree}</p>
                    <div class="mob-tags">
                        ${skillsHTML}
                    </div>
                </div>
            </div>
        `;

        const quickLinksHTML = `
            <div class="mob-quick-links-row">
                ${data.quickLinks.map(link => `
                    <a href="${link.href}" class="mob-quick-link-btn">
                        <div class="mob-quick-link-icon"><i class="${link.icon}"></i></div>
                        <div class="mob-quick-link-label">${link.label}</div>
                    </a>
                `).join('')}
            </div>
        `;

        const featuresHTML = `
            <div class="mob-feature-grid">
                ${data.features.map(f => `
                    <div class="mob-feature-card">
                        ${f.badge ? `<div class="mob-feature-badge">${f.badge}</div>` : ''}
                        <div class="mob-feature-icon">
                            <i class="${f.iconClass}"></i>
                        </div>
                        <div class="mob-feature-title">${f.title}</div>
                        <div class="mob-feature-subtitle">${f.subtitle}</div>
                        <div class="mob-feature-value">
                            ${f.value} <span>${f.valueSuffix}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        const activitiesHTML = data.activities.length > 0 ? data.activities.map(act => `
            <div class="mob-activity-card">
                <div class="mob-activity-icon">
                    <img src="${act.iconImg}" alt="Icon" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <i class="${act.fallbackIcon}" style="display:none; color: #4285F4; font-size: 1.2rem;"></i>
                </div>
                <div class="mob-activity-info">
                    <div class="mob-activity-info-header">
                        <h3>${act.title}</h3>
                        <div class="mob-activity-badge">
                            <i class="fas fa-clock" style="font-size:0.6rem; color:#5f6b7a;"></i> ${act.badge}
                        </div>
                    </div>
                    <div class="mob-activity-desc">
                        <span>${act.desc}</span>
                        <span class="mob-activity-time">${act.timeLabel}</span>
                    </div>
                </div>
            </div>
        `).join('') : '<p style="text-align:center; padding: 20px 0; color: #8f9aaa; font-size: 0.85rem;">No recent activities.</p>';

        const activitySectionHTML = `
            <div class="mob-section-header">
                <div class="mob-section-title"><i class="fas fa-history" style="font-size: 0.85rem; color: #c2491f;"></i> Recent Activity</div>
                <a href="Messages.html" class="mob-section-link">View All <i class="fas fa-arrow-right" style="font-size: 0.8rem;"></i></a>
            </div>
            ${activitiesHTML}
        `;

        const careerHTML = `
            <div class="mob-career-alert">
                <div class="mob-career-header">
                    <h3>${data.careerInsight.title}</h3>
                    <div class="mob-career-tag">${data.careerInsight.tag}</div>
                </div>
                <div class="mob-career-desc">${data.careerInsight.desc}</div>
                <button class="mob-btn" onclick="window.location.href='Student-Profile.html'">
                    ${data.careerInsight.actionText} <i class="fas fa-arrow-right" style="font-size: 0.85rem;"></i>
                </button>
            </div>
        `;

        const navHTML = `
            <div class="mob-bottom-nav-container">
                ${data.tabs.map(tab => `
                    <a href="${tab.href}" class="mob-nav-item ${tab.active ? 'active' : ''}" ${tab.id === 'more' ? 'onclick="MobileDashboard.toggleSideNav(); return false;"' : ''}>
                        <div class="mob-nav-icon"><i class="${tab.icon}"></i></div>
                        <div class="mob-nav-label">${tab.label}</div>
                    </a>
                `).join('')}
            </div>
        `;

        const sideNavHTML = `
            <div class="mob-side-nav-overlay" id="mob-side-nav-overlay" onclick="MobileDashboard.toggleSideNav()"></div>
            <div class="mob-side-nav" id="mob-side-nav">
                <div class="mob-side-nav-header">
                    <h2>Menu</h2>
                    <button class="mob-side-nav-close" onclick="MobileDashboard.toggleSideNav()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="mob-side-nav-content">
                    <a href="Dashboard.html" class="mob-side-nav-item"><i class="fas fa-th-large"></i> Dashboard</a>
                    <a href="Direct-Job.html" class="mob-side-nav-item"><i class="fas fa-briefcase"></i> Jobs</a>
                    <a href="Mentor-Requests.html" class="mob-side-nav-item"><i class="fas fa-user-friends"></i> Mentors</a>
                    <a href="Mock-Application.html" class="mob-side-nav-item"><i class="fas fa-video"></i> Mock Interviews</a>
                    <a href="Course-Map.html" class="mob-side-nav-item"><i class="fas fa-map-marked-alt"></i> Course Map</a>
                    <a href="#" class="mob-side-nav-item"><i class="fas fa-rocket"></i> Launch Pad</a>
                    <a href="Messages.html" class="mob-side-nav-item"><i class="fas fa-comment-dots"></i> Messages</a>
                    <a href="#" class="mob-side-nav-item"><i class="fas fa-cog"></i> Settings</a>
                    <a href="#" class="mob-side-nav-item"><i class="fas fa-question-circle"></i> Help & Support</a>
                    <a href="../Main/Landing-Page.html" class="mob-side-nav-item logout" style="margin-top: 20px;"><i class="fas fa-sign-out-alt"></i> Logout</a>
                </div>
            </div>
        `;

        root.innerHTML = `
            ${headerHTML}
            ${welcomeHTML}
            ${profileHTML}
            ${quickLinksHTML}
            ${featuresHTML}
            ${activitySectionHTML}
            ${careerHTML}
            ${navHTML}
            ${sideNavHTML}
        `;
    },

    toggleSideNav: function () {
        const nav = document.getElementById('mob-side-nav');
        const overlay = document.getElementById('mob-side-nav-overlay');
        if (nav && overlay) {
            nav.classList.toggle('open');
            overlay.classList.toggle('open');
        }
    },

    bindEvents: function () {
        // Ready for future interactions
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Wait slightly to ensure api.js is loaded
    setTimeout(() => {
        MobileDashboard.init();
    }, 100);
});

window.addEventListener('resize', () => {
    const root = document.getElementById('mobile-dashboard-root');
    if (window.innerWidth <= 768 && root && !root.innerHTML.trim()) {
        MobileDashboard.init();
    }
});
