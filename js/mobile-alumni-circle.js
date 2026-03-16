/**
 * mobile-alumni-circle.js
 * Premium mobile experience for Alumni Circle.
 * Makes its own API calls via apiFetch — fully independent.
 * Follows MobileMentors module pattern.
 */
(function () {
    if (window.innerWidth > 768) return;

    // ── STATE ──
    let currentTab = 'discovery';
    let currentFilter = 'all';
    let alumniData = [];
    let mobPage = 1;
    const PER_PAGE = 10;

    // ── HIDE DESKTOP ──
    document.querySelectorAll('.navbar-hlpu, .mesh-bg, .hero, .smart-bar, .nav-pills, .tab-content, .cards-grid, .footer').forEach(el => {
        if (!el.closest('#mobile-root')) el.style.display = 'none';
    });

    // ── MOBILE ROOT ──
    let root = document.getElementById('mobile-root');
    if (!root) {
        root = document.createElement('div');
        root.id = 'mobile-root';
        document.body.prepend(root);
    }

    // ── RENDER SKELETON ──
    function renderBase() {
        const Nav = window.AlumniMobileNav || window.MobileNav;
        if (!Nav) return;

        root.innerHTML = `
            ${Nav.renderHeader({})}

            <div class="mob-circle-header">
                <h1>Alumni Circle</h1>
                <p><i class="fas fa-network-wired"></i> Connect with fellow alumni and grow your network</p>
            </div>

            <!-- SEARCH -->
            <div class="mob-circle-search-wrap">
                <div class="mob-circle-search">
                    <i class="fas fa-search"></i>
                    <input type="text" id="mob-circle-search-input" placeholder="Search alumni, company, role…" />
                </div>
            </div>

            <!-- TAB PILLS -->
            <div class="mob-circle-tabs" id="mob-circle-tabs">
                <button class="mob-circle-tab active" data-tab="discovery">
                    <i class="fas fa-compass"></i> Discovery
                </button>
                <button class="mob-circle-tab" data-tab="requests">
                    <i class="fas fa-paper-plane"></i> Requests <span class="mob-tab-badge" id="mob-req-badge" style="display:none;">0</span>
                </button>
                <button class="mob-circle-tab" data-tab="connections">
                    <i class="fas fa-link"></i> Connections
                </button>
                <button class="mob-circle-tab" data-tab="circles">
                    <i class="fas fa-users"></i> Circles
                </button>
            </div>

            <!-- FILTER CHIPS (discovery only) -->
            <div class="mob-circle-chips" id="mob-circle-chips">
                <button class="mob-circle-chip active" data-filter="all">All Alumni</button>
                <button class="mob-circle-chip" data-filter="mentors">Mentors Only</button>
                <button class="mob-circle-chip" data-filter="recent">Recently Active</button>
            </div>

            <!-- CONTENT -->
            <div id="mob-circle-content">
                <div class="mob-circle-loading">
                    <i class="fas fa-spinner fa-spin fa-2x"></i>
                    <p>Searching your network…</p>
                </div>
            </div>

            <!-- PAGINATION -->
            <div id="mob-circle-pagination"></div>

            ${Nav.renderSidenav()}
            ${Nav.renderBottomNav('more')}
        `;

        if (Nav.initSidenavEvents) setTimeout(() => Nav.initSidenavEvents(), 100);
        bindEvents();
        loadTab();
    }

    // ── BIND EVENTS ──
    function bindEvents() {
        // Tab switching
        document.querySelectorAll('#mob-circle-tabs .mob-circle-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#mob-circle-tabs .mob-circle-tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentTab = btn.dataset.tab;
                mobPage = 1;

                const chips = document.getElementById('mob-circle-chips');
                if (chips) chips.style.display = currentTab === 'discovery' ? 'flex' : 'none';

                loadTab();
            });
        });

        // Filter chips
        document.querySelectorAll('#mob-circle-chips .mob-circle-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#mob-circle-chips .mob-circle-chip').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.dataset.filter;
                mobPage = 1;
                applyFilterAndRender();
            });
        });

        // Search
        const searchInput = document.getElementById('mob-circle-search-input');
        if (searchInput) {
            let debounce;
            searchInput.addEventListener('input', () => {
                clearTimeout(debounce);
                debounce = setTimeout(() => {
                    mobPage = 1;
                    loadTab();
                }, 400);
            });
        }
    }

    // ── LOAD TAB (direct API calls) ──
    async function loadTab() {
        showLoading();
        try {
            const query = (document.getElementById('mob-circle-search-input')?.value || '').trim();

            switch (currentTab) {
                case 'discovery': {
                    let url = `/api/alumni/circle?page=1&limit=50`;
                    if (query) url += `&search=${encodeURIComponent(query)}`;
                    const res = await apiFetch(url);
                    alumniData = res?.alumni || res?.data || res || [];
                    if (!Array.isArray(alumniData)) alumniData = [];
                    break;
                }
                case 'connections': {
                    const res = await apiFetch('/api/alumni/connections');
                    alumniData = res?.connections || res?.data || res || [];
                    if (!Array.isArray(alumniData)) alumniData = [];
                    // Mark as connections
                    alumniData = alumniData.map(a => ({ ...a, _type: 'connection' }));
                    break;
                }
                case 'requests': {
                    const [incoming, outgoing] = await Promise.all([
                        apiFetch('/api/alumni/requests/incoming').catch(() => ({ requests: [] })),
                        apiFetch('/api/alumni/requests/outgoing').catch(() => ({ requests: [] }))
                    ]);

                    const inList = (incoming?.requests || incoming?.data || incoming || []);
                    const outList = (outgoing?.requests || outgoing?.data || outgoing || []);

                    alumniData = [
                        ...(Array.isArray(inList) ? inList : []).map(r => ({
                            ...(r.requester || r),
                            _id: r._id,
                            userId: r.requester?._id || r._id,
                            _type: 'incoming'
                        })),
                        ...(Array.isArray(outList) ? outList : []).map(r => ({
                            ...(r.recipient || r),
                            _id: r._id,
                            userId: r.recipient?._id || r._id,
                            _type: 'outgoing'
                        }))
                    ];
                    updateReqBadge(Array.isArray(inList) ? inList.length : 0);
                    break;
                }
                case 'circles': {
                    renderCircles();
                    return;
                }
            }
            applyFilterAndRender();
        } catch (err) {
            console.error('[mob-circle]', err);
            showError('Network error. Pull to retry.');
        }
    }

    // ── FILTER + RENDER ──
    function applyFilterAndRender() {
        let filtered = [...alumniData];

        const query = (document.getElementById('mob-circle-search-input')?.value || '').toLowerCase();
        if (query) {
            filtered = filtered.filter(a =>
                (a.name || '').toLowerCase().includes(query) ||
                (a.title || '').toLowerCase().includes(query) ||
                (a.company || '').toLowerCase().includes(query) ||
                (a.stream || '').toLowerCase().includes(query) ||
                (a.skills || []).some(s => s.toLowerCase().includes(query))
            );
        }

        if (currentTab === 'discovery') {
            if (currentFilter === 'mentors') {
                filtered = filtered.filter(a => a.isMentorAvailable);
            } else if (currentFilter === 'recent') {
                filtered = filtered.sort((a, b) => new Date(b.lastActive || 0) - new Date(a.lastActive || 0));
            }
        }

        renderCards(filtered);
    }

    // ── RENDER ALUMNI CARDS ──
    function renderCards(items) {
        const container = document.getElementById('mob-circle-content');
        if (!container) return;

        if (!items || items.length === 0) {
            const msgs = {
                discovery: { icon: 'fa-compass', title: 'No Alumni Found', text: 'Try adjusting your search or filters to find alumni.' },
                requests: { icon: 'fa-paper-plane', title: 'No Requests', text: 'No pending connection requests at the moment.' },
                connections: { icon: 'fa-link', title: 'No Connections Yet', text: 'Start networking to build your professional circle!' }
            };
            const m = msgs[currentTab] || msgs.discovery;
            container.innerHTML = `
                <div class="mob-circle-empty">
                    <i class="fas ${m.icon}"></i>
                    <h4>${m.title}</h4>
                    <p>${m.text}</p>
                </div>
            `;
            renderPagination(0);
            return;
        }

        const total = items.length;
        const totalPages = Math.ceil(total / PER_PAGE);
        const start = (mobPage - 1) * PER_PAGE;
        const paged = items.slice(start, start + PER_PAGE);

        container.innerHTML = paged.map(item => renderAlumniCard(item)).join('');
        renderPagination(totalPages);
    }

    // ── SINGLE CARD ──
    function renderAlumniCard(item) {
        const name = item.name || 'Alumni';
        const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const pic = item.profilePicture || item.profilePic || '';
        const title = item.title || '';
        const company = item.company || '';
        const isOnline = item.isOnline || false;
        const verified = item.verificationStatus === 'approved';
        const type = item._type || (item.connectionStatus === 'accepted' ? 'connection' : item.connectionStatus === 'pending' ? 'outgoing' : 'discovery');
        const id = item.userId || item._id || item.id;

        const avatarHtml = pic && !pic.includes('default-avatar')
            ? `<img src="${pic}" alt="${name}" onerror="this.parentElement.textContent='${initials}'" />`
            : initials;

        let tagsHtml = '';
        if (item.yearsOfExperience) tagsHtml += `<span class="mob-alumni-tag"><i class="fas fa-briefcase"></i> ${item.yearsOfExperience}+ Yrs</span>`;
        if (item.stream) tagsHtml += `<span class="mob-alumni-tag"><i class="fas fa-graduation-cap"></i> ${item.stream}</span>`;
        if (item.graduationYear) tagsHtml += `<span class="mob-alumni-tag"><i class="fas fa-calendar"></i> ${item.graduationYear}</span>`;
        if (item.isMentorAvailable !== undefined) {
            tagsHtml += item.isMentorAvailable
                ? `<span class="mob-alumni-tag mentor-avail"><i class="fas fa-shield-halved"></i> Mentor</span>`
                : `<span class="mob-alumni-tag mentor-busy"><i class="fas fa-shield-halved"></i> Busy</span>`;
        }

        const skillsHtml = (item.skills || []).slice(0, 4).map(s => `<span class="mob-skill-tag">${s}</span>`).join('');

        let actionsHtml = '';
        if (type === 'incoming') {
            actionsHtml = `
                <div class="mob-alumni-actions">
                    <button class="mob-act-btn mob-act-accept" onclick="window._mobCircleRespond('${item._id}', 'accepted', this)">
                        <i class="fas fa-check"></i> Accept
                    </button>
                    <button class="mob-act-btn mob-act-ignore" onclick="window._mobCircleRespond('${item._id}', 'rejected', this)">
                        Ignore
                    </button>
                </div>
            `;
        } else if (type === 'outgoing') {
            actionsHtml = `
                <div class="mob-alumni-actions single-action">
                    <button class="mob-act-btn mob-act-pending" disabled>
                        <i class="fas fa-clock"></i> Pending Approval
                    </button>
                </div>
            `;
        } else if (type === 'connection') {
            actionsHtml = `
                <div class="mob-alumni-actions">
                    <button class="mob-act-btn mob-act-message" onclick="window.location.href='Messages.html?userId=${id}'">
                        <i class="fas fa-comment"></i> Message
                    </button>
                    <button class="mob-act-btn mob-act-profile" onclick="window._mobCircleViewProfile('${id}')">
                        <i class="fas fa-user"></i> Profile
                    </button>
                </div>
            `;
        } else {
            actionsHtml = `
                <div class="mob-alumni-actions">
                    <button class="mob-act-btn mob-act-connect" onclick="window._mobCircleConnect('${id}', this)">
                        <i class="fas fa-user-plus"></i> Connect
                    </button>
                    <button class="mob-act-btn mob-act-profile" onclick="window._mobCircleViewProfile('${id}')">
                        Profile
                    </button>
                </div>
            `;
        }

        return `
            <div class="mob-alumni-card" data-user-id="${id}">
                <div class="mob-online-dot ${isOnline ? 'online' : 'offline'}"></div>
                ${type === 'incoming' ? '<div class="mob-req-status pending"></div>' : ''}
                ${type === 'outgoing' ? '<div class="mob-req-status accepted"></div>' : ''}

                <div class="mob-alumni-card-header">
                    <div class="mob-alumni-avatar">${avatarHtml}</div>
                    <div class="mob-alumni-info">
                        <h3>${name} ${verified ? '<i class="fas fa-check-circle mob-verified-icon"></i>' : ''}</h3>
                        <div class="mob-alumni-headline">
                            <span class="mob-alumni-title">${title || 'Alumni'}</span>
                            ${company ? `<span class="mob-alumni-company">@ ${company}</span>` : ''}
                        </div>
                    </div>
                </div>

                ${tagsHtml ? `<div class="mob-alumni-tags">${tagsHtml}</div>` : ''}
                ${skillsHtml ? `<div class="mob-alumni-skills">${skillsHtml}</div>` : ''}

                ${actionsHtml}
            </div>
        `;
    }

    // ── RENDER CIRCLES ──
    function renderCircles() {
        const container = document.getElementById('mob-circle-content');
        if (!container) return;

        container.innerHTML = `
            <div class="mob-circle-loading">
                <i class="fas fa-spinner fa-spin fa-2x"></i>
                <p>Loading circles…</p>
            </div>
        `;

        (async () => {
            try {
                const res = await apiFetch('/api/alumni/circles');
                const circleItems = res?.circles || res?.data || res || [];

                if (!Array.isArray(circleItems) || circleItems.length === 0) {
                    container.innerHTML = `
                        <div class="mob-circle-empty">
                            <i class="fas fa-users"></i>
                            <h4>No Circles Yet</h4>
                            <p>Communities will appear here once created by alumni.</p>
                        </div>
                    `;
                    return;
                }

                container.innerHTML = `
                    <div class="mob-circle-card create" onclick="if($)$('#createCircleModal').modal('show')">
                        <div class="mob-circle-icon"><i class="fas fa-plus-circle"></i></div>
                        <div class="mob-circle-title">Start a Circle</div>
                        <div class="mob-circle-members">Create a micro-community</div>
                        <button class="mob-circle-join-btn">Start Group</button>
                    </div>
                    ${circleItems.map(c => `
                        <div class="mob-circle-card">
                            <div class="mob-circle-icon"><i class="fas fa-users-viewfinder"></i></div>
                            <div class="mob-circle-title">${c.name}</div>
                            <div class="mob-circle-members">${c.memberCount || 0} Members</div>
                            <div class="mob-circle-stats">
                                <div><div class="mob-circle-stat-val">${c.postCount || 0}</div><div class="mob-circle-stat-lbl">Posts</div></div>
                                <div><div class="mob-circle-stat-val">${c.activeCount || 0}</div><div class="mob-circle-stat-lbl">Online</div></div>
                            </div>
                            <button class="mob-circle-join-btn ${c.isJoined ? 'joined' : ''}" onclick="window._mobCircleToggle('${c._id}', this)">
                                <i class="fas fa-${c.isJoined ? 'check' : 'plus'}"></i>
                                ${c.isJoined ? 'Joined' : 'Join Community'}
                            </button>
                        </div>
                    `).join('')}
                `;
            } catch (err) {
                container.innerHTML = `
                    <div class="mob-circle-empty">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h4>Failed to load</h4>
                        <p>Could not sync circles. Try again.</p>
                    </div>
                `;
            }
        })();
    }

    // ── PAGINATION ──
    function renderPagination(totalPages) {
        const container = document.getElementById('mob-circle-pagination');
        if (!container) return;

        if (!totalPages || totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `
            <div class="mob-circle-pagination">
                <button class="mob-circle-pag-btn" ${mobPage <= 1 ? 'disabled' : ''} onclick="window._mobCirclePage(${mobPage - 1})">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <span class="mob-circle-pag-info">Page ${mobPage} / ${totalPages}</span>
                <button class="mob-circle-pag-btn" ${mobPage >= totalPages ? 'disabled' : ''} onclick="window._mobCirclePage(${mobPage + 1})">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        `;
    }

    // ── UI HELPERS ──
    function showLoading() {
        const c = document.getElementById('mob-circle-content');
        if (c) c.innerHTML = `
            <div class="mob-circle-loading">
                <i class="fas fa-spinner fa-spin fa-2x"></i>
                <p>Loading…</p>
            </div>
        `;
    }

    function showError(msg) {
        const c = document.getElementById('mob-circle-content');
        if (c) c.innerHTML = `
            <div class="mob-circle-empty">
                <i class="fas fa-wifi"></i>
                <h4>Connection Issue</h4>
                <p>${msg}</p>
            </div>
        `;
    }

    function updateReqBadge(count) {
        const badge = document.getElementById('mob-req-badge');
        if (!badge) return;
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }

    // ── GLOBAL ACTIONS (direct API calls) ──
    window._mobCircleConnect = async function (id, btn) {
        try {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btn.disabled = true;
            await apiFetch('/api/alumni/connect', {
                method: 'POST',
                body: JSON.stringify({ recipientId: id })
            });
            btn.innerHTML = '<i class="fas fa-clock"></i> Pending';
            btn.className = 'mob-act-btn mob-act-pending';
        } catch (err) {
            btn.innerHTML = '<i class="fas fa-user-plus"></i> Connect';
            btn.disabled = false;
            console.error('Connect error:', err);
        }
    };

    window._mobCircleRespond = async function (reqId, action, btn) {
        try {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            await apiFetch(`/api/alumni/requests/${reqId}/respond`, {
                method: 'POST',
                body: JSON.stringify({ action })
            });
            setTimeout(() => loadTab(), 500);
        } catch (err) {
            btn.innerHTML = action === 'accepted' ? '<i class="fas fa-check"></i> Accept' : 'Ignore';
            console.error('Respond error:', err);
        }
    };

    window._mobCircleViewProfile = function (id) {
        const item = alumniData.find(a => (a._id || a.userId || a.id) === id);
        if (item && typeof Swal !== 'undefined') {
            Swal.fire({
                title: '',
                html: `
                    <div style="text-align: center; padding: 10px 0;">
                        <div style="width: 70px; height: 70px; border-radius: 20px; background: linear-gradient(135deg, #0A1A2F, #1c3a63); color: white; font-weight: 800; font-size: 1.5rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px;">
                            ${(item.name || 'A').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <h3 style="font-weight: 800; color: #0A1A2F; margin-bottom: 4px;">${item.name}</h3>
                        <p style="color: #C2491F; font-weight: 600; font-size: 0.85rem; margin-bottom: 15px;">${item.title || 'Alumni'}${item.company ? ' @ ' + item.company : ''}</p>
                    </div>
                    <div style="text-align: left; font-size: 0.85rem; color: #3f4d5e; line-height: 1.8;">
                        ${item.stream ? `<p><i class="fas fa-graduation-cap" style="color: #C2491F; width: 20px;"></i> ${item.stream}</p>` : ''}
                        ${item.yearsOfExperience ? `<p><i class="fas fa-briefcase" style="color: #C2491F; width: 20px;"></i> ${item.yearsOfExperience}+ Years Experience</p>` : ''}
                        ${item.graduationYear ? `<p><i class="fas fa-calendar" style="color: #C2491F; width: 20px;"></i> Class of ${item.graduationYear}</p>` : ''}
                        ${item.skills?.length ? `<p><i class="fas fa-code" style="color: #C2491F; width: 20px;"></i> ${item.skills.join(', ')}</p>` : ''}
                        ${item.isMentorAvailable ? `<p><i class="fas fa-shield-halved" style="color: #059669; width: 20px;"></i> Available to Mentor</p>` : ''}
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: '<i class="fas fa-comment"></i> Message',
                cancelButtonText: 'Close',
                confirmButtonColor: '#0A1A2F',
                cancelButtonColor: '#e8e8e8',
                background: '#FFF8F0',
                customClass: { popup: 'mob-profile-swal' }
            }).then(result => {
                if (result.isConfirmed) {
                    window.location.href = `Messages.html?userId=${id}`;
                }
            });
        }
    };

    window._mobCirclePage = function (page) {
        mobPage = page;
        applyFilterAndRender();
        const content = document.getElementById('mob-circle-content');
        if (content) content.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    window._mobCircleToggle = async function (circleId, btn) {
        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            await apiFetch(`/api/alumni/circles/${circleId}/toggle`, { method: 'POST' });
            setTimeout(() => loadTab(), 500);
        } catch (err) {
            btn.disabled = false;
            console.error('Circle toggle error:', err);
        }
    };

    // ── INIT ──
    renderBase();

})();
