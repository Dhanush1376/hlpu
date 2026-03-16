/**
 * mobile-jobs.js
 * Dynamic rendering for the mobile Job Opportunities page using REAL API data.
 */

window.MobileJobs = (function initMobileJobs() {
    let currentJobs = [];

    // Helper: Time Ago
    function timeAgo(dateString) {
        if (!dateString) return "N/A";
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return "N/A";
            const now = new Date();
            const seconds = Math.floor((now - date) / 1000);
            if (seconds < 60) return "Just now";
            const minutes = Math.floor(seconds / 60);
            if (minutes < 60) return `${minutes}m ago`;
            const hours = Math.floor(minutes / 60);
            if (hours < 24) return `${hours}h ago`;
            const days = Math.floor(hours / 24);
            if (days < 30) return `${days}d ago`;
            return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        } catch (e) { return "N/A"; }
    }

    // Helper: Deadline Text
    function getDeadlineText(deadline) {
        if (!deadline) return "No deadline";
        try {
            const date = new Date(deadline);
            if (isNaN(date.getTime())) return "No deadline";
            const now = new Date();
            if (date < now) return "Expired";
            const diff = date - now;
            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
            if (days === 0) return "Ends today";
            return `${days} ${days === 1 ? 'day' : 'days'} left`;
        } catch (e) { return "No deadline"; }
    }

    let currentPageType = 'browse';

    // Helper: Dynamic Initials
    function getInitials() {
        try {
            const token = localStorage.getItem('token');
            const storedName = localStorage.getItem('userName');

            let fullName = storedName || "User";
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                fullName = payload.fullName || payload.name || payload.userName || fullName;
            }

            const names = fullName.trim().split(/\s+/);
            if (names.length === 0) return "U";
            if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
            return (names[0][0] + names[names.length - 1][0]).toUpperCase();
        } catch (e) {
            return "U";
        }
    }

    function run(pageType = 'browse') {
        const root = document.getElementById('mobile-root');
        if (!root) return;

        currentPageType = pageType;
        const userInitial = getInitials();

        // Render Base Layout
        renderPage(root, userInitial, pageType);

        bindMobileEvents();
    }

    function renderPage(root, userInitial, pageType) {
        const isSavedPage = pageType === 'saved';

        const headerContent = isSavedPage ? `
            <div class="mob-jobs-header">
                <h1><i class="fas fa-bookmark" style="color: #C2491F;"></i> Saved Jobs</h1>
                <p>Jobs you've bookmarked for later review</p>
            </div>
            <div class="mob-quick-pills">
                <a href="Direct-Job.html" class="mob-pill-btn active">
                    <i class="fas fa-arrow-left"></i> Back to Browse
                </a>
            </div>
        ` : `
            <div class="mob-jobs-header">
                <h1>Job Opportunities</h1>
                <p><i class="fas fa-briefcase"></i> Explore internships and roles from verified alumni</p>
            </div>
            <div class="mob-quick-pills">
                <button type="button" class="mob-pill-btn" onclick="MobileJobs.toggleAppliedView()" id="mob-toggle-applied">
                    <i class="fas fa-check-double"></i> Applied Jobs
                </button>
                <button type="button" class="mob-pill-btn" onclick="MobileJobs.toggleSavedView()" id="mob-toggle-saved">
                    <i class="fas fa-bookmark"></i> Saved Jobs
                </button>
            </div>
        `;

        root.innerHTML = `
            ${MobileNav.renderHeader({ userInitial: userInitial, notificationCount: 0 })}
            
            ${headerContent}

            <div class="mob-search-container">
                <div class="mob-unified-search">
                    <i class="fas fa-search search-icon"></i>
                    <input type="text" id="mob-unified-input" placeholder="Search title, company, or city..." />
                </div>
            </div>

            <div id="mob-job-list-container">
                <div style="text-align: center; padding: 40px; color: #5f6b7a;">
                    <i class="fas fa-circle-notch fa-spin"></i> Loading jobs...
                </div>
            </div>

            <div id="mob-pagination"></div>

            ${MobileNav.renderBottomNav("jobs")}
            ${MobileNav.renderSidenav()}
        `;

        setTimeout(() => MobileNav.initSidenavEvents(), 50);
    }

    function render(jobsList, pagination) {
        const container = document.getElementById('mob-job-list-container');
        if (!container) return;

        // Update pill UI
        const isAppliedView = window.viewMode === 'applied';
        const isSavedView = window.viewMode === 'saved';

        const appliedPill = document.getElementById('mob-toggle-applied');
        if (appliedPill) {
            appliedPill.innerHTML = isAppliedView ?
                '<i class="fas fa-arrow-left"></i> Back to Browse' :
                '<i class="fas fa-check-double"></i> Applied Jobs';
            appliedPill.classList.toggle('active', isAppliedView);
            appliedPill.style.display = isSavedView ? 'none' : 'flex';
        }

        const savedPill = document.getElementById('mob-toggle-saved');
        if (savedPill) {
            savedPill.innerHTML = isSavedView ?
                '<i class="fas fa-arrow-left"></i> Back to Browse' :
                '<i class="fas fa-bookmark"></i> Saved Jobs';
            savedPill.classList.toggle('active', isSavedView);
            savedPill.style.display = isAppliedView ? 'none' : 'flex';
        }

        currentJobs = jobsList;

        if (!jobsList || jobsList.length === 0) {
            container.innerHTML = `<div style="text-align: center; padding: 60px; color: #5f6b7a;">
                <i class="fas fa-search-minus" style="font-size: 3rem; opacity: 0.3; margin-bottom: 15px; display: block;"></i>
                No jobs match your search.
            </div>`;
            renderPagination(null);
            return;
        }

        try {
            container.innerHTML = jobsList.map(job => renderJobCard(job)).join('');
        } catch (err) {
            console.error('[mobile-jobs] Render error:', err);
            container.innerHTML = `<div style="text-align: center; padding: 40px; color: #dc3545;">
                <i class="fas fa-exclamation-circle"></i> Error rendering jobs.
            </div>`;
        }
        renderPagination(pagination);
    }

    function renderPagination(pagination) {
        const pagContainer = document.getElementById('mob-pagination');
        if (!pagContainer) return;

        if (!pagination || pagination.pages <= 1) {
            pagContainer.innerHTML = '';
            return;
        }

        const currentPage = pagination.page || 1;
        const totalPages = pagination.pages || 1;

        pagContainer.innerHTML = `
            <div class="mob-pagination-flex">
                <button class="mob-pag-btn" ${currentPage <= 1 ? 'disabled' : ''} onclick="window.fetchJobs(${currentPage - 1})">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <span class="mob-pag-info">Page ${currentPage} of ${totalPages}</span>
                <button class="mob-pag-btn" ${currentPage >= totalPages ? 'disabled' : ''} onclick="window.fetchJobs(${currentPage + 1})">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        `;
    }

    function renderJobCard(job) {
        const jobId = job._id || job.id;
        const companyName = job.companyName || job.company || 'Company';
        const initials = companyName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

        const logoContent = job.companyLogo
            ? `<img src="${job.companyLogo}" alt="${companyName}" onerror="this.onerror=null; this.outerHTML='<div class=\\'mob-company-logo\\'>${initials}</div>';"/>`
            : initials;

        const salaryText = job.salaryMin ? `₹${job.salaryMin}-${job.salaryMax || job.salaryMin} K/M` : 'Competitive';

        const isCampusDrive = job.postedBy?.role === 'admin';
        const campusBadge = isCampusDrive
            ? `<span class="mob-campus-badge">
                <i class="fas fa-graduation-cap"></i> Campus
               </span>`
            : '';

        // Check application status
        const status = job.applicationStatus;
        const hasApplied = !!status;

        let statusHtml = '';
        if (hasApplied) {
            const statusIcons = {
                pending: 'fa-clock',
                accepted: 'fa-check-circle',
                rejected: 'fa-times-circle',
                withdrawn: 'fa-undo'
            };
            statusHtml = `
                <div class="mob-status-badge mob-status-${status}">
                    <i class="fas ${statusIcons[status] || 'fa-circle'}"></i> ${status}
                </div>
            `;
        }

        // Metadata Calculations
        const postedTimeText = timeAgo(job.createdAt || job.postedAt);
        const deadline = job.applicationDeadline || job.deadline;
        const daysLeftText = getDeadlineText(deadline);
        const matchScore = job.matchScore || job.matchPercentage;

        return `
            <div class="mob-job-card">
                <div class="mob-job-card-header">
                    <div class="mob-company-logo">${logoContent}</div>
                    <div class="mob-job-info">
                        <h3>${job.title || job.jobTitle}</h3>
                        <div class="mob-company-row">
                            <span class="mob-company-name">${companyName}</span>
                            ${campusBadge}
                        </div>
                    </div>
                    ${statusHtml}
                </div>

                <div class="mob-job-tags">
                    <span class="mob-tag"><i class="fas fa-briefcase"></i> ${job.jobType || 'Full-time'}</span>
                    <span class="mob-tag"><i class="fas fa-map-marker-alt"></i> ${job.location || 'Remote'}</span>
                    <span class="mob-tag" style="color: #27ae60; background: rgba(39, 174, 96, 0.05); border-color: rgba(39, 174, 96, 0.1);">
                        <i class="fas fa-coins" style="color: #27ae60;"></i> ${salaryText}
                    </span>
                </div>

                <div class="mob-job-actions">
                    <button class="mob-btn-details" onclick="window.showJobDetails('${jobId}')" data-toggle="modal" data-target="#alumniModal">
                        Details
                    </button>
                    ${hasApplied ?
                `<button class="mob-btn-apply applied" disabled>Applied</button>` :
                `<button class="mob-btn-apply" id="applyBtn-${jobId}" onclick="window.handleApply('${jobId}')">Apply</button>`
            }
                    <button class="mob-btn-save ${job.isSaved ? 'active' : ''}" id="saveBtn-${jobId}" onclick="window.handleSaveToggle('${jobId}')">
                        <i class="${job.isSaved ? 'fas' : 'far'} fa-bookmark"></i>
                    </button>
                    <button class="mob-btn-report-circle" onclick="window.handleFlag('${jobId}')" title="Report this job">
                         <i class="fas fa-exclamation-triangle"></i>
                    </button>
                </div>

                <div class="mob-job-footer">
                    <div class="mob-footer-item">
                        <i class="far fa-calendar-alt"></i> Posted ${postedTimeText}
                    </div>
                    <div class="mob-footer-item mob-deadline ${daysLeftText === 'Expired' ? 'expired' : ''}">
                        <i class="fas fa-hourglass-half"></i> ${daysLeftText}
                    </div>
                    ${matchScore !== undefined ? `
                    <div class="mob-footer-item mob-match">
                        <i class="fas fa-bullseye"></i> Match: ${matchScore}%
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    function toggleAppliedView() {
        const toggleBtn = document.getElementById('toggleAppliedBtn');
        if (toggleBtn) {
            toggleBtn.click(); // Trigger the desktop toggle logic

            // Update mobile pill UI
            const mobilePill = document.getElementById('mob-toggle-applied');
            const isAppliedView = document.getElementById('toggleAppliedBtn').innerText.toLowerCase().includes('back');
            if (mobilePill) {
                mobilePill.innerHTML = isAppliedView ?
                    '<i class="fas fa-arrow-left"></i> Back to Browse' :
                    '<i class="fas fa-check-double"></i> Applied Jobs';
                mobilePill.classList.toggle('active', isAppliedView);
            }
        }
    }

    function bindMobileEvents() {
        const unifiedInput = document.getElementById('mob-unified-input');

        if (unifiedInput) {
            unifiedInput.addEventListener('input', (e) => {
                const val = e.target.value;
                const desktopSearch = document.getElementById('searchInput');
                const desktopLoc = document.getElementById('locationInput');

                if (desktopSearch && desktopLoc) {
                    // Map unified input to BOTH search and location for broader results
                    desktopSearch.value = val;
                    desktopLoc.value = ''; // Clear location input to let search handle city too

                    clearTimeout(window.searchTimeout);
                    window.searchTimeout = setTimeout(() => window.fetchJobs(1), 500);
                }
            });
        }
    }

    // Auto-run on load is removed - pages now call MobileJobs.run() explicitly with params

    function toggleSavedView() {
        const toggleBtn = document.getElementById('toggleSavedBtn');
        if (toggleBtn) {
            toggleBtn.click(); // Trigger the desktop toggle logic
        }
    }

    // Return public methods
    return {
        run: run,
        render: render,
        toggleAppliedView: toggleAppliedView,
        toggleSavedView: toggleSavedView
    };
})();
