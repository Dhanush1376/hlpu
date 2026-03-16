/**
 * mobile-mock-interview.js
 * Mobile-first logic for Mock Interview Request.
 * Reuses existing form submission and validation pipeline.
 */

window.MobileMockInterview = (function () {
    let currentView = 'form'; // 'form' or 'requests'
    let isSubmitting = false;

    function run() {
        const root = document.getElementById('mobile-root');
        if (!root) return;
        renderBase(root);
        bindEvents();
    }

    function renderBase(root) {
        const isForm = currentView === 'form';
        const userInitial = getInitials();

        root.innerHTML = `
            ${MobileNav.renderHeader({ userInitial })}

            <div class="mob-mock-header">
                <h1>${isForm ? 'Mock Interview' : 'My Requests'}</h1>
                <p><i class="fas fa-${isForm ? 'handshake' : 'history'}"></i> ${isForm ? 'Practice with alumni experts · Get real feedback' : 'Track your interview requests'}</p>
            </div>

            <div class="mob-quick-pills">
                <button class="mob-pill-btn ${isForm ? 'active' : ''}" onclick="MobileMockInterview.switchView('form')">
                    <i class="fas fa-calendar-check"></i> Schedule
                </button>
                <button class="mob-pill-btn ${!isForm ? 'active' : ''}" onclick="MobileMockInterview.switchView('requests')">
                    <i class="fas fa-history"></i> My Requests
                </button>
            </div>

            <div id="mob-mock-content">
                ${isForm ? renderFormHTML() : '<div style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin fa-2x" style="color:#C2491F;"></i></div>'}
            </div>

            ${MobileNav.renderBottomNav("more")}
            ${MobileNav.renderSidenav()}
        `;

        setTimeout(() => MobileNav.initSidenavEvents(), 100);

        if (!isForm) loadMobileRequests();
    }

    function renderFormHTML() {
        // Set min date to today
        const today = new Date().toISOString().split('T')[0];

        return `
            <div class="mob-form-card">
                <form id="mob-mock-form" novalidate>

                    <div class="mob-form-group">
                        <label class="mob-form-label"><i class="fas fa-briefcase"></i> Preferred Job Role *</label>
                        <select class="mob-select" id="mob-jobRole" required>
                            <option value="" disabled selected>Select your target role</option>
                            <option>Software Developer</option>
                            <option>Frontend Developer</option>
                            <option>Backend Engineer</option>
                            <option>Data Scientist</option>
                            <option>Business Analyst</option>
                            <option>Cybersecurity Analyst</option>
                            <option value="Others">Others (Specify below)</option>
                        </select>
                        <div class="mob-hidden-field" id="mob-jobRoleOther">
                            <textarea class="mob-textarea" id="mob-jobRoleText" rows="2" placeholder="e.g., DevOps Engineer, Product Manager..."></textarea>
                        </div>
                        <div class="mob-error-msg" id="err-jobRole"><i class="fas fa-exclamation-circle"></i> Please select a role</div>
                    </div>

                    <div class="mob-form-group">
                        <label class="mob-form-label"><i class="fas fa-code"></i> Interview Topic *</label>
                        <select class="mob-select" id="mob-topic" required>
                            <option value="" disabled selected>Select focus area</option>
                            <option>Data Structures & Algorithms</option>
                            <option>System Design</option>
                            <option>Behavioral / HR Round</option>
                            <option>SQL & Databases</option>
                            <option>Python / Java Fundamentals</option>
                            <option>Resume Review</option>
                            <option value="Others">Others (Specify below)</option>
                        </select>
                        <div class="mob-hidden-field" id="mob-topicOther">
                            <textarea class="mob-textarea" id="mob-topicText" rows="2" placeholder="e.g., Cloud Computing, ML, Product Strategy..."></textarea>
                        </div>
                        <div class="mob-error-msg" id="err-topic"><i class="fas fa-exclamation-circle"></i> Please select a topic</div>
                    </div>

                    <div class="mob-form-row">
                        <div class="mob-form-group">
                            <label class="mob-form-label"><i class="fas fa-layer-group"></i> Type *</label>
                            <select class="mob-select" id="mob-type" required>
                                <option value="" disabled selected>Select</option>
                                <option value="HR">HR</option>
                                <option value="Technical">Technical</option>
                                <option value="Behavioral">Behavioral</option>
                            </select>
                            <div class="mob-error-msg" id="err-type"><i class="fas fa-exclamation-circle"></i> Required</div>
                        </div>
                        <div class="mob-form-group">
                            <label class="mob-form-label"><i class="fas fa-calendar-day"></i> Date *</label>
                            <input type="date" class="mob-input" id="mob-date" min="${today}" required>
                            <div class="mob-error-msg" id="err-date"><i class="fas fa-exclamation-circle"></i> Required</div>
                        </div>
                    </div>

                    <div class="mob-form-group">
                        <label class="mob-form-label"><i class="fas fa-question-circle"></i> Specific Questions</label>
                        <textarea class="mob-textarea" id="mob-questions" rows="3" placeholder="What areas should the interviewer focus on?"></textarea>
                    </div>

                    <button type="submit" class="mob-submit-btn" id="mob-submit-btn">
                        <i class="fas fa-paper-plane"></i> Request Mock Interview
                    </button>
                </form>

                <div class="mob-info-panel">
                    <div class="mob-info-title"><i class="fas fa-lightbulb"></i> What happens next?</div>
                    <ul class="mob-info-list">
                        <li><i class="fas fa-user-check"></i> An alumni expert will be assigned</li>
                        <li><i class="fas fa-clock"></i> Response within 24-48 hours</li>
                        <li><i class="fas fa-video"></i> Conducted via Video Call</li>
                        <li><i class="fas fa-star"></i> Detailed feedback provided</li>
                    </ul>
                </div>
            </div>
        `;
    }

    function bindEvents() {
        // "Others" toggle for Job Role
        const jobRoleEl = document.getElementById('mob-jobRole');
        const jobRoleOther = document.getElementById('mob-jobRoleOther');
        if (jobRoleEl && jobRoleOther) {
            jobRoleEl.addEventListener('change', function () {
                if (this.value === 'Others') {
                    jobRoleOther.classList.add('show');
                    document.getElementById('mob-jobRoleText').focus();
                } else {
                    jobRoleOther.classList.remove('show');
                }
                clearError('jobRole');
            });
        }

        // "Others" toggle for Topic
        const topicEl = document.getElementById('mob-topic');
        const topicOther = document.getElementById('mob-topicOther');
        if (topicEl && topicOther) {
            topicEl.addEventListener('change', function () {
                if (this.value === 'Others') {
                    topicOther.classList.add('show');
                    document.getElementById('mob-topicText').focus();
                } else {
                    topicOther.classList.remove('show');
                }
                clearError('topic');
            });
        }

        // Clear errors on change
        ['mob-type', 'mob-date'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', () => clearError(id.replace('mob-', '')));
        });

        // Form submission
        const form = document.getElementById('mob-mock-form');
        if (form) {
            form.addEventListener('submit', handleSubmit);
        }
    }

    function clearError(field) {
        const errEl = document.getElementById('err-' + field);
        const inputEl = document.getElementById('mob-' + field);
        if (errEl) errEl.classList.remove('visible');
        if (inputEl) inputEl.classList.remove('error');
    }

    function showError(field) {
        const errEl = document.getElementById('err-' + field);
        const inputEl = document.getElementById('mob-' + field);
        if (errEl) errEl.classList.add('visible');
        if (inputEl) inputEl.classList.add('error');
    }

    function validate() {
        let valid = true;
        const fields = [
            { id: 'jobRole', el: document.getElementById('mob-jobRole') },
            { id: 'topic', el: document.getElementById('mob-topic') },
            { id: 'type', el: document.getElementById('mob-type') },
            { id: 'date', el: document.getElementById('mob-date') }
        ];

        fields.forEach(f => {
            if (!f.el || !f.el.value) {
                showError(f.id);
                valid = false;
            } else {
                clearError(f.id);
            }
        });

        // Scroll to first error
        if (!valid) {
            const firstErr = document.querySelector('.mob-error-msg.visible');
            if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        return valid;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (isSubmitting) return;
        if (!validate()) return;

        const btn = document.getElementById('mob-submit-btn');
        const origHTML = btn.innerHTML;

        isSubmitting = true;
        btn.disabled = true;
        btn.classList.add('loading');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

        try {
            const jobRoleEl = document.getElementById('mob-jobRole');
            const jobRole = jobRoleEl.value === 'Others'
                ? document.getElementById('mob-jobRoleText').value
                : jobRoleEl.value;

            const topicEl = document.getElementById('mob-topic');
            const topic = topicEl.value === 'Others'
                ? document.getElementById('mob-topicText').value
                : topicEl.value;

            const interviewType = document.getElementById('mob-type').value;
            const preferredDate = document.getElementById('mob-date').value;
            const specificQuestions = document.getElementById('mob-questions').value;

            const payload = {
                roleRequested: jobRole,
                skills: [topic, specificQuestions].filter(Boolean),
                interviewType,
                preferredDate
            };

            await apiFetch('/api/mock-interviews/request', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'success',
                    title: 'Request Submitted!',
                    text: 'Your mock interview request has been sent.',
                    confirmButtonColor: '#C2491F'
                });
            }

            // Reset form
            document.getElementById('mob-mock-form').reset();
            const otherFields = document.querySelectorAll('.mob-hidden-field');
            otherFields.forEach(f => f.classList.remove('show'));

            // Also trigger desktop load for sync
            if (typeof window.loadMyRequests === 'function') window.loadMyRequests();

        } catch (err) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'error',
                    title: 'Submission Failed',
                    text: err.message || 'Connection error',
                    confirmButtonColor: '#C2491F'
                });
            }
        } finally {
            isSubmitting = false;
            btn.disabled = false;
            btn.classList.remove('loading');
            btn.innerHTML = origHTML;
        }
    }

    async function loadMobileRequests() {
        const container = document.getElementById('mob-mock-content');
        if (!container) return;

        try {
            const requests = await apiFetch('/api/mock-interviews/student');

            if (!requests || requests.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center;padding:60px;color:#5f6b7a;">
                        <i class="fas fa-calendar-times" style="font-size:3rem;opacity:0.3;margin-bottom:15px;display:block;"></i>
                        No interview requests yet.<br>Schedule your first mock interview!
                    </div>
                `;
                return;
            }

            container.innerHTML = requests.map(req => {
                const status = (req.status || 'pending').toLowerCase();
                const alumni = req.alumni ? req.alumni.name : 'Pending Assignment';

                return `
                    <div class="mob-request-card status-${status}">
                        <div class="mob-req-header">
                            <div class="mob-req-role">${req.roleRequested || 'N/A'}</div>
                            <span class="mob-req-status ${status}">${status.toUpperCase()}</span>
                        </div>
                        <div class="mob-req-meta">
                            <div><i class="fas fa-tag"></i> ${req.interviewType || 'N/A'} Interview</div>
                            <div><i class="fas fa-calendar-day"></i> Preferred: ${formatMobDate(req.preferredDate)}</div>
                            <div><i class="fas fa-user-tie"></i> Alumni: ${alumni}</div>
                        </div>
                        ${req.scheduledDate ? `
                            <div class="mob-scheduled-badge">
                                <i class="fas fa-clock"></i> Confirmed: ${new Date(req.scheduledDate).toLocaleString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                })}
                            </div>
                        ` : ''}
                        ${req.meetingLink ? `
                            <a href="${req.meetingLink}" target="_blank" class="mob-join-btn">
                                <i class="fas fa-video"></i> Join Meeting
                            </a>
                        ` : ''}
                        ${req.feedback ? `
                            <div style="margin-top:12px;padding:12px;background:rgba(0,0,0,0.03);border-radius:12px;font-style:italic;font-size:0.85rem;color:#52606d;">
                                "${req.feedback}"
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');

        } catch (err) {
            container.innerHTML = `
                <div style="text-align:center;padding:40px;color:#e74c3c;">
                    <i class="fas fa-exclamation-triangle" style="font-size:2rem;margin-bottom:10px;display:block;"></i>
                    Failed to load requests
                </div>
            `;
        }
    }

    function formatMobDate(dateStr) {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    }

    function switchView(view) {
        currentView = view;
        const root = document.getElementById('mobile-root');
        if (root) {
            renderBase(root);
            bindEvents();
        }
    }

    function getInitials() {
        try {
            const name = localStorage.getItem('userName') || 'User';
            return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        } catch (e) { return 'U'; }
    }

    return { run, switchView };
})();
