/**
 * For-Alumini/js/mobile-dashboard.js
 * Alumni-specific mobile dashboard implementation.
 * Mirrors Student mobile UI structure while using alumni data pipelines.
 */

(function initAlumniMobileDashboard() {
    // DYNAMIC ALUMNI DATA SKELETON
    let alumniDashboardData = {
        userInitial: "A",
        userName: "Loading...",
        notificationCount: 0,
        opportunityCount: 0,
        role: "Alumni & Mentor",
        batch: "Batch of ...",
        company: "...",
        quickActions: [
            { iconHTML: '<i class="fas fa-handshake"></i>', label: "Mentorship", href: "Mentor-Accepts.html" },
            { iconHTML: '<i class="fas fa-briefcase"></i>', label: "Post Jobs", href: "Post-job.html" },
            { iconHTML: '<i class="fas fa-users"></i>', label: "Networking", href: "Alumini-Circle.html" },
            { iconHTML: '<i class="fas fa-rocket"></i>', label: "LaunchPad", href: "Launch-Pad.html" }
        ],
        features: [
            {
                iconHTML: '<i class="fas fa-user-graduate"></i>',
                title: "Students<br>Mentored",
                subtitle: "Active connections",
                value: "...",
                valueSub: "Active mentees",
                badge: null
            },
            {
                iconHTML: '<i class="fas fa-clock"></i>',
                title: "Incoming<br>Requests",
                subtitle: "Pending mentorship",
                value: "...",
                valueSub: "Pending",
                badge: null
            },
            {
                iconHTML: '<i class="fas fa-video"></i>',
                title: "Sessions<br>Completed",
                subtitle: "Mock Interviews",
                value: "...",
                valueSub: "Completed",
                badge: null
            },
            {
                iconHTML: '<i class="fas fa-plus-circle"></i>',
                title: "Jobs<br>Posted",
                subtitle: "Total opportunities",
                value: "...",
                valueSub: "Posted",
                badge: null
            }
        ],
        recentActivities: [],
        insights: {
            tag: "NETWORK",
            text: "Analyzing your contributions...",
            buttonAction: "View Analytics"
        },
        currentTab: "dashboard"
    };

    function run() {
        if (typeof loadAlumniDashboard === 'function') {
            loadAlumniDashboard(alumniDashboardData);
        }
    }

    // EXPOSE GLOBAL LOADER AS REQUESTED
    window.loadAlumniDashboard = function (data) {
        console.log("hLPU Alumni Mobile: loadAlumniDashboard triggered.");
        const root = document.getElementById('mobile-root');
        if (!root) {
            setTimeout(() => window.loadAlumniDashboard(data), 100);
            return;
        }

        // Use AlumniMobileNav if available, otherwise fallback to MobileNav
        const nav = window.AlumniMobileNav || window.MobileNav;
        if (!nav) return;

        root.innerHTML = '';
        root.innerHTML = `
            ${nav.renderHeader(data)}
            ${renderAlumniWelcome(data)}
            ${renderAlumniProfileCard(data)}
            ${renderAlumniQuickActions(data)}
            ${renderAlumniRecentActivity(data)}
            ${renderAlumniFeatureGrid(data)}
            ${renderAlumniInsights(data)}
            ${nav.renderBottomNav(data.currentTab)}
            ${nav.renderSidenav()}
        `;

        // Initialize Sidenav
        setTimeout(() => {
            if (nav.initSidenavEvents) nav.initSidenavEvents();
        }, 50);
    };

    // EXPOSE GLOBAL UPDATER
    window.updateAlumniMobileData = function (newData) {
        if (!newData) return;
        alumniDashboardData = { ...alumniDashboardData, ...newData };

        // Deep merge specific sections if needed
        if (newData.features) {
            newData.features.forEach((feat, i) => {
                if (alumniDashboardData.features[i]) {
                    alumniDashboardData.features[i] = { ...alumniDashboardData.features[i], ...feat };
                }
            });
        }

        window.loadAlumniDashboard(alumniDashboardData);
    };

    // COMPONENT RENDERERS
    function renderAlumniWelcome(data) {
        const firstName = data.userName.split(' ')[0];
        return `
            <div class="mob-welcome-section">
                <h1 class="mob-welcome-title">Welcome back, ${firstName}</h1>
                <p class="mob-welcome-subtitle">
                    Your heritage network is active &middot; ${data.opportunityCount} new opportunities today
                </p>
            </div>
        `;
    }

    function renderAlumniProfileCard(data) {
        const skillTagsHTML = [
            { icon: "fas fa-user-graduate", text: "Verified Alumni" },
            { icon: "fas fa-chalkboard-teacher", text: "Expert Mentor" }
        ].map(tag => `<div class="mob-pill-tag"><i class="${tag.icon}"></i> ${tag.text}</div>`).join('');

        return `
            <div class="mob-profile-card">
                <div class="mob-profile-row">
                    <div class="mob-profile-avatar-lg">${data.userInitial}</div>
                    <div class="mob-profile-details">
                        <h2>${data.userName}</h2>
                        <p><i class="fas fa-rocket"></i> ${data.role} &middot; <br> ${data.company} | ${data.batch}</p>
                    </div>
                </div>
                <div class="mob-profile-tags">
                    ${skillTagsHTML}
                </div>
            </div>
        `;
    }

    function renderAlumniQuickActions(data) {
        const actionsHTML = data.quickActions.map(action => `
            <a href="${action.href}" class="mob-action-btn">
                <div class="mob-action-icon">${action.iconHTML}</div>
                <div class="mob-action-label">${action.label}</div>
            </a>
        `).join('');

        return `<div class="mob-actions-row">${actionsHTML}</div>`;
    }

    function renderAlumniRecentActivity(data) {
        const listsHTML = (data.recentActivities || []).slice(0, 1).map(act => {
            const todayBadge = act.isToday
                ? `<div class="mob-act-badge"><i class="fas fa-calendar-day"></i> Today</div>`
                : '';

            return `
            <div class="mob-activity-card">
                <div class="mob-act-icon">${act.iconHTML}</div>
                <div class="mob-act-content">
                    <div class="mob-act-header">
                        <h4>${act.title}</h4>
                        ${todayBadge}
                    </div>
                    <div class="mob-act-footer">
                        <p>${act.description}</p>
                        <span>${act.timeLabel}</span>
                    </div>
                </div>
            </div>
        `;
        }).join('');

        const emptyContent = `<div style="text-align:center; padding:20px; color:#8f9aaa; font-size:0.8rem;">No recent activity</div>`;

        return `
            <div class="mob-recent-activity-container" style="width: 100%; display: block; margin-bottom: 25px;">
                <div class="mob-section-header">
                    <h3 class="mob-sec-title"><i class="fas fa-arrow-left" style="font-size: 0.8rem; margin-right: 2px;"></i> Recent Activity</h3>
                    <a href="#" class="mob-sec-link">View All <i class="fas fa-arrow-right" style="font-size: 0.8rem;"></i></a>
                </div>
                <div>${listsHTML || emptyContent}</div>
            </div>
        `;
    }

    function renderAlumniFeatureGrid(data) {
        const featuresHTML = data.features.map(feat => `
            <div class="mob-feature-card">
                ${feat.badge ? `<div class="mob-feat-badge">${feat.badge}</div>` : ''}
                <div class="mob-feat-header">
                    <div class="mob-feat-icon">${feat.iconHTML}</div>
                    <div class="mob-feat-title">${feat.title}</div>
                </div>
                <div class="mob-feat-sub">${feat.subtitle}</div>
                <div class="mob-feat-value-row">
                    <strong>${feat.value}</strong>
                    <span>${feat.valueSub}</span>
                </div>
            </div>
        `).join('');

        return `<div class="mob-feature-grid">${featuresHTML}</div>`;
    }

    function renderAlumniInsights(data) {
        return `
            <div class="mob-career-card">
                <div class="mob-career-header">
                    <h3>Best Career Path</h3>
                    <span class="mob-ai-badge">${data.insights.tag}</span>
                </div>
                <p class="mob-career-desc">${data.insights.text}</p>
                <button class="mob-career-btn">
                    ${data.insights.buttonAction} <i class="fas fa-arrow-right"></i>
                </button>
            </div>
        `;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }
})();
