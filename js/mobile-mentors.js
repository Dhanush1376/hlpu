/**
 * mobile-mentors.js
 * Mobile-first logic for Mentor Network.
 * Reuses existing data pipeline and integrates with mobile ecosystem.
 */

window.MobileMentors = (function () {
    let currentMentors = [];
    let currentViewMode = 'browse'; // 'browse' or 'dashboard'

    function run(viewMode = 'browse') {
        const root = document.getElementById('mobile-root');
        if (!root) return;

        currentViewMode = viewMode;

        // Initial structure
        renderBase(root);
        bindEvents();
    }

    function renderBase(root) {
        const isDashboard = currentViewMode === 'dashboard';
        const userInitial = getInitials();

        const headerHtml = isDashboard ? `
            <div class="mob-mentors-header">
                <h1>My Mentorship</h1>
                <p><i class="fas fa-id-card"></i> Track your requests and connect with active mentors</p>
            </div>
            <div class="mob-quick-pills">
                <button class="mob-pill-btn" onclick="MobileMentors.switchView('browse')">
                    <i class="fas fa-arrow-left"></i> Back to Browse
                </button>
            </div>
        ` : `
            <div class="mob-mentors-header">
                <h1>Mentor Network</h1>
                <p><i class="fas fa-handshake"></i> Connect with LPU alumni for career guidance</p>
            </div>
            <div class="mob-quick-pills">
                <button class="mob-pill-btn" onclick="MobileMentors.switchView('dashboard')" id="mob-btn-dashboard">
                    <i class="fas fa-id-card"></i> My Mentees
                </button>
                <button class="mob-pill-btn" onclick="MobileMentors.openHelpPool()">
                    <i class="fas fa-paper-plane"></i> Help Pool
                </button>
            </div>
        `;

        root.innerHTML = `
            ${MobileNav.renderHeader({ userInitial })}
            
            ${headerHtml}

            ${!isDashboard ? `
                <div class="mob-search-container">
                    <div class="mob-unified-search">
                        <i class="fas fa-search"></i>
                        <input type="text" id="mob-mentor-search" placeholder="Search mentors, company or role..." />
                    </div>
                </div>
            ` : ''}

            <div id="mob-mentors-container">
                <div style="text-align: center; padding: 50px;">
                    <i class="fas fa-spinner fa-spin fa-2x" style="color: #C2491F;"></i>
                    <p style="margin-top: 10px; color: #5f6b7a;">Loading mentors...</p>
                </div>
            </div>

            <div id="mob-pagination-container"></div>

            ${MobileNav.renderBottomNav("mentors")}
            ${MobileNav.renderSidenav()}
        `;

        setTimeout(() => MobileNav.initSidenavEvents(), 100);
    }

    function render(mentors, pagination) {
        const container = document.getElementById('mob-mentors-container');
        if (!container) return;

        currentMentors = mentors;

        if (currentViewMode === 'dashboard') {
            renderDashboard(container);
            return;
        }

        if (!mentors || mentors.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px; color: #5f6b7a;">
                    <i class="fas fa-search-minus" style="font-size: 3rem; opacity: 0.3; margin-bottom: 15px; display: block;"></i>
                    No mentors found matching your search.
                </div>
            `;
            renderPagination(null);
            return;
        }

        container.innerHTML = mentors.map((m, idx) => renderMentorCard(m, idx)).join('');
        renderPagination(pagination);
    }

    function renderMentorCard(m, idx) {
        const pPic = m.profilePic || m.profilePicture || '../Images/default-avatar.png';
        const initials = m.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

        const currentLoad = m.currentMentees || 0;
        const maxLoad = m.maxMentees || 5;
        const loadPerc = (currentLoad / maxLoad) * 100;
        const isFull = loadPerc >= 100;

        return `
            <div class="mob-mentor-card">
                <div class="mob-mentor-card-header">
                    ${pPic && !pPic.includes('default-avatar') ?
                `<img src="${pPic}" class="mob-mentor-avatar" alt="${m.name}" onerror="this.src='../Images/default-avatar.png'"/>` :
                `<div class="mob-mentor-avatar">${initials}</div>`
            }
                    <div class="mob-mentor-info">
                        <h3>${m.name} ${m.isVerified ? '<i class="fas fa-circle-check mob-verified-badge"></i>' : ''}</h3>
                        <div class="mob-company-row">
                            <span class="mob-mentor-title">${m.title || 'Mentor'}</span>
                            <span class="mob-mentor-company">@ ${m.company || 'LPU Alum'}</span>
                        </div>
                    </div>
                </div>

                <div class="mob-mentor-tags">
                    <span class="mob-tag"><i class="fas fa-graduation-cap"></i> ${m.department || 'Education'}</span>
                    <span class="mob-tag"><i class="fas fa-briefcase"></i> ${m.experience || '3+'} Yrs</span>
                    <span class="mob-tag"><i class="fas fa-users"></i> ${currentLoad}/${maxLoad} Load</span>
                </div>

                <div class="mob-mentor-actions">
                    <button class="mob-btn mob-btn-profile" onclick="window.viewAlumniProfile('${m._id}')">
                        Profile
                    </button>
                    <button class="mob-btn mob-btn-connect" onclick="window.showRequestFormForAlumni('${m._id}', '${m.name}')" ${isFull ? 'disabled' : ''}>
                        <i class="fas fa-paper-plane"></i> ${isFull ? 'Full' : 'Connect'}
                    </button>
                    ${m.matchScore !== undefined ? `
                        <div class="mob-match-badge">
                            <i class="fas fa-bullseye"></i> ${m.matchScore}%
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    function renderDashboard(container) {
        // Dashboard rendering usually uses a different list (requests)
        // This is handled by loadMyRequests and renderMyRequests in the main page.
        // We will override renderMyRequests in main page to call this if mobile.
    }

    function renderPagination(pagination) {
        const container = document.getElementById('mob-pagination-container');
        if (!container) return;

        if (!pagination || pagination.pages <= 1) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `
            <div class="mob-pagination-flex">
                <button class="mob-pag-btn" ${pagination.page <= 1 ? 'disabled' : ''} onclick="window.loadAvailableMentors(${pagination.page - 1})">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <span class="mob-pag-info">Page ${pagination.page} / ${pagination.pages}</span>
                <button class="mob-pag-btn" ${pagination.page >= pagination.pages ? 'disabled' : ''} onclick="window.loadAvailableMentors(${pagination.page + 1})">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        `;
    }

    function bindEvents() {
        const searchInput = document.getElementById('mob-mentor-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const val = e.target.value;
                const desktopSearch = document.getElementById('searchAll');
                if (desktopSearch) {
                    desktopSearch.value = val;
                    // Trigger load after delay
                    clearTimeout(window.mentorSearchTimeout);
                    window.mentorSearchTimeout = setTimeout(() => window.loadAvailableMentors(1), 500);
                }
            });
        }
    }

    function switchView(mode) {
        currentViewMode = mode;
        const toggleBtn = document.getElementById('toggleRequestsBtn');
        if (toggleBtn) {
            toggleBtn.click(); // Sync with desktop state
            run(mode); // Re-render mobile structure

            if (mode === 'browse') window.loadAvailableMentors(1);
            else if (window.loadMyRequests) window.loadMyRequests();
        }
    }

    function getInitials() {
        try {
            const name = localStorage.getItem('userName') || 'User';
            return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        } catch (e) { return 'U'; }
    }

    return {
        run,
        render,
        switchView,
        openHelpPool: function () {
            // Trigger the desktop general request form safely
            if (typeof window.showGeneralRequestForm === 'function') {
                window.showGeneralRequestForm();
            } else if (typeof $ !== 'undefined') {
                $('#mentorRequestModal').modal('show');
            }
        },
        renderMyRequests: function (requests) {
            // Only render to mobile container when in dashboard view
            if (currentViewMode !== 'dashboard') return;
            const container = document.getElementById('mob-mentors-container');
            if (!container) return;

            if (!requests || requests.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 60px; color: #5f6b7a;">
                        <i class="fas fa-clipboard-list" style="font-size: 3rem; opacity: 0.3; margin-bottom: 15px; display: block;"></i>
                        No requests found.
                    </div>
                `;
                return;
            }

            container.innerHTML = requests.map(req => {
                const date = new Date(req.createdAt).toLocaleDateString();
                const status = req.status || 'pending';
                const mentorName = req.alumni ? req.alumni.name : 'Finding...';

                return `
                    <div class="mob-request-card status-${status}">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 10px;">
                            <div>
                                <div style="font-size:0.7rem; color:#8f9aaa; text-transform:uppercase; font-weight:700;">${req.preferredDomain || 'General'}</div>
                                <div style="font-size:1rem; font-weight:800; color:#0A1A2F;">${mentorName}</div>
                            </div>
                            <div class="mob-tag" style="background: white;">${status.toUpperCase()}</div>
                        </div>
                        <div style="font-size:0.85rem; color:#5f6b7a; line-height:1.4; font-style:italic; margin-bottom: 15px;">
                            "${req.message}"
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:0.75rem; color:#8f9aaa;"><i class="fas fa-calendar"></i> ${date}</span>
                            ${status === 'accepted' ? `
                                <a href="Messages.html" class="mob-btn mob-btn-connect" style="padding: 8px 15px; font-size:0.75rem; text-decoration:none;">
                                    <i class="fas fa-comment"></i> Message
                                </a>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }
    };
})();
