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
// Toast Notification Utility
// (dipakai juga oleh products.js lewat window.showToast)
// ==============================

function showToast(message, icon = "fa-solid fa-circle-check") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<i class="${icon}"></i><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => toast.remove(), 3300);
}
window.showToast = showToast;

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
// Smooth Scroll Shop Now
// ==============================

const shopNowBtn = document.getElementById("shopNowBtn");

if (shopNowBtn) {

    shopNowBtn.addEventListener("click", function(e){

        e.preventDefault();

        document.getElementById("shop").scrollIntoView({

            behavior: "smooth",
            block: "start"

        });

    });

}

// ==============================
// Buy Product
// ==============================

function buyProduct(name, price) {

    localStorage.setItem("productName", name);
    localStorage.setItem("productPrice", price);

    window.location.href = "terms.html";

}
window.buyProduct = buyProduct;

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
// Card Tilt (efek 3D ringan mengikuti posisi kursor)
// Hanya aktif di layar yang punya mouse (bukan sentuh) & tidak reduced-motion
// ==============================

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

if (supportsHover && !prefersReducedMotion) {

    document.addEventListener("mousemove", (e) => {
        const card = e.target.closest(".card");
        if (!card) return;

        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateY = ((x - centerX) / centerX) * 6;
        const rotateX = ((centerY - y) / centerY) * 6;

        card.style.transform = `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px)`;
    });

    document.addEventListener("mouseleave", (e) => {
        const card = e.target.closest?.(".card");
        if (card) card.style.transform = "";
    }, true);
}

