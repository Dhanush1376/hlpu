/**
 * mobile-alumni-profile.js
 * Mobile-first adaptation for Alumini-Profile.html.
 * Reuses: /api/profile/me (and related update endpoints)
 * Zero desktop impact.
 */
(function () {
    if (window.innerWidth > 768) return;

    // === HIDE DESKTOP ===
    document.querySelectorAll('.navbar-hlpu, .container-fluid').forEach(el => {
        if (!el.closest('#mobile-root')) el.classList.add('desktop-only');
    });

    // === MOBILE ROOT ===
    let root = document.getElementById('mobile-root');
    if (!root) {
        root = document.createElement('div');
        root.id = 'mobile-root';
        document.body.appendChild(root);
    }

    // === SKELETON ===
    root.innerHTML = `
        ${window.AlumniMobileNav ? AlumniMobileNav.renderHeader({}) : ''}
        <div id="mob-profile-content">
            <!-- HEADER / HERO -->
            <div class="mob-profile-hero">
                <div class="mob-profile-main">
                    <div class="mob-hero-avatar-wrapper">
                        <div class="mob-hero-avatar" id="mob-hero-avatar">A</div>
                        <button class="mob-avatar-edit-btn" id="mob-avatar-edit"><i class="fas fa-camera"></i></button>
                    </div>
                    <h1 id="mob-hero-name">Loading...</h1>
                    <p id="mob-hero-title">Professional Title</p>
                    <div class="mob-profile-badges" id="mob-hero-badges">
                        <span class="mob-profile-tag">Alumni</span>
                        <span class="mob-profile-tag" id="mob-mentor-badge" style="display:none;">Mentor</span>
                    </div>
                </div>
            </div>

            <!-- MENTORSHIP STATS -->
            <div class="mob-stats-row" style="margin-top: -30px; position: relative; z-index: 2;">
                <div class="mob-stat-card">
                    <div class="mob-stat-value" id="mob-stat-mentees">0</div>
                    <div class="mob-stat-label">Mentees</div>
                </div>
                <div class="mob-stat-card">
                    <div class="mob-stat-value" id="mob-stat-hours">0</div>
                    <div class="mob-stat-label">Hours</div>
                </div>
                <div class="mob-stat-card">
                    <div class="mob-stat-value" id="mob-stat-rating">5.0</div>
                    <div class="mob-stat-label">Rating</div>
                </div>
            </div>

            <!-- CONTACT SECTION -->
            <div class="mob-section-card">
                <div class="mob-section-title">
                    <h3><i class="fas fa-address-book"></i> Contact Info</h3>
                </div>
                <div class="mob-activity-item">
                    <div class="mob-activity-icon"><i class="fas fa-envelope"></i></div>
                    <div>
                        <div class="mob-activity-title">Email</div>
                        <div class="mob-activity-desc" id="mob-email">—</div>
                    </div>
                </div>
                <div class="mob-activity-item">
                    <div class="mob-activity-icon"><i class="fas fa-phone"></i></div>
                    <div>
                        <div class="mob-activity-title">Phone</div>
                        <div class="mob-activity-desc" id="mob-phone">—</div>
                    </div>
                </div>
                <div class="mob-activity-item">
                    <div class="mob-activity-icon"><i class="fab fa-linkedin"></i></div>
                    <div>
                        <div class="mob-activity-title">LinkedIn</div>
                        <div class="mob-activity-desc" id="mob-linkedin">Not linked</div>
                    </div>
                </div>
            </div>

            <!-- EXPERIENCE SECTION -->
            <div class="mob-section-card">
                <div class="mob-section-title">
                    <h3><i class="fas fa-briefcase"></i> Experience</h3>
                    <button class="btn-edit-section" onclick="window.showExperienceModal()"><i class="fas fa-plus"></i></button>
                </div>
                <div id="mob-experience-list">
                    <div style="text-align:center;padding:20px;color:#8f9aaa;font-size:0.8rem;">Loading experience...</div>
                </div>
            </div>

            <!-- EDUCATION SECTION -->
            <div class="mob-section-card">
                <div class="mob-section-title">
                    <h3><i class="fas fa-graduation-cap"></i> Education</h3>
                </div>
                <div id="mob-education-list">
                    <div style="text-align:center;padding:20px;color:#8f9aaa;font-size:0.8rem;">Loading education...</div>
                </div>
            </div>

            <!-- SKILLS SECTION -->
            <div class="mob-section-card">
                <div class="mob-section-title">
                    <h3><i class="fas fa-tags"></i> Expertise</h3>
                    <button class="btn-edit-section" onclick="window.showSkillsModal()"><i class="fas fa-plus"></i></button>
                </div>
                <div class="mob-profile-tags" id="mob-skills-list" style="padding: 10px 0;">
                    <!-- Skills tags here -->
                </div>
            </div>

            <!-- ACHIEVEMENTS SECTION -->
            <div class="mob-section-card">
                <div class="mob-section-title">
                    <h3><i class="fas fa-award"></i> Achievements</h3>
                    <button class="btn-edit-section" onclick="window.showAchievementsModal()"><i class="fas fa-plus"></i></button>
                </div>
                <div id="mob-achievements-list">
                    <div style="text-align:center;padding:20px;color:#8f9aaa;font-size:0.8rem;">Loading achievements...</div>
                </div>
            </div>

            <!-- RESUME ACTIONS -->
            <div style="padding: 0 15px 30px 15px;">
                <button class="mob-btn-accept" style="width:100%; margin-bottom: 10px;" onclick="window.downloadResume()">
                    <i class="fas fa-file-download"></i> Download Full Resume (PDF)
                </button>
            </div>
        </div>
        ${window.AlumniMobileNav ? AlumniMobileNav.renderSidenav() : ''}
        ${window.AlumniMobileNav ? AlumniMobileNav.renderBottomNav('') : ''}
    `;

    // Style for the hero (alumni specific)
    const style = document.createElement('style');
    style.textContent = `
        .mob-profile-hero {
            background: linear-gradient(135deg, #0A1A2F 0%, #1a2a44 100%);
            padding: 40px 20px 60px 20px;
            margin: -20px -15px 0 -15px;
            text-align: center;
            color: white;
            border-bottom-left-radius: 40px;
            border-bottom-right-radius: 40px;
        }
        .mob-hero-avatar-wrapper {
            position: relative;
            width: 100px;
            height: 100px;
            margin: 0 auto 15px;
        }
        .mob-hero-avatar {
            width: 100%;
            height: 100%;
            border-radius: 35% 65% 65% 35% / 35% 35% 65% 65%;
            background: linear-gradient(145deg, #C2491F, #E68A2E);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2.5rem;
            font-weight: 800;
            border: 4px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }
        .mob-avatar-edit-btn {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 32px;
            height: 32px;
            border-radius: 10px;
            background: white;
            border: none;
            color: #C2491F;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8rem;
            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
        }
        .mob-profile-hero h1 {
            font-size: 1.5rem;
            font-weight: 800;
            margin: 0 0 5px 0;
            letter-spacing: -0.02em;
        }
        .mob-profile-hero p {
            font-size: 0.85rem;
            opacity: 0.8;
            margin: 0 0 15px 0;
        }
        .mob-profile-badges {
            display: flex;
            justify-content: center;
            gap: 8px;
        }
        .mob-profile-tag {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.7rem;
            font-weight: 700;
            background: rgba(255,255,255,0.15);
            backdrop-filter: blur(4px);
            color: white;
            border: 1px solid rgba(255,255,255,0.2);
        }
    `;
    document.head.appendChild(style);

    if (window.AlumniMobileNav) AlumniMobileNav.initSidenavEvents();

    // === DATA BINDING ===

    async function bindData(data) {
        if (!data) return;

        const el = id => document.getElementById(id);

        // Name & Avatar
        if (el('mob-hero-name')) el('mob-hero-name').textContent = data.name || 'Alumni';
        const initials = (data.name || 'A').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        if (el('mob-hero-avatar')) el('mob-hero-avatar').textContent = initials;

        // Title & Company
        const title = data.title || (data.experience && data.experience[0] ? data.experience[0].role : 'Alumni');
        const company = data.company || (data.experience && data.experience[0] ? data.experience[0].company : 'LPU Alumni');
        if (el('mob-hero-title')) el('mob-hero-title').textContent = `${title} @ ${company}`;

        // Mentor Badge
        if (data.isMentorAvailable && el('mob-mentor-badge')) {
            el('mob-mentor-badge').style.display = 'inline-block';
        }

        // Stats
        if (el('mob-stat-mentees')) el('mob-stat-mentees').textContent = data.currentMentees || 0;
        if (el('mob-stat-hours')) el('mob-stat-hours').textContent = data.mentoringHours || data.totalHours || 0;
        if (el('mob-stat-rating')) el('mob-stat-rating').textContent = (data.rating || 5.0).toFixed(1);

        // Contact
        if (el('mob-email')) el('mob-email').textContent = data.email || '—';
        if (el('mob-phone')) el('mob-phone').textContent = data.phone || '—';
        if (el('mob-linkedin')) el('mob-linkedin').textContent = data.linkedin || 'Not linked';

        // Experience
        const expList = el('mob-experience-list');
        if (expList) {
            if (!data.experience || data.experience.length === 0) {
                expList.innerHTML = '<div class="mob-empty-state"><i class="fas fa-briefcase"></i><p>Add your work experience</p></div>';
            } else {
                expList.innerHTML = data.experience.map(exp => `
                    <div class="mob-activity-item">
                        <div class="mob-activity-icon"><i class="fas fa-building"></i></div>
                        <div style="flex:1;">
                            <div class="mob-activity-title" style="display:flex; justify-content:space-between;">
                                <span>${exp.role}</span>
                                <span style="font-size:0.65rem; color:#C2491F;">${exp.period}</span>
                            </div>
                            <div class="mob-activity-desc">${exp.company}</div>
                            <div class="mob-activity-desc" style="font-size:0.68rem; margin-top:4px;">${exp.location || ''}</div>
                        </div>
                    </div>
                `).join('');
            }
        }

        // Education
        const eduList = el('mob-education-list');
        if (eduList) {
            if (!data.education || data.education.length === 0) {
                eduList.innerHTML = '<div class="mob-empty-state"><i class="fas fa-graduation-cap"></i><p>Add your education history</p></div>';
            } else {
                eduList.innerHTML = data.education.map(edu => `
                    <div class="mob-activity-item">
                        <div class="mob-activity-icon"><i class="fas fa-university"></i></div>
                        <div style="flex:1;">
                            <div class="mob-activity-title" style="display:flex; justify-content:space-between;">
                                <span>${edu.degree}</span>
                                <span style="font-size:0.65rem; color:#C2491F;">${edu.period}</span>
                            </div>
                            <div class="mob-activity-desc">${edu.institution}</div>
                            ${edu.gpa ? `<div class="mob-activity-desc" style="font-size:0.68rem; margin-top:4px; font-weight:700;">GPA: ${edu.gpa}</div>` : ''}
                        </div>
                    </div>
                `).join('');
            }
        }

        // Skills
        const skillsList = el('mob-skills-list');
        if (skillsList) {
            if (!data.skills || data.skills.length === 0) {
                skillsList.innerHTML = '<p style="color:#8f9aaa;font-size:0.75rem;text-align:center;">Add your expertise areas</p>';
            } else {
                skillsList.innerHTML = data.skills.map(s => `
                    <span class="mob-profile-tag" style="background:rgba(194,73,31,0.08); color:#C2491F; border:1px solid rgba(194,73,31,0.1); margin-bottom:5px;">${s}</span>
                `).join('');
            }
        }

        // Achievements
        const achList = el('mob-achievements-list');
        if (achList) {
            if (!data.achievements || data.achievements.length === 0) {
                achList.innerHTML = '<div class="mob-empty-state"><i class="fas fa-award"></i><p>Add your achievements</p></div>';
            } else {
                achList.innerHTML = data.achievements.map(ach => `
                    <div class="mob-activity-item">
                        <div class="mob-activity-icon" style="background:rgba(230,138,46,0.1); color:#E68A2E;"><i class="fas fa-trophy"></i></div>
                        <div style="flex:1;">
                            <div class="mob-activity-title">${ach.title}</div>
                            <div class="mob-activity-desc">${ach.issuer} · ${ach.date}</div>
                        </div>
                    </div>
                `).join('');
            }
        }
    }

    // === MODAL HELPERS (Delegate to Desktop Modals) ===
    window.showExperienceModal = () => {
        if (typeof $ !== 'undefined' && $('#experienceModal').length) $('#experienceModal').modal('show');
    };
    window.showSkillsModal = () => {
        if (typeof $ !== 'undefined' && $('#skillsModal').length) $('#skillsModal').modal('show');
    };
    window.showAchievementsModal = () => {
        if (typeof $ !== 'undefined' && $('#achievementsModal').length) $('#achievementsModal').modal('show');
    };
    window.downloadResume = () => {
        if (typeof window.generateResume === 'function') window.generateResume();
        else if (typeof Swal !== 'undefined') Swal.fire('Coming Soon', 'Full resume generation is being optimized for mobile.', 'info');
    };

    // === INIT ===
    async function init() {
        if (typeof apiFetch !== 'function') { setTimeout(init, 200); return; }
        try {
            const data = await apiFetch('/api/profile/me');
            bindData(data);
        } catch (err) {
            console.error('[mob-alumni-profile] init error:', err);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 100));
    } else {
        setTimeout(init, 100);
    }
})();
