/**
 * mobile-alumni-postjob.js
 * Mobile-first logic for Post-job.html.
 * Features: Multi-step form for posting jobs + View/Manage posted jobs.
 */
(function () {
    if (window.innerWidth > 768) return;

    // === HIDE DESKTOP ===
    document.querySelectorAll('.navbar-hlpu, .mesh-bg, .hero, .container-glass, .posted-jobs-section').forEach(el => {
        if (!el.closest('#mobile-root')) el.classList.add('desktop-only');
    });

    // === MOBILE ROOT ===
    let root = document.getElementById('mobile-root');
    if (!root) {
        root = document.createElement('div');
        root.id = 'mobile-root';
        document.body.appendChild(root);
    }

    // === STATE ===
    let viewMode = 'form'; // 'form' or 'manage'
    let myJobs = [];

    // === SKELETON ===
    function renderSkeleton() {
        root.innerHTML = `
            ${window.AlumniMobileNav ? AlumniMobileNav.renderHeader({}) : ''}
            
            <div class="mob-page-container">
                <d/**
 * mobile-alumni-postjob.js
 * Mobile-first logic for Post-job.html.
 * Features: Multi-step form for posting jobs + View/Manage posted jobs.
 */
(function () {
    if (window.innerWidth > 768) return;

    // === HIDE DESKTOP ===
    document.querySelectorAll('.navbar-hlpu, .mesh-bg, .hero, .container-glass, .posted-jobs-section').forEach(el => {
        if (!el.closest('#mobile-root')) el.classList.add('desktop-only');
    });

    // === MOBILE ROOT ===
    let root = document.getElementById('mobile-root');
    if (!root) {
        root = document.createElement('div');
        root.id = 'mobile-root';
        document.body.appendChild(root);
    }

    // === STATE ===
    let viewMode = 'form'; // 'form' or 'manage'
    let myJobs = [];

    // === SKELETON ===
    function renderSkeleton() {
        root.innerHTML = `
            ${window.AlumniMobileNav ? AlumniMobileNav.renderHeader({}) : ''}
            
            <div class="mob-page-container">
                <div class="mob-tabs-fixed" style="margin-bottom:20px;">
                    <button class="mob-tab-chip ${viewMode === 'form' ? 'active' : ''}" id="btn-show-form">Post New</button>
                    <button class="mob-tab-chip ${viewMode === 'manage' ? 'active' : ''}" id="btn-show-manage">My Postings</button>
                </div>

                <div id="mob-postjob-content">
                    <!-- Dynamic content -->
                </div>
            </div>

            ${window.AlumniMobileNav ? AlumniMobileNav.renderSidenav() : ''}
            ${window.AlumniMobileNav ? AlumniMobileNav.renderBottomNav('more') : ''}
        `;

        if (window.AlumniMobileNav) AlumniMobileNav.initSidenavEvents();
        bindTabEvents();
        renderView();
    }

    function bindTabEvents() {
        document.getElementById('btn-show-form').addEventListener('click', () => { viewMode = 'form'; renderSkeleton(); });
        document.getElementById('btn-show-manage').addEventListener('click', () => { viewMode = 'manage'; renderSkeleton(); });
    }

    function renderView() {
        const content = document.getElementById('mob-postjob-content');
        if (viewMode === 'form') renderForm(content);
        else renderManage(content);
    }

    // === RENDER FORM ===
    function renderForm(container) {
        container.innerHTML = `
            <div class="mob-section-header">
                <h2>Hire hLPU Talent</h2>
                <p>post an opportunity</p>
            </div>
            
            <div class="mob-section-card" style="padding:20px;">
                <div class="mob-form-group">
                    <label><i class="fas fa-briefcase"></i> Job Title *</label>
                    <input type="text" id="m-jobTitle" placeholder="e.g. Senior Frontend Dev">
                </div>
                <div class="mob-form-row" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                    <div class="mob-form-group">
                        <label><i class="fas fa-building"></i> Company *</label>
                        <input type="text" id="m-companyName" placeholder="e.g. Acme Corp">
                    </div>
                    <div class="mob-form-group">
                        <label><i class="fas fa-image"></i> Logo URL</label>
                        <input type="url" id="m-companyLogo" placeholder="https://logo.url">
                    </div>
                </div>

                <div class="mob-form-row" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                    <div class="mob-form-group">
                        <label><i class="fas fa-map-marker-alt"></i> Location *</label>
                        <input type="text" id="m-jobLocation" placeholder="e.g. Delhi">
                    </div>
                    <div class="mob-form-group">
                        <label><i class="fas fa-laptop-house"></i> Mode *</label>
                        <select id="m-workMode">
                            <option value="Remote">Remote</option>
                            <option value="Hybrid">Hybrid</option>
                            <option value="Onsite">Onsite</option>
                        </select>
                    </div>
                </div>

                <div class="mob-form-row" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                    <div class="mob-form-group">
                        <label><i class="fas fa-clock"></i> Type *</label>
                        <select id="m-jobType">
                            <option>Full Time</option>
                            <option>Internship</option>
                            <option>Part Time</option>
                            <option>Contract</option>
                            <option>Freelance</option>
                        </select>
                    </div>
                    <div class="mob-form-group">
                        <label><i class="fas fa-user-graduate"></i> Experience *</label>
                        <select id="m-experienceLevel">
                            <option value="No Experience">No Experience</option>
                            <option value="0-1 Years">0-1 Years</option>
                            <option value="1-3 Years">1-3 Years</option>
                            <option value="3+ Years">3+ Years</option>
                        </select>
                    </div>
                </div>

                <div class="mob-form-header" style="font-size:0.75rem; font-weight:700; color:#0A1A2F; margin:10px 0 5px;"><i class="fas fa-money-bill-wave" style="color:#C2491F;"></i> Salary Range (K)</div>
                <div class="mob-form-row" style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-bottom:15px;">
                    <input type="number" id="m-salaryMin" placeholder="Min">
                    <input type="number" id="m-salaryMax" placeholder="Max">
                    <select id="m-salaryPeriod">
                        <option value="Month">/ Mo</option>
                        <option value="Year">/ Yr</option>
                    </select>
                </div>

                <div class="mob-form-group">
                    <label><i class="fas fa-calendar-alt"></i> Application Deadline *</label>
                    <input type="date" id="m-jobDeadline">
                </div>

                <div class="mob-form-group">
                    <label><i class="fas fa-graduation-cap"></i> Eligible Streams (Check all that apply)</label>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:5px; padding:10px; background:rgba(0,0,0,0.02); border-radius:12px;">
                        <label style="font-size:0.7rem; display:flex; align-items:center; gap:5px;"><input type="checkbox" class="m-stream-check" value="CSE"> CSE</label>
                        <label style="font-size:0.7rem; display:flex; align-items:center; gap:5px;"><input type="checkbox" class="m-stream-check" value="ECE"> ECE</label>
                        <label style="font-size:0.7rem; display:flex; align-items:center; gap:5px;"><input type="checkbox" class="m-stream-check" value="ME"> ME</label>
                        <label style="font-size:0.7rem; display:flex; align-items:center; gap:5px;"><input type="checkbox" class="m-stream-check" value="MBA"> MBA</label>
                        <label style="font-size:0.7rem; display:flex; align-items:center; gap:5px;"><input type="checkbox" class="m-stream-check" value="BBA"> BBA</label>
                        <label style="font-size:0.7rem; display:flex; align-items:center; gap:5px;"><input type="checkbox" class="m-stream-check" value="Other"> Other</label>
                    </div>
                </div>

                <div class="mob-form-group">
                    <label><i class="fas fa-align-left"></i> Description *</label>
                    <textarea id="m-jobDescription" rows="4" placeholder="Role responsibilities and requirements..."></textarea>
                </div>
                
                <div class="mob-form-row" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                    <div class="mob-form-group">
                        <label><i class="fas fa-code"></i> Skills (Comma sep.)</label>
                        <input type="text" id="m-skills" placeholder="React, Node.js">
                    </div>
                    <div class="mob-form-group">
                        <label><i class="fas fa-tags"></i> Tags (Comma sep.)</label>
                        <input type="text" id="m-tags" placeholder="Hiring, Future">
                    </div>
                </div>

                <div class="mob-form-group">
                    <label><i class="fas fa-link"></i> External Apply Link (Optional)</label>
                    <input type="url" id="m-jobLink" placeholder="https://careers.company.com/job">
                </div>
                
                <button class="mob-btn-accept" style="width:100%; margin-top:10px;" id="m-btn-submit">
                    <i class="fas fa-paper-plane"></i> Publish Opportunity
                </button>
            </div>
        `;

        document.getElementById('m-btn-submit').addEventListener('click', submitJob);
    }

    // === RENDER MANAGE ===
    async function renderManage(container) {
        container.innerHTML = `
            <div class="mob-section-header">
                <h2>Manage Postings</h2>
                <p>Track your active opportunities</p>
            </div>
            <div id="m-jobs-list">
                <div style="text-align:center;padding:40px 0;">
                    <i class="fas fa-spinner fa-spin fa-2x" style="color:#C2491F;"></i>
                </div>
            </div>
        `;

        try {
            if (typeof apiFetch === 'undefined') throw new Error('apiFetch not found');
            myJobs = await apiFetch('/api/jobs/my');

            const list = document.getElementById('m-jobs-list');
            if (myJobs.length === 0) {
                list.innerHTML = `<div class="mob-empty-state"><i class="fas fa-folder-open"></i><p>You haven't posted any jobs yet.</p></div>`;
                return;
            }

            list.innerHTML = myJobs.map(job => `
                <div class="mob-section-card" style="padding:15px; margin-bottom:12px;">
                    <div style="display:flex; justify-content:space-between; align-items:start;">
                        <div style="display:flex; gap:12px;">
                            ${job.companyLogo ? `<img src="${job.companyLogo}" style="width:40px;height:40px;border-radius:8px;object-fit:contain;background:#f8f9fa;">` : `<div style="width:40px;height:40px;border-radius:8px;background:rgba(194,73,31,0.1);display:flex;align-items:center;justify-content:center;color:#C2491F;"><i class="fas fa-building"></i></div>`}
                            <div>
                                <h4 style="margin:0; font-size:1rem; font-weight:700;">${job.title}</h4>
                                <p style="margin:0; font-size:0.75rem; color:#5f6b7a;">${job.company || job.companyName} · ${job.location}</p>
                            </div>
                        </div>
                        <span class="mob-profile-tag" style="background:rgba(194,73,31,0.1); color:#C2491F; font-size:0.6rem;">${(job.applicants || []).length} APPS</span>
                    </div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-top:15px;">
                        <button class="mob-btn-accept" style="padding:8px; font-size:0.75rem; background:rgba(194,73,31,0.1); color:#C2491F; border:none;" onclick="openApplicantsModal('${job._id}')">
                            <i class="fas fa-users"></i> Applicants
                        </button>
                        <button class="mob-btn-accept" style="padding:8px; font-size:0.75rem; background:transparent; border:1px solid #0A1A2F; color:#0A1A2F;" onclick="openEditModal('${job._id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="mob-btn-accept" style="padding:8px; font-size:0.75rem; background:#dc3545; border-color:#dc3545; grid-column: span 2;" onclick="window.deleteJob('${job._id}')">
                            <i class="fas fa-trash"></i> Delete Posting
                        </button>
                    </div>
                </div>
            `).join('');
        } catch (err) {
            console.error('[mob-postjob] manage error:', err);
            const list = document.getElementById('m-jobs-list');
            if (list) list.innerHTML = `<div class="alert alert-danger" style="font-size:0.8rem;">Error loading jobs: ${err.message}</div>`;
        }
    }

    // === ACTIONS ===
    async function submitJob() {
        const btn = document.getElementById('m-btn-submit');
        const originalHTML = btn.innerHTML;

        const data = {
            title: document.getElementById('m-jobTitle').value.trim(),
            companyName: document.getElementById('m-companyName').value.trim(),
            companyLogo: document.getElementById('m-companyLogo').value.trim(),
            location: document.getElementById('m-jobLocation').value.trim(),
            workMode: document.getElementById('m-workMode').value,
            jobType: document.getElementById('m-jobType').value,
            experienceLevel: document.getElementById('m-experienceLevel').value,
            salaryMin: document.getElementById('m-salaryMin').value,
            salaryMax: document.getElementById('m-salaryMax').value,
            salaryPeriod: document.getElementById('m-salaryPeriod').value,
            deadline: document.getElementById('m-jobDeadline').value,
            department: Array.from(document.querySelectorAll('.m-stream-check:checked')).map(cb => cb.value).join(', ') || 'All',
            description: document.getElementById('m-jobDescription').value.trim(),
            skills: document.getElementById('m-skills').value.split(',').map(s => s.trim()).filter(Boolean),
            tags: document.getElementById('m-tags').value.split(',').map(s => s.trim()).filter(Boolean),
            link: document.getElementById('m-jobLink').value.trim()
        };

        if (!data.title || !data.companyName || !data.description || !data.deadline) {
            Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Please fill in all required fields marked with *', confirmButtonColor: '#C2491F' });
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publishing...';

        try {
            if (typeof apiFetch === 'undefined') throw new Error('apiFetch not found');
            await apiFetch('/api/jobs', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            Swal.fire({
                icon: 'success',
                title: 'Opportunity Live!',
                text: 'Your job has been posted successfully.',
                confirmButtonColor: '#C2491F'
            });

            viewMode = 'manage';
            renderSkeleton();
        } catch (err) {
            console.error('[mob-postjob] submit error:', err);
            Swal.fire({ icon: 'error', title: 'Post Failed', text: err.message || 'Could not publish job.', confirmButtonColor: '#C2491F' });
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        }
    }

    window.viewApplicants = (id) => {
        if (typeof openApplicantsModal !== 'undefined') {
            openApplicantsModal(id);
        } else {
            window.location.href = `Messages.html?jobId=${id}`;
        }
    };

    window.deleteJob = async (id) => {
        const result = await Swal.fire({
            title: 'Delete Posting?',
            text: 'This will remove the job and all applications permanently.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            confirmButtonText: 'Yes, Delete'
        });
        if (result.isConfirmed) {
            try {
                if (typeof apiFetch === 'undefined') throw new Error('apiFetch not found');
                await apiFetch(`/api/jobs/${id}`, { method: 'DELETE' });
                Swal.fire('Deleted', 'Posting removed.', 'success');
                renderView();
            } catch (err) {
                Swal.fire('Error', err.message || 'Could not delete.', 'error');
            }
        }
    };

    // === STYLES ===
    const style = document.createElement('style');
    style.textContent = `
        .mob-section-card {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(194, 73, 31, 0.1);
            border-radius: 24px;
            margin-bottom: 20px;
            box-shadow: 0 8px 32px rgba(10, 26, 47, 0.05);
        }
        .mob-form-group { margin-bottom: 15px; }
        .mob-form-group label { display: block; font-size: 0.75rem; font-weight: 700; color: #0A1A2F; margin-bottom: 6px; }
        .mob-form-group label i { color: #C2491F; width: 14px; margin-right: 4px; }
        .mob-form-group input, .mob-form-group select, .mob-form-group textarea {
            width: 100%; padding: 12px 14px; border-radius: 12px; border: 1.5px solid rgba(10,26,47,0.08); 
            font-size: 0.85rem; background: #fff; transition: all 0.2s ease;
        }
        .mob-form-group input:focus, .mob-form-group select:focus, .mob-form-group textarea:focus {
            border-color: #C2491F; outline: none; box-shadow: 0 0 0 3px rgba(194, 73, 31, 0.1);
        }
        .mob-form-row input, .mob-form-row select {
            width: 100%; padding: 10px; border-radius: 12px; border: 1.5px solid rgba(10,26,47,0.08); 
            font-size: 0.8rem; background: #fff;
        }
        .m-stream-check { transform: scale(1.1); accent-color: #C2491F; }
        #mobile-root { padding-top: 60px !important; }
        .mob-tabs-fixed {
            display: flex; gap: 10px; background: rgba(255,255,255,0.7); backdrop-filter: blur(10px);
            padding: 6px; border-radius: 40px; border: 1px solid rgba(194,73,31,0.1);
            position: sticky; top: 60px; z-index: 100;
        }
        .mob-tab-chip {
            flex: 1; padding: 10px; border-radius: 30px; border: none; font-size: 0.8rem; font-weight: 600;
            background: transparent; color: #5f6b7a; transition: all 0.2s ease;
        }
        .mob-tab-chip.active {
            background: #C2491F; color: #fff; box-shadow: 0 4px 12px rgba(194, 73, 31, 0.3);
        }
    `;
    document.head.appendChild(style);

    // === INIT ===
    renderSkeleton();

})();
