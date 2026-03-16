/**
 * mobile-alumni-requests.js
 * Mobile adaptation for Alumni Mentor-Accepts page.
 * Reuses: /api/profile/me, /api/mentorship/alumni, /api/mentorship/:id/respond
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
        <div id="mob-requests-content">
            <div class="mob-page-header">
                <h1><i class="fas fa-handshake" style="color:#C2491F;margin-right:6px;"></i> Mentorship</h1>
                <p>Manage your mentee connections</p>
            </div>

            <!-- STATUS WIDGET -->
            <div class="mob-section-card" id="mob-status-widget">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                    <div>
                        <div style="font-size:0.88rem;font-weight:800;color:#0A1A2F;">Availability</div>
                        <div style="font-size:0.68rem;color:#5f6b7a;" id="mob-load-text">Loading capacity...</div>
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span id="mob-avail-status" style="font-size:0.72rem;font-weight:800;">—</span>
                        <label class="switch" style="width:50px;height:26px;">
                            <input type="checkbox" id="mob-avail-toggle">
                            <span class="slider" style="border-radius:26px;"></span>
                        </label>
                    </div>
                </div>
                <div class="mob-progress-bar-bg"><div class="mob-progress-fill" id="mob-capacity-bar" style="width:0%;"></div></div>
            </div>

            <!-- TAB CHIPS -->
            <div class="mob-tab-chips" id="mob-tab-chips">
                <div class="mob-tab-chip active" data-tab="pending">Pending</div>
                <div class="mob-tab-chip" data-tab="accepted">Active</div>
                <div class="mob-tab-chip" data-tab="completed">History</div>
            </div>

            <!-- FILTER -->
            <select class="mob-filter-select" id="mob-course-filter">
                <option value="all">All Departments</option>
            </select>

            <!-- REQUESTS LIST -->
            <div id="mob-requests-list">
                <div style="text-align:center;padding:30px 0;"><i class="fas fa-spinner fa-spin" style="font-size:1.2rem;color:#C2491F;"></i></div>
            </div>
        </div>
        ${window.AlumniMobileNav ? AlumniMobileNav.renderSidenav() : ''}
        ${window.AlumniMobileNav ? AlumniMobileNav.renderBottomNav('mentorship') : ''}
    `;

    if (window.AlumniMobileNav) AlumniMobileNav.initSidenavEvents();

    // === STATE ===
    let allRequests = [];
    let currentTab = 'pending';

    // === TAB EVENTS ===
    document.querySelectorAll('#mob-tab-chips .mob-tab-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#mob-tab-chips .mob-tab-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentTab = chip.dataset.tab;
            renderRequests();
        });
    });

    document.getElementById('mob-course-filter')?.addEventListener('change', renderRequests);

    // === RENDER ===
    function renderRequests() {
        const container = document.getElementById('mob-requests-list');
        const courseFilter = document.getElementById('mob-course-filter')?.value || 'all';
        if (!container) return;

        const filtered = allRequests.filter(r => {
            const s = (r.status || '').toLowerCase();
            let match = false;
            if (currentTab === 'pending') match = s === 'pending';
            else if (currentTab === 'accepted') match = s === 'accepted';
            else match = ['completed', 'rejected', 'cancelled'].includes(s);

            const courseMatch = courseFilter === 'all' || (r.student && r.student.department === courseFilter);
            return match && courseMatch;
        });

        if (!filtered.length) {
            container.innerHTML = `
                <div class="mob-empty-state">
                    <i class="fas fa-inbox"></i>
                    <h4>No ${currentTab} requests</h4>
                    <p>Requests matching your filters will appear here.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map((r, i) => {
            const initials = r.student?.name ? r.student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??';
            const date = new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

            let actions = '';
            if (r.status === 'pending') {
                actions = `
                    <button class="mob-btn-accept" onclick="mobRespondRequest('${r._id}','accepted',this)"><i class="fas fa-check"></i> Accept</button>
                    <button class="mob-btn-dismiss" onclick="mobRespondRequest('${r._id}','rejected',this)"><i class="fas fa-times"></i></button>
                    <button class="mob-btn-view" onclick="mobViewProfile('${r.student?._id}')"><i class="fas fa-user"></i></button>
                `;
            } else if (r.status === 'accepted') {
                actions = `
                    <button class="mob-btn-dismiss" onclick="mobRespondRequest('${r._id}','completed',this)"><i class="fas fa-archive"></i> Done</button>
                    <a href="Messages.html" class="mob-btn-accept" style="text-decoration:none;"><i class="fas fa-comment"></i> Chat</a>
                `;
            } else {
                actions = `<span class="mob-status-badge ${r.status}">${r.status.toUpperCase()}</span>`;
            }

            return `
                <div class="mob-request-card" id="mob-req-${r._id}" style="animation-delay:${i * 0.04}s;">
                    <div class="mob-request-header">
                        <div class="mob-request-avatar">${initials}</div>
                        <div style="flex:1;">
                            <div class="mob-request-name">${r.student?.name || 'Student'}</div>
                            <div class="mob-request-dept">${r.student?.department || 'LPU Student'} · ${r.student?.email || ''}</div>
                        </div>
                        <span class="mob-status-badge ${r.status}">${r.preferredDomain}</span>
                    </div>
                    <div class="mob-request-meta">
                        <span class="mob-meta-pill"><i class="fas fa-calendar-alt"></i> ${date}</span>
                        <span class="mob-meta-pill"><i class="fas fa-headset"></i> ${r.preferredMode}</span>
                    </div>
                    ${r.message ? `<div class="mob-request-message">"${r.message}"</div>` : ''}
                    <div class="mob-request-actions">${actions}</div>
                </div>
            `;
        }).join('');
    }

    // === RESPOND ===
    window.mobRespondRequest = async function (id, status, btn) {
        if (!btn) return;
        const originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        try {
            await apiFetch(`/api/mentorship/${id}/respond`, {
                method: 'PATCH',
                body: JSON.stringify({ status })
            });

            // Remove card
            const card = document.getElementById(`mob-req-${id}`);
            if (card) {
                card.style.transition = 'all 0.3s ease';
                card.style.opacity = '0';
                card.style.transform = 'translateX(40px)';
                setTimeout(() => card.remove(), 300);
            }

            // Refresh capacity
            const profile = await apiFetch('/api/profile/me');
            updateCapacity(profile);

            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'success', title: status === 'accepted' ? 'Accepted!' : 'Updated', timer: 1200, showConfirmButton: false });
            }

            // Reload requests
            loadRequests();
        } catch (err) {
            btn.disabled = false;
            btn.innerHTML = originalHTML;
            if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Failed', text: err.message });
        }
    };

    // === VIEW PROFILE ===
    window.mobViewProfile = function (id) {
        if (!id) return;
        const student = allRequests.find(r => r.student?._id === id)?.student;
        if (!student) return;

        Swal.fire({
            title: `<div style="font-weight:700;color:#0A1A2F">${student.name}</div>`,
            html: `
                <div style="text-align:left;padding:10px;">
                    <p style="margin-bottom:8px;"><strong>📚 Course:</strong> ${student.department || 'N/A'}</p>
                    <p style="margin-bottom:8px;"><strong>📧 Email:</strong> ${student.email || 'N/A'}</p>
                    <p style="margin-bottom:0;"><strong>💡 Skills:</strong> ${(student.skills || []).join(', ') || 'Not specified'}</p>
                </div>
            `,
            icon: 'info',
            confirmButtonColor: '#C2491F',
            confirmButtonText: 'Close',
            background: 'rgba(255, 250, 240, 0.95)'
        });
    };

    // === CAPACITY WIDGET ===
    function updateCapacity(user) {
        if (!user) return;
        const toggleEl = document.getElementById('mob-avail-toggle');
        const loadText = document.getElementById('mob-load-text');
        const availStatus = document.getElementById('mob-avail-status');
        const bar = document.getElementById('mob-capacity-bar');

        if (toggleEl) toggleEl.checked = user.isMentorAvailable;
        const current = user.currentMentees || 0;
        const max = user.maxMentees || 5;
        const pct = (current / max) * 100;

        if (loadText) loadText.textContent = `Capacity: ${current}/${max} Mentees`;
        if (availStatus) {
            availStatus.textContent = user.isMentorAvailable ? 'ON' : 'OFF';
            availStatus.style.color = user.isMentorAvailable ? '#0F7B3A' : '#C2491F';
        }
        if (bar) {
            bar.style.width = `${pct}%`;
            if (pct >= 100) bar.style.background = '#B02A37';
        }
    }

    // === TOGGLE AVAILABILITY ===
    document.getElementById('mob-avail-toggle')?.addEventListener('change', async function () {
        const toggle = this;
        const isAvailable = toggle.checked;
        try {
            toggle.disabled = true;
            await apiFetch('/api/mentorship/availability', {
                method: 'PATCH',
                body: JSON.stringify({ isMentorAvailable: isAvailable })
            });
            const s = document.getElementById('mob-avail-status');
            if (s) {
                s.textContent = isAvailable ? 'ON' : 'OFF';
                s.style.color = isAvailable ? '#0F7B3A' : '#C2491F';
            }
        } catch (err) {
            toggle.checked = !isAvailable;
            Swal.fire({ icon: 'error', title: 'Error', text: err.message });
        } finally {
            toggle.disabled = false;
        }
    });

    // === LOAD ===
    async function loadRequests() {
        try {
            allRequests = await apiFetch('/api/mentorship/alumni');
            renderRequests();
        } catch (err) {
            const container = document.getElementById('mob-requests-list');
            if (container) container.innerHTML = `<div class="mob-empty-state"><i class="fas fa-exclamation-circle" style="color:#B02A37;"></i><p>${err.message}</p></div>`;
        }
    }

    async function init() {
        if (typeof apiFetch !== 'function') { setTimeout(init, 200); return; }
        try {
            const profile = await apiFetch('/api/profile/me');
            updateCapacity(profile);
            loadRequests();
        } catch (err) { console.error('[mob-alumni-req] init error:', err); }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 100));
    } else {
        setTimeout(init, 100);
    }
})();
