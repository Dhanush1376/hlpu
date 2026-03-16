/**
 * mobile-admin-jobs.js
 * Mobile job moderation for Admin.
 * Reuses shared job API endpoints.
 */
(function () {
    if (window.innerWidth > 768) return;

    const Nav = window.AdminMobileNav || window.MobileNav;
    if (!Nav) return;

    document.querySelectorAll('#navbar, .mesh-bg, .dashboard-container').forEach(el => el.style.display = 'none');

    let root = document.getElementById('mobile-root');
    if (!root) { root = document.createElement('div'); root.id = 'mobile-root'; document.body.prepend(root); }

    let allJobs = [];
    let filtered = [];
    let currentFilter = 'all';
    let mobPage = 1;
    const PER_PAGE = 10;

    async function init() {
        renderShell();
        try {
            const res = await apiFetch('/api/jobs');
            allJobs = res?.jobs || res?.data || res || [];
            if (!Array.isArray(allJobs)) allJobs = [];
            filtered = [...allJobs];
            renderJobs();
        } catch (err) {
            console.error('[admin-jobs]', err);
            document.getElementById('mob-admin-jobs-list').innerHTML = '<div class="mob-admin-empty"><i class="fas fa-wifi"></i><h4>Connection Error</h4><p>Could not load jobs.</p></div>';
        }
    }

    function renderShell() {
        root.innerHTML = `
            ${Nav.renderHeader({})}
            <div class="mob-admin-welcome">
                <h1>Job Moderation</h1>
                <p><i class="fas fa-briefcase"></i> Review and moderate job postings</p>
                <button class="mob-admin-btn mob-admin-btn-view mt-2" onclick="window._adminExportJobs()"><i class="fas fa-download"></i> Export Jobs</button>
            </div>
            <div class="mob-admin-search">
                <i class="fas fa-search"></i>
                <input type="text" id="mob-admin-job-search" placeholder="Search jobs, companies…" />
            </div>
            <div class="mob-admin-filters" id="mob-admin-job-filters">
                <button class="mob-admin-filter-chip active" data-filter="all">All Jobs</button>
                <button class="mob-admin-filter-chip" data-filter="pending">Pending</button>
                <button class="mob-admin-filter-chip" data-filter="active">Active</button>
                <button class="mob-admin-filter-chip" data-filter="flagged">Flagged</button>
            </div>
            <div id="mob-admin-jobs-list">
                <div class="mob-admin-loading"><i class="fas fa-spinner fa-spin"></i><p>Loading jobs…</p></div>
            </div>
            <div id="mob-admin-jobs-pagination"></div>
            ${Nav.renderSidenav()}
            ${Nav.renderBottomNav('')}
        `;
        if (Nav.initSidenavEvents) setTimeout(() => Nav.initSidenavEvents(), 100);
        bindEvents();
    }

    function bindEvents() {
        document.querySelectorAll('#mob-admin-job-filters .mob-admin-filter-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#mob-admin-job-filters .mob-admin-filter-chip').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.dataset.filter;
                mobPage = 1;
                applyFilter();
            });
        });

        const searchInput = document.getElementById('mob-admin-job-search');
        if (searchInput) {
            let debounce;
            searchInput.addEventListener('input', () => {
                clearTimeout(debounce);
                debounce = setTimeout(() => { mobPage = 1; applyFilter(); }, 350);
            });
        }
    }

    function applyFilter() {
        const query = (document.getElementById('mob-admin-job-search')?.value || '').toLowerCase();
        filtered = allJobs.filter(j => {
            const matchFilter = currentFilter === 'all' || (j.status || '').toLowerCase() === currentFilter || (currentFilter === 'flagged' && j.isFlagged);
            const matchSearch = !query || (j.title || '').toLowerCase().includes(query) || (j.company || '').toLowerCase().includes(query);
            return matchFilter && matchSearch;
        });
        renderJobs();
    }

    function renderJobs() {
        const container = document.getElementById('mob-admin-jobs-list');
        if (!container) return;

        if (filtered.length === 0) {
            container.innerHTML = '<div class="mob-admin-empty"><i class="fas fa-briefcase"></i><h4>No Jobs Found</h4><p>Try adjusting your search or filters.</p></div>';
            renderPagination(0);
            return;
        }

        const totalPages = Math.ceil(filtered.length / PER_PAGE);
        const start = (mobPage - 1) * PER_PAGE;
        const paged = filtered.slice(start, start + PER_PAGE);

        container.innerHTML = paged.map(j => {
            const posted = j.postedBy?.name || 'Unknown';
            const postedRole = j.postedBy?.role || 'Alumni';
            const date = j.createdAt ? new Date(j.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';
            const status = j.status || 'active';
            const statusClass = status === 'pending' ? 'status-pending' : status === 'active' ? 'status-approved' : 'status-rejected';

            return `
                <div class="mob-admin-job-card" id="job-card-${j._id}">
                    <div class="mob-admin-job-title">${j.title || 'Untitled'}</div>
                    <div class="mob-admin-job-company">${j.company || 'Unknown Company'}</div>
                    <div class="mob-admin-job-meta">
                        <span class="mob-admin-job-meta-item"><i class="fas fa-user"></i> ${posted} (${postedRole})</span>
                        ${date ? `<span class="mob-admin-job-meta-item"><i class="fas fa-calendar"></i> ${date}</span>` : ''}
                        <span class="mob-admin-tag ${statusClass}">${status}</span>
                        ${j.isFlagged ? '<span class="mob-admin-tag" style="background:#fce4ec; color:#b71c1c;"><i class="fas fa-flag"></i> Flagged</span>' : ''}
                    </div>
                    ${j.location ? `<div class="mob-admin-job-meta"><span class="mob-admin-job-meta-item"><i class="fas fa-map-marker-alt"></i> ${j.location}</span></div>` : ''}
                    <div class="mob-admin-actions">
                        <button class="mob-admin-btn mob-admin-btn-approve" onclick="window._adminJobAction('${j._id}', 'approve', this)"><i class="fas fa-check"></i> Approve</button>
                        <button class="mob-admin-btn mob-admin-btn-flag" onclick="window._adminJobAction('${j._id}', 'flag', this)"><i class="fas fa-flag"></i> Flag</button>
                        <button class="mob-admin-btn mob-admin-btn-reject" onclick="window._adminJobAction('${j._id}', 'remove', this)"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        }).join('');

        renderPagination(totalPages);
    }

    function renderPagination(totalPages) {
        const container = document.getElementById('mob-admin-jobs-pagination');
        if (!container) return;
        if (!totalPages || totalPages <= 1) { container.innerHTML = ''; return; }
        container.innerHTML = `
            <div class="mob-admin-pagination">
                <button class="mob-admin-pag-btn" ${mobPage <= 1 ? 'disabled' : ''} onclick="window._adminJobsPage(${mobPage - 1})"><i class="fas fa-chevron-left"></i></button>
                <span class="mob-admin-pag-info">Page ${mobPage} / ${totalPages}</span>
                <button class="mob-admin-pag-btn" ${mobPage >= totalPages ? 'disabled' : ''} onclick="window._adminJobsPage(${mobPage + 1})"><i class="fas fa-chevron-right"></i></button>
            </div>
        `;
    }

    window._adminJobsPage = function (page) { mobPage = page; renderJobs(); document.getElementById('mob-admin-jobs-list')?.scrollIntoView({ behavior: 'smooth' }); };

    window._adminJobAction = function (jobId, action, btn) {
        if (typeof Swal === 'undefined') return;
        const titles = { approve: 'Approve this job?', flag: 'Flag this job?', remove: 'Remove this job?' };
        const icons = { approve: 'success', flag: 'warning', remove: 'error' };
        Swal.fire({
            title: titles[action], showCancelButton: true, confirmButtonColor: action === 'approve' ? '#2d6a4f' : '#C2491F', cancelButtonColor: '#e8e8e8', background: '#FFF8F0',
            confirmButtonText: action.charAt(0).toUpperCase() + action.slice(1)
        }).then(result => {
            if (result.isConfirmed) {
                const card = document.getElementById(`job-card-${jobId}`);
                if (card) { card.style.opacity = '0.5'; }
                Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, icon: icons[action], title: `Job ${action}d`, background: '#FFF8F0' });
            }
        });
    };

    window._adminExportJobs = function () {
        if (typeof Swal === 'undefined') return;
        Swal.fire({
            title: 'Exporting Jobs', text: 'Preparing report…', icon: 'info', showConfirmButton: false, background: '#FFF8F0',
            didOpen: async () => {
                try {
                    const res = await fetch(API_BASE + '/api/admin/export-jobs', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
                    if (!res.ok) throw new Error('Export failed');
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = `jobs_${new Date().toISOString().split('T')[0]}.xlsx`; a.click();
                    Swal.fire({ icon: 'success', title: 'Export Complete', timer: 1500, showConfirmButton: false, background: '#FFF8F0' });
                } catch (e) { Swal.fire({ icon: 'error', title: 'Export Failed', background: '#FFF8F0' }); }
            }
        });
    };

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
