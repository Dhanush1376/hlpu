/**
 * mobile-settings.js
 * Mobile-first logic for Settings page.
 * Reuses /api/settings/* endpoints.
 */

window.MobileSettings = (function () {
    let userData = null;
    let activeTab = 'profile';

    const tabs = [
        { key: 'profile', label: 'Profile', icon: 'fas fa-user' },
        { key: 'account', label: 'Account', icon: 'fas fa-id-card' },
        { key: 'privacy', label: 'Privacy', icon: 'fas fa-shield-alt' },
        { key: 'notifications', label: 'Alerts', icon: 'fas fa-bell' },
        { key: 'preferences', label: 'Prefs', icon: 'fas fa-sliders-h' },
        { key: 'danger', label: 'Danger', icon: 'fas fa-exclamation-triangle' }
    ];

    async function run() {
        const root = document.getElementById('mobile-root');
        if (!root) return;

        root.innerHTML = `
            ${MobileNav.renderHeader({ userInitial: getInitials() })}
            <div style="text-align:center;padding:80px 0;">
                <i class="fas fa-spinner fa-spin fa-2x" style="color:#C2491F;"></i>
                <p style="margin-top:12px;color:#5f6b7a;font-size:0.85rem;">Loading settings...</p>
            </div>
            ${MobileNav.renderBottomNav("more")}
            ${MobileNav.renderSidenav()}
        `;
        setTimeout(() => MobileNav.initSidenavEvents(), 100);

        try {
            userData = await apiFetch('/api/settings/me');
        } catch (err) {
            console.error('[MobileSettings] Load error:', err);
        }

        renderPage(root);
    }

    function getInitials() {
        try {
            return (localStorage.getItem('userName') || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        } catch (e) { return 'U'; }
    }

    function renderPage(root) {
        const s = userData?.settings || {};

        root.innerHTML = `
            ${MobileNav.renderHeader({ userInitial: getInitials() })}

            <div class="mob-settings-header">
                <h1>Settings</h1>
                <p>Manage your account, privacy, and preferences</p>
            </div>

            <div class="mob-settings-tabs" id="mob-settings-tabs">
                ${tabs.map(t => `
                    <button class="mob-settings-tab ${t.key === activeTab ? 'active' : ''}" data-tab="${t.key}">
                        <i class="${t.icon}"></i> ${t.label}
                    </button>
                `).join('')}
            </div>

            <!-- PROFILE -->
            <div class="mob-settings-section ${activeTab === 'profile' ? 'active' : ''}" data-section="profile">
                ${renderProfileSection()}
            </div>

            <!-- ACCOUNT -->
            <div class="mob-settings-section ${activeTab === 'account' ? 'active' : ''}" data-section="account">
                ${renderAccountSection()}
            </div>

            <!-- PRIVACY -->
            <div class="mob-settings-section ${activeTab === 'privacy' ? 'active' : ''}" data-section="privacy">
                ${renderPrivacySection(s)}
            </div>

            <!-- NOTIFICATIONS -->
            <div class="mob-settings-section ${activeTab === 'notifications' ? 'active' : ''}" data-section="notifications">
                ${renderNotificationSection(s)}
            </div>

            <!-- PREFERENCES -->
            <div class="mob-settings-section ${activeTab === 'preferences' ? 'active' : ''}" data-section="preferences">
                ${renderPreferencesSection(s)}
            </div>

            <!-- DANGER -->
            <div class="mob-settings-section ${activeTab === 'danger' ? 'active' : ''}" data-section="danger">
                ${renderDangerSection()}
            </div>

            <!-- LOGOUT -->
            <button class="mob-logout-btn" id="mob-logout-btn">
                <i class="fas fa-sign-out-alt"></i> Log Out
            </button>

            <div class="mob-settings-footer">hLPU Heritage Network v2.1</div>

            ${MobileNav.renderBottomNav("more")}
            ${MobileNav.renderSidenav()}
        `;

        setTimeout(() => MobileNav.initSidenavEvents(), 100);
        bindTabEvents();
        bindProfileForm();
        bindToggleEvents();
        bindLogout();
    }

    // ========== PROFILE ==========
    function renderProfileSection() {
        const d = userData || {};
        const [firstName, ...lastParts] = (d.name || '').split(' ');
        const lastName = lastParts.join(' ');

        return `
            <div class="mob-settings-card">
                <div class="mob-settings-section-title"><i class="fas fa-user-circle"></i> Profile Information</div>
                <form id="mob-profile-form">
                    <div class="mob-s-form-group">
                        <label class="mob-s-form-label"><i class="fas fa-user"></i> First Name</label>
                        <input class="mob-s-form-input" type="text" id="mob-firstName" value="${firstName || ''}">
                    </div>
                    <div class="mob-s-form-group">
                        <label class="mob-s-form-label"><i class="fas fa-user"></i> Last Name</label>
                        <input class="mob-s-form-input" type="text" id="mob-lastName" value="${lastName || ''}" placeholder="Enter last name">
                    </div>
                    <div class="mob-s-form-group">
                        <label class="mob-s-form-label"><i class="fas fa-envelope"></i> Email Address</label>
                        <input class="mob-s-form-input" type="email" id="mob-email" value="${d.email || ''}" readonly>
                        <div class="mob-s-form-hint">Used for account notifications</div>
                    </div>
                    <div class="mob-s-form-group">
                        <label class="mob-s-form-label"><i class="fas fa-phone"></i> Phone Number</label>
                        <input class="mob-s-form-input" type="tel" id="mob-phone" value="${d.contact?.phone || ''}">
                    </div>
                    <div class="mob-s-form-group">
                        <label class="mob-s-form-label"><i class="fas fa-align-left"></i> Bio</label>
                        <textarea class="mob-s-form-textarea" id="mob-bio" placeholder="Tell us about yourself...">${d.about || ''}</textarea>
                    </div>
                    <div class="mob-s-form-group">
                        <label class="mob-s-form-label"><i class="fas fa-map-marker-alt"></i> Location</label>
                        <input class="mob-s-form-input" type="text" id="mob-location" value="${d.contact?.location || ''}">
                    </div>
                    <div class="mob-s-form-group">
                        <label class="mob-s-form-label"><i class="fas fa-graduation-cap"></i> Graduation Year</label>
                        <select class="mob-s-form-select" id="mob-gradYear">
                            ${[2024, 2025, 2026, 2027].map(y => `<option ${(d.graduationYear || '2026') == y ? 'selected' : ''}>${y}</option>`).join('')}
                        </select>
                    </div>
                    <button type="submit" class="mob-s-save-btn" id="mob-profile-save">
                        <i class="fas fa-save"></i> Save Changes
                    </button>
                </form>
            </div>
        `;
    }

    // ========== ACCOUNT ==========
    function renderAccountSection() {
        return `
            <div class="mob-settings-card">
                <div class="mob-settings-section-title"><i class="fas fa-id-card"></i> Account Settings</div>

                <div class="mob-settings-section-title" style="font-size:0.82rem;margin-bottom:8px;">Connected Accounts</div>
                ${renderConnectedRow('LinkedIn', true)}
                ${renderConnectedRow('GitHub', false)}
                ${renderConnectedRow('Google Account', true)}

                <div class="mob-s-form-group" style="margin-top:14px;">
                    <label class="mob-s-form-label"><i class="fas fa-language"></i> Language</label>
                    <select class="mob-s-form-select">
                        <option selected>English (US)</option>
                        <option>English (UK)</option>
                        <option>Hindi</option>
                        <option>Spanish</option>
                    </select>
                </div>
            </div>
        `;
    }

    function renderConnectedRow(name, connected) {
        return `
            <div class="mob-connected-row">
                <div>
                    <div class="mob-connected-label">${name}</div>
                    <div class="mob-connected-status">
                        <i class="fas ${connected ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                        ${connected ? 'Connected' : 'Not Connected'}
                    </div>
                </div>
                <button class="mob-connect-btn">${connected ? 'Disconnect' : 'Connect'}</button>
            </div>
        `;
    }

    // ========== PRIVACY ==========
    function renderPrivacySection(s) {
        const p = s.privacy || {};
        return `
            <div class="mob-settings-card">
                <div class="mob-settings-section-title"><i class="fas fa-shield-alt"></i> Privacy & Security</div>

                <div class="mob-nav-item" onclick="openPasswordModal()">
                    <div class="mob-nav-item-info">
                        <h4>Change Password</h4>
                        <p>Last changed 30 days ago</p>
                    </div>
                    <i class="fas fa-chevron-right mob-nav-item-arrow"></i>
                </div>

                ${renderToggle('mob-tfa', 'Two-Factor Auth', 'Extra layer of security', true, 'privacy')}
                ${renderToggle('mob-showEmail', 'Show Email Address', 'Allow others to see your email', p.showEmail ?? true, 'privacy')}
                ${renderToggle('mob-dataSharing', 'Data Sharing', 'Share anonymous usage data', p.dataSharing ?? true, 'privacy')}

                <div class="mob-s-form-group" style="margin-top:12px;">
                    <label class="mob-s-form-label"><i class="fas fa-eye"></i> Profile Visibility</label>
                    <select class="mob-s-form-select" id="mob-visibility">
                        <option value="public" ${(p.profileVisibility || 'public') === 'public' ? 'selected' : ''}>Public</option>
                        <option value="connections" ${p.profileVisibility === 'connections' ? 'selected' : ''}>Connections Only</option>
                        <option value="private" ${p.profileVisibility === 'private' ? 'selected' : ''}>Hidden</option>
                    </select>
                </div>
            </div>
        `;
    }

    // ========== NOTIFICATIONS ==========
    function renderNotificationSection(s) {
        const n = s.notifications || {};
        return `
            <div class="mob-settings-card">
                <div class="mob-settings-section-title"><i class="fas fa-bell"></i> Notification Preferences</div>

                <div class="mob-category-label"><i class="fas fa-envelope"></i> Email Notifications</div>
                ${renderToggle('mob-jobAlerts', 'Job Alerts', 'New job opportunities', n.jobAlerts ?? true, 'notif')}
                ${renderToggle('mob-mentorMsg', 'Mentor Messages', 'When mentors message you', n.mentorMessages ?? true, 'notif')}
                ${renderToggle('mob-eventRem', 'Event Reminders', 'Upcoming event reminders', n.eventReminders ?? true, 'notif')}

                <div class="mob-category-label" style="margin-top:12px;"><i class="fas fa-mobile-alt"></i> Push Notifications</div>
                ${renderToggle('mob-appUpdates', 'Application Updates', 'Real-time application updates', n.applicationUpdates ?? true, 'notif')}
                ${renderToggle('mob-connReq', 'Connection Requests', 'Someone wants to connect', n.connectionRequests ?? false, 'notif')}
                ${renderToggle('mob-weekly', 'Weekly Summary', 'Weekly activity report', n.weeklySummary ?? true, 'notif')}

                <div class="mob-category-label" style="margin-top:12px;"><i class="fas fa-sms"></i> SMS Notifications</div>
                ${renderToggle('mob-smsAlerts', 'Important Alerts', 'Critical updates via SMS', n.smsAlerts ?? false, 'notif')}
                ${renderToggle('mob-intReminders', 'Interview Reminders', 'SMS before interviews', n.interviewReminders ?? true, 'notif')}
            </div>
        `;
    }

    // ========== PREFERENCES ==========
    function renderPreferencesSection(s) {
        const p = s.preferences || {};
        return `
            <div class="mob-settings-card">
                <div class="mob-settings-section-title"><i class="fas fa-sliders-h"></i> Preferences</div>

                <div class="mob-s-form-group">
                    <label class="mob-s-form-label"><i class="fas fa-chart-pie"></i> Dashboard View</label>
                    <select class="mob-s-form-select" id="mob-dashView">
                        <option value="standard" ${(p.dashboardView || 'standard') === 'standard' ? 'selected' : ''}>Standard</option>
                        <option value="compact" ${p.dashboardView === 'compact' ? 'selected' : ''}>Compact</option>
                    </select>
                </div>

                ${renderToggle('mob-autoSave', 'Auto-save Forms', 'Automatically save form progress', p.autoSaveForms ?? true, 'pref')}
                ${renderToggle('mob-onlineStatus', 'Show Online Status', "Let others see when you're online", p.showOnlineStatus ?? true, 'pref')}
                ${renderToggle('mob-emailDigest', 'Email Digest', 'Receive daily summary emails', p.emailDigest ?? false, 'pref')}

                <div class="mob-nav-item" style="margin-top:12px;">
                    <div class="mob-nav-item-info">
                        <h4>Export Data</h4>
                        <p>Download all your hLPU data</p>
                    </div>
                    <i class="fas fa-download mob-nav-item-arrow" style="color:#C2491F;"></i>
                </div>
            </div>
        `;
    }

    // ========== DANGER ==========
    function renderDangerSection() {
        return `
            <div class="mob-danger-card">
                <div class="mob-danger-title"><i class="fas fa-exclamation-triangle"></i> Deactivate Or Deletion</div>
                <div class="mob-danger-item">
                    <div>
                        <h4>Deactivate Account</h4>
                        <p>Temporarily disable your account</p>
                    </div>
                    <button class="mob-danger-btn" onclick="confirmDeactivate()">
                        <i class="fas fa-user-slash"></i> Deactivate
                    </button>
                </div>
                <div class="mob-danger-item">
                    <div>
                        <h4>Delete Account</h4>
                        <p>Permanently delete all data</p>
                    </div>
                    <button class="mob-danger-btn" onclick="confirmDelete()">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }

    // ========== REUSABLE TOGGLE ==========
    function renderToggle(id, label, desc, checked, group) {
        return `
            <div class="mob-toggle-item">
                <div class="mob-toggle-info">
                    <div class="mob-toggle-label">${label}</div>
                    <div class="mob-toggle-desc">${desc}</div>
                </div>
                <label class="mob-toggle-switch">
                    <input type="checkbox" id="${id}" data-group="${group}" ${checked ? 'checked' : ''}>
                    <span class="mob-toggle-slider"></span>
                </label>
            </div>
        `;
    }

    // ========== EVENTS ==========
    function bindTabEvents() {
        document.querySelectorAll('#mob-settings-tabs .mob-settings-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#mob-settings-tabs .mob-settings-tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeTab = btn.dataset.tab;
                document.querySelectorAll('.mob-settings-section').forEach(s => s.classList.remove('active'));
                const target = document.querySelector(`.mob-settings-section[data-section="${activeTab}"]`);
                if (target) target.classList.add('active');
            });
        });
    }

    function bindProfileForm() {
        const form = document.getElementById('mob-profile-form');
        if (!form) return;
        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            const btn = document.getElementById('mob-profile-save');
            const orig = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            try {
                await apiFetch('/api/settings/profile', {
                    method: 'PATCH',
                    body: JSON.stringify({
                        firstName: document.getElementById('mob-firstName').value,
                        lastName: document.getElementById('mob-lastName').value,
                        phone: document.getElementById('mob-phone').value,
                        bio: document.getElementById('mob-bio').value,
                        location: document.getElementById('mob-location').value,
                        graduationYear: document.getElementById('mob-gradYear').value
                    })
                });
                localStorage.setItem('userName', `${document.getElementById('mob-firstName').value} ${document.getElementById('mob-lastName').value}`);
                Swal.fire({ title: 'Saved!', icon: 'success', timer: 1500, showConfirmButton: false, confirmButtonColor: '#C2491F' });
            } catch (err) {
                Swal.fire('Error', err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = orig;
            }
        });
    }

    function bindToggleEvents() {
        // Notification toggles
        const notifMap = {
            'mob-jobAlerts': 'jobAlerts', 'mob-mentorMsg': 'mentorMessages',
            'mob-eventRem': 'eventReminders', 'mob-appUpdates': 'applicationUpdates',
            'mob-connReq': 'connectionRequests', 'mob-weekly': 'weeklySummary',
            'mob-smsAlerts': 'smsAlerts', 'mob-intReminders': 'interviewReminders'
        };

        document.querySelectorAll('input[data-group="notif"]').forEach(el => {
            el.addEventListener('change', async function () {
                try {
                    const allNotifs = {};
                    Object.entries(notifMap).forEach(([id, field]) => {
                        const cb = document.getElementById(id);
                        if (cb) allNotifs[field] = cb.checked;
                    });
                    await apiFetch('/api/settings/notifications', { method: 'PATCH', body: JSON.stringify(allNotifs) });
                } catch (err) {
                    this.checked = !this.checked;
                    console.error('Notif toggle error:', err);
                }
            });
        });

        // Privacy toggles
        document.querySelectorAll('input[data-group="privacy"]').forEach(el => {
            el.addEventListener('change', async function () {
                try {
                    const allPrivacy = {
                        profileVisibility: document.getElementById('mob-visibility')?.value || 'public',
                        showEmail: document.getElementById('mob-showEmail')?.checked ?? true,
                        dataSharing: document.getElementById('mob-dataSharing')?.checked ?? true
                    };
                    await apiFetch('/api/settings/privacy', { method: 'PATCH', body: JSON.stringify(allPrivacy) });
                } catch (err) {
                    this.checked = !this.checked;
                }
            });
        });

        // Visibility select
        const vis = document.getElementById('mob-visibility');
        if (vis) {
            vis.addEventListener('change', async function () {
                try {
                    await apiFetch('/api/settings/privacy', {
                        method: 'PATCH',
                        body: JSON.stringify({
                            profileVisibility: this.value,
                            showEmail: document.getElementById('mob-showEmail')?.checked ?? true,
                            dataSharing: document.getElementById('mob-dataSharing')?.checked ?? true
                        })
                    });
                } catch (err) { console.error('Visibility error:', err); }
            });
        }

        // Preference toggles
        document.querySelectorAll('input[data-group="pref"]').forEach(el => {
            el.addEventListener('change', async function () {
                try {
                    const allPrefs = {
                        dashboardView: document.getElementById('mob-dashView')?.value || 'standard',
                        autoSaveForms: document.getElementById('mob-autoSave')?.checked ?? true,
                        showOnlineStatus: document.getElementById('mob-onlineStatus')?.checked ?? true,
                        emailDigest: document.getElementById('mob-emailDigest')?.checked ?? false
                    };
                    await apiFetch('/api/settings/preferences', { method: 'PATCH', body: JSON.stringify(allPrefs) });
                } catch (err) {
                    this.checked = !this.checked;
                }
            });
        });

        // Dashboard view select
        const dv = document.getElementById('mob-dashView');
        if (dv) {
            dv.addEventListener('change', async function () {
                try {
                    await apiFetch('/api/settings/preferences', {
                        method: 'PATCH',
                        body: JSON.stringify({
                            dashboardView: this.value,
                            autoSaveForms: document.getElementById('mob-autoSave')?.checked ?? true,
                            showOnlineStatus: document.getElementById('mob-onlineStatus')?.checked ?? true,
                            emailDigest: document.getElementById('mob-emailDigest')?.checked ?? false
                        })
                    });
                } catch (err) { console.error('Pref error:', err); }
            });
        }
    }

    function bindLogout() {
        const btn = document.getElementById('mob-logout-btn');
        if (btn) {
            btn.addEventListener('click', () => {
                Swal.fire({
                    title: 'Log Out?',
                    text: 'You will be signed out of hLPU.',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#B02A37',
                    confirmButtonText: 'Log Out',
                    cancelButtonText: 'Cancel',
                    background: '#FFF8F0'
                }).then(result => {
                    if (result.isConfirmed && typeof window.handleLogout === 'function') {
                        window.handleLogout();
                    } else if (result.isConfirmed) {
                        localStorage.clear();
                        window.location.href = '../Main/login.html';
                    }
                });
            });
        }
    }

    return { run };
})();

// Auto-init on mobile
if (window.innerWidth <= 768 && document.getElementById('mobile-root')) {
    MobileSettings.run();
}
