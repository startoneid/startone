// ==============================================================
// REVIEWS.JS
// Mengelola fitur ulasan/review pelanggan yang tampil di halaman
// utama (index.html), sebelum footer.
//
// Ulasan disimpan di koleksi Firestore "reviews" (nama, produk,
// rating bintang 1-5, createdAt) dan ditampilkan secara realtime.
// ==============================================================

import { db } from "./firebase.js";

import {
    collection,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    limit,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
}

const reviewsGrid = document.getElementById("reviewsGrid");
const reviewsViewport = document.getElementById("reviewsViewport");
const reviewsPrevBtn = document.getElementById("reviewsPrevBtn");
const reviewsNextBtn = document.getElementById("reviewsNextBtn");
const reviewModal = document.getElementById("reviewModal");
const reviewModalClose = document.getElementById("reviewModalClose");
const openReviewModalBtn = document.getElementById("openReviewModalBtn");
const reviewForm = document.getElementById("reviewForm");
const reviewNameInput = document.getElementById("reviewName");
const reviewProductInput = document.getElementById("reviewProduct");
const reviewMessageInput = document.getElementById("reviewMessage");
const reviewRatingInput = document.getElementById("reviewRating");
const reviewSubmitBtn = document.getElementById("reviewSubmitBtn");
const starRating = document.getElementById("starRating");
const stars = starRating ? Array.from(starRating.querySelectorAll("i")) : [];

// ==============================================================
// STAR RATING WIDGET (klik & hover untuk memilih 1-5 bintang)
// ==============================================================
function paintStars(value) {
    stars.forEach((star) => {
        const starValue = Number(star.dataset.value);
        if (starValue <= value) {
            star.classList.remove("fa-regular");
            star.classList.add("fa-solid", "active");
        } else {
            star.classList.remove("fa-solid", "active");
            star.classList.add("fa-regular");
        }
    });
}

stars.forEach((star) => {
    star.addEventListener("click", () => {
        const value = Number(star.dataset.value);
        reviewRatingInput.value = value;
        paintStars(value);
    });

    star.addEventListener("mouseenter", () => {
        paintStars(Number(star.dataset.value));
    });
});

starRating?.addEventListener("mouseleave", () => {
    paintStars(Number(reviewRatingInput.value) || 0);
});

// ==============================================================
// BUKA / TUTUP MODAL FORM ULASAN
// ==============================================================
function openReviewModal() {
    if (!reviewModal) return;
    reviewModal.classList.add("active");
    document.body.style.overflow = "hidden";
}

function closeReviewModal() {
    if (!reviewModal) return;
    reviewModal.classList.remove("active");
    document.body.style.overflow = "";
}

openReviewModalBtn?.addEventListener("click", openReviewModal);
reviewModalClose?.addEventListener("click", closeReviewModal);

reviewModal?.addEventListener("click", (e) => {
    if (e.target === reviewModal) closeReviewModal();
});

window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeReviewModal();
});

// ==============================================================
// RENDER BINTANG (read-only) UNTUK SETIAP KARTU ULASAN
// ==============================================================
function starsHTML(rating) {
    const safeRating = Math.min(5, Math.max(0, Math.round(Number(rating) || 0)));
    let html = "";
    for (let i = 1; i <= 5; i++) {
        html += `<i class="${i <= safeRating ? "fa-solid" : "fa-regular"} fa-star"></i>`;
    }
    return html;
}

function reviewCardHTML(review) {
    const initial = escapeHTML((review.name || "?").trim().charAt(0).toUpperCase() || "?");

    return `
    <div class="review-card">
        <div class="review-card-top">
            <div class="review-avatar">${initial}</div>
            <div>
                <h4>${escapeHTML(review.name || "Anonim")}</h4>
                <span class="review-product">${escapeHTML(review.product || "-")}</span>
            </div>
        </div>
        <div class="review-stars">${starsHTML(review.rating)}</div>
        ${review.message ? `<p class="review-message">${escapeHTML(review.message)}</p>` : ""}
    </div>
    `;
}

function renderReviews(reviews) {
    if (!reviewsGrid) return;

    if (reviews.length === 0) {
        reviewsGrid.innerHTML = `
            <p style="grid-column:1/-1;text-align:center;color:#bbb;padding:20px 0;">
                Belum ada ulasan. Jadilah yang pertama menulis ulasan!
            </p>
        `;
        return;
    }

    reviewsGrid.innerHTML = reviews.map(reviewCardHTML).join("");
    updateArrowState();
}

// ==============================================================
// CAROUSEL: TOMBOL GESER (‹ ›) + AUTO-SCROLL SAAT IDLE
// ==============================================================
const AUTO_SCROLL_DELAY = 3000;   // jeda diam sebelum auto-scroll (ms)
const AUTO_SCROLL_INTERVAL = 4000; // jarak antar auto-scroll (ms)

let autoScrollTimer = null;
let autoScrollStarter = null;

