/**
 * mobile-alumni-mock.js
 * Mobile adaptation for Alumni Mock Interviews page.
 * Reuses: /api/mock-interviews/alumni, /api/mock-interviews/:id/respond,
 *         /api/mock-interviews/:id/complete, /api/mock-interviews/expertise
 * Zero desktop impact.
 */
(function () {
    if (window.innerWidth > 768) return;

    // === HIDE DESKTOP ===
    document.querySelectorAll('.hero, .navbar-hlpu').forEach(el => el.classList.add('desktop-only'));

    // === MOBILE ROOT ===
    let root = document.getElementById('mobile-root');
    if (!root) { root = document.createElement('div'); root.id = 'mobile-root'; document.body.appendChild(root); }

    // === SKELETON ===
    root.innerHTML = `
        ${window.AlumniMobileNav ? AlumniMobileNav.renderHeader({}) : ''}
        <div id="mob-mock-content">
            <div class="mob-page-header">
                <h1><i class="fas fa-users" style="color:#C2491F;margin-right:6px;"></i> Mock Interviews</h1>
                <p>Review and schedule mock interviews with students.</p>
            </div>

            <!-- EXPERTISE TOPICS -->
            <div class="mob-section-card" id="mob-expertise-display" style="display:none;"></div>

            <!-- FILTER CHIPS -->
            <div class="mob-tab-chips">
                <div class="mob-tab-chip active" data-filter="all">All</div>
                <div class="mob-tab-chip" data-filter="pending">Pending</div>
                <div class="mob-tab-chip" data-filter="accepted">Accepted</div>
                <div class="mob-tab-chip" data-filter="completed">Completed</div>
            </div>

            <!-- FILTER SELECT -->
            <select class="mob-filter-select" id="mob-role-filter">
                <option value="">All Roles</option>
                <option>Software Developer</option>
                <option>Frontend Developer</option>
                <option>Backend Engineer</option>
                <option>Data Scientist</option>
                <option>Business Analyst</option>
            </select>

            <!-- REQUESTS LIST -->
            <div id="mob-mock-list">
                <div style="text-align:center;padding:30px 0;"><i class="fas fa-spinner fa-spin" style="font-size:1.2rem;color:#C2491F;"></i></div>
            </div>

            <!-- FAB: Post Topics -->
            <div style="position:fixed;bottom:85px;right:15px;z-index:50;">
                <button id="mob-fab-topics" style="width:52px;height:52px;border-radius:50%;border:none;background:linear-gradient(145deg,#C2491F,#E68A2E);color:white;font-size:1.1rem;box-shadow:0 8px 20px rgba(194,73,31,0.3);cursor:pointer;">
                    <i class="fas fa-edit"></i>
                </button>
            </div>
        </div>
        ${window.AlumniMobileNav ? AlumniMobileNav.renderSidenav() : ''}
        ${window.AlumniMobileNav ? AlumniMobileNav.renderBottomNav('') : ''}
    `;

    if (window.AlumniMobileNav) AlumniMobileNav.initSidenavEvents();

    // === STATE ===
    let allMockRequests = [];
    let currentFilter = 'all';
    let expertise = null;

    // === TAB EVENTS ===
    document.querySelectorAll('.mob-tab-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.mob-tab-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFilter = chip.dataset.filter;
            renderMockRequests();
        });
    });

    document.getElementById('mob-role-filter')?.addEventListener('change', renderMockRequests);

    // === FAB: Open Topics Modal ===
    document.getElementById('mob-fab-topics')?.addEventListener('click', () => {
        // Use desktop modal via jQuery
        if (typeof $ !== 'undefined' && $('#topicsModal').length) {
            $('#topicsModal').modal('show');
        }
    });

    // === RENDER ===
    function renderMockRequests() {
        const container = document.getElementById('mob-mock-list');
        const roleFilter = document.getElementById('mob-role-filter')?.value || '';
        if (!container) return;

        let filtered = allMockRequests;

        // Status filter
        if (currentFilter !== 'all') {
            filtered = filtered.filter(r => (r.status || '').toLowerCase() === currentFilter);
        }

        // Role filter
        if (roleFilter) {
            filtered = filtered.filter(r => r.roleRequested.toLowerCase().includes(roleFilter.toLowerCase()));
        }

        if (!filtered.length) {
            container.innerHTML = `
                <div class="mob-empty-state">
                    <i class="fas fa-users-slash"></i>
                    <h4>No requests found</h4>
                    <p>Try adjusting your filters or check back later.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map((req, i) => {
            const student = req.student || { name: 'Unknown', department: 'N/A' };
            const initials = student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
            const isPending = req.status === 'pending';
            const date = req.preferredDate ? new Date(req.preferredDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'TBD';
            const skills = Array.isArray(req.skills) ? req.skills : [];

            let actions = '';
            if (isPending) {
                actions = `
                    <button class="mob-btn-accept" onclick="mobRespondMock('${req._id}','accepted',this)"><i class="fas fa-check"></i> Accept</button>
                    <button class="mob-btn-dismiss" onclick="mobRespondMock('${req._id}','rejected',this)"><i class="fas fa-times"></i></button>
                `;
            } else if (req.status === 'accepted') {
                actions = `
                    <button class="mob-btn-accept" onclick="mobCompleteMock('${req._id}')"><i class="fas fa-check-double"></i> Complete</button>
                    <span class="mob-status-badge accepted">ACCEPTED</span>
                `;
            } else {
                actions = `<span class="mob-status-badge ${req.status}">${req.status.toUpperCase()}</span>`;
            }

            return `
                <div class="mob-request-card" id="mob-mock-${req._id}" style="animation-delay:${i * 0.04}s;">
                    <div class="mob-request-header">
                        <div class="mob-request-avatar">${initials}</div>
                        <div style="flex:1;">
                            <div class="mob-request-name">${student.name}</div>
                            <div class="mob-request-dept">${student.department || 'Student'}</div>
                        </div>
                        <span class="mob-status-badge pending">${req.roleRequested}</span>
                    </div>
                    <div class="mob-request-meta">
                        <span class="mob-meta-pill"><i class="fas fa-briefcase"></i> ${req.roleRequested}</span>
                        <span class="mob-meta-pill"><i class="fas fa-calendar"></i> ${date}</span>
                        <span class="mob-meta-pill"><i class="fas fa-clock"></i> ${req.interviewType || 'Video'}</span>
                    </div>
                    ${skills.length > 0 ? `
                        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">
                            ${skills.map(s => `<span class="mob-profile-tag">${s}</span>`).join('')}
                        </div>
                    ` : ''}
                    <div class="mob-request-actions">${actions}</div>
                </div>
            `;
        }).join('');
    }

    // === RESPOND ===
    window.mobRespondMock = async function (id, status, btn) {
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }

        try {
            let meetingLink = '', scheduledDate = '';

            if (status === 'accepted' && typeof Swal !== 'undefined') {
                const { value: formValues } = await Swal.fire({
                    title: 'Accept & Schedule',
                    html:
                        '<div style="text-align:left;margin-bottom:12px;">' +
                        '<label style="font-size:0.82rem;font-weight:700;margin-bottom:4px;display:block;">Meeting Link</label>' +
                        '<input id="swal-link" class="swal2-input" placeholder="https://meet.google.com/..." style="border-radius:12px;font-size:0.85rem;margin:0;width:100%;">' +
                        '</div>' +
                        '<div style="text-align:left;">' +
                        '<label style="font-size:0.82rem;font-weight:700;margin-bottom:4px;display:block;">Date & Time</label>' +
                        '<input id="swal-date" type="datetime-local" class="swal2-input" style="border-radius:12px;font-size:0.85rem;margin:0;width:100%;">' +
                        '</div>',
                    showCancelButton: true,
                    confirmButtonText: 'Schedule',
                    confirmButtonColor: '#C2491F',
                    preConfirm: () => {
                        const link = document.getElementById('swal-link').value;
                        const date = document.getElementById('swal-date').value;
                        if (!link || !date) Swal.showValidationMessage('Both fields required');
                        return { link, date };
                    }
                });

                if (!formValues) { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Accept'; } return; }
                meetingLink = formValues.link;
                scheduledDate = formValues.date;
            }

            await apiFetch(`/api/mock-interviews/${id}/respond`, {
                method: 'PATCH',
                body: JSON.stringify({ status, meetingLink, scheduledDate })
            });

            Swal.fire({ icon: 'success', title: status === 'accepted' ? 'Scheduled!' : 'Rejected', timer: 1500, showConfirmButton: false });
            loadMockRequests();
        } catch (err) {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Accept'; }
            Swal.fire({ icon: 'error', title: 'Failed', text: err.message });
        }
    };

    // === COMPLETE ===
    window.mobCompleteMock = async function (id) {
        const { value: feedback } = await Swal.fire({
            title: 'Complete Interview',
            text: 'Add performance feedback for the student',
            input: 'textarea',
            inputPlaceholder: 'Strengths, areas to improve...',
            showCancelButton: true,
            confirmButtonColor: '#C2491F'
        });

        if (feedback === undefined) return;

        try {
            await apiFetch(`/api/mock-interviews/${id}/complete`, {
                method: 'PATCH',
                body: JSON.stringify({ feedback })
            });
            Swal.fire({ icon: 'success', title: 'Completed!', timer: 1500, showConfirmButton: false });
            loadMockRequests();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Failed', text: err.message });
        }
    };

    // === EXPERTISE DISPLAY ===
    function updateExpertiseDisplay() {
        const display = document.getElementById('mob-expertise-display');
        if (!display || !expertise || !expertise.primaryArea) { if (display) display.style.display = 'none'; return; }

        display.style.display = 'block';
        display.innerHTML = `
            <div class="mob-section-title"><h3><i class="fas fa-tasks"></i> My Topics</h3></div>
            <div style="display:flex;flex-wrap:wrap;gap:5px;">
                <span class="mob-profile-tag" style="background:#0A1A2F;color:white;border:none;">${expertise.primaryArea}</span>
                ${(expertise.topics || []).map(t => `<span class="mob-profile-tag">${t}</span>`).join('')}
                ${expertise.availability ? `<span class="mob-profile-tag"><i class="fas fa-clock" style="margin-right:3px;"></i> ${expertise.availability}</span>` : ''}
            </div>
        `;
    }

    // === LOAD ===
    async function loadMockRequests() {
        try {
            allMockRequests = await apiFetch('/api/mock-interviews/alumni') || [];
            renderMockRequests();
        } catch (err) {
            const container = document.getElementById('mob-mock-list');
            if (container) container.innerHTML = `<div class="mob-empty-state"><i class="fas fa-exclamation-circle" style="color:#B02A37;"></i><p>${err.message}</p></div>`;
        }
    }

    async function loadExpertise() {
        try {
            const data = await apiFetch('/api/mock-interviews/expertise');
            if (data && data.primaryArea) {
                expertise = data;
                updateExpertiseDisplay();
            }
        } catch (err) { console.error('[mob-alumni-mock] expertise error:', err); }
    }

    async function init() {
        if (typeof apiFetch !== 'function') { setTimeout(init, 200); return; }
        loadMockRequests();
        loadExpertise();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 100));
    } else {
        setTimeout(init, 100);
    }
})();
