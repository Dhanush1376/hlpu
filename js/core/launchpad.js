/**
 * LaunchPad Core Logic
 * Handles dynamic project feed, applications, and real-time updates.
 */

const LaunchPad = {
    projects: [],
    filters: {
        domain: '',
        projectType: '',
        search: '',
        page: 1
    },
    userRole: localStorage.getItem('role'),
    token: localStorage.getItem('token'),

    init: function () {
        console.log('[LaunchPad] Initializing...');
        this.loadProjects();
        this.setupEventListeners();
        this.initSockets();
    },

    // API Calls
    loadProjects: async function () {
        try {
            const { domain, projectType, search, page } = this.filters;
            let url = `/api/launchpad/projects?page=${page}&limit=12`;
            if (domain) url += `&domain=${domain}`;
            if (projectType) url += `&projectType=${projectType}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;

            const result = await apiFetch(url);
            if (result && result.success) {
                this.projects = result.data;
                this.renderProjects(result.data);
                this.renderPagination(result.pagination);
            }
        } catch (err) {
            console.error('[LaunchPad] Failed to load projects:', err);
        }
    },

    applyToProject: async function (projectId, message) {
        try {
            const result = await apiFetch(`/api/launchpad/apply/${projectId}`, {
                method: 'POST',
                body: JSON.stringify({ message })
            });

            if (result && result.success) {
                Swal.fire('Success', 'Application submitted successfully!', 'success');
                this.loadProjects();
            }
        } catch (err) {
            Swal.fire('Error', err.message || 'An error occurred during application', 'error');
        }
    },

    createProject: async function (formData) {
        try {
            const result = await apiFetch('/api/launchpad/projects', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            if (result && result.success) {
                Swal.fire('Success', 'Project posted successfully!', 'success');
                // Standardized modal ID: postProjectModal
                if (document.getElementById('postProjectModal')) {
                    document.getElementById('postProjectModal').classList.remove('active');
                    document.body.style.overflow = 'auto';
                }
                this.loadProjects();
            }
        } catch (err) {
            Swal.fire('Error', err.message || 'An error occurred while posting', 'error');
        }
    },

    // UI Rendering
    renderProjects: function (projects) {
        const container = document.getElementById('projectsContainer');
        if (!container) return;

        if (projects.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-rocket fa-3x mb-3" style="color: var(--ember); opacity: 0.3;"></i>
                    <p style="color: #5f6b7a;">No projects found. Be the first to start one!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = projects.map(project => {
            const hasScore = project.evaluation && project.evaluation.startupScore > 0;
            const stageLabel = (project.stage || 'idea').replace(/_/g, ' ').toUpperCase();

            return `
                <div class="col-lg-4 col-md-6 mb-4">
                    <div class="step-card cursor-glow h-100 project-card">
                        <div class="badge-domain">${project.domain}</div>
                        <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
                            <div class="project-type-tag">${project.projectType.toUpperCase()}</div>
                            ${project.projectType === 'startup' ? `<span style="font-size: 0.6rem; font-weight: 800; background: var(--ember); color: white; padding: 2px 8px; border-radius: 4px;">${stageLabel}</span>` : ''}
                        </div>
                        
                        <h5 class="mt-2">${project.title}</h5>
                        <p class="project-desc">${project.description.substring(0, 100)}${project.description.length > 100 ? '...' : ''}</p>
                        
                        ${hasScore ? `
                            <div style="margin: 15px 0; display: flex; align-items: center; gap: 10px;">
                                <div style="flex-grow: 1; height: 6px; background: rgba(0,0,0,0.05); border-radius: 10px; overflow: hidden;">
                                    <div style="width: ${project.evaluation.startupScore}%; height: 100%; background: linear-gradient(90deg, var(--ember), var(--gilt));"></div>
                                </div>
                                <span style="font-size: 0.75rem; font-weight: 800; color: var(--ember);">${project.evaluation.startupScore} Score</span>
                            </div>
                        ` : ''}

                        <div class="skills-tags mt-3">
                            ${project.skillsRequired.slice(0, 3).map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                        </div>

                        <div class="project-meta mt-4 py-2 border-top border-bottom d-flex justify-content-between align-items-center">
                            <span class="meta-item"><i class="fas fa-users"></i> ${project.teamSizeNeeded} needed</span>
                            <span class="meta-item"><i class="fas fa-rocket"></i> Stage: ${project.projectType === 'startup' ? stageLabel : 'IDEA'}</span>
                        </div>

                        <div class="mt-4 d-flex gap-2">
                            <button class="btn-heritage flex-grow-1" onclick="LaunchPad.viewDetails('${project._id}')">
                                <i class="fas fa-info-circle"></i> Details
                            </button>
                            ${this.renderActionButtons(project)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        if (window.initCursorGlow) window.initCursorGlow();
    },

    renderActionButtons: function (project) {
        const userId = localStorage.getItem('userId');
        const isOwner = project.postedBy === userId || (project.owner && project.owner._id === userId);

        if (isOwner) {
            return `
                <button class="btn-connect" onclick="LaunchPad.manageProject('${project._id}')">
                    <i class="fas fa-tasks"></i> Dashboard
                </button>
            `;
        }
        return `
            <button class="btn-connect flex-grow-1" onclick="LaunchPad.openApplyModal('${project._id}', '${project.title}')">
                <i class="fas fa-paper-plane"></i> Apply
            </button>
        `;
    },

    renderPagination: function (meta) {
        const container = document.getElementById('paginationContainer');
        if (!container || !meta) return;

        let html = '';
        for (let i = 1; i <= meta.pages; i++) {
            html += `
                <button class="page-btn ${meta.page === i ? 'active' : ''}" onclick="LaunchPad.changePage(${i})">
                    ${i}
                </button>
            `;
        }
        container.innerHTML = html;
    },

    // Event Helpers
    changePage: function (page) {
        this.filters.page = page;
        this.loadProjects();
        document.getElementById('projects-feed').scrollIntoView({ behavior: 'smooth' });
    },

    openApplyModal: function (id, title) {
        Swal.fire({
            title: `Apply to ${title}`,
            input: 'textarea',
            inputPlaceholder: 'Tell the project lead why you want to join...',
            inputAttributes: {
                'aria-label': 'Application message'
            },
            showCancelButton: true,
            confirmButtonText: 'Submit Application',
            confirmButtonColor: '#C2491F',
            cancelButtonColor: '#d33',
            background: '#FFF8F0',
            preConfirm: (message) => {
                if (!message) {
                    Swal.showValidationMessage('Please enter a message');
                }
                return message;
            }
        }).then((result) => {
            if (result.isConfirmed) {
                this.applyToProject(id, result.value);
            }
        });
    },

    viewDetails: async function (id) {
        try {
            const result = await apiFetch(`/api/launchpad/projects/${id}`);

            if (result && result.success) {
                const p = result.data;
                Swal.fire({
                    title: p.title,
                    html: `
                        <div class="text-left">
                            <p><strong>Domain:</strong> ${p.domain}</p>
                            <p><strong>Type:</strong> ${p.projectType}</p>
                            <p><strong>Posted By:</strong> ${p.postedBy ? p.postedBy.name : (p.owner ? p.owner.name : 'Unknown')}</p>
                            <p class="mt-3" style="max-height: 200px; overflow-y: auto;">${p.description}</p>
                            <div class="mt-3">
                                <strong>Skills Needed:</strong><br>
                                ${p.skillsRequired.map(s => `<span class="badge badge-secondary mr-1">${s}</span>`).join('')}
                            </div>
                        </div>
                    `,
                    confirmButtonColor: '#C2491F',
                });
            }
        } catch (err) {
            Swal.fire('Error', 'Failed to fetch details', 'error');
        }
    },

    setupEventListeners: function () {
        const searchInput = document.getElementById('projectSearch');
        if (searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                this.filters.search = e.target.value;
                this.filters.page = 1;
                this.loadProjects();
            }, 500));
        }

        const domainFilter = document.getElementById('domainFilter');
        if (domainFilter) {
            domainFilter.addEventListener('change', (e) => {
                this.filters.domain = e.target.value;
                this.filters.page = 1;
                this.loadProjects();
            });
        }
    },

    initSockets: function () {
        if (window.socket) {
            window.socket.on('launchpad:application:new', (data) => {
                Toast.fire({
                    icon: 'info',
                    title: `New application for your project: ${data.projectTitle}`
                });
                this.loadProjects();
            });

            window.socket.on('launchpad:application:accepted', (data) => {
                Swal.fire('Congratulations!', `Your application for "${data.projectTitle}" was accepted!`, 'success');
            });

            window.socket.on('launchpad:project:new', (data) => {
                Toast.fire({
                    icon: 'success',
                    title: `New project posted: ${data.title}`
                });
                this.loadProjects();
            });
        }
    },

    manageProject: async function (id) {
        try {
            const result = await apiFetch(`/api/launchpad/projects/${id}`);
            if (result && result.success) {
                const startup = result.data;
                this.renderStartupDashboard(startup);
            }
        } catch (err) {
            Swal.fire('Error', 'Failed to load startup dashboard', 'error');
        }
    },

    renderStartupDashboard: function (startup) {
        const stageLabel = (startup.stage || 'idea').replace(/_/g, ' ').toUpperCase();
        const score = startup.evaluation ? startup.evaluation.startupScore : 0;
        const readiness = startup.investorReadiness ? startup.investorReadiness.readinessScore : 0;

        Swal.fire({
            title: `🚀 ${startup.title} - Incubator Dashboard`,
            width: '900px',
            background: '#FFF8F0',
            html: `
                <div class="text-left p-3">
                    <div class="row">
                        <div class="col-md-4">
                            <div class="stat-item mb-3" style="background: white; border: 1px solid var(--ember);">
                                <div class="stat-number" style="font-size: 1.5rem;">${stageLabel}</div>
                                <div class="stat-label">Current Stage</div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="stat-item mb-3" style="background: white; border: 1px solid var(--ember);">
                                <div class="stat-number" style="font-size: 1.5rem;">${score}</div>
                                <div class="stat-label">Startup Score</div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="stat-item mb-3" style="background: white; border: 1px solid var(--ember);">
                                <div class="stat-number" style="font-size: 1.5rem;">${readiness}%</div>
                                <div class="stat-label">Investor Readiness</div>
                            </div>
                        </div>
                    </div>

                    <div class="mt-4">
                        <h6 class="font-weight-bold"><i class="fas fa-users text-primary"></i> Founder Team</h6>
                        <div class="d-flex flex-wrap gap-2 mt-2">
                            <span class="badge badge-pill badge-primary p-2">You (Founding Member)</span>
                            ${(startup.team || []).map(m => `<span class="badge badge-pill badge-info p-2">${m.user.name || 'Member'} (${m.role})</span>`).join('')}
                            <button class="btn btn-sm btn-outline-primary rounded-circle" onclick="LaunchPad.addTeamMember('${startup._id}')">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    </div>

                    <div class="mt-4">
                        <h6 class="font-weight-bold"><i class="fas fa-tasks text-success"></i> Milestones</h6>
                        <div class="list-group mt-2">
                            ${(startup.milestones || []).length > 0 ? startup.milestones.map(m => `
                                <div class="list-group-item d-flex justify-content-between align-items-center">
                                    <span>${m.title}</span>
                                    <input type="checkbox" ${m.status === 'completed' ? 'checked' : ''} onchange="LaunchPad.toggleMilestone('${startup._id}', '${m._id}', this.checked)">
                                </div>
                            `).join('') : '<p class="text-muted small">No milestones added yet.</p>'}
                        </div>
                    </div>

                    <div class="mt-4 p-3 rounded" style="background: rgba(194, 73, 31, 0.05); border-left: 4px solid var(--ember);">
                        <h6 class="font-weight-bold">Investor Readiness Checklist</h6>
                        <div class="row mt-2">
                            <div class="col-6">
                                <label><input type="checkbox" ${startup.investorReadiness?.pitchDeckUploaded ? 'checked' : ''} onchange="LaunchPad.updateReadiness('${startup._id}', 'pitchDeckUploaded', this.checked)"> Pitch Deck</label><br>
                                <label><input type="checkbox" ${startup.investorReadiness?.mvpReady ? 'checked' : ''} onchange="LaunchPad.updateReadiness('${startup._id}', 'mvpReady', this.checked)"> MVP Ready</label>
                            </div>
                            <div class="col-6">
                                <label><input type="checkbox" ${startup.investorReadiness?.tractionMetrics ? 'checked' : ''} onchange="LaunchPad.updateReadiness('${startup._id}', 'tractionMetrics', this.checked)"> Traction</label><br>
                                <label><input type="checkbox" ${startup.investorReadiness?.teamComplete ? 'checked' : ''} onchange="LaunchPad.updateReadiness('${startup._id}', 'teamComplete', this.checked)"> Team Complete</label>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            showCloseButton: true,
            confirmButtonText: 'Close',
            confirmButtonColor: '#C2491F'
        });
    },

    addTeamMember: async function (id) {
        const { value: email } = await Swal.fire({
            title: 'Add Co-founder',
            input: 'email',
            inputLabel: 'Enter email of the student/alumni',
            inputPlaceholder: 'email@hlpu.edu.in',
            showCancelButton: true
        });

        if (email) {
            try {
                const result = await apiFetch(`/api/launchpad/startups/${id}/team`, {
                    method: 'PATCH',
                    body: JSON.stringify({ action: 'add', email, role: 'Co-founder' })
                });
                if (result.success) {
                    Swal.fire('Added!', 'Team member added successfully.', 'success');
                    this.manageProject(id);
                }
            } catch (err) {
                Swal.fire('Error', err.message, 'error');
            }
        }
    },

    toggleMilestone: async function (startupId, milestoneId, isChecked) {
        try {
            await apiFetch(`/api/launchpad/startups/${startupId}/milestones/${milestoneId}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: isChecked ? 'completed' : 'pending' })
            });
        } catch (err) {
            console.error('Failed to update milestone');
        }
    },

    updateReadiness: async function (id, field, value) {
        try {
            const body = {};
            body[field] = value;
            const result = await apiFetch(`/api/launchpad/startups/${id}/readiness`, {
                method: 'PATCH',
                body: JSON.stringify(body)
            });
            if (result.success) {
                this.manageProject(id);
            }
        } catch (err) {
            console.error('Failed to update readiness');
        }
    }
};

// Helper: Debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Global Toast
const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true
});

document.addEventListener('DOMContentLoaded', () => LaunchPad.init());
