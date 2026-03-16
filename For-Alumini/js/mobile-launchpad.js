/**
 * mobile-launchpad.js (Alumni)
 * Mobile-first logic for Alumni Launch Pad page.
 * Reuses LaunchPad shared data pipeline.
 * Three views: Journey Steps, Innovation Feed, Submit Idea.
 */

window.MobileLaunchpad = (function () {
    let currentTab = 'feed'; // 'journey' | 'feed' | 'submit'
    let currentDomain = '';
    let currentPage = 1;

    const stats = [
        { number: '500+', label: 'Ideas Supported' },
        { number: '200+', label: 'Projects Funded' },
        { number: '85%', label: 'Success Rate' },
        { number: '50+', label: 'Industry Partners' }
    ];

    const journeySteps = [
        { num: '01', title: 'Validate Your Idea', desc: 'Pressure-test your concept and shape it into a scalable product with market potential.' },
        { num: '02', title: 'Get Funding', desc: 'Access incubation support, grants, and investor connections for your innovation.' },
        { num: '03', title: 'Build With Experts', desc: 'Professors, industry mentors, and technical experts guide you through development.' },
        { num: '04', title: 'Find Your Team', desc: 'Connect with designers, developers, marketers, and business strategists.' },
        { num: '05', title: 'Create The Prototype', desc: 'Build functional prototypes and minimum viable products in state-of-the-art labs.' },
        { num: '06', title: 'Launch To Market', desc: 'Marketing, branding, and business development teams help launch your product.' },
        { num: '07', title: 'Protect Your Innovation', desc: 'Get guidance on patents, trademarks, copyrights, and legal frameworks.' },
        { num: '08', title: 'Scale Without Limits', desc: 'From early traction to rapid expansion, we provide ongoing support.' }
    ];

    const domainFilters = [
        { key: '', label: 'All Domains', icon: 'fas fa-th-large' },
        { key: 'AI', label: 'AI/ML' },
        { key: 'Web', label: 'Web Dev' },
        { key: 'FinTech', label: 'FinTech' },
        { key: 'EdTech', label: 'EdTech' },
        { key: 'Health', label: 'Health' },
        { key: 'Research', label: 'Research' }
    ];

    function run() {
        const root = document.getElementById('mobile-root');
        if (!root) return;
        renderPage(root);
    }

    function getInitials() {
        try {
            const name = localStorage.getItem('userName') || 'User';
            return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        } catch (e) { return 'U'; }
    }

    function renderPage(root) {
        const Nav = window.AlumniMobileNav || window.MobileNav;
        if (!Nav) return;
        const userInitial = getInitials();

        root.innerHTML = `
            ${Nav.renderHeader({ userInitial })}

            <div class="mob-lp-header">
                <h1>Launch Pad</h1>
                <p>Transform your ideas into impactful ventures with mentorship, resources, and funding support</p>
            </div>

            <!-- Stats -->
            <div class="mob-stats-row">
                ${stats.map(s => `
                    <div class="mob-stat-card">
                        <div class="mob-stat-number">${s.number}</div>
                        <div class="mob-stat-label">${s.label}</div>
                    </div>
                `).join('')}
            </div>

            <!-- Quick Actions -->
            <div class="mob-quick-actions">
                <div class="mob-quick-action-card" onclick="MobileLaunchpad.switchTab('journey')">
                    <div class="mob-quick-action-icon"><i class="fas fa-route"></i></div>
                    <div class="mob-quick-action-label">Your Journey</div>
                </div>
                <div class="mob-quick-action-card" onclick="MobileLaunchpad.switchTab('submit')">
                    <div class="mob-quick-action-icon"><i class="fas fa-lightbulb"></i></div>
                    <div class="mob-quick-action-label">Submit Idea</div>
                </div>
            </div>

            <!-- Tab Navigation -->
            <div class="mob-lp-tabs" id="mob-lp-tabs">
                <button class="mob-lp-tab ${currentTab === 'journey' ? 'active' : ''}" data-tab="journey">
                    <i class="fas fa-map-signs"></i>8 Steps
                </button>
                <button class="mob-lp-tab ${currentTab === 'feed' ? 'active' : ''}" data-tab="feed">
                    <i class="fas fa-rocket"></i>Innovation Feed
                </button>
                <button class="mob-lp-tab ${currentTab === 'submit' ? 'active' : ''}" data-tab="submit">
                    <i class="fas fa-paper-plane"></i>Submit Idea
                </button>
            </div>

            <!-- Tab Content -->
            <div id="mob-lp-content"></div>

            ${Nav.renderBottomNav("more")}
            ${Nav.renderSidenav()}
        `;

        setTimeout(() => Nav.initSidenavEvents(), 100);
        bindTabEvents();
        renderTabContent();
    }

    function bindTabEvents() {
        document.querySelectorAll('#mob-lp-tabs .mob-lp-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#mob-lp-tabs .mob-lp-tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentTab = btn.dataset.tab;
                renderTabContent();
            });
        });
    }

    function renderTabContent() {
        const content = document.getElementById('mob-lp-content');
        if (!content) return;

        if (currentTab === 'journey') renderJourney(content);
        else if (currentTab === 'feed') renderFeed(content);
        else if (currentTab === 'submit') renderSubmit(content);
    }

    // ============ JOURNEY VIEW ============
    function renderJourney(container) {
        container.innerHTML = `
            <div style="margin-bottom:10px;">
                <div style="font-size:1.1rem;font-weight:800;color:#0A1A2F;margin-bottom:6px;">
                    Your Journey in <span style="color:#C2491F;">8 Steps</span>
                </div>
                <div style="font-size:0.8rem;color:#5f6b7a;">From idea validation to market launch</div>
            </div>
            ${journeySteps.map(step => `
                <div class="mob-step-card">
                    <div class="mob-step-num">${step.num}</div>
                    <div class="mob-step-content">
                        <h5>${step.title}</h5>
                        <p>${step.desc}</p>
                    </div>
                </div>
            `).join('')}
        `;
    }

    // ============ FEED VIEW ============
    function renderFeed(container) {
        container.innerHTML = `
            <div class="mob-lp-search-container">
                <div class="mob-lp-unified-search">
                    <i class="fas fa-search"></i>
                    <input type="text" id="mob-lp-search" placeholder="Search projects, ideas, keywords..." />
                </div>
            </div>

            <div class="mob-lp-filter-row" id="mob-lp-domain-filters">
                ${domainFilters.map(f => `
                    <button class="mob-lp-filter-chip ${f.key === currentDomain ? 'active' : ''}" data-domain="${f.key}">
                        ${f.icon ? `<i class="${f.icon}"></i> ` : ''}${f.label}
                    </button>
                `).join('')}
            </div>

            <div id="mob-projects-container">
                <div style="text-align:center;padding:50px;">
                    <i class="fas fa-spinner fa-spin fa-2x" style="color:#C2491F;"></i>
                    <p style="margin-top:12px;color:#5f6b7a;font-size:0.85rem;">Loading projects...</p>
                </div>
            </div>

            <div id="mob-lp-pagination-area"></div>
        `;

        bindFeedEvents();
        fetchMobileProjects();
    }

    function bindFeedEvents() {
        document.querySelectorAll('#mob-lp-domain-filters .mob-lp-filter-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#mob-lp-domain-filters .mob-lp-filter-chip').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentDomain = btn.dataset.domain;
                currentPage = 1;
                fetchMobileProjects();
            });
        });

        const searchEl = document.getElementById('mob-lp-search');
        if (searchEl) {
            searchEl.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    currentPage = 1;
                    fetchMobileProjects();
                }
            });
        }
    }

    async function fetchMobileProjects() {
        const container = document.getElementById('mob-projects-container');
        if (!container) return;

        container.innerHTML = `
            <div style="text-align:center;padding:50px;">
                <i class="fas fa-spinner fa-spin fa-2x" style="color:#C2491F;"></i>
            </div>
        `;

        try {
            const searchVal = document.getElementById('mob-lp-search')?.value || '';
            let url = `/api/launchpad/projects?page=${currentPage}&limit=10`;
            if (currentDomain) url += `&domain=${currentDomain}`;
            if (searchVal) url += `&search=${encodeURIComponent(searchVal)}`;

            const res = await apiFetch(url);
            if (res && res.success) {
                renderMobileProjects(res.data, container);
                renderMobilePagination(res.pagination);
            }
        } catch (err) {
            container.innerHTML = `
                <div style="text-align:center;padding:50px;color:#e74c3c;">
                    <i class="fas fa-exclamation-triangle" style="font-size:2rem;margin-bottom:10px;display:block;"></i>
                    Failed to load projects
                </div>
            `;
        }
    }

    function renderMobileProjects(projects, container) {
        if (!projects || projects.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:60px;color:#5f6b7a;">
                    <i class="fas fa-rocket" style="font-size:3rem;opacity:0.3;margin-bottom:15px;display:block;"></i>
                    No projects found. Be the first to start one!
                </div>
            `;
            return;
        }

        container.innerHTML = projects.map(project => {
            const hasScore = project.evaluation && project.evaluation.startupScore > 0;
            const stageLabel = (project.stage || 'idea').replace(/_/g, ' ').toUpperCase();
            const typeClass = project.projectType === 'startup' ? 'mob-proj-type-startup'
                : project.projectType === 'research' ? 'mob-proj-type-research'
                    : 'mob-proj-type-default';
            const skills = (project.skillsRequired || []).slice(0, 4);

            return `
                <div class="mob-project-card">
                    <div class="mob-proj-meta">
                        <div>
                            <span class="mob-proj-type-badge ${typeClass}">${project.projectType.toUpperCase()}</span>
                            ${project.projectType === 'startup' ? `<span class="mob-proj-stage-badge">${stageLabel}</span>` : ''}
                        </div>
                        <span class="mob-proj-domain-badge">${project.domain}</span>
                    </div>

                    <div class="mob-proj-title">${project.title}</div>
                    <div class="mob-proj-desc">${project.description}</div>

                    ${hasScore ? `
                        <div class="mob-proj-score">
                            <div class="mob-score-bar-bg">
                                <div class="mob-score-bar-fill" style="width:${project.evaluation.startupScore}%"></div>
                            </div>
                            <span class="mob-score-label">${project.evaluation.startupScore} Score</span>
                        </div>
                    ` : ''}

                    <div class="mob-proj-skills">
                        ${skills.map(s => `<span class="mob-proj-skill">${s}</span>`).join('')}
                        ${(project.skillsRequired || []).length > 4 ? `<span class="mob-proj-skill" style="color:#8f9aaa;">+${project.skillsRequired.length - 4}</span>` : ''}
                    </div>

                    <div class="mob-proj-meta-row">
                        <span><i class="fas fa-users"></i> ${project.teamSizeNeeded} needed</span>
                        <span><i class="fas fa-rocket"></i> ${stageLabel}</span>
                    </div>

                    <div class="mob-proj-actions">
                        <button class="mob-btn-details" onclick="LaunchPad.viewDetails('${project._id}')">
                            <i class="fas fa-info-circle"></i> Details
                        </button>
                        <button class="mob-btn-apply" onclick="LaunchPad.openApplyModal('${project._id}', '${project.title.replace(/'/g, "\\'")}')">
                            <i class="fas fa-hand-paper"></i> Apply
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderMobilePagination(meta) {
        const area = document.getElementById('mob-lp-pagination-area');
        if (!area || !meta || meta.pages <= 1) { if (area) area.innerHTML = ''; return; }

        area.innerHTML = `
            <div class="mob-lp-pagination">
                <button class="mob-lp-page-btn" onclick="MobileLaunchpad.changePage(${meta.page - 1})" ${meta.page <= 1 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i>
                </button>
                <span class="mob-lp-page-info">Page <span class="current">${meta.page}</span> / ${meta.pages}</span>
                <button class="mob-lp-page-btn" onclick="MobileLaunchpad.changePage(${meta.page + 1})" ${meta.page >= meta.pages ? 'disabled' : ''}>
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        `;
    }

    // ============ SUBMIT VIEW ============
    function renderSubmit(container) {
        container.innerHTML = `
            <div class="mob-submit-section">
                <h2>Share Your Vision</h2>
                <p>Submit your innovative idea through one of these options</p>

                <div class="mob-submit-options">
                    <div class="mob-submit-option" onclick="openPostModal()">
                        <div class="mob-submit-icon"><i class="fas fa-file-alt"></i></div>
                        <div class="mob-submit-text">
                            <h4>Detailed Idea Form</h4>
                            <p>Fill out a comprehensive form to explain your concept, problem, and solution</p>
                        </div>
                    </div>

                    <div class="mob-submit-option" onclick="openVideoUpload()">
                        <div class="mob-submit-icon"><i class="fas fa-video"></i></div>
                        <div class="mob-submit-text">
                            <h4>Video Pitch</h4>
                            <p>Upload a video explaining your idea (max 5 minutes) with supporting documents</p>
                        </div>
                    </div>
                </div>

                <div class="mob-security-note">
                    <i class="fas fa-shield-alt"></i>
                    All submissions are confidential and protected by non-disclosure agreements. Response within 3-5 business days.
                </div>
            </div>
        `;
    }

    // ============ PUBLIC METHODS ============
    function switchTab(tab) {
        currentTab = tab;
        document.querySelectorAll('#mob-lp-tabs .mob-lp-tab').forEach(b => {
            b.classList.toggle('active', b.dataset.tab === tab);
        });
        renderTabContent();
    }

    function changePage(page) {
        if (page < 1) return;
        currentPage = page;
        fetchMobileProjects();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    return { run, switchTab, changePage };
})();

// Auto-init on mobile
if (window.innerWidth <= 768) {
    MobileLaunchpad.run();
}
