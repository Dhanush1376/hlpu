/**
 * mobile-dashboard.js
 * Dynamic rendering for the mobile dashboard layout in hLPU.
 * Ensures pixel-perfection corresponding to the design screenshot.
 */

(function initMobileDashboard() {
    // DYNAMIC MOCK DATA (Later replaceable via API)
    let dashboardData = {
        userInitial: "",
        userName: "Loading...",
        notificationCount: 0,
        opportunityCount: 0,
        course: "Loading...",
        branch: "",
        skills: [],
        quickActions: [
            { iconHTML: '<i class="fas fa-briefcase"></i>', label: "Jobs", href: "Direct-Job.html" },
            { iconHTML: '<i class="fas fa-user-tie"></i>', label: "Mentors", href: "Mentor-Requests.html" },
            { iconHTML: '<i class="fas fa-video"></i>', label: "Mock", href: "Mock-Application.html" },
            { iconHTML: '<i class="fas fa-map"></i>', label: "CourseMap", href: "Course-Map.html" }
        ],
        features: [
            {
                iconHTML: '<i class="fas fa-handshake"></i>',
                title: "Mentors<br>Connected",
                subtitle: "Accepted connections",
                value: "...",
                valueSub: "Accepted connections",
                badge: null
            },
            {
                iconHTML: '<i class="fas fa-video"></i>',
                title: "Mock<br>Interviews",
                subtitle: "Total submitted",
                value: "...",
                valueSub: "Total submitted",
                badge: null
            },
            {
                iconHTML: '<i class="fas fa-list-check"></i>',
                title: "Profile Tasks",
                subtitle: "Completed items",
                value: "...",
                valueSub: "Completed items",
                badge: null
            },
            {
                iconHTML: '<i class="fas fa-bookmark"></i>',
                title: "Saved Jobs",
                subtitle: "Tracked opportunities",
                value: "...",
                valueSub: "Tracked opportunities",
                badge: null
            }
        ],
        recentActivities: [],
        careerPath: {
            insightTag: "LOADING",
            text: "Analyzing your profile...",
            buttonAction: "View Insights"
        },
        currentTab: "dashboard" // dashboard, jobs, mentors, more
    };

    function run() {
        loadMobileDashboard(dashboardData);
    }

    // EXPOSE GLOBAL UPDATER HOOK FOR DESKTOP DASHBOARD API TO PUSH DATA
    window.updateMobileDashboardData = function (newData) {
        if (!newData) return;

        // Merge the new data fields into the existing dashboardData skeleton
        dashboardData = { ...dashboardData, ...newData };

        // For deep merges like nested objects or arrays if needed
        if (newData.features) {
            newData.features.forEach((incomingFeat, idx) => {
                if (dashboardData.features[idx]) {
                    dashboardData.features[idx] = { ...dashboardData.features[idx], ...incomingFeat };
                }
            });
        }

        if (newData.recentActivities) {
            dashboardData.recentActivities = newData.recentActivities;
        }

        console.log("hLPU Mobile: Received Dynamic Data Update ->", dashboardData);
        loadMobileDashboard(dashboardData); // Re-render with new data
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }

    /**
     * Main render function
     * @param {Object} data 
     */
    function loadMobileDashboard(data) {
        console.log("hLPU Mobile: loadMobileDashboard triggered.");

        const root = document.getElementById('mobile-root');
        console.log("hLPU Mobile: root element found?", !!root);

        if (!root) {
            console.warn("hLPU Mobile: #mobile-root not found. Retrying in 100ms...");
            setTimeout(() => loadMobileDashboard(data), 100);
            return;
        }

        // Clear inner content to prevent re-render stacking
        root.innerHTML = '';
        console.log("hLPU Mobile: Injecting HTML...");

        // Append all dynamic components
        root.innerHTML = `
        ${MobileNav.renderHeader(data)}
        ${renderWelcome(data)}
        ${renderProfileCard(data)}
        ${renderQuickActions(data)}
        ${renderRecentActivity(data)}
        ${renderFeatureGrid(data)}
        ${renderCareerPath(data)}
        ${MobileNav.renderBottomNav(data.currentTab)}
        ${MobileNav.renderSidenav()}
    `;

        // Bind Sidenav Events
        setTimeout(() => {
            MobileNav.initSidenavEvents();
        }, 50);

        console.log("hLPU Mobile: Injection Complete.");
    }

    // ==============================================
    // COMPONENT RENDER FUNCTIONS
    // ==============================================

    function renderWelcome(data) {
        // Extracting first name for welcome message
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

    function renderProfileCard(data) {
        const skillTagsHTML = data.skills.map(skill => {
            let icon = "fas fa-star"; // default generic
            if (skill.toLowerCase().includes('student')) icon = "fas fa-user-graduate";
            if (skill.toLowerCase().includes('solidworks')) icon = "fas fa-layer-group";

            return `<div class="mob-pill-tag"><i class="${icon}"></i> ${skill}</div>`;
        }).join('');

        return `
        <div class="mob-profile-card">
            <div class="mob-profile-row">
                <div class="mob-profile-avatar-lg">${data.userInitial}</div>
                <div class="mob-profile-details">
                    <h2>${data.userName}</h2>
                    <p><i class="fas fa-rocket"></i> ${data.course} &middot; <br> ${data.branch}</p>
                </div>
            </div>
            <div class="mob-profile-tags">
                ${skillTagsHTML}
            </div>
        </div>
    `;
    }

    function renderQuickActions(data) {
        const actionsHTML = data.quickActions.map(action => {
            return `
            <a href="${action.href}" class="mob-action-btn">
                <div class="mob-action-icon">${action.iconHTML}</div>
                <div class="mob-action-label">${action.label}</div>
            </a>
        `;
        }).join('');

        return `
        <div class="mob-actions-row">
            ${actionsHTML}
        </div>
    `;
    }

    function renderFeatureGrid(data) {
        const cardsHTML = data.features.map(feat => {
            const badgeHTML = feat.badge ? `<div class="mob-feat-badge">${feat.badge}</div>` : '';

            return `
            <div class="mob-feature-card">
                ${badgeHTML}
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
        `;
        }).join('');

        return `
        <div class="mob-feature-grid">
            ${cardsHTML}
        </div>
    `;
    }

    function renderRecentActivity(data) {
        const listsHTML = data.recentActivities.slice(0, 1).map(act => {
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

        return `
        <div class="mob-recent-activity-container" style="width: 100%; display: block; margin-bottom: 25px;">
            <div class="mob-section-header">
                <h3 class="mob-sec-title"><i class="fas fa-arrow-left" style="font-size: 0.8rem; margin-right: 2px;"></i> Recent Activity</h3>
                <a href="#" class="mob-sec-link">View All <i class="fas fa-arrow-right" style="font-size: 0.8rem;"></i></a>
            </div>
            <div>${listsHTML}</div>
        </div>
    `;
    }

    function renderCareerPath(data) {
        return `
        <div class="mob-career-card">
            <div class="mob-career-header">
                <h3>Best Career Path</h3>
                <span class="mob-ai-badge">${data.careerPath.insightTag}</span>
            </div>
            <p class="mob-career-desc">${data.careerPath.text}</p>
            <button class="mob-career-btn">
                ${data.careerPath.buttonAction} <i class="fas fa-arrow-right"></i>
            </button>
        </div>
    `;
    }
})();
