/**
 * mobile-contact.js
 * Mobile-first logic for Contact Us page.
 * Reuses existing /api/contact submit pipeline.
 */

window.MobileContact = (function () {

    function run() {
        const root = document.getElementById('mobile-root');
        if (!root) return;

        const initials = getInitials();

        root.innerHTML = `
            ${MobileNav.renderHeader({ userInitial: initials })}

            <div class="mob-contact-header">
                <h1>Contact Us</h1>
                <p>Get in touch with our team for support, inquiries, or feedback about the hLPU Heritage Network.</p>
            </div>

            <!-- DEVELOPER CARD -->
            <div class="mob-contact-card">
                <div class="mob-contact-card-header">
                    <div class="mob-contact-card-icon"><i class="fas fa-code"></i></div>
                    <h3 class="mob-contact-card-title">Website Developer</h3>
                </div>
                ${renderInfoItem('fas fa-user', 'Name', 'Dhanush Atmakuri')}
                ${renderInfoItem('fas fa-envelope', 'Email', '<a href="mailto:dhanush1376@gmail.com">dhanush1376@gmail.com</a>')}
                ${renderInfoItem('fas fa-phone', 'Phone', '<a href="tel:+919154691315">+91-9154691315</a>')}
                ${renderInfoItem('fas fa-clock', 'Availability', 'Mon-Fri, 10:00 AM - 6:00 PM IST')}
                <button class="mob-contact-action-btn" data-toggle="modal" data-target="#feedbackModal">
                    <i class="fas fa-star"></i> Give Feedback
                </button>
            </div>

            <!-- CUSTOMER CARE CARD -->
            <div class="mob-contact-card">
                <div class="mob-contact-card-header">
                    <div class="mob-contact-card-icon"><i class="fas fa-headset"></i></div>
                    <h3 class="mob-contact-card-title">Customer Care</h3>
                </div>
                ${renderInfoItem('fas fa-envelope', 'Email', '<a href="mailto:support@hlpu.com">support@hlpu.com</a>')}
                ${renderInfoItem('fas fa-phone', 'Phone', '<a href="tel:+918005551234">+91-800-555-1234</a>')}
                ${renderInfoItem('fas fa-clock', 'Support Hours', '24/7 · Always available')}
                ${renderInfoItem('fas fa-map-marker-alt', 'Address', 'Lovely Professional University, Punjab, India')}
            </div>

            <!-- MAP BUTTON -->
            <button class="mob-map-btn" data-toggle="modal" data-target="#mapModal">
                <i class="fas fa-map-marker-alt"></i> View Our Location
            </button>

            <!-- INLINE CONTACT FORM -->
            <div class="mob-contact-form-card">
                <div class="mob-form-title"><i class="fas fa-paper-plane"></i> Send a Message</div>
                <div id="mob-contact-success" class="mob-success-card">
                    <i class="fas fa-check-circle"></i>
                    <h4>Thank You!</h4>
                    <p>Your message has been sent. We'll get back to you soon.</p>
                </div>
                <form id="mobContactForm">
                    <div class="mob-form-group">
                        <label class="mob-form-label"><i class="fas fa-user"></i> Name</label>
                        <input type="text" class="mob-form-input" id="mob-contact-name" placeholder="Enter your full name" required>
                        <div class="mob-form-error" id="mob-name-err">Please enter your name</div>
                    </div>
                    <div class="mob-form-group">
                        <label class="mob-form-label"><i class="fas fa-envelope"></i> Email</label>
                        <input type="email" class="mob-form-input" id="mob-contact-email" placeholder="your.email@hlpu.edu.in" required>
                        <div class="mob-form-error" id="mob-email-err">Please enter a valid email</div>
                    </div>
                    <div class="mob-form-group">
                        <label class="mob-form-label"><i class="fas fa-comment"></i> Message</label>
                        <textarea class="mob-form-textarea" id="mob-contact-message" placeholder="How can we help you?" required></textarea>
                        <div class="mob-form-error" id="mob-msg-err">Please enter your message</div>
                    </div>
                    <button type="submit" class="mob-submit-btn" id="mob-submit-btn">
                        <i class="fas fa-paper-plane"></i> Send Message
                    </button>
                </form>
            </div>

            <!-- SOCIAL -->
            <div class="mob-social-card">
                <div class="mob-social-title">Connect With Us</div>
                <div class="mob-social-subtitle">Follow us on social media for updates</div>
                <div class="mob-social-icons">
                    <a href="https://twitter.com/LPUUniversity" target="_blank" class="mob-social-link"><i class="fab fa-twitter"></i></a>
                    <a href="https://linkedin.com/school/lovely-professional-university" target="_blank" class="mob-social-link"><i class="fab fa-linkedin-in"></i></a>
                    <a href="https://instagram.com/lpuuniversity" target="_blank" class="mob-social-link"><i class="fab fa-instagram"></i></a>
                    <a href="https://facebook.com/LPUUniversity" target="_blank" class="mob-social-link"><i class="fab fa-facebook-f"></i></a>
                </div>
            </div>

            ${MobileNav.renderBottomNav("more")}
            ${MobileNav.renderSidenav()}
        `;

        setTimeout(() => MobileNav.initSidenavEvents(), 100);
        bindFormEvents();
    }

    function getInitials() {
        try {
            return (localStorage.getItem('userName') || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        } catch (e) { return 'U'; }
    }

    function renderInfoItem(icon, label, value) {
        return `
            <div class="mob-contact-info-item">
                <div class="mob-contact-info-icon"><i class="${icon}"></i></div>
                <div>
                    <div class="mob-contact-info-label">${label}</div>
                    <div class="mob-contact-info-value">${value}</div>
                </div>
            </div>
        `;
    }

    // ========== FORM ==========
    function bindFormEvents() {
        const form = document.getElementById('mobContactForm');
        if (!form) return;

        form.addEventListener('submit', async function (e) {
            e.preventDefault();

            const nameInput = document.getElementById('mob-contact-name');
            const emailInput = document.getElementById('mob-contact-email');
            const msgInput = document.getElementById('mob-contact-message');
            const submitBtn = document.getElementById('mob-submit-btn');

            // Reset errors
            [nameInput, emailInput, msgInput].forEach(inp => inp.classList.remove('error'));
            document.querySelectorAll('.mob-form-error').forEach(el => el.classList.remove('show'));

            const name = nameInput.value.trim();
            const email = emailInput.value.trim();
            const message = msgInput.value.trim();
            let hasError = false;

            if (!name) {
                nameInput.classList.add('error');
                document.getElementById('mob-name-err').classList.add('show');
                if (!hasError) nameInput.focus();
                hasError = true;
            }

            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                emailInput.classList.add('error');
                document.getElementById('mob-email-err').classList.add('show');
                if (!hasError) emailInput.focus();
                hasError = true;
            }

            if (!message) {
                msgInput.classList.add('error');
                document.getElementById('mob-msg-err').classList.add('show');
                if (!hasError) msgInput.focus();
                hasError = true;
            }

            if (hasError) return;

            // Submit — reuse same API endpoint as desktop
            const originalHTML = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

            try {
                const response = await fetch(`${API_BASE}/api/contact`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name,
                        email,
                        subject: 'Contact Us Inquiry',
                        message,
                        role: 'student',
                        submittedBy: localStorage.getItem('userId')
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    form.style.display = 'none';
                    document.getElementById('mob-contact-success').classList.add('show');
                    form.reset();

                    // Auto-reset after 5 seconds
                    setTimeout(() => {
                        form.style.display = 'block';
                        document.getElementById('mob-contact-success').classList.remove('show');
                    }, 5000);
                } else {
                    throw new Error(data.message || 'Submission failed');
                }
            } catch (err) {
                Swal.fire({
                    title: 'Error',
                    text: err.message || 'Failed to send message.',
                    icon: 'error',
                    confirmButtonColor: '#C2491F',
                    background: '#FFF8F0'
                });
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalHTML;
            }
        });
    }

    return { run };
})();

// Auto-init on mobile
if (window.innerWidth <= 768 && document.getElementById('mobile-root')) {
    MobileContact.run();
}
