/**
 * mobile-landing.js
 * Mobile-specific enhancements for hLPU Landing Page.
 */

function initMobileLanding() {
    // 1. Detect Screen Size
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) return;

    console.log("🚀 hLPU Mobile Landing Initialized");

    // 2. Dynamic Content Bindings
    const heroContent = {
        headline: "Bridge the gap, <span>ignite legacy.</span>",
        subheadline: "Where LPU’s heritage meets your ambition. Join the network built for tomorrow.",
        heroCTA: "Join hLPU Now",
        exploreCTA: "Explore Features",
        illustrationSrc: "https://res.cloudinary.com/drxgnnzeb/image/upload/v1721650897/Screenshot_2024-07-22_174912-removebg-preview_rlokrq.png"
    };

    const titleEl = document.getElementById('hero-title');
    const subEl = document.getElementById('hero-sub');
    const primaryCTA = document.getElementById('hero-cta-1');
    const secondaryCTA = document.getElementById('hero-cta-2');
    const illustrationEl = document.getElementById('hero-illustration');

    if (titleEl) titleEl.innerHTML = heroContent.headline;
    if (subEl) subEl.textContent = heroContent.subheadline;
    if (primaryCTA) {
        primaryCTA.innerHTML = `<i class="fas fa-compass mr-2"></i>${heroContent.heroCTA}`;
        primaryCTA.href = "login.html";
    }
    if (secondaryCTA) secondaryCTA.innerHTML = `<i class="fas fa-handshake mr-2"></i>${heroContent.exploreCTA}`;
    if (illustrationEl) illustrationEl.src = heroContent.illustrationSrc;

    // 3. Navbar Mobile Behavior - Cleanup (Side Navbar removed per user request)
    // No side navigation required as per latest refinements.

    // 4. Smooth Scroll Adjustment for Mobile
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                });
            }
        });
    });

    // 5. Scroll Animations Trigger (Simplified for mobile performance)
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.hero-section, .role-container, .service-card, .course-path, .contact-form, .stat-item, .path-step').forEach(el => {
        observer.observe(el);
    });
}

// Initialize on Load and Resize
window.addEventListener('load', initMobileLanding);
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(initMobileLanding, 250);
});