function getStep() {
    // Geser sejauh lebar satu kartu ulasan (termasuk gap-nya)
    const firstCard = reviewsGrid?.querySelector(".review-card, .skeleton-card");
    if (!firstCard) return reviewsViewport ? reviewsViewport.clientWidth : 0;
    const gap = parseFloat(getComputedStyle(reviewsGrid).gap) || 0;
    return firstCard.getBoundingClientRect().width + gap;
}

function updateArrowState() {
    if (!reviewsViewport || !reviewsPrevBtn || !reviewsNextBtn) return;
    const maxScroll = reviewsViewport.scrollWidth - reviewsViewport.clientWidth - 1;
    reviewsPrevBtn.disabled = reviewsViewport.scrollLeft <= 0;
    reviewsNextBtn.disabled = reviewsViewport.scrollLeft >= maxScroll || maxScroll <= 0;
}

function scrollByStep(direction) {
    if (!reviewsViewport) return;
    const maxScroll = reviewsViewport.scrollWidth - reviewsViewport.clientWidth - 1;

    if (direction > 0 && reviewsViewport.scrollLeft >= maxScroll) {
        // Sudah di ujung kanan, putar balik ke awal
        reviewsViewport.scrollTo({ left: 0, behavior: "smooth" });
        return;
    }
    if (direction < 0 && reviewsViewport.scrollLeft <= 0) {
        reviewsViewport.scrollTo({ left: maxScroll, behavior: "smooth" });
        return;
    }

    reviewsViewport.scrollBy({ left: direction * getStep(), behavior: "smooth" });
}

function stopAutoScroll() {
    clearInterval(autoScrollTimer);
    autoScrollTimer = null;
}

const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function scheduleAutoScroll() {
    if (prefersReducedMotion) return;
    clearTimeout(autoScrollStarter);
    stopAutoScroll();
    autoScrollStarter = setTimeout(() => {
        autoScrollTimer = setInterval(() => scrollByStep(1), AUTO_SCROLL_INTERVAL);
    }, AUTO_SCROLL_DELAY);
}

function resetIdleTimer() {
    scheduleAutoScroll();
}

reviewsPrevBtn?.addEventListener("click", () => {
    scrollByStep(-1);
    resetIdleTimer();
});

reviewsNextBtn?.addEventListener("click", () => {
    scrollByStep(1);
    resetIdleTimer();
});

reviewsViewport?.addEventListener("scroll", () => {
    updateArrowState();
});

reviewsViewport?.addEventListener("mouseenter", stopAutoScroll);
reviewsViewport?.addEventListener("mouseleave", resetIdleTimer);
reviewsViewport?.addEventListener("touchstart", stopAutoScroll, { passive: true });
reviewsViewport?.addEventListener("touchend", resetIdleTimer, { passive: true });

window.addEventListener("resize", updateArrowState);

resetIdleTimer();

// ==============================================================
// REALTIME LISTENER (ulasan terbaru di atas, maksimal 24 ulasan)
// ==============================================================
const reviewsQuery = query(collection(db, "reviews"), orderBy("createdAt", "desc"), limit(24));

onSnapshot(reviewsQuery, (snapshot) => {
    const reviews = [];
    snapshot.forEach((docSnap) => reviews.push({ id: docSnap.id, ...docSnap.data() }));
    renderReviews(reviews);
}, (error) => {
    console.error("Gagal memuat ulasan:", error);
    if (reviewsGrid) {
        reviewsGrid.innerHTML = `
            <p style="grid-column:1/-1;text-align:center;color:#ff8080;">
                Gagal memuat ulasan. Silakan refresh halaman.
            </p>
        `;
    }
});

// ==============================================================
// SUBMIT FORM ULASAN
// ==============================================================
reviewForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = reviewNameInput.value.trim();
    const product = reviewProductInput.value.trim();
    const message = reviewMessageInput.value.trim();
    const rating = Number(reviewRatingInput.value);

    if (!name) {
        alert("Nama wajib diisi.");
        return;
    }
    if (!product) {
        alert("Nama produk yang dibeli wajib diisi.");
        return;
    }
    if (!message) {
        alert("Pesan/komentar ulasan wajib diisi.");
        return;
    }
    if (!rating || rating < 1 || rating > 5) {
        alert("Silakan pilih rating bintang (1-5) terlebih dahulu.");
        return;
    }

    reviewSubmitBtn.disabled = true;
    reviewSubmitBtn.textContent = "Mengirim...";

    try {
        await addDoc(collection(db, "reviews"), {
            name,
            product,
            message,
            rating,
            createdAt: serverTimestamp()
        });

        window.showToast?.("Ulasan berhasil dikirim, terima kasih!", "fa-solid fa-star");

        reviewForm.reset();
        reviewMessageInput.value = "";
        reviewRatingInput.value = "0";
        paintStars(0);
        closeReviewModal();

    } catch (error) {
        console.error(error);
        alert("Gagal mengirim ulasan. Silakan coba lagi.");
    } finally {
        reviewSubmitBtn.disabled = false;
        reviewSubmitBtn.textContent = "Kirim Ulasan";
    }
});
