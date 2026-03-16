/**
 * mobile-course-map.js
 * Mobile-first logic for Academic Course Map.
 * Reuses existing data pipeline. Two views: course listing + blueprint detail.
 */

window.MobileCourseMap = (function () {
    let currentView = 'listing'; // 'listing' or 'blueprint'
    let currentCategory = 'all';
    let currentYear = 'all';
    let currentPage = 1;
    let currentSlug = '';

    const yearFilters = [
        { key: 'all', label: 'All Years', icon: 'fas fa-calendar' },
        { key: '1', label: '1st Year' },
        { key: '2', label: '2nd Year' },
        { key: '3', label: '3rd Year' },
        { key: '4', label: '4th Year' }
    ];

    const categoryFilters = [
        { key: 'all', label: 'All Programs', icon: 'fas fa-th-large' },
        { key: 'AI & Data', label: 'AI & Data' },
        { key: 'Web Dev', label: 'Web Dev' },
        { key: 'Core Engineering', label: 'Core Engineering' },
        { key: 'Product & Design', label: 'Product & Design' }
    ];

    function run() {
        const root = document.getElementById('mobile-root');
        if (!root) return;
        renderListing(root);
    }

    function getInitials() {
        try {
            const name = localStorage.getItem('userName') || 'User';
            return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        } catch (e) { return 'U'; }
    }

    // ============ LISTING VIEW ============
    function renderListing(root) {
        currentView = 'listing';
        const userInitial = getInitials();

        root.innerHTML = `
            ${MobileNav.renderHeader({ userInitial })}

            <div class="mob-cm-header">
                <h1>Academic Course Map</h1>
                <p>Explore dynamic academic pathways and professional skill frameworks tailored for your year</p>
            </div>

            <div class="mob-search-container">
                <div class="mob-unified-search">
                    <i class="fas fa-search"></i>
                    <input type="text" id="mob-course-search" placeholder="Search by title, technology, or keyword..." />
                </div>
            </div>

            <div class="mob-filter-row" id="mob-year-filters">
                ${yearFilters.map(f => `
                    <button class="mob-filter-chip ${f.key === currentYear ? 'active' : ''}" data-year="${f.key}">
                        ${f.icon ? `<i class="${f.icon}"></i>` : ''}${f.label}
                    </button>
                `).join('')}
            </div>

            <div class="mob-filter-row" id="mob-cat-filters">
                ${categoryFilters.map(f => `
                    <button class="mob-filter-chip ${f.key === currentCategory ? 'active' : ''}" data-category="${f.key}">
                        ${f.icon ? `<i class="${f.icon}"></i>` : ''}${f.label}
                    </button>
                `).join('')}
            </div>

            <div id="mob-courses-container">
                <div style="text-align:center;padding:50px;">
                    <i class="fas fa-spinner fa-spin fa-2x" style="color:#C2491F;"></i>
                    <p style="margin-top:12px;color:#5f6b7a;font-size:0.85rem;">Loading courses...</p>
                </div>
            </div>

            <div id="mob-pagination-area"></div>

            ${MobileNav.renderBottomNav("more")}
            ${MobileNav.renderSidenav()}
        `;

        setTimeout(() => MobileNav.initSidenavEvents(), 100);
        bindListingEvents();
        fetchMobileCourses();
    }

    function bindListingEvents() {
        // Year filters
        document.querySelectorAll('#mob-year-filters .mob-filter-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#mob-year-filters .mob-filter-chip').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentYear = btn.dataset.year;
                currentPage = 1;
                fetchMobileCourses();
            });
        });

        // Category filters
        document.querySelectorAll('#mob-cat-filters .mob-filter-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#mob-cat-filters .mob-filter-chip').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentCategory = btn.dataset.category;
                currentPage = 1;
                fetchMobileCourses();
            });
        });

        // Search
        const searchEl = document.getElementById('mob-course-search');
        if (searchEl) {
            searchEl.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    currentPage = 1;
                    fetchMobileCourses();
                }
            });
        }
    }

    async function fetchMobileCourses() {
        const container = document.getElementById('mob-courses-container');
        if (!container) return;

        container.innerHTML = `
            <div style="text-align:center;padding:50px;">
                <i class="fas fa-spinner fa-spin fa-2x" style="color:#C2491F;"></i>
            </div>
        `;

        try {
            const searchVal = document.getElementById('mob-course-search')?.value || '';
            let url = `/api/courses?page=${currentPage}&limit=10`;
            if (currentCategory !== 'all') url += `&category=${currentCategory}`;
            if (currentYear !== 'all') url += `&year=${currentYear}`;
            if (searchVal) url += `&search=${searchVal}`;

            const res = await apiFetch(url);
            if (res.success) {
                renderMobileCourses(res.data, container);
                renderMobilePagination(res.page, res.pages);
            }
        } catch (err) {
            container.innerHTML = `
                <div style="text-align:center;padding:50px;color:#e74c3c;">
                    <i class="fas fa-exclamation-triangle" style="font-size:2rem;margin-bottom:10px;display:block;"></i>
                    Failed to load courses
                </div>
            `;
        }
    }

    function renderMobileCourses(courses, container) {
        if (!courses || courses.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:60px;color:#5f6b7a;">
                    <i class="fas fa-search-minus" style="font-size:3rem;opacity:0.3;margin-bottom:15px;display:block;"></i>
                    No courses found matching your search.
                </div>
            `;
            return;
        }

        container.innerHTML = courses.map(course => {
            const yearStr = course.eligibleYears ? course.eligibleYears.map(y => y + getSuffix(y) + ' Year').join(' & ') : '';
            const yearBadge = course.eligibleYears ? course.eligibleYears.map(y => y + getSuffix(y)).join(' ') + ' YEAR' : '';
            const rolesPreview = course.jobRoles && course.jobRoles.length
                ? course.jobRoles.slice(0, 2).join(' – ') + '...'
                : 'Career discovery...';
            const skills = (course.skillsRequired || []).slice(0, 4);
            const startDate = course.startDate ? formatDate(course.startDate) : '';
            const endDate = course.endDate ? formatDate(course.endDate) : '';

            return `
                <div class="mob-course-card">
                    <div class="mob-card-meta">
                        <div class="mob-level-badges">
                            <span class="mob-level-pill mob-level-${course.level}">${course.level}</span>
                        </div>
                        ${course.eligibleYears && course.eligibleYears.length ? `<span class="mob-year-badge-right">${yearStr}</span>` : ''}
                    </div>
                    <div class="mob-course-title">${course.title}</div>
                    <div class="mob-course-desc">${course.summaryLine || ''}</div>

                    <div class="mob-role-preview">
                        <div class="mob-role-icon"><i class="fas fa-route"></i></div>
                        <span>${rolesPreview}</span>
                    </div>

                    <div class="mob-skill-chips">
                        ${skills.map(s => `<span class="mob-skill-chip">${s}</span>`).join('')}
                        ${(course.skillsRequired || []).length > 4 ? `<span class="mob-skill-chip" style="color:#8f9aaa;">+${course.skillsRequired.length - 4}</span>` : ''}
                    </div>

                    <div class="mob-card-actions">
                        <button class="mob-btn-explore" onclick="MobileCourseMap.openBlueprint('${course.slug}')">
                            <i class="fas fa-compass"></i> Explore Blueprint
                        </button>
                        ${course.roadmapPdfUrl ? `
                            <button class="mob-btn-explore-outline" onclick="MobileCourseMap.downloadPdf('${course.slug}')">
                                <i class="fas fa-file-pdf"></i> Download PDF
                            </button>
                        ` : ''}
                    </div>

                    ${startDate && endDate ? `
                        <div class="mob-course-date">
                            <i class="fas fa-calendar-alt"></i> ${startDate} → ${endDate}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    function renderMobilePagination(current, total) {
        const area = document.getElementById('mob-pagination-area');
        if (!area || total <= 1) { if (area) area.innerHTML = ''; return; }

        area.innerHTML = `
            <div class="mob-pagination">
                <button class="mob-page-btn" onclick="MobileCourseMap.changePage(${current - 1})" ${current <= 1 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i>
                </button>
                <span class="mob-page-info">Page <span class="current">${current}</span> / ${total}</span>
                <button class="mob-page-btn" onclick="MobileCourseMap.changePage(${current + 1})" ${current >= total ? 'disabled' : ''}>
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        `;
    }

    // ============ BLUEPRINT VIEW ============
    async function openBlueprint(slug) {
        currentView = 'blueprint';
        currentSlug = slug;

        const root = document.getElementById('mobile-root');
        if (!root) return;

        root.innerHTML = `
            ${MobileNav.renderHeader({ userInitial: getInitials() })}
            <div style="text-align:center;padding:80px;">
                <i class="fas fa-spinner fa-spin fa-2x" style="color:#C2491F;"></i>
                <p style="margin-top:12px;color:#5f6b7a;">Loading blueprint...</p>
            </div>
            ${MobileNav.renderBottomNav("more")}
            ${MobileNav.renderSidenav()}
        `;

        setTimeout(() => MobileNav.initSidenavEvents(), 100);

        try {
            const course = await apiFetch(`/api/courses/${slug}`);
            const data = course.success !== undefined ? (course.data || course) : course;
            renderBlueprint(root, data);
        } catch (err) {
            root.innerHTML = `
                ${MobileNav.renderHeader({ userInitial: getInitials() })}
                <button class="mob-back-btn" onclick="MobileCourseMap.backToListing()">
                    <i class="fas fa-arrow-left"></i> Back
                </button>
                <div style="text-align:center;padding:60px;color:#e74c3c;">
                    <i class="fas fa-exclamation-triangle" style="font-size:2rem;margin-bottom:10px;display:block;"></i>
                    Failed to load blueprint
                </div>
                ${MobileNav.renderBottomNav("more")}
                ${MobileNav.renderSidenav()}
            `;
            setTimeout(() => MobileNav.initSidenavEvents(), 100);
        }
    }

    function renderBlueprint(root, c) {
        const phases = c.steps || c.phases || [];
        const jobRoles = c.jobRoles || [];
        const techStack = c.skillsRequired || c.techStack || [];
        const hiringCompanies = c.topCompanies || c.hiringCompanies || c.topHiring || [];
        const matchScore = c.aiRecommendedScore || c.matchScore || 0;
        const yearStr = c.eligibleYears ? 'Year ' + c.eligibleYears.join(', ') : '';
        const startDate = c.startDate ? formatDate(c.startDate) : '';
        const endDate = c.endDate ? formatDate(c.endDate) : '';

        // Build timeline: use jobRoles as professional pathway, fallback to phases/steps
        const timelineItems = jobRoles.length > 0
            ? jobRoles.map((role, i) => ({ title: role, description: phases[i] ? (phases[i].description || phases[i].details || '') : '' }))
            : phases.map(p => ({ title: p.title || p.role || '', description: p.description || p.details || '' }));

        root.innerHTML = `
            ${MobileNav.renderHeader({ userInitial: getInitials() })}

            <button class="mob-back-btn" onclick="MobileCourseMap.backToListing()">
                <i class="fas fa-arrow-left"></i> Back to Course Map
            </button>

            <!-- Blueprint Header Card -->
            <div class="mob-bp-title-card">
                <h1>${c.title}</h1>
                <p>${c.summaryLine || c.description || ''}</p>
            </div>

            <!-- Meta Strip -->
            <div class="mob-bp-meta-strip">
                <div class="mob-bp-meta-item">
                    <div class="mob-bp-meta-label">INTENSITY</div>
                    <div class="mob-bp-meta-value">${c.level || 'N/A'}</div>
                </div>
                <div class="mob-bp-meta-item">
                    <div class="mob-bp-meta-label">DURATION</div>
                    <div class="mob-bp-meta-value">${c.durationEstimate || c.duration || '2 Months'}</div>
                </div>
                <div class="mob-bp-meta-item">
                    <div class="mob-bp-meta-label">YEARS</div>
                    <div class="mob-bp-meta-value">${yearStr || 'All'}</div>
                </div>
                <div class="mob-bp-meta-item">
                    <div class="mob-bp-meta-label">POPULARITY</div>
                    <div class="mob-bp-meta-value">${c.viewCount || c.views || 0} Views</div>
                </div>
            </div>

            <!-- Two Column: Timeline + Right Sidebar -->
            <div class="mob-bp-grid">
                <!-- LEFT: Blueprint Overview Timeline -->
                <div class="mob-bp-left">
                    <div class="mob-bp-section-title"><i class="fas fa-stream"></i> Blueprint Overview</div>
                    ${timelineItems.length > 0 ? `
                        <div class="mob-timeline">
                            ${timelineItems.map((p, i) => `
                                <div class="mob-timeline-entry">
                                    <div class="mob-timeline-dot"></div>
                                    <div class="mob-timeline-phase">PHASE ${i + 1}</div>
                                    <div class="mob-timeline-title">${p.title}</div>
                                    ${p.description ? `<div class="mob-timeline-desc">${p.description}</div>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p style="color:#8f9aaa;font-size:0.85rem;">No phases available.</p>'}
                </div>

                <!-- RIGHT: Tech + Score + Hiring -->
                <div class="mob-bp-right">
                    <!-- Tech Stack -->
                    ${techStack.length > 0 ? `
                        <div class="mob-tech-section">
                            <div class="mob-bp-section-title"><i class="fas fa-microchip"></i> Tech Stack Units</div>
                            <div class="mob-tech-chips">
                                ${techStack.map(t => `<span class="mob-tech-chip">${t}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- Match Score -->
                    ${matchScore > 0 ? `
                        <div class="mob-match-card">
                            <div class="mob-match-circle">${matchScore}</div>
                            <div class="mob-match-label">AI MATCH SCORE</div>
                            <div class="mob-match-sub">Elevate your potential, strength of your profile score.</div>
                        </div>
                    ` : ''}

                    <!-- Hiring Companies -->
                    ${hiringCompanies.length > 0 ? `
                        <div class="mob-hiring-section">
                            <div class="mob-bp-section-title"><i class="fas fa-building"></i> Top Hiring Units</div>
                            ${hiringCompanies.map(h => `
                                <div class="mob-hiring-item">
                                    <div class="mob-hiring-dot"></div>
                                    <div class="mob-hiring-name">${typeof h === 'string' ? h : h.name}</div>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>

            <!-- Date Bar -->
            ${startDate && endDate ? `
                <div class="mob-date-bar">
                    <i class="fas fa-calendar-alt"></i> ${startDate} → ${endDate}
                </div>
            ` : ''}

            <!-- Download -->
            <button class="mob-download-btn" onclick="MobileCourseMap.downloadPdf('${c.slug}')">
                <i class="fas fa-download"></i> Download Roadmap PDF
            </button>

            ${MobileNav.renderBottomNav("more")}
            ${MobileNav.renderSidenav()}
        `;

        setTimeout(() => MobileNav.initSidenavEvents(), 100);
        root.scrollTo({ top: 0 });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function backToListing() {
        const root = document.getElementById('mobile-root');
        if (root) renderListing(root);
    }

    async function downloadPdf(slug) {
        try {
            const res = await apiFetch(`/api/courses/${slug}/download`);
            if (res.success && res.downloadUrl) {
                window.open(res.downloadUrl, '_blank');
            } else {
                Swal.fire('Standby', 'PDF Blueprint is being prepared.', 'info');
            }
        } catch (err) {
            Swal.fire('Info', 'PDF not available yet.', 'info');
        }
    }

    function changePage(page) {
        if (page < 1) return;
        currentPage = page;
        fetchMobileCourses();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Helpers
    function getSuffix(n) {
        n = parseInt(n);
        if (n === 1) return 'st';
        if (n === 2) return 'nd';
        if (n === 3) return 'rd';
        return 'th';
    }

    function formatDate(d) {
        if (!d) return '';
        return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    return { run, openBlueprint, backToListing, changePage, downloadPdf };
})();
