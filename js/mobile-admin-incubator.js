/**
 * mobile-admin-incubator.js
 * Mobile Incubator Panel for Admin.
 * Full parity: startup list, evaluation form, stage update, impact score, mentor match.
 */
(function () {
    if (window.innerWidth > 768) return;
    const Nav = window.AdminMobileNav || window.MobileNav;
    if (!Nav) return;

    document.querySelectorAll('#navbar, .admin-container, #evaluationModal').forEach(el => el.style.display = 'none');
    let root = document.getElementById('mobile-root');
    if (!root) { root = document.createElement('div'); root.id = 'mobile-root'; document.body.prepend(root); }

    let startups = [];

    async function init() {
        renderShell();
        try {
            const result = await apiFetch('/api/launchpad/projects?projectType=startup&limit=100');
            if (result.success) { startups = result.data || []; renderStartups(); }
        } catch (e) { document.getElementById('mob-inc-list').innerHTML = '<div class="mob-admin-empty"><i class="fas fa-wifi"></i><h4>Connecti/**
 * mobile-admin-incubator.js
 * Mobile Incubator Panel for Admin.
 * Full parity: startup list, evaluation form, stage update, impact score, mentor match.
 */
(function () {
    if (window.innerWidth > 768) return;
    const Nav = window.AdminMobileNav || window.MobileNav;
    if (!Nav) return;

    document.querySelectorAll('#navbar, .admin-container, #evaluationModal').forEach(el => el.style.display = 'none');
    let root = document.getElementById('mobile-root');
    if (!root) { root = document.createElement('div'); root.id = 'mobile-root'; document.body.prepend(root); }

    let startups = [];

    async function init() {
        renderShell();
        try {
            const result = await apiFetch('/api/launchpad/projects?projectType=startup&limit=100');
            if (result.success) { startups = result.data || []; renderStartups(); }
        } catch (e) { document.getElementById('mob-inc-list').innerHTML = '<div class="mob-admin-empty"><i class="fas fa-wifi"></i><h4>Connection Error</h4></div>'; }
    }

    function renderShell() {
        root.innerHTML = `
            ${Nav.renderHeader({})}
            <div class="mob-admin-welcome"><h1>Incubator Panel</h1><p><i class="fas fa-rocket"></i> Manage startup lifecycle from idea to graduation</p></div>
            <div class="mob-admin-stats" id="mob-inc-stats"></div>
            <div id="mob-inc-list"><div class="mob-admin-loading"><i class="fas fa-spinner fa-spin"></i><p>Loading startups…</p></div></div>
            <div id="mob-inc-modal" class="mob-fullscreen-modal" style="display:none;"></div>
            ${Nav.renderSidenav()}${Nav.renderBottomNav('')}
        `;
        if (Nav.initSidenavEvents) setTimeout(() => Nav.initSidenavEvents(), 100);
    }

    function getStageColor(stage) {
        const c = { idea_submitted: '#6c757d', under_review: '#17a2b8', shortlisted: '#ffc107', incubating: '#28a745', investor_ready: '#fd7e14', graduated: '#007bff', rejected: '#dc3545' };
        return c[stage] || '#6c757d';
    }

    function renderStartups() {
        const statsEl = document.getElementById('mob-inc-stats');
        if (statsEl) {
            statsEl.innerHTML = `
                <div class="mob-admin-stat-card"><div class="mob-admin-stat-icon"><i class="fas fa-rocket"></i></div><div class="mob-admin-stat-title">Total</div><div class="mob-admin-stat-value">${startups.length}</div></div>
                <div class="mob-admin-stat-card"><div class="mob-admin-stat-icon"><i class="fas fa-seedling"></i></div><div class="mob-admin-stat-title">Incubating</div><div class="mob-admin-stat-value">${startups.filter(s => s.stage === 'incubating').length}</div></div>
                <div class="mob-admin-stat-card"><div class="mob-admin-stat-icon"><i class="fas fa-medal"></i></div><div class="mob-admin-stat-title">Graduated</div><div class="mob-admin-stat-value">${startups.filter(s => s.stage === 'graduated').length}</div></div>
                <div class="mob-admin-stat-card"><div class="mob-admin-stat-icon"><i class="fas fa-chart-line"></i></div><div class="mob-admin-stat-title">Investor Ready</div><div class="mob-admin-stat-value">${startups.filter(s => s.stage === 'investor_ready').length}</div></div>
            `;
        }

        const container = document.getElementById('mob-inc-list');
        if (!startups.length) { container.innerHTML = '<div class="mob-admin-empty"><i class="fas fa-rocket"></i><h4>No Startups</h4></div>'; return; }

        container.innerHTML = startups.map(s => `
            <div class="mob-admin-user-card">
                <div class="mob-admin-user-header">
                    <div class="mob-admin-user-avatar" style="font-size:0.8rem;background:${getStageColor(s.stage)}22;color:${getStageColor(s.stage)}"><i class="fas fa-rocket"></i></div>
                    <div class="mob-admin-user-info">
                        <h3>${s.title || 'Untitled Startup'}</h3>
                        <p class="mob-admin-user-meta">${(s.description || '').substring(0, 80)}…</p>
                    </div>
                </div>
                <div style="margin:8px 0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                        <span style="font-size:0.75rem;font-weight:700;">Impact Score</span>
                        <span style="font-size:0.75rem;font-weight:700;color:var(--ember,#C2491F);">${s.evaluation?.startupScore || 0}%</span>
                    </div>
                    <div style="background:#f1f5f9;height:6px;border-radius:10px;overflow:hidden;"><div style="width:${s.evaluation?.startupScore || 0}%;height:100%;background:var(--ember,#C2491F);border-radius:10px;"></div></div>
                </div>
                <div class="mob-admin-user-tags">
                    <span class="mob-admin-tag" style="background:${getStageColor(s.stage)}22;color:${getStageColor(s.stage)};font-weight:700;">${(s.stage || 'submitted').replace(/_/g, ' ')}</span>
                    ${s.domain ? `<span class="mob-admin-tag">${s.domain}</span>` : ''}
                </div>
                <div class="mob-admin-actions">
                    <button class="mob-admin-btn mob-admin-btn-primary" onclick="window._incEvaluate('${s._id}')"><i class="fas fa-clipboard-check"></i> Evaluate</button>
                    <select class="mob-filter-select" onchange="window._incStage('${s._id}', this.value); this.selectedIndex=0;">
                        <option value="" disabled selected>Stage →</option>
                        <option value="shortlisted">Shortlist</option>
                        <option value="incubating">Incubate</option>
                        <option value="investor_ready">Investor Ready</option>
                        <option value="graduated">Graduate</option>
                        <option value="rejected">Reject</option>
                    </select>
                </div>
            </div>
        `).join('');
    }

    /* ======= EVALUATE (full-screen form) ======= */
    window._incEvaluate = function (id) {
        const modal = document.getElementById('mob-inc-modal');
        if (!modal) return;
        const s = startups.find(x => x._id === id);
        modal.innerHTML = `
            <div class="mob-modal-header">
                <button class="mob-modal-back" onclick="window._incCloseModal()"><i class="fas fa-arrow-left"></i></button>
                <h2>Startup Evaluation</h2>
                <button class="mob-modal-save" onclick="window._incSubmitEval('${id}')"><i class="fas fa-check"></i> Save</button>
            </div>
            <div class="mob-modal-body">
                ${s ? `<h3 style="font-size:1.1rem;font-weight:700;margin-bottom:16px;">${s.title}</h3>` : ''}
                <div class="mob-form-group"><label>INNOVATION SCORE (1-100)</label><input type="number" id="mob-eval-innovation" min="0" max="100" value="${s?.evaluation?.innovationScore || ''}" placeholder="0-100" /></div>
                <div class="mob-form-group"><label>MARKET SIZE (1-100)</label><input type="number" id="mob-eval-market" min="0" max="100" value="${s?.evaluation?.marketSize || ''}" placeholder="0-100" /></div>
                <div class="mob-form-group"><label>TECHNICAL FEASIBILITY (1-100)</label><input type="number" id="mob-eval-tech" min="0" max="100" value="${s?.evaluation?.technicalFeasibility || ''}" placeholder="0-100" /></div>
                <div class="mob-form-group"><label>TEAM STRENGTH (1-100)</label><input type="number" id="mob-eval-team" min="0" max="100" value="${s?.evaluation?.teamStrength || ''}" placeholder="0-100" /></div>
                <div class="mob-form-group"><label>ADMIN FEEDBACK</label><textarea id="mob-eval-feedback" rows="4" placeholder="Feedback for the startup team…">${s?.evaluation?.adminFeedback || ''}</textarea></div>
            </div>
        `;
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    };

    window._incCloseModal = function () { document.getElementById('mob-inc-modal').style.display = 'none'; document.body.style.overflow = ''; };

    window._incSubmitEval = async function (id) {
        const data = {
            innovationScore: document.getElementById('mob-eval-innovation')?.value,
            marketSize: document.getElementById('mob-eval-market')?.value,
            technicalFeasibility: document.getElementById('mob-eval-tech')?.value,
            teamStrength: document.getElementById('mob-eval-team')?.value,
            adminFeedback: document.getElementById('mob-eval-feedback')?.value
        };
        try {
            await apiFetch(`/api/launchpad/startups/${id}/evaluation`, { method: 'PATCH', body: JSON.stringify(data) });
            window._incCloseModal();
            if (typeof Swal !== 'undefined') Swal.fire({ icon: 'success', title: 'Evaluation Saved!', timer: 1500, showConfirmButton: false, background: '#FFF8F0' });
            init();
        } catch (e) { if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Failed to save', background: '#FFF8F0' }); }
    };

    window._incStage = async function (id, stage) {
        try {
            await apiFetch(`/api/launchpad/startups/${id}/stage`, { method: 'PATCH', body: JSON.stringify({ stage }) });
            if (typeof Swal !== 'undefined') Swal.fire({ icon: 'success', title: 'Stage Updated', timer: 1500, showConfirmButton: false, background: '#FFF8F0' });
            init();
        } catch (e) { if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Failed', background: '#FFF8F0' }); }
    };

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
