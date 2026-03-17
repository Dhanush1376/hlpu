/**
 * mobile-profile.js
 * Mobile-first logic for Student Profile page.
 * Reuses the same /api/profile/me data pipeline.
 */

window.MobileProfile = (function () {
    let profileData = {};

    async function run() {
        const root = document.getElementById('mobile-root');
        if (!root) return;

        // Show loading
        root.innerHTML = `
            ${MobileNav.renderHeader({ userInitial: 'U' })}
            <div style="text-align:center;padding:80px 0;">
                <i class="fas fa-spinner fa-spin fa-2x" style="color:#C2491F;"></i>
                <p style="margin-top:12px;color:#5f6b7a;font-size:0.85rem;">Loading profile...</p>
            </div>
            ${MobileNav.renderBottomNav("more")}
            ${MobileNav.renderSidenav()}
        `;
        setTimeout(() => MobileNav.initSidenavEvents(), 100);

        try {
            const data = await apiFetch('/api/profile/me');
            profileData = data || {};
            renderProfile(root);
        } catch (err) {
            console.error('[MobileProfile] Load error:', err);
            root.querySelector('#mob-profile-content')?.remove();
            renderProfile(root);
        }
    }

    function getInitials(name) {
        try {
            return (name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        } catch (e) { return 'U'; }
    }

    function getBadgeIcon(badge) {
        const b = (badge || '').toLowerCase();
        if (b.includes('developer') || b.includes('code') || b.includes('engineer')) return 'fas fa-code';
        if (b.includes('student') || b.includes('scholar')) return 'fas fa-user-graduate';
        if (b.includes('star') || b.includes('award') || b.includes('expert')) return 'fas fa-star';
        if (b.includes('design') || b.includes('creative')) return 'fas fa-palette';
        if (b.includes('lead') || b.includes('manager')) return 'fas fa-users';
        return 'fas fa-tag';
    }

    function renderProfile(root) {
        const d = profileData;
        const initial = getInitials(d.name);
        const picUrl = d.profilePicture
            ? (d.profilePicture.startsWith('/') ? API_BASE + d.profilePicture : d.profilePicture)
            : null;
        const badges = d.professionalBadges && d.professionalBadges.length
            ? d.professionalBadges
            : [d.role || 'Student'];

        root.innerHTML = `
            ${MobileNav.renderHeader({ userInitial: initial })}

            <!-- PROFILE HEADER CARD -->
            <div class="mob-profile-card">
                <div class="mob-profile-avatar-wrapper">
                    <div class="mob-profile-avatar">
                        ${picUrl ? `<img src="${picUrl}" alt="${d.name || 'Avatar'}">` : `<span>${initial}</span>`}
                    </div>
                    <div class="mob-profile-avatar-edit" onclick="showEditProfilePicModal()">
                        <i class="fas fa-camera"></i>
                    </div>
                </div>
                <div class="mob-profile-name">${d.name || 'Your Name'}</div>
                <div class="mob-profile-badges">
                    ${badges.map(b => `
                        <span class="mob-profile-badge">
                            <i class="${getBadgeIcon(b)}"></i> ${b.charAt(0).toUpperCase() + b.slice(1)}
                        </span>
                    `).join('')}
                </div>
                <div class="mob-profile-title">${d.title || 'Student'}</div>
                <div class="mob-profile-university">
                    <i class="fas fa-graduation-cap"></i> ${d.university || 'Lovely Professional University'}
                </div>
                <button class="mob-edit-profile-btn" onclick="showEditProfileModal()">
                    <i class="fas fa-edit"></i> Edit Basic Info
                </button>
            </div>

            <!-- RESUME QUICK ACTIONS -->
            <div class="mob-resume-actions">
                <button class="mob-resume-btn mob-resume-btn-primary" onclick="downloadResume()">
                    <i class="fas fa-download"></i> Download PDF
                </button>
                <button class="mob-resume-btn mob-resume-btn-outline" onclick="previewResume()">
                    <i class="fas fa-eye"></i> Preview
                </button>
            </div>

            <!-- ABOUT -->
            ${renderSection('about', 'fas fa-user-circle', 'About', 'about', d.about
            ? `<p class="mob-about-text">${d.about}</p>`
            : renderEmpty('fas fa-user-circle', 'Your Story Starts Here', 'Tell us about your passions and goals', "showEditSectionModal('about')")
        )}

            <!-- SKILLS -->
            ${renderSection('skills', 'fas fa-code', 'Technical Skills', 'skills', renderSkills(d.skills))}

            <!-- EXPERIENCE -->
            ${renderSection('experience', 'fas fa-briefcase', 'Working Experience', 'experience', renderExperience(d.experience))}

            <!-- PROJECTS -->
            ${renderSection('projects', 'fas fa-rocket', 'Featured Projects', 'project', renderProjects(d.projects))}

            <!-- EDUCATION -->
            ${renderSection('education', 'fas fa-graduation-cap', 'Education', 'education', renderEducation(d.education))}

            <!-- CONTACT -->
            ${renderSection('contact', 'fas fa-address-card', 'Contact Information', 'contact', renderContact(d))}

            ${MobileNav.renderBottomNav("more")}
            ${MobileNav.renderSidenav()}
        `;

        setTimeout(() => MobileNav.initSidenavEvents(), 100);
    }

    // ========== REUSABLE SECTION ===========
    function renderSection(id, icon, title, editKey, bodyHTML) {
        return `
            <div class="mob-section-card" id="mob-section-${id}">
                <div class="mob-section-header">
                    <h3 class="mob-section-title"><i class="${icon}"></i> ${title}</h3>
                    <button class="mob-section-edit-btn" onclick="showEditSectionModal('${editKey}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                </div>
                ${bodyHTML}
            </div>
        `;
    }

    function renderEmpty(icon, title, text, onclick) {
        return `
            <div class="mob-empty-placeholder" onclick="${onclick}">
                <i class="${icon}"></i>
                <h5>${title}</h5>
                <p>${text}</p>
            </div>
        `;
    }

    // ========== SKILLS ===========
    function renderSkills(skills) {
        if (!skills || skills.length === 0) {
            return renderEmpty('fas fa-bolt', 'Unleash Your Potential', 'Add your technical skills to showcase your expertise', "showEditSectionModal('skills')");
        }
        return `<div class="mob-skills-container">${skills.map(s => `<span class="mob-skill-tag"><i class="fas fa-code"></i> ${s}</span>`).join('')}</div>`;
    }

    // ========== EXPERIENCE ===========
    function renderExperience(exp) {
        if (!exp || exp.length === 0) {
            return renderEmpty('fas fa-briefcase', 'Professional Journey', 'Add your internships or work experience', "showEditSectionModal('experience')");
        }
        return exp.map(e => `
            <div class="mob-exp-card">
                <div class="mob-exp-title"><i class="fas fa-briefcase"></i>${e.title || 'Job Title'}</div>
                <div class="mob-exp-company">${e.company || 'Company'}</div>
                <div class="mob-exp-period"><i class="fas fa-calendar-alt"></i> ${e.period || 'Period'}</div>
                ${e.description ? `<p class="mob-exp-desc">${e.description}</p>` : ''}
            </div>
        `).join('');
    }

    // ========== PROJECTS ===========
    function renderProjects(projects) {
        if (!projects || projects.length === 0) {
            return renderEmpty('fas fa-rocket', 'No Projects Yet', 'Share your work and demonstrate practical skills', "showEditSectionModal('project')");
        }
        const truncate = (t, l = 150) => t && t.length > l ? t.substring(0, l) + '...' : (t || '');
        return projects.map(p => `
            <div class="mob-proj-card-inner">
                <div class="mob-exp-title"><i class="fas fa-folder-open"></i>${p.title || 'Project'}</div>
                <p class="mob-exp-desc">${truncate(p.description)}</p>
                <div class="mob-tech-tags">
                    ${(p.technologies || []).map(t => `<span class="mob-tech-tag">${t}</span>`).join('')}
                </div>
                ${p.link ? `<a href="${p.link.startsWith('http') ? p.link : 'https://' + p.link}" class="mob-project-link" target="_blank"><i class="fas fa-external-link-alt"></i> View Project</a>` : ''}
            </div>
        `).join('');
    }

    // ========== EDUCATION ===========
    function renderEducation(edu) {
        if (!edu || edu.length === 0) {
            return renderEmpty('fas fa-graduation-cap', 'Academic Background', 'Add your degrees and institutions', "showEditSectionModal('education')");
        }
        return edu.map(e => `
            <div class="mob-edu-card">
                <div style="flex:1;min-width:0;">
                    <div class="mob-edu-degree">${e.degree || 'Degree'}</div>
                    <div class="mob-edu-institution">${e.institution || 'Institution'}</div>
                    <div class="mob-edu-meta">
                        <span><i class="fas fa-calendar"></i>${e.period || 'Period'}</span>
                        ${e.scholarship ? `<span><i class="fas fa-trophy"></i>${e.scholarship}</span>` : ''}
                    </div>
                </div>
                ${e.gpa ? `<div class="mob-edu-gpa">${e.gpa} CGPA</div>` : ''}
            </div>
        `).join('');
    }

    // ========== CONTACT ===========
    function renderContact(d) {
        const contact = d.contact || {};
        const items = [];

        if (d.email) items.push({ icon: 'fas fa-envelope', label: 'Email', value: `<a href="mailto:${d.email}">${d.email}</a>` });
        if (contact.phone) items.push({ icon: 'fas fa-phone-alt', label: 'Phone', value: contact.phone });
        if (contact.linkedin) items.push({ icon: 'fab fa-linkedin-in', label: 'LinkedIn', value: `<a href="${contact.linkedin.startsWith('http') ? contact.linkedin : 'https://' + contact.linkedin}" target="_blank">${contact.linkedin}</a>` });
        if (contact.github) items.push({ icon: 'fab fa-github', label: 'GitHub', value: `<a href="${contact.github.startsWith('http') ? contact.github : 'https://' + contact.github}" target="_blank">${contact.github}</a>` });
        if (contact.location) items.push({ icon: 'fas fa-map-marker-alt', label: 'Location', value: contact.location });
        if (contact.portfolio) items.push({ icon: 'fas fa-globe', label: 'Portfolio', value: `<a href="${contact.portfolio.startsWith('http') ? contact.portfolio : 'https://' + contact.portfolio}" target="_blank">${contact.portfolio}</a>` });

        if (items.length === 0) {
            return renderEmpty('fas fa-address-card', 'Contact Information', 'Add your email, phone, and links', "showEditSectionModal('contact')");
        }

        return `<div class="mob-contact-grid">${items.map(c => `
            <div class="mob-contact-item">
                <div class="mob-contact-icon"><i class="${c.icon}"></i></div>
                <div>
                    <div class="mob-contact-label">${c.label}</div>
                    <div class="mob-contact-value">${c.value}</div>
                </div>
            </div>
        `).join('')}</div>`;
    }

    return { run };
})();
