/**
 * mobile-admin-courses.js
 * Mobile course management for Admin.
 * Full feature parity with desktop: stats, search, CRUD, full form modal with chips, years, trending, PDF.
 */
(function () {
    if (window.innerWidth > 768) return;

    const Nav = window.AdminMobileNav || window.MobileNav;
    if (!Nav) return;

    document.querySelectorAll('#navbar, .mesh-bg, .dashboard-container, #courseModal').forEach(el => el.style.display = 'none');

    let root = document.getElementById('mobile-root');
    if (!root) { root = document.createElement('div'); root.id = 'mobile-root'; document.body.prepend(root); }

    let allCourses = [];
    let filtered = [];
    let mobPage = 1;
    const PER_PAGE = 10;

    async function init() {
        renderShell();
        try {
            const res = await apiFetch('/api/admin/courses');
            allCourses = res?.data || res || [];
            if (!Array.isArray(allCourses)) allCourses = [];
            filtered = [...allCourses];
            renderContent();
        } catch (err) {
            console.error('[admin-courses]', err);
            document.getElementById('mob-admin-courses-list').innerHTML = '<div class="mob-admin-empty"><i class="fas fa-wifi"></i><h4>Connection Error</h4><p>Could not load courses.</p></div>';
        }
    }

    function renderShell() {
        root.innerHTML = `
            ${Nav.renderHeader({})}
            <div class="mob-admin-welcome">
                <h1>Course Management</h1>
                <p><i class="fas fa-graduation-cap"></i> Curate academic pathways and roadmaps</p>
            </div>
            <div class="mob-admin-search">
                <i class="fas fa-search"></i>
                <input type="text" id="mob-admin-course-search" placeholder="Search courses…" />
            </div>
            <div class="mob-admin-stats" id="mob-admin-course-stats"></div>
            <div style="margin-bottom:16px;">
                <button class="mob-admin-btn mob-admin-btn-primary" style="width:100%;padding:14px;" onclick="window._mobOpenCourseForm()">
                    <i class="fas fa-plus-circle"></i> Add New Course
                </button>
            </div>
            <div id="mob-admin-courses-list">
                <div class="mob-admin-loading"><i class="fas fa-spinner fa-spin"></i><p>Loading courses…</p></div>
            </div>
            <div id="mob-admin-courses-pagination"></div>
            <!-- FULL SCREEN FORM MODAL -->
            <div id="mob-course-modal" class="mob-fullscreen-modal" style="display:none;"></div>
            ${Nav.renderSidenav()}
            ${Nav.renderBottomNav('')}
        `;
        if (Nav.initSidenavEvents) setTimeout(() => Nav.initSidenavEvents(), 100);
        bindEvents();
    }

    function bindEvents() {
        const searchInput = document.getElementById('mob-admin-course-search');
        if (searchInput) {
            let debounce;
            searchInput.addEventListener('input', () => {
                clearTimeout(debounce);
                debounce = setTimeout(() => { mobPage = 1; applyFilter(); }, 350);
            });
        }
    }

    function applyFilter() {
        const query = (document.getElementById('mob-admin-course-search')?.value || '').toLowerCase();
        filtered = allCourses.filter(c => !query || (c.title || '').toLowerCase().includes(query) || (c.category || '').toLowerCase().includes(query) || (c.level || '').toLowerCase().includes(query));
        renderContent();
    }

    function renderContent() {
        const statsEl = document.getElementById('mob-admin-course-stats');
        if (statsEl) {
            const roadmaps = allCourses.filter(c => c.roadmapPdfUrl).length;
            statsEl.innerHTML = `
                <div class="mob-admin-stat-card"><div class="mob-admin-stat-icon"><i class="fas fa-book"></i></div><div class="mob-admin-stat-title">Total</div><div class="mob-admin-stat-value">${allCourses.length}</div></div>
                <div class="mob-admin-stat-card"><div class="mob-admin-stat-icon"><i class="fas fa-route"></i></div><div class="mob-admin-stat-title">Roadmaps</div><div class="mob-admin-stat-value">${roadmaps}</div></div>
                <div class="mob-admin-stat-card"><div class="mob-admin-stat-icon"><i class="fas fa-fire"></i></div><div class="mob-admin-stat-title">Trending</div><div class="mob-admin-stat-value">${allCourses.filter(c => c.isTrending).length}</div></div>
                <div class="mob-admin-stat-card"><div class="mob-admin-stat-icon"><i class="fas fa-check-circle"></i></div><div class="mob-admin-stat-title">Active</div><div class="mob-admin-stat-value">${allCourses.filter(c => c.isActive !== false).length}</div></div>
            `;
        }

        const container = document.getElementById('mob-admin-courses-list');
        if (!container) return;

        if (filtered.length === 0) {
            container.innerHTML = '<div class="mob-admin-empty"><i class="fas fa-search"></i><h4>No Courses Found</h4><p>Try a different search.</p></div>';
            return;
        }

        const totalPages = Math.ceil(filtered.length / PER_PAGE);
        const start = (mobPage - 1) * PER_PAGE;
        const paged = filtered.slice(start, start + PER_PAGE);

        container.innerHTML = paged.map(c => {
            const levelClass = c.level === 'beginner' ? 'role-student' : c.level === 'advanced' ? 'status-rejected' : 'status-pending';
            return `
                <div class="mob-admin-user-card">
                    <div class="mob-admin-user-header">
                        <div class="mob-admin-user-avatar" style="font-size:1rem;"><i class="fas fa-book"></i></div>
                        <div class="mob-admin-user-info">
                            <h3>${c.title || 'Untitled'}</h3>
                            <p class="mob-admin-user-meta">${c.summaryLine || c.category || ''}</p>
                        </div>
                    </div>
                    <div class="mob-admin-user-tags">
                        <span class="mob-admin-tag ${levelClass}">${c.level || 'N/A'}</span>
                        <span class="mob-admin-tag"><i class="fas fa-clock"></i> ${c.durationEstimate || 'N/A'}</span>
                        <span class="mob-admin-tag"><i class="fas fa-layer-group"></i> ${c.category || 'N/A'}</span>
                        ${c.isTrending ? '<span class="mob-admin-tag" style="background:#fff3e0;color:#e65100;"><i class="fas fa-fire"></i> Trending</span>' : ''}
                        ${c.isActive !== false ? '<span class="mob-admin-tag status-approved">Active</span>' : '<span class="mob-admin-tag status-pending">Draft</span>'}
                        ${c.roadmapPdfUrl ? '<span class="mob-admin-tag" style="background:#e3f2fd;color:#1565c0;"><i class="fas fa-file-pdf"></i> Roadmap</span>' : ''}
                    </div>
                    <div class="mob-admin-actions">
                        <button class="mob-admin-btn mob-admin-btn-view" onclick="window._adminViewCourse('${c._id}')"><i class="fas fa-eye"></i> View</button>
                        <button class="mob-admin-btn mob-admin-btn-primary" onclick="window._mobOpenCourseForm('${c._id}')"><i class="fas fa-pen"></i> Edit</button>
                        <button class="mob-admin-btn mob-admin-btn-view" style="background:#fef2f2;color:#dc2626;border-color:#fee2e2;" onclick="window._adminDeleteCourse('${c._id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        }).join('');

        const pagContainer = document.getElementById('mob-admin-courses-pagination');
        if (pagContainer && totalPages > 1) {
            pagContainer.innerHTML = `<div class="mob-admin-pagination">
                <button class="mob-admin-pag-btn" ${mobPage <= 1 ? 'disabled' : ''} onclick="window._adminCoursesPage(${mobPage - 1})"><i class="fas fa-chevron-left"></i></button>
                <span class="mob-admin-pag-info">Page ${mobPage} / ${totalPages}</span>
                <button class="mob-admin-pag-btn" ${mobPage >= totalPages ? 'disabled' : ''} onclick="window._adminCoursesPage(${mobPage + 1})"><i class="fas fa-chevron-right"></i></button>
            </div>`;
        } else if (pagContainer) pagContainer.innerHTML = '';
    }

    window._adminCoursesPage = function (page) { mobPage = page; renderContent(); document.getElementById('mob-admin-courses-list')?.scrollIntoView({ behavior: 'smooth' }); };

    /* =================== FULL FORM MODAL =================== */
    window._mobOpenCourseForm = function (editId) {
        const modal = document.getElementById('mob-course-modal');
        if (!modal) return;
        const c = editId ? allCourses.find(x => x._id === editId) : null;
        const isEdit = !!c;

        modal.innerHTML = `
            <div class="mob-modal-header">
                <button class="mob-modal-back" onclick="window._mobCloseCourseForm()"><i class="fas fa-arrow-left"></i></button>
                <h2>${isEdit ? 'Update Course' : 'Create New Course'}</h2>
                <button class="mob-modal-save" onclick="window._mobSaveCourse('${editId || ''}')"><i class="fas fa-check"></i> Save</button>
            </div>
            <div class="mob-modal-body">
                <!-- Title -->
                <div class="mob-form-group">
                    <label>COURSE TITLE *</label>
                    <input type="text" id="mob-c-title" placeholder="e.g., Senior Frontend Engineer Mastery" value="${c?.title || ''}" />
                </div>
                <!-- Summary -->
                <div class="mob-form-group">
                    <label>SUMMARY LINE *</label>
                    <input type="text" id="mob-c-summary" maxlength="150" placeholder="One-line card summary…" value="${c?.summaryLine || ''}" />
                </div>
                <!-- Description -->
                <div class="mob-form-group">
                    <label>DETAILED DESCRIPTION *</label>
                    <textarea id="mob-c-desc" rows="4" placeholder="Explain the deep value proposition…">${c?.description || ''}</textarea>
                </div>
                <!-- Category & Level -->
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <div class="mob-form-group">
                        <label>CATEGORY</label>
                        <select id="mob-c-cat">
                            <option ${c?.category === 'AI & Data' ? 'selected' : ''}>AI & Data</option>
                            <option ${c?.category === 'Web Dev' ? 'selected' : ''}>Web Dev</option>
                            <option ${c?.category === 'Core Engineering' ? 'selected' : ''}>Core Engineering</option>
                            <option ${c?.category === 'Product & Design' ? 'selected' : ''}>Product & Design</option>
                        </select>
                    </div>
                    <div class="mob-form-group">
                        <label>LEVEL</label>
                        <select id="mob-c-level">
                            <option value="beginner" ${c?.level === 'beginner' ? 'selected' : ''}>Beginner</option>
                            <option value="intermediate" ${c?.level === 'intermediate' ? 'selected' : ''}>Intermediate</option>
                            <option value="advanced" ${c?.level === 'advanced' ? 'selected' : ''}>Advanced</option>
                        </select>
                    </div>
                </div>
                <!-- Duration -->
                <div class="mob-form-group">
                    <label>DURATION ESTIMATE *</label>
                    <input type="text" id="mob-c-duration" placeholder="e.g., 12 Weeks" value="${c?.durationEstimate || ''}" />
                </div>
                <!-- Eligible Years -->
                <div class="mob-form-group">
                    <label>ELIGIBLE YEARS</label>
                    <div class="mob-year-grid">
                        <label class="mob-year-check ${c?.eligibleYears?.includes(1) ? 'active' : ''}"><input type="checkbox" value="1" ${c?.eligibleYears?.includes(1) ? 'checked' : ''}/> 1st</label>
                        <label class="mob-year-check ${c?.eligibleYears?.includes(2) ? 'active' : ''}"><input type="checkbox" value="2" ${c?.eligibleYears?.includes(2) ? 'checked' : ''}/> 2nd</label>
                        <label class="mob-year-check ${c?.eligibleYears?.includes(3) ? 'active' : ''}"><input type="checkbox" value="3" ${c?.eligibleYears?.includes(3) ? 'checked' : ''}/> 3rd</label>
                        <label class="mob-year-check ${c?.eligibleYears?.includes(4) ? 'active' : ''}"><input type="checkbox" value="4" ${c?.eligibleYears?.includes(4) ? 'checked' : ''}/> 4th</label>
                    </div>
                </div>
                <!-- Trending Toggle -->
                <div class="mob-form-group" style="display:flex;justify-content:space-between;align-items:center;">
                    <label style="margin:0;">TRENDING COURSE</label>
                    <label class="mob-toggle"><input type="checkbox" id="mob-c-trending" ${c?.isTrending ? 'checked' : ''}/><span class="mob-toggle-slider"></span></label>
                </div>
                <!-- Job Roles Chips -->
                <div class="mob-form-group">
                    <label>JOB ROLES (Entry → Advanced)</label>
                    <div class="mob-chips-container" id="mob-c-roles">
                        ${(c?.jobRoles || []).map(r => `<span class="mob-chip">${r}<i class="fas fa-times" onclick="this.parentElement.remove()"></i></span>`).join('')}
                        <input type="text" id="mob-c-role-input" placeholder="Add role + Enter" />
                    </div>
                </div>
                <!-- Skills Chips -->
                <div class="mob-form-group">
                    <label>SKILLS REQUIRED</label>
                    <div class="mob-chips-container" id="mob-c-skills">
                        ${(c?.skillsRequired || []).map(s => `<span class="mob-chip">${s}<i class="fas fa-times" onclick="this.parentElement.remove()"></i></span>`).join('')}
                        <input type="text" id="mob-c-skill-input" placeholder="Add skill + Enter" />
                    </div>
                </div>
                <!-- Companies Chips -->
                <div class="mob-form-group">
                    <label>TOP HIRING COMPANIES</label>
                    <div class="mob-chips-container" id="mob-c-companies">
                        ${(c?.topCompanies || []).map(co => `<span class="mob-chip">${co}<i class="fas fa-times" onclick="this.parentElement.remove()"></i></span>`).join('')}
                        <input type="text" id="mob-c-company-input" placeholder="Add company + Enter" />
                    </div>
                </div>
                <!-- PDF Upload -->
                <div class="mob-form-group">
                    <label>ROADMAP BLUEPRINT (PDF)</label>
                    <div class="mob-upload-area" onclick="document.getElementById('mob-c-file').click()">
                        <i class="fas fa-file-pdf"></i>
                        <p id="mob-upload-status">${c?.roadmapPdfUrl ? '✅ Roadmap Connected' : 'Click to Upload Blueprint'}</p>
                        <input type="file" id="mob-c-file" hidden accept=".pdf" />
                    </div>
                    <input type="hidden" id="mob-c-pdfUrl" value="${c?.roadmapPdfUrl || ''}" />
                </div>
            </div>
        `;
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';

        // Bind chips
        _initMobChips('mob-c-role-input', 'mob-c-roles');
        _initMobChips('mob-c-skill-input', 'mob-c-skills');
        _initMobChips('mob-c-company-input', 'mob-c-companies');

        // Year checkboxes toggle
        modal.querySelectorAll('.mob-year-check input').forEach(cb => {
            cb.addEventListener('change', function () { this.parentElement.classList.toggle('active', this.checked); });
        });

        // File upload
        const fileInput = document.getElementById('mob-c-file');
        if (fileInput) {
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                if (file.type !== 'application/pdf') { alert('Only PDF allowed'); return; }
                document.getElementById('mob-upload-status').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading…';
                try {
                    const fd = new FormData(); fd.append('roadmap', file);
                    const res = await fetch('/api/admin/courses/upload-roadmap', { method: 'POST', body: fd });
                    const data = await res.json();
                    if (data.success) {
                        document.getElementById('mob-c-pdfUrl').value = data.url;
                        document.getElementById('mob-upload-status').innerHTML = `<i class="fas fa-check-circle"></i> ${file.name} Uploaded`;
                    } else throw new Error(data.message);
                } catch (err) { document.getElementById('mob-upload-status').textContent = 'Upload Failed'; }
            });
        }
    };

    function _initMobChips(inputId, containerId) {
        const input = document.getElementById(inputId);
        if (!input) return;
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const val = input.value.trim();
                if (val) {
                    const chip = document.createElement('span');
                    chip.className = 'mob-chip';
                    chip.innerHTML = `${val}<i class="fas fa-times" onclick="this.parentElement.remove()"></i>`;
                    const container = document.getElementById(containerId);
                    container.insertBefore(chip, input);
                    input.value = '';
                }
            }
        });
    }

    window._mobCloseCourseForm = function () {
        const modal = document.getElementById('mob-course-modal');
        if (modal) modal.style.display = 'none';
        document.body.style.overflow = '';
    };

    window._mobSaveCourse = async function (editId) {
        const title = document.getElementById('mob-c-title')?.value;
        const summary = document.getElementById('mob-c-summary')?.value;
        const desc = document.getElementById('mob-c-desc')?.value;
        if (!title || !summary) { alert('Title and Summary required'); return; }

        const years = Array.from(document.querySelectorAll('#mob-course-modal .mob-year-check input:checked')).map(cb => parseInt(cb.value));
        if (years.length === 0) { alert('Select at least one eligible year'); return; }

        const skills = Array.from(document.querySelectorAll('#mob-c-skills .mob-chip')).map(c => c.textContent.trim());
        const roles = Array.from(document.querySelectorAll('#mob-c-roles .mob-chip')).map(c => c.textContent.trim());
        const companies = Array.from(document.querySelectorAll('#mob-c-companies .mob-chip')).map(c => c.textContent.trim());

        const payload = {
            title, summaryLine: summary, description: desc,
            category: document.getElementById('mob-c-cat')?.value,
            level: document.getElementById('mob-c-level')?.value,
            durationEstimate: document.getElementById('mob-c-duration')?.value,
            skillsRequired: skills, jobRoles: roles, topCompanies: companies,
            eligibleYears: years,
            roadmapPdfUrl: document.getElementById('mob-c-pdfUrl')?.value,
            isTrending: document.getElementById('mob-c-trending')?.checked
        };

        try {
            const url = editId ? `/api/admin/courses/${editId}` : '/api/admin/courses';
            const method = editId ? 'PATCH' : 'POST';
            await apiFetch(url, { method, body: JSON.stringify(payload) });
            window._mobCloseCourseForm();
            if (typeof Swal !== 'undefined') Swal.fire({ icon: 'success', title: editId ? 'Updated!' : 'Created!', timer: 1500, showConfirmButton: false, background: '#FFF8F0' });
            init();
        } catch (e) {
            if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Failed to save', background: '#FFF8F0' });
        }
    };

    /* =================== VIEW DETAIL =================== */
    window._adminViewCourse = function (id) {
        const c = allCourses.find(x => x._id === id);
        if (!c || typeof Swal === 'undefined') return;
        const skills = (c.skillsRequired || []).map(s => `<span style="background:#f1f5f9;padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;">${s}</span>`).join(' ');
        const roles = (c.jobRoles || []).map(r => `<span style="background:#fdf6ec;padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;">${r}</span>`).join(' ');
        const companies = (c.topCompanies || []).map(co => `<span style="background:#e8f5e9;padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;">${co}</span>`).join(' ');
        Swal.fire({
            title: c.title, html: `
                <div style="text-align:left; font-size:0.85rem; color:#3f4d5e; line-height:1.8;">
                    <p><strong>Category:</strong> ${c.category || 'N/A'} · <strong>Level:</strong> ${c.level || 'N/A'}</p>
                    <p><strong>Duration:</strong> ${c.durationEstimate || 'N/A'} · <strong>Years:</strong> ${(c.eligibleYears || []).join(', ') || 'All'}</p>
                    <p><strong>Trending:</strong> ${c.isTrending ? '🔥 Yes' : 'No'} · <strong>Status:</strong> ${c.isActive !== false ? '✅ Active' : '📝 Draft'}</p>
                    ${c.description ? `<p style="margin-top:10px;"><strong>Description:</strong><br>${c.description}</p>` : ''}
                    ${skills ? `<p><strong>Skills:</strong><br><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">${skills}</div></p>` : ''}
                    ${roles ? `<p><strong>Job Roles:</strong><br><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">${roles}</div></p>` : ''}
                    ${companies ? `<p><strong>Companies:</strong><br><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">${companies}</div></p>` : ''}
                    ${c.roadmapPdfUrl ? `<p><a href="${c.roadmapPdfUrl}" target="_blank" style="color:#C2491F;font-weight:700;"><i class="fas fa-file-pdf"></i> View Roadmap PDF</a></p>` : ''}
                </div>
            `, confirmButtonColor: '#C2491F', background: '#FFF8F0', width: '95%'
        });
    };

    /* =================== DELETE =================== */
    window._adminDeleteCourse = async function (id) {
        if (typeof Swal === 'undefined') return;
        const result = await Swal.fire({
            title: 'Delete Course?', text: 'This action cannot be undone.', icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#dc2626', confirmButtonText: 'Yes, Delete', background: '#FFF8F0'
        });
        if (result.isConfirmed) {
            try {
                await apiFetch(`/api/admin/courses/${id}`, { method: 'DELETE' });
                Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1500, showConfirmButton: false, background: '#FFF8F0' });
                init();
            } catch (e) { Swal.fire({ icon: 'error', title: 'Failed to delete', background: '#FFF8F0' }); }
        }
    };

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
