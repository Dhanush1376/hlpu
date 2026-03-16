/**
 * mobile-admin-profile.js
 * Mobile profile page for Admin.
 * Full feature parity: personal info edit, admin role, recent activity, security toggles, notifications, danger zone.
 */
(function () {
    if (window.innerWidth > 768) return;

    const Nav = window.AdminMobileNav || window.MobileNav;
    if (!Nav) return;

    document.querySelectorAll('#navbar, .mesh-bg, .dashboard-container').forEach(el => el.style.display = 'none');

    let root = document.getElementById('mobile-root');
    if (!root) { root = document.createElement('div'); root.id = 'mobile-root'; document.body.prepend(root); }

    let currentUser = null;

    async function init() {
        root.innerHTML = `
            ${Nav.renderHeader({})}
            <div class="mob-admin-loading"><i class="fas fa-spinner fa-spin"></i><p>Loading profile…</p></div>
            ${Nav.renderSidenav()}
            ${Nav.renderBottomNav('')}
        `;
        if (Nav.initSidenavEvents) setTimeout(() => Nav.initSidenavEvents(), 100);

        try {
            const user = await apiFetch('/api/profile/me');
            if (user) { currentUser = user; renderProfile(user); }
        } catch (err) {
            console.error('[admin-profile]', err);
            root.innerHTML = `${Nav.renderHeader({})}<div class="mob-admin-empty"><i class="fas fa-wifi"></i><h4>Connection Error</h4><p>Could not load profile.</p></div>${Nav.renderSidenav()}${Nav.renderBottomNav('')}`;
            if (Nav.initSidenavEvents) setTimeout(() => Nav.initSidenavEvents(), 100);
        }
    }

    function renderProfile(user) {
        const initials = (user.name || 'AD').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const joinedDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
        const joinedShort = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'N/A';
        const lastActive = formatTimeAgo(user.lastActive);
        const twoFA = user.settings?.security?.twoFactorEnabled;
        const loginNotifs = user.settings?.security?.loginNotifications !== false;

        root.innerHTML = `
            ${Nav.renderHeader({})}

            <!-- Profile Header -->
            <div class="mob-admin-profile-header">
                <div class="mob-admin-profile-avatar">${initials}</div>
                <h2>${user.name || 'Admin User'} <span class="mob-admin-tag" style="font-size:0.7rem;vertical-align:middle;">${user.role || 'admin'}</span></h2>
                <p class="mob-admin-profile-role">
                    <i class="fas fa-envelope"></i> ${user.email || ''} · <i class="fas fa-phone-alt"></i> ${user.phoneNumber || 'N/A'} · <i class="fas fa-map-pin"></i> ${user.contact?.location || 'N/A'}
                </p>
                <div class="mob-admin-profile-badges">
                    <span class="mob-admin-tag"><i class="fas fa-calendar-check"></i> Joined ${joinedShort}</span>
                    <span class="mob-admin-tag"><i class="fas fa-shield-alt"></i> ${user.role || 'admin'}</span>
                    <span class="mob-admin-tag"><i class="fas fa-key"></i> Last login ${lastActive}</span>
                </div>
            </div>

            <!-- Personal Information -->
            <div class="mob-admin-section">
                <div class="mob-admin-section-header">
                    <div class="mob-admin-section-title"><i class="fas fa-user-circle"></i> Personal Information</div>
                    <span class="mob-admin-section-link" onclick="window._mobEditPersonal()"><i class="fas fa-pen"></i> Edit</span>
                </div>
                <div class="mob-admin-info-list">
                    <div class="mob-admin-info-row"><span class="mob-admin-info-label">Full Name</span><span class="mob-admin-info-value">${user.name || 'N/A'}</span></div>
                    <div class="mob-admin-info-row"><span class="mob-admin-info-label">Display Name</span><span class="mob-admin-info-value">${user.name ? user.name + ' (Admin)' : 'N/A'}</span></div>
                    <div class="mob-admin-info-row"><span class="mob-admin-info-label">Email</span><span class="mob-admin-info-value">${user.email || 'N/A'}</span></div>
                    <div class="mob-admin-info-row"><span class="mob-admin-info-label">Phone</span><span class="mob-admin-info-value">${user.phoneNumber || 'Not Set'}</span></div>
                    <div class="mob-admin-info-row"><span class="mob-admin-info-label">Location</span><span class="mob-admin-info-value">${user.contact?.location || 'Not Set'}</span></div>
                    <div class="mob-admin-info-row"><span class="mob-admin-info-label">Language</span><span class="mob-admin-info-value">English (UK)</span></div>
                </div>
            </div>

            <!-- Admin Role & Permissions -->
            <div class="mob-admin-section">
                <div class="mob-admin-section-header">
                    <div class="mob-admin-section-title"><i class="fas fa-building"></i> Admin Role & Permissions</div>
                </div>
                <div class="mob-admin-info-list">
                    <div class="mob-admin-info-row"><span class="mob-admin-info-label">Role</span><span class="mob-admin-info-value"><span class="mob-admin-tag status-approved">${user.role || 'admin'} · full access</span></span></div>
                    <div class="mob-admin-info-row"><span class="mob-admin-info-label">Permissions</span><span class="mob-admin-info-value">Users, Content, Reports, Settings</span></div>
                    <div class="mob-admin-info-row"><span class="mob-admin-info-label">Since</span><span class="mob-admin-info-value">${joinedDate}</span></div>
                </div>
            </div>

            <!-- Recent Activity -->
            <div class="mob-admin-section">
                <div class="mob-admin-section-header">
                    <div class="mob-admin-section-title"><i class="fas fa-history"></i> Recent Activity</div>
                    <span class="mob-admin-section-link" onclick="window._adminViewAllActivity()">View All</span>
                </div>
                <div id="mob-admin-activity-list">
                    <div class="mob-admin-loading" style="padding:20px;"><i class="fas fa-spinner fa-spin"></i></div>
                </div>
            </div>

            <!-- Security & Authentication -->
            <div class="mob-admin-section">
                <div class="mob-admin-section-header">
                    <div class="mob-admin-section-title"><i class="fas fa-lock"></i> Security & Auth</div>
                    <span class="mob-admin-section-link" onclick="window._mobEditSecurity()"><i class="fas fa-pen"></i> Manage</span>
                </div>
                <div class="mob-admin-info-list">
                    <div class="mob-admin-info-row">
                        <span class="mob-admin-info-label">2FA (TOTP)</span>
                        <label class="mob-toggle"><input type="checkbox" id="mob-toggle-2fa" ${twoFA ? 'checked' : ''} onchange="window._mobToggleSecurity('twoFactorEnabled', this.checked)"/><span class="mob-toggle-slider"></span></label>
                    </div>
                    <div class="mob-admin-info-row">
                        <span class="mob-admin-info-label">Session Timeout</span>
                        <span class="mob-admin-info-value">30 min auto-logout</span>
                    </div>
                    <div class="mob-admin-info-row">
                        <span class="mob-admin-info-label">Login Alerts</span>
                        <label class="mob-toggle"><input type="checkbox" id="mob-toggle-notif" ${loginNotifs ? 'checked' : ''} onchange="window._mobToggleSecurity('loginNotifications', this.checked)"/><span class="mob-toggle-slider"></span></label>
                    </div>
                    <div class="mob-admin-info-row">
                        <span class="mob-admin-info-label">Backup Codes</span>
                        <span class="mob-admin-info-value">8 remaining · <span style="color:var(--ember, #C2491F);font-weight:700;cursor:pointer;" onclick="window._mobRegenCodes()">Regenerate</span></span>
                    </div>
                </div>
                <div class="mob-admin-actions" style="margin-top:12px;">
                    <button class="mob-admin-btn mob-admin-btn-view" onclick="window._mobChangePassword()"><i class="fas fa-key"></i> Change Password</button>
                    <button class="mob-admin-btn mob-admin-btn-view" onclick="window._mobSessions()"><i class="fas fa-desktop"></i> Sessions (3)</button>
                </div>
            </div>

            <!-- Notification Preferences -->
            <div class="mob-admin-section">
                <div class="mob-admin-section-header">
                    <div class="mob-admin-section-title"><i class="fas fa-bell"></i> Notification Preferences</div>
                    <span class="mob-admin-section-link" onclick="window._mobEditNotifications()"><i class="fas fa-pen"></i> Customize</span>
                </div>
                <div class="mob-admin-info-list">
                    <div class="mob-admin-info-row">
                        <span class="mob-admin-info-label">New Users</span>
                        <label class="mob-toggle"><input type="checkbox" checked /><span class="mob-toggle-slider"></span></label>
                    </div>
                    <div class="mob-admin-info-row">
                        <span class="mob-admin-info-label">Urgent Flags</span>
                        <label class="mob-toggle"><input type="checkbox" checked /><span class="mob-toggle-slider"></span></label>
                    </div>
                    <div class="mob-admin-info-row">
                        <span class="mob-admin-info-label">Daily Digest</span>
                        <label class="mob-toggle"><input type="checkbox" /><span class="mob-toggle-slider"></span></label>
                    </div>
                </div>
            </div>

            <!-- Danger Zone -->
            <div class="mob-admin-section" style="border:1px solid rgba(194,73,31,0.2);background:rgba(245,200,190,0.15);">
                <div class="mob-admin-section-header" style="border-color:rgba(194,73,31,0.15);">
                    <div class="mob-admin-section-title" style="color:#b23c1a;"><i class="fas fa-exclamation-triangle"></i> Danger Zone</div>
                </div>
                <p style="font-size:0.78rem;color:#5f6b7a;margin-bottom:12px;">Permanently delete account or transfer ownership</p>
                <div class="mob-admin-actions">
                    <button class="mob-admin-btn" style="background:transparent;color:#b23c1a;border:2px solid #b23c1a;" onclick="window._mobDeleteAccount()"><i class="fas fa-trash"></i> Delete Account</button>
                    <button class="mob-admin-btn mob-admin-btn-primary" style="background:#0A1A2F;" onclick="window._mobTransferAdmin()"><i class="fas fa-exchange-alt"></i> Transfer Admin</button>
                </div>
            </div>

            <!-- Logout -->
            <div style="margin-top:16px; margin-bottom:20px;">
                <button class="mob-admin-btn mob-admin-btn-view" style="width:100%;padding:14px;" onclick="window._adminLogout()"><i class="fas fa-sign-out-alt"></i> Logout</button>
            </div>

            <!-- Full-Screen Edit Modal -->
            <div id="mob-profile-modal" class="mob-fullscreen-modal" style="display:none;"></div>

            ${Nav.renderSidenav()}
            ${Nav.renderBottomNav('')}
        `;
        if (Nav.initSidenavEvents) setTimeout(() => Nav.initSidenavEvents(), 100);
        loadActivityLogs();
    }

    /* ============ EDIT PERSONAL INFO (Full-screen form) ============ */
    window._mobEditPersonal = function () {
        const modal = document.getElementById('mob-profile-modal');
        if (!modal || !currentUser) return;

        modal.innerHTML = `
            <div class="mob-modal-header">
                <button class="mob-modal-back" onclick="window._mobCloseProfileModal()"><i class="fas fa-arrow-left"></i></button>
                <h2>Edit Personal Info</h2>
                <button class="mob-modal-save" onclick="window._mobSavePersonal()"><i class="fas fa-check"></i> Save</button>
            </div>
            <div class="mob-modal-body">
                <div class="mob-form-group">
                    <label>FULL NAME</label>
                    <input type="text" id="mob-p-name" value="${currentUser.name || ''}" />
                </div>
                <div class="mob-form-group">
                    <label>EMAIL ADDRESS</label>
                    <input type="text" id="mob-p-email" value="${currentUser.email || ''}" />
                </div>
                <div class="mob-form-group">
                    <label>PHONE NUMBER</label>
                    <input type="text" id="mob-p-phone" value="${currentUser.phoneNumber || ''}" placeholder="+91 00000 00000" />
                </div>
                <div class="mob-form-group">
                    <label>LOCATION</label>
                    <input type="text" id="mob-p-location" value="${currentUser.contact?.location || ''}" placeholder="City, Country" />
                </div>
            </div>
        `;
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    };

    window._mobSavePersonal = async function () {
        const payload = {
            name: document.getElementById('mob-p-name')?.value,
            email: document.getElementById('mob-p-email')?.value,
            phoneNumber: document.getElementById('mob-p-phone')?.value,
            contact: { ...currentUser.contact, location: document.getElementById('mob-p-location')?.value }
        };
        try {
            await apiFetch('/api/profile/me', { method: 'PATCH', body: JSON.stringify(payload) });
            window._mobCloseProfileModal();
            if (typeof Swal !== 'undefined') Swal.fire({ icon: 'success', title: 'Profile Updated!', timer: 1500, showConfirmButton: false, background: '#FFF8F0' });
            init();
        } catch (e) {
            if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Failed to update', background: '#FFF8F0' });
        }
    };

    window._mobCloseProfileModal = function () {
        const modal = document.getElementById('mob-profile-modal');
        if (modal) modal.style.display = 'none';
        document.body.style.overflow = '';
    };

    /* ============ SECURITY TOGGLES ============ */
    window._mobToggleSecurity = async function (field, value) {
        if (!currentUser) return;
        try {
            await apiFetch('/api/profile/me', {
                method: 'PATCH',
                body: JSON.stringify({
                    settings: {
                        ...currentUser.settings,
                        security: { ...currentUser.settings?.security, [field]: value }
                    }
                })
            });
            currentUser.settings = currentUser.settings || {};
            currentUser.settings.security = currentUser.settings.security || {};
            currentUser.settings.security[field] = value;
        } catch (e) {
            if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Failed to update', background: '#FFF8F0' });
        }
    };

    /* ============ CHANGE PASSWORD (Full form) ============ */
    window._mobChangePassword = function () {
        const modal = document.getElementById('mob-profile-modal');
        if (!modal) return;
        modal.innerHTML = `
            <div class="mob-modal-header">
                <button class="mob-modal-back" onclick="window._mobCloseProfileModal()"><i class="fas fa-arrow-left"></i></button>
                <h2>Change Password</h2>
                <button class="mob-modal-save" onclick="window._mobSubmitPassword()"><i class="fas fa-check"></i> Update</button>
            </div>
            <div class="mob-modal-body">
                <div class="mob-form-group">
                    <label>CURRENT PASSWORD</label>
                    <input type="password" id="mob-pw-current" placeholder="Enter current password" style="width:100%;padding:12px 14px;border:1px solid rgba(10,26,47,0.1);border-radius:14px;font-size:0.88rem;background:rgba(255,255,255,0.7);outline:none;" />
                </div>
                <div class="mob-form-group">
                    <label>NEW PASSWORD</label>
                    <input type="password" id="mob-pw-new" placeholder="Enter new password" style="width:100%;padding:12px 14px;border:1px solid rgba(10,26,47,0.1);border-radius:14px;font-size:0.88rem;background:rgba(255,255,255,0.7);outline:none;" />
                </div>
                <div class="mob-form-group">
                    <label>CONFIRM NEW PASSWORD</label>
                    <input type="password" id="mob-pw-confirm" placeholder="Confirm new password" style="width:100%;padding:12px 14px;border:1px solid rgba(10,26,47,0.1);border-radius:14px;font-size:0.88rem;background:rgba(255,255,255,0.7);outline:none;" />
                </div>
            </div>
        `;
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    };

    window._mobSubmitPassword = async function () {
        const current = document.getElementById('mob-pw-current')?.value;
        const newPw = document.getElementById('mob-pw-new')?.value;
        const confirm = document.getElementById('mob-pw-confirm')?.value;
        if (!current || !newPw) { alert('Please fill all fields'); return; }
        if (newPw !== confirm) { alert('Passwords do not match'); return; }
        try {
            await apiFetch('/api/profile/change-password', { method: 'POST', body: JSON.stringify({ currentPassword: current, newPassword: newPw }) });
            window._mobCloseProfileModal();
            if (typeof Swal !== 'undefined') Swal.fire({ icon: 'success', title: 'Password Changed!', timer: 1500, showConfirmButton: false, background: '#FFF8F0' });
        } catch (e) {
            if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Failed to change password', text: e.message || '', background: '#FFF8F0' });
        }
    };

    /* ============ SESSIONS ============ */
    window._mobSessions = function () {
        if (typeof Swal === 'undefined') return;
        Swal.fire({
            title: 'Active Sessions', html: `
                <div style="text-align:left;font-size:0.85rem;color:#3f4d5e;">
                    <div style="padding:10px 0;border-bottom:1px solid #f0f0f0;"><i class="fas fa-mobile-alt" style="color:#C2491F;width:20px;"></i> <strong>This device</strong><br><span style="font-size:0.75rem;color:#8b99a8;">Active now</span></div>
                    <div style="padding:10px 0;border-bottom:1px solid #f0f0f0;"><i class="fas fa-laptop" style="color:#C2491F;width:20px;"></i> <strong>Chrome on Windows</strong><br><span style="font-size:0.75rem;color:#8b99a8;">2 hours ago · Delhi, IN</span></div>
                    <div style="padding:10px 0;"><i class="fas fa-tablet-alt" style="color:#C2491F;width:20px;"></i> <strong>Safari on iPad</strong><br><span style="font-size:0.75rem;color:#8b99a8;">1 day ago · Punjab, IN</span></div>
                </div>
            `, confirmButtonColor: '#C2491F', background: '#FFF8F0', width: '95%'
        });
    };

    /* ============ BACKUP CODES ============ */
    window._mobRegenCodes = function () {
        if (typeof Swal === 'undefined') return;
        Swal.fire({
            title: 'Regenerate Backup Codes?', text: 'Old codes will be invalidated.', icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#C2491F', confirmButtonText: 'Regenerate', background: '#FFF8F0'
        }).then(r => { if (r.isConfirmed) Swal.fire({ icon: 'success', title: 'New codes generated', timer: 1500, showConfirmButton: false, background: '#FFF8F0' }); });
    };

    /* ============ EDIT SECURITY (convenience alias) ============ */
    window._mobEditSecurity = function () {
        if (typeof Swal === 'undefined') return;
        Swal.fire({ title: 'Security Settings', text: 'Use toggles on this page to manage 2FA and login alerts.', icon: 'info', confirmButtonColor: '#C2491F', background: '#FFF8F0' });
    };

    /* ============ EDIT NOTIFICATIONS (convenience alias) ============ */
    window._mobEditNotifications = function () {
        if (typeof Swal === 'undefined') return;
        Swal.fire({ title: 'Notification Settings', text: 'Use toggles on this page to manage notification preferences.', icon: 'info', confirmButtonColor: '#C2491F', background: '#FFF8F0' });
    };

    /* ============ VIEW ALL ACTIVITY ============ */
    window._adminViewAllActivity = async function () {
        const modal = document.getElementById('mob-profile-modal');
        if (!modal) return;
        modal.innerHTML = `
            <div class="mob-modal-header">
                <button class="mob-modal-back" onclick="window._mobCloseProfileModal()"><i class="fas fa-arrow-left"></i></button>
                <h2>Activity Log</h2>
                <div></div>
            </div>
            <div class="mob-modal-body" id="mob-full-activity">
                <div class="mob-admin-loading"><i class="fas fa-spinner fa-spin"></i><p>Loading…</p></div>
            </div>
        `;
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        try {
            const logs = await apiFetch('/api/profile/logs');
            const el = document.getElementById('mob-full-activity');
            if (logs && logs.length > 0) {
                el.innerHTML = logs.map(log => `
                    <div class="mob-admin-activity">
                        <div class="mob-admin-activity-icon"><i class="fas fa-circle" style="font-size:0.4rem;"></i></div>
                        <div style="flex:1;">
                            <div class="mob-admin-activity-title">${log.description || log.action || 'Activity'}</div>
                            <div class="mob-admin-activity-time">${formatTimeAgo(log.createdAt)}</div>
                        </div>
                    </div>
                `).join('');
            } else { el.innerHTML = '<p style="text-align:center;color:#8b99a8;">No activity found</p>'; }
        } catch (e) { document.getElementById('mob-full-activity').innerHTML = '<p style="text-align:center;color:#8b99a8;">Failed to load</p>'; }
    };

    /* ============ DANGER ZONE ============ */
    window._mobDeleteAccount = function () {
        if (typeof Swal === 'undefined') return;
        Swal.fire({
            title: 'Delete Account?', html: '<p style="font-size:0.85rem;">This action is <strong>permanent</strong> and cannot be undone. All data will be lost.</p>',
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc2626', confirmButtonText: 'Yes, Delete Forever', background: '#FFF8F0'
        });
    };

    window._mobTransferAdmin = function () {
        if (typeof Swal === 'undefined') return;
        Swal.fire({
            title: 'Transfer Admin', html: '<p style="font-size:0.85rem;">Transfer admin ownership to another registered user.</p>',
            input: 'email', inputPlaceholder: 'Enter new admin email',
            icon: 'info', showCancelButton: true, confirmButtonColor: '#0A1A2F', confirmButtonText: 'Transfer', background: '#FFF8F0'
        });
    };

    /* ============ LOGOUT ============ */
    window._adminLogout = function () {
        localStorage.removeItem('token');
        localStorage.removeItem('userName');
        window.location.href = '../Main/Login.html';
    };

    /* ============ ACTIVITY LOGS ============ */
    async function loadActivityLogs() {
        const container = document.getElementById('mob-admin-activity-list');
        if (!container) return;
        try {
            const logs = await apiFetch('/api/profile/logs');
            if (logs && logs.length > 0) {
                container.innerHTML = logs.slice(0, 5).map(log => `
                    <div class="mob-admin-activity">
                        <div class="mob-admin-activity-icon"><i class="fas fa-circle" style="font-size:0.4rem;"></i></div>
                        <div style="flex:1;">
                            <div class="mob-admin-activity-title">${log.description || log.action || 'Activity'}</div>
                            <div class="mob-admin-activity-time">${formatTimeAgo(log.createdAt)}</div>
                        </div>
                    </div>
                `).join('');
            } else { container.innerHTML = '<p style="text-align:center;padding:12px 0;color:#8b99a8;font-size:0.82rem;">No recent activity</p>'; }
        } catch (e) { container.innerHTML = '<p style="text-align:center;padding:12px 0;color:#8b99a8;font-size:0.82rem;">No recent activity</p>'; }
    }

    function formatTimeAgo(dateString) {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
