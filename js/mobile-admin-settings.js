/**
 * mobile-admin-settings.js
 * Mobile settings for Admin.
 * Reuses MobileSettings pattern with admin-specific options.
 */
(function () {
    if (window.innerWidth > 768) return;

    const Nav = window.AdminMobileNav || window.MobileNav;
    if (!Nav) return;

    document.querySelectorAll('#navbar, .mesh-bg, .dashboard-container').forEach(el => el.style.display = 'none');

    let root = document.getElementById('mobile-root');
    if (!root) { root = document.createElement('div'); root.id = 'mobile-root'; document.body.prepend(root); }

    async function init() {
        let userData = {};
        try {
            userData = await apiFetch('/api/profile/me') || {};
        } catch (e) { console.error('[admin-settings]', e); }

        const userName = userData.name || localStorage.getItem('userName') || 'Admin';
        const initials = userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

        root.innerHTML = `
            ${Nav.renderHeader({})}

            <div class="mob-admin-welcome">
                <h1>Settings</h1>
                <p><i class="fas fa-cog"></i> System preferences and configuration</p>
            </div>

            <div class="mob-admin-profile">
                <div class="mob-admin-profile-avatar">${initials}</div>
                <div class="mob-admin-profile-info">
                    <h2>${userName}</h2>
                    <p>${userData.email || ''}</p>
                    <div class="mob-admin-badges">
                        <span class="mob-admin-badge"><i class="fas fa-crown"></i> Administrator</span>
                    </div>
                </div>
            </div>

            <div class="mob-admin-section">
                <div class="mob-admin-section-header">
                    <div class="mob-admin-section-title"><i class="fas fa-shield-alt"></i> System Controls</div>
                </div>
                ${renderSettingsGroup([
            { icon: 'fa-user-check', label: 'Auto-approve Students', desc: 'Skip verification for students', key: 'autoApproveStudents' },
            { icon: 'fa-bell', label: 'Email Notifications', desc: 'Send alerts to admin email', key: 'emailNotifications' },
            { icon: 'fa-eye-slash', label: 'Maintenance Mode', desc: 'Temporarily disable platform', key: 'maintenanceMode' }
        ])}
            </div>

            <div class="mob-admin-section">
                <div class="mob-admin-section-header">
                    <div class="mob-admin-section-title"><i class="fas fa-briefcase"></i> Job Moderation</div>
                </div>
                ${renderSettingsGroup([
            { icon: 'fa-check-double', label: 'Auto-approve Jobs', desc: 'Skip review for alumni jobs', key: 'autoApproveJobs' },
            { icon: 'fa-flag', label: 'Profanity Filter', desc: 'Auto-flag inappropriate content', key: 'profanityFilter' }
        ])}
            </div>

            <div class="mob-admin-section">
                <div class="mob-admin-section-header">
                    <div class="mob-admin-section-title"><i class="fas fa-database"></i> Data Management</div>
                </div>
                <div class="mob-admin-system-chips" style="border-top: none; padding-top: 0; margin-top: 0;">
                    <div class="mob-admin-system-chip" onclick="window._adminSettingsAction('cache')"><i class="fas fa-broom"></i> Clear Cache</div>
                    <div class="mob-admin-system-chip" onclick="window._adminSettingsAction('export')"><i class="fas fa-file-export"></i> Export Data</div>
                    <div class="mob-admin-system-chip" onclick="window._adminSettingsAction('backup')"><i class="fas fa-database"></i> Backup DB</div>
                    <div class="mob-admin-system-chip" onclick="window._adminSettingsAction('logs')"><i class="fas fa-clipboard-list"></i> View Logs</div>
                </div>
            </div>

            <div class="mob-admin-section" style="background: rgba(183, 28, 28, 0.03); border-color: rgba(183, 28, 28, 0.1);">
                <div class="mob-admin-section-header">
                    <div class="mob-admin-section-title" style="color: #b71c1c;"><i class="fas fa-exclamation-triangle" style="color: #b71c1c;"></i> Danger Zone</div>
                </div>
                <div class="mob-admin-actions" style="flex-direction: column;">
                    <button class="mob-admin-btn mob-admin-btn-outline" onclick="window._adminSettingsAction('resetPlatform')"><i class="fas fa-redo"></i> Reset Platform Stats</button>
                    <button class="mob-admin-btn mob-admin-btn-danger" onclick="window._adminLogout()"><i class="fas fa-sign-out-alt"></i> Logout</button>
                </div>
            </div>

            ${Nav.renderSidenav()}
            ${Nav.renderBottomNav('')}
        `;
        if (Nav.initSidenavEvents) setTimeout(() => Nav.initSidenavEvents(), 100);
    }

    function renderSettingsGroup(items) {
        return items.map(item => `
            <div class="mob-admin-activity" style="cursor: pointer;" onclick="this.querySelector('input')?.click()">
                <div class="mob-admin-activity-icon"><i class="fas ${item.icon}"></i></div>
                <div style="flex: 1;">
                    <div class="mob-admin-activity-title">${item.label}</div>
                    <div class="mob-admin-activity-desc">${item.desc}</div>
                </div>
                <label style="position: relative; width: 44px; height: 24px; flex-shrink: 0;">
                    <input type="checkbox" style="opacity: 0; width: 0; height: 0;" data-key="${item.key}" onchange="window._adminToggle('${item.key}', this.checked)">
                    <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: #ccc; border-radius: 24px; transition: 0.3s;">
                        <span style="position: absolute; content: ''; height: 18px; width: 18px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.3s;"></span>
                    </span>
                </label>
            </div>
        `).join('');
    }

    window._adminToggle = function (key, value) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, icon: 'success', title: `${key} ${value ? 'enabled' : 'disabled'}`, background: '#FFF8F0' });
        }
    };

    window._adminSettingsAction = function (action) {
        if (typeof Swal === 'undefined') return;
        const actions = {
            cache: { title: 'Clear Cache', text: 'This will clear all temporary files.', icon: 'warning' },
            export: { title: 'Export Data', text: 'Full data export will be generated.', icon: 'info' },
            backup: { title: 'Database Backup', text: 'A snapshot will be created.', icon: 'info' },
            logs: { title: 'System Logs', text: 'Viewing latest 100 log entries…', icon: 'info' },
            resetPlatform: { title: 'Reset Stats?', text: 'This will reset all analytics counters. This action is irreversible!', icon: 'warning' }
        };
        const cfg = actions[action] || { title: action, text: '', icon: 'info' };
        Swal.fire({ title: cfg.title, text: cfg.text, icon: cfg.icon, showCancelButton: true, confirmButtonColor: '#C2491F', background: '#FFF8F0' });
    };

    window._adminLogout = function () {
        if (typeof Swal !== 'undefined') {
            Swal.fire({ title: 'Logout?', text: 'You will return to the login page.', icon: 'question', showCancelButton: true, confirmButtonText: 'Logout', confirmButtonColor: '#b71c1c', background: '#FFF8F0' }).then(r => {
                if (r.isConfirmed) { localStorage.clear(); window.location.href = '../Main/Login.html'; }
            });
        }
    };

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
