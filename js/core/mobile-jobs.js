/* Mobile Jobs Dashboard Logic - js/core/mobile-jobs.js */

const MobileJobs = {
    state: {
        viewMode: 'browse', // 'browse' or 'applied'
        jobs: [],
        currentPage: 1,
        totalPages: 1,
        savedJobIds: new Set(),
        searchTimeout: null,
        abortController: null,
        currentUserId: null,
        userInitials: 'U',
        notificationsCount: 0,
        loading: false,
        error: null
    },

    init: async function () {
        if (window.innerWidth > 768) return;

        const root = document.getElementById('mobile-jobs-root');
        if (!root) return;

        // Show loading state
        this.state.loading = true;
        this.render(root);

        this.state.currentUserId = this.getTokenUserId();
        this.fetchUserHeaderData();
        await this.loadSavedJobIds();
        await this.fetchJobs(1);

        this.bindEvents();
    },

    getTokenUserId: function () {
        try {
            const token = localStorage.getItem('token');
            if (!token) return null;
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.id || payload._id;
        } catch (e) {
            return null;
        }
    },

    fetchUserHeaderData: function () {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.name) {
                const names = payload.name.split(' ');
                this.state.userInitials = names.length > 1 ? (names[0][0] + names[1][0]).toUpperCase() : names[0][0].toUpperCase();
            }
        } catch (e) {
            console.warn('[mobile-jobs] Could not parse user initials');
        }
    },

    loadSavedJobIds: async function () {
        try {
            const res = await (typeof apiFetch === 'function' ? apiFetch('/api/jobs/saved?limit=50') : null);
            if (res && res.jobs) {
                this.state.savedJobIds = new Set(res.jobs.map(j => j._id));
            }
        } catch (e) {
            console.warn('[mobile-jobs] Could not load saved jobs:', e.message);
        }
    },

    fetchJobs: async function (page = 1) {
        if (this.state.abortController) this.state.abortController.abort();
        this.state.abortController = new AbortController();

        try {
            this.state.currentPage = page;
            this.state.loading = true; // Track loading state

            // Render immediately to show skeleton/spinner within the container
            const root = document.getElementById('mobile-jobs-root');
            this.render(root);

            let url;
            if (this.state.viewMode === 'applied') {
                url = `/api/jobs/applied`;
            } else if (this.state.viewMode === 'saved') {
                url = `/api/jobs/saved?page=${page}&limit=10`;
            } else {
                url = `/api/jobs?page=${page}&limit=10&sortBy=relevance`;

                const searchEl = document.getElementById('mobSearchInput');
                const locEl = document.getElementById('mobLocInput');
                const typeEl = document.getElementById('mobTypeSelect');
                const streamEl = document.getElementById('mobStreamSelect');

                if (searchEl && searchEl.value) url += `&search=${encodeURIComponent(searchEl.value)}`;
                if (locEl && locEl.value) url += `&location=${encodeURIComponent(locEl.value)}`;
                if (streamEl && streamEl.value !== 'all') url += `&department=${encodeURIComponent(streamEl.value)}`;
                if (typeEl && typeEl.value !== 'all') url += `&jobType=${encodeURIComponent(typeEl.value)}`;
            }

            const response = await (typeof apiFetch === 'function' ? apiFetch(url, { signal: this.state.abortController.signal }) : { jobs: [] });

            // Handle both array (applied) and object (browse/saved)
            this.state.jobs = Array.isArray(response) ? response : (response.jobs || []);
            this.state.totalPages = response.pagination?.pages || 1;
            this.state.loading = false;

            this.render(root);
        } catch (err) {
            if (err.name === 'AbortError') return;
            console.error('[mobile-jobs] Failed to load:', err);
            this.state.loading = false;
            this.state.error = err.message || 'Failed to fetch jobs';
            this.render(document.getElementById('mobile-jobs-root'));
        }
    },

    formatDate: function (dateString) {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    },

    truncateDesc: function (text, limit = 120) {
        if (!text) return "";
        if (text.length <= limit) return text;
        return text.substring(0, limit) + "...";
    },


    render: function (root) {
        if (!root) return;

        // Base App Data
        const topHeaderHTML = typeof MobileNav !== 'undefined'
            ? MobileNav.renderHeader({ userInitial: this.state.userInitials, notificationCount: this.state.notificationsCount })
            : `
            <div class="mob-header">
                <div class="mob-logo">
                    <img src="../assets/assets/images/hlpu-logo.png" alt="hLPU Logo" onerror="this.src=''; this.alt='hlpu';">
                </div>
                <div class="mob-header-actions">
                    <a href="Student-Profile.html" style="text-decoration: none;">
                        <div class="mob-avatar">${this.state.userInitials}</div>
                    </a>
                    <a href="Notification.html" style="text-decoration: none;">
                        <div class="mob-notification">
                            <i class="fas fa-bell"></i>
                            ${this.state.notificationsCount > 0 ? `<div class="mob-badge">${this.state.notificationsCount}</div>` : ''}
                        </div>
                    </a>
                </div>
            </div>
        `;

        const headerHTML = `
            <div class="mob-jobs-header" style="margin-top: 20px;">
                <h1>Job Opportunities</h1>
                <p><i class="fas fa-briefcase"></i> Explore internships and full-time roles posted by verified LPU alumni</p>
            </div>
        `;

        const pillsHTML = `
            <div class="mob-jobs-pills">
                <button class="mob-pill-btn ${this.state.viewMode === 'applied' ? 'active' : ''}" onclick="MobileJobs.setViewMode('${this.state.viewMode === 'applied' ? 'browse' : 'applied'}')">
                    <i class="fas fa-check-double"></i> View Applied Jobs
                </button>
                <button class="mob-pill-btn ${this.state.viewMode === 'saved' ? 'active' : ''}" onclick="MobileJobs.setViewMode('${this.state.viewMode === 'saved' ? 'browse' : 'saved'}')">
                    <i class="fas fa-bookmark"></i> Saved Jobs
                </button>
            </div>
        `;

        let filtersHTML = '';
        if (this.state.viewMode === 'browse') {
            filtersHTML = `
                <div class="mob-search-section">
                    <div class="mob-search-label"><i class="fas fa-search"></i> SEARCH</div>
                    <div class="mob-filters-grid">
                        <input type="text" id="mobSearchInput" class="mob-filter-input mob-filter-full" placeholder="Title or Company..." oninput="MobileJobs.handleSearch()">
                        <input type="text" id="mobLocInput" class="mob-filter-input mob-filter-full" placeholder="City or Remote..." oninput="MobileJobs.handleSearch()">
                        <select id="mobTypeSelect" class="mob-filter-input" onchange="MobileJobs.handleSearch()">
                            <option value="all">All Types</option>
                            <option value="Internship">Internship</option>
                            <option value="Full-time">Full-time</option>
                        </select>
                        <select id="mobStreamSelect" class="mob-filter-input" onchange="MobileJobs.handleSearch()">
                            <option value="all">All Streams</option>
                            <option value="Engineering">Engineering</option>
                            <option value="Management">Management</option>
                            <option value="Design">Design</option>
                            <option value="Science">Science</option>
                            <option value="Commerce">Commerce</option>
                            <option value="Law">Law</option>
                        </select>
                    </div>
                </div>
            `;
        } else {
            filtersHTML = `<div class="mob-search-label" style="opacity:0.5; margin-bottom: 20px;"><i class="fas fa-filter"></i> Filters Disabled in This View</div>`;
        }

        let jobsListHTML = '';
        if (this.state.loading) {
            jobsListHTML = `
                <div style="display:flex; justify-content:center; align-items:center; height: 30vh; width: 100%;">
                    <div class="spinner-border text-primary" role="status" style="color: var(--ember) !important;">
                        <span class="sr-only">Loading...</span>
                    </div>
                </div>
            `;
        } else if (this.state.error) {
            jobsListHTML = `
                <div style="padding: 40px 20px; text-align: center; color: var(--ember); font-weight: 600;">
                    <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    ${this.state.error}
                    <button class="mob-btn mob-btn-details" style="margin-top: 15px; width: auto; margin-left: auto; margin-right: auto;" onclick="MobileJobs.fetchJobs(1)">
                        <i class="fas fa-sync-alt"></i> Try Again
                    </button>
                </div>
            `;
            this.state.error = null; // Reset error after displaying
        } else if (!this.state.jobs || this.state.jobs.length === 0) {
            jobsListHTML = `
                <div style="padding: 60px 20px; text-align: center; color: #718096;">
                    <i class="fas fa-search" style="font-size: 3rem; opacity: 0.2; margin-bottom: 20px; display: block;"></i>
                    <h3>No jobs found</h3>
                    <p>Try adjusting your filters or search terms.</p>
                </div>
            `;
        } else {
            jobsListHTML = this.state.jobs.map(job => this.renderJobCard(job)).join('');
        }

        const navHTML = `
            <div class="mob-bottom-nav-container">
                <a href="Dashboard.html" class="mob-nav-item">
                    <div class="mob-nav-icon"><i class="fas fa-th-large"></i></div>
                    <div class="mob-nav-label">Dashboard</div>
                </a>
                <a href="Direct-Job.html" class="mob-nav-item active">
                    <div class="mob-nav-icon"><i class="fas fa-briefcase"></i></div>
                    <div class="mob-nav-label">Jobs</div>
                </a>
                <a href="Mentor-Requests.html" class="mob-nav-item">
                    <div class="mob-nav-icon"><i class="fas fa-user-friends"></i></div>
                    <div class="mob-nav-label">Mentors</div>
                </a>
                <a href="#" class="mob-nav-item" onclick="MobileJobs.toggleSideNav(); return false;">
                    <div class="mob-nav-icon"><i class="fas fa-ellipsis-h"></i></div>
                    <div class="mob-nav-label">More</div>
                </a>
            </div>
            ${this.renderSideNav()}
        `;

        root.innerHTML = `
            <div class="mob-jobs-container">
                ${topHeaderHTML}
                ${headerHTML}
                ${pillsHTML}
                ${filtersHTML}
                <div id="mobJobsContainer">
                    ${jobsListHTML}
                </div>
                ${navHTML}
            </div>
        `;

        // Restore input values after re-render if needed
        setTimeout(() => {
            const preservedSearch = this.__tempSearch || '';
            const input = document.getElementById('mobSearchInput');
            if (input && preservedSearch) {
                input.value = preservedSearch;
                input.focus();
            }
        }, 50);
    },

    renderJobCard: function (job) {
        const companyName = job.companyName || job.company || 'Company';
        const initials = companyName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

        const postedDate = this.formatDate(job.createdAt);
        const finalDeadline = job.applicationDeadline || job.deadline;
        const deadlineDate = finalDeadline ? this.formatDate(finalDeadline) : "N/A";

        const isExpired = finalDeadline && new Date(finalDeadline) < new Date();
        const jobStatus = job.status || 'active';
        const isJobInactive = ['paused', 'closed', 'expired'].includes(jobStatus);
        const canApply = !isExpired && !isJobInactive;

        const applicantIds = (job.applicants || []).map(a => {
            if (!a) return null;
            if (typeof a === 'string') return a;
            const id = a.student || a.user || a._id || a.id || a;
            return (id && typeof id === 'object') ? (id._id || id.id || id) : id;
        });
        const hasApplied = (this.state.currentUserId && applicantIds.includes(this.state.currentUserId.toString())) || !!job.applicationStatus;
        const isSaved = this.state.savedJobIds.has(job._id);

        const skills = job.skills || [];
        const salaryText = job.salaryMin ? `₹${job.salaryMin}-${job.salaryMax || job.salaryMin}K / mo` : 'Competitive';

        let adminBadge = job.postedBy?.role === 'admin' ? '<div class="mob-job-badge-top"><i class="fas fa-university"></i> Campus Drive</div>' : '';

        // Status injection for applied view
        let statusHtml = '';
        if (this.state.viewMode === 'applied' || job.applicationStatus) {
            const status = job.applicationStatus || 'pending';
            const statusIcons = { pending: 'fa-clock', accepted: 'fa-check-circle', rejected: 'fa-times-circle', withdrawn: 'fa-undo' };
            statusHtml = `<div class="status-badge status-${status}"><i class="fas ${statusIcons[status] || 'fa-circle'}"></i> ${status.toUpperCase()}</div>`;
        }

        return `
            <div class="mob-job-card">
                <div class="mob-job-card-header">
                    <div class="mob-job-brand">
                        <div class="mob-job-logo">
                            ${job.companyLogo ? `<img src="${job.companyLogo}" style="width:100%; height:100%; border-radius:12px; object-fit:cover;" onerror="this.outerHTML='${initials}'">` : initials}
                        </div>
                        <div class="mob-job-title-group">
                            <h3>${job.title}</h3>
                            <div class="mob-job-company">${companyName}</div>
                        </div>
                    </div>
                    ${statusHtml || adminBadge || `<div class="mob-job-badge-top"><i class="fas fa-coins"></i> ${salaryText}</div>`}
                </div>

                <div class="mob-job-tags">
                    <div class="mob-job-tag"><i class="fas fa-briefcase"></i> ${job.jobType || 'Full-time'}</div>
                    <div class="mob-job-tag"><i class="fas fa-laptop-house"></i> ${job.workMode || 'Remote'}</div>
                    <div class="mob-job-tag"><i class="fas fa-user-graduate"></i> ${job.experienceLevel || '0-1 Yrs'}</div>
                    <div class="mob-job-tag"><i class="fas fa-map-marker-alt"></i> ${job.location || 'India'}</div>
                </div>

                <div class="mob-job-desc">
                    ${this.truncateDesc(job.description)}
                </div>

                <div class="mob-job-actions">
                    <button class="mob-btn mob-btn-details" onclick="MobileJobs.showDetails('${job._id}')">
                        <i class="fas fa-eye"></i> Details
                    </button>
                    ${hasApplied ?
                `<button class="mob-btn mob-btn-apply" disabled style="background:#48bb78;"><i class="fas fa-check-circle"></i> Applied</button>` :
                `<button class="mob-btn mob-btn-apply" id="mobApplyBtn-${job._id}" onclick="MobileJobs.handleApply('${job._id}')" ${!canApply ? 'disabled' : ''}>
                            <i class="fas ${!canApply ? 'fa-times-circle' : 'fa-paper-plane'}"></i> ${isJobInactive ? jobStatus : isExpired ? 'Expired' : 'Apply Now'}
                        </button>`
            }
                    <button class="mob-btn mob-btn-icon ${isSaved ? 'saved' : ''}" id="mobSaveBtn-${job._id}" onclick="MobileJobs.toggleSave('${job._id}')">
                        <i class="fa${isSaved ? 's' : 'r'} fa-bookmark"></i>
                    </button>
                    <button class="mob-btn mob-btn-icon report" onclick="MobileJobs.handleReport('${job._id}')">
                        <i class="fas fa-exclamation-triangle"></i>
                    </button>
                </div>

                <div class="mob-job-footer">
                    <div class="mob-job-footer-item"><i class="far fa-calendar-alt"></i> ${postedDate}</div>
                    <div class="mob-job-footer-item"><i class="fas fa-hourglass-half" style="color:var(--ember)"></i> ${deadlineDate}</div>
                    ${job.matchScore ? `<div class="mob-job-footer-item mob-match-score"><i class="fas fa-bullseye"></i> Match: ${job.matchScore}%</div>` : ''}
                </div>
            </div>
        `;
    },

    renderSideNav: function () {
        // Reuse Sidebar structural injection from MobileDashboard
        return `
            <div class="mob-side-nav-overlay" id="mob-side-nav-overlay" onclick="MobileJobs.toggleSideNav()"></div>
            <div class="mob-side-nav" id="mob-side-nav">
                <div class="mob-side-nav-header">
                    <h2>Menu</h2>
                    <button class="mob-side-nav-close" onclick="MobileJobs.toggleSideNav()">
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
    },

    setViewMode: function (mode) {
        this.state.viewMode = mode;
        this.fetchJobs(1);
    },

    handleSearch: function () {
        clearTimeout(this.state.searchTimeout);
        const input = document.getElementById('mobSearchInput');
        if (input) this.__tempSearch = input.value;

        this.state.searchTimeout = setTimeout(() => {
            this.fetchJobs(1);
        }, 500);
    },

    toggleSideNav: function () {
        const nav = document.getElementById('mob-side-nav');
        const overlay = document.getElementById('mob-side-nav-overlay');
        if (nav && overlay) {
            nav.classList.toggle('open');
            overlay.classList.toggle('open');
        }
    },

    showDetails: function (jobId) {
        if (typeof window.showJobDetails === 'function') {
            // Re-use desktop modal handler by injecting selected payload into global DOM scope temporarily
            if (!window.jobs) window.jobs = this.state.jobs;
            window.showJobDetails(jobId);
        } else {
            console.warn('showJobDetails global method missing');
        }
    },

    handleApply: async function (jobId) {
        if (typeof window.handleApply === 'function') {
            await window.handleApply(jobId);
            // Re-render local node manually or refetch
            this.fetchJobs(this.state.currentPage);
        }
    },

    toggleSave: async function (jobId) {
        if (typeof window.handleSaveToggle === 'function') {
            await window.handleSaveToggle(jobId);
            // Local sync
            if (this.state.savedJobIds.has(jobId)) {
                this.state.savedJobIds.delete(jobId);
            } else {
                this.state.savedJobIds.add(jobId);
            }
            this.render(document.getElementById('mobile-jobs-root'));
        }
    },

    handleReport: function (jobId) {
        if (typeof window.handleFlag === 'function') {
            window.handleFlag(jobId);
        }
    },

    bindEvents: function () {
        // Handled via onclick inline hooks
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        MobileJobs.init();
    }, 100);
});

window.addEventListener('resize', () => {
    const root = document.getElementById('mobile-jobs-root');
    if (window.innerWidth <= 768 && root && !root.innerHTML.trim()) {
        MobileJobs.init();
    }
});
