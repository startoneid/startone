// ==============================
// AOS Animation
// ==============================

AOS.init({
    duration: 900,
    once: true,
    offset: 60,
});

// ==============================
// Preloader
// ==============================

window.addEventListener("load", () => {
    const preloader = document.getElementById("preloader");
    if (preloader) {
        setTimeout(() => preloader.classList.add("loaded"), 250);
    }
});

// ==============================
// Toast Notification Utility & Buy Product
// Sekarang ada di js/toast.js dan js/buy-product.js (dipakai
// bersama oleh index.html dan shop.html) - tetap tersedia lewat
// window.showToast / window.buyProduct.
// ==============================
// Header scroll state + Scroll progress bar
// ==============================

const siteHeader = document.getElementById("siteHeader");
const scrollProgress = document.getElementById("scrollProgress");
const backToTopFallback = document.getElementById("backToTop");

window.addEventListener("scroll", () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

    if (scrollProgress) scrollProgress.style.width = progress + "%";

    if (siteHeader) {
        if (scrollTop > 30) siteHeader.classList.add("scrolled");
        else siteHeader.classList.remove("scrolled");
    }

    if (backToTopFallback) {
        backToTopFallback.style.display = scrollTop > 500 ? "block" : "none";
    }
});

// ==============================
// Hamburger Mobile Nav
// ==============================

const hamburgerBtn = document.getElementById("hamburgerBtn");
const mainNav = document.getElementById("mainNav");
const navOverlay = document.getElementById("navOverlay");

function closeMobileNav() {
    hamburgerBtn?.classList.remove("active");
    mainNav?.classList.remove("nav-open");
    navOverlay?.classList.remove("active");
    document.body.style.overflow = "";
}

function toggleMobileNav() {
    const isOpen = mainNav?.classList.toggle("nav-open");
    hamburgerBtn?.classList.toggle("active", isOpen);
    navOverlay?.classList.toggle("active", isOpen);
    document.body.style.overflow = isOpen ? "hidden" : "";
}

hamburgerBtn?.addEventListener("click", toggleMobileNav);
navOverlay?.addEventListener("click", closeMobileNav);

mainNav?.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", closeMobileNav);
});

// ==============================
// Scrollspy - highlight active nav link
// ==============================

const sections = document.querySelectorAll("section[id]");
const navLinks = document.querySelectorAll('#mainNav a[href^="#"]');

window.addEventListener("scroll", () => {
    let current = "";

    sections.forEach(section => {
        const sectionTop = section.offsetTop - 140;
        if (window.scrollY >= sectionTop) {
            current = section.getAttribute("id");
        }
    });

    navLinks.forEach(link => {
        link.classList.remove("active-link");
        if (link.getAttribute("href") === "#" + current) {
            link.classList.add("active-link");
        }
    });
});

// ==============================
// Shop Now (tombol di Hero) sekarang berupa link biasa ke
// shop.html, jadi tidak perlu JS scroll khusus di sini lagi.
// ==============================

// ==============================
// Back To Top (dukungan tambahan jika elemen ada langsung di halaman)
// ==============================

if (backToTopFallback) {
    backToTopFallback.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

// ==============================
// Stat Counter Animation (9K+, 4.9★, dst)
// ==============================

const countEls = document.querySelectorAll(".count-up");

function animateCount(el) {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    const isDecimal = String(el.dataset.count).includes(".");
    const duration = 1400;
    const start = performance.now();

    function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = target * eased;

        el.textContent = (isDecimal ? value.toFixed(1) : Math.floor(value)) + suffix;

        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = (isDecimal ? target.toFixed(1) : target) + suffix;
    }

    requestAnimationFrame(tick);
}

if (countEls.length) {
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCount(entry.target);
                counterObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.6 });

    countEls.forEach(el => counterObserver.observe(el));
}

// ==============================
// Copy-to-Clipboard (Contact Info)
// ==============================

document.addEventListener("click", (e) => {
    const btn = e.target.closest(".copy-btn");
    if (!btn) return;

    const text = btn.dataset.copy;
    if (!text) return;

    navigator.clipboard?.writeText(text).then(() => {
        btn.classList.add("copied");
        btn.innerHTML = '<i class="fa-solid fa-check"></i>';
        showToast("Berhasil disalin: " + text, "fa-solid fa-copy");

        setTimeout(() => {
            btn.classList.remove("copied");
            btn.innerHTML = '<i class="fa-regular fa-copy"></i>';
        }, 1800);
    }).catch(() => {
        showToast("Gagal menyalin, coba lagi.", "fa-solid fa-triangle-exclamation");
    });
});

// ==============================
// Card Tilt sekarang ada di js/card-tilt.js (dipakai bersama
// oleh index.html dan shop.html).
// ==============================

