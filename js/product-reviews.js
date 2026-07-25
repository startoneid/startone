// ==============================================================
// PRODUCT-REVIEWS.JS
// Ulasan khusus per produk untuk halaman detail (product.html).
//
// Memakai koleksi Firestore "reviews" yang SAMA dengan yang dipakai
// di section Review halaman utama (js/reviews.js) — field "product"
// menyimpan nama produknya. Di sini kita filter ulasan yang field
// "product"-nya cocok dengan nama produk yang sedang dibuka, lalu
// tampilkan ringkasan rating (rata-rata + breakdown bintang) dan
// daftar ulasannya, plus form untuk menambah ulasan baru.
// ==============================================================

import { db } from "./firebase.js";

import {
    collection,
    addDoc,
    onSnapshot,
    query,
    where,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
}

function starsHTML(rating, size = "") {
    const safeRating = Math.min(5, Math.max(0, Math.round(Number(rating) || 0)));
    let html = "";
    for (let i = 1; i <= 5; i++) {
        html += `<i class="${i <= safeRating ? "fa-solid" : "fa-regular"} fa-star"></i>`;
    }
    return `<span class="pd-stars ${size}">${html}</span>`;
}

function formatDate(ts) {
    try {
        const date = ts?.toDate ? ts.toDate() : new Date(ts);
        if (isNaN(date.getTime())) return "";
        return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    } catch {
        return "";
    }
}

// ==============================================================
// INISIALISASI ULASAN UNTUK 1 PRODUK
// ==============================================================
export function initProductReviews(product, els) {
    const { rootEl, headerStarsEl, headerCountEl, tabCountEl } = els;
    if (!rootEl) return;

    const productName = product.name || "";

    rootEl.innerHTML = `
        <div class="pd-review-summary" id="pdReviewSummary"></div>

        <div class="pd-review-list" id="pdReviewList">
            <p class="pd-review-empty">Memuat ulasan...</p>
        </div>

        <div class="pd-review-form-wrap">
            <h3>Tulis Ulasan</h3>
            <p class="pd-review-form-hint">Bagikan pengalamanmu memakai preset ${escapeHTML(productName)} ini.</p>

            <form id="pdReviewForm" class="review-modal-content">
                <label>Rating Kamu</label>
                <div class="star-rating" id="pdStarRating">
                    <i class="fa-regular fa-star" data-value="1"></i>
                    <i class="fa-regular fa-star" data-value="2"></i>
                    <i class="fa-regular fa-star" data-value="3"></i>
                    <i class="fa-regular fa-star" data-value="4"></i>
                    <i class="fa-regular fa-star" data-value="5"></i>
                </div>
                <input type="hidden" id="pdReviewRating" value="0">

                <label for="pdReviewMessage">Ulasan Kamu</label>
                <textarea id="pdReviewMessage" rows="4" maxlength="300" placeholder="Ceritakan pengalamanmu memakai preset ini..." required></textarea>

                <div class="pd-form-row">
                    <div>
                        <label for="pdReviewName">Nama</label>
                        <input type="text" id="pdReviewName" maxlength="60" placeholder="Nama kamu" required>
                    </div>
                    <div>
                        <label for="pdReviewEmail">Email</label>
                        <input type="email" id="pdReviewEmail" maxlength="120" placeholder="Email kamu (tidak ditampilkan)" required>
                    </div>
                </div>

                <button type="submit" class="btn btn-primary" id="pdReviewSubmitBtn" style="width:100%;margin-top:14px;">
                    Kirim Ulasan
                </button>
            </form>
        </div>
    `;

    // ---- Star picker ----
    const starRatingEl = document.getElementById("pdStarRating");
    const ratingInput = document.getElementById("pdReviewRating");
    const stars = starRatingEl ? Array.from(starRatingEl.querySelectorAll("i")) : [];

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
            ratingInput.value = value;
            paintStars(value);
        });
        star.addEventListener("mouseenter", () => paintStars(Number(star.dataset.value)));
    });
    starRatingEl?.addEventListener("mouseleave", () => paintStars(Number(ratingInput.value) || 0));

    // ---- Render ringkasan + daftar ulasan ----
    function renderSummary(reviews) {
        const summaryEl = document.getElementById("pdReviewSummary");
        if (!summaryEl) return;

        const total = reviews.length;
        const avg = total ? reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / total : 0;

        const counts = [0, 0, 0, 0, 0]; // index 0 = bintang 1 ... index 4 = bintang 5
        reviews.forEach((r) => {
            const rating = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 0)));
            counts[rating - 1]++;
        });

        const barsHTML = [5, 4, 3, 2, 1].map((star) => {
            const count = counts[star - 1];
            const pct = total ? Math.round((count / total) * 100) : 0;
            return `
                <div class="pd-rating-bar-row">
                    <span>${star} <i class="fa-solid fa-star"></i></span>
                    <div class="pd-rating-bar-track"><div class="pd-rating-bar-fill" style="width:${pct}%"></div></div>
                    <span class="pd-rating-bar-count">${count}</span>
                </div>
            `;
        }).join("");

        summaryEl.innerHTML = `
            <div class="pd-review-avg">
                <div class="pd-review-avg-num">${avg.toFixed(1)}</div>
                ${starsHTML(avg)}
                <span class="pd-review-avg-total">Berdasarkan ${total} ulasan</span>
            </div>
            <div class="pd-rating-bars">${barsHTML}</div>
        `;

        // Update header (dekat judul produk) & label tab
        if (headerStarsEl) headerStarsEl.innerHTML = starsHTML(avg).replace(/^<span[^>]*>|<\/span>$/g, "");
        if (headerCountEl) headerCountEl.textContent = total ? `(${total} ulasan)` : "(Belum ada ulasan)";
        if (tabCountEl) tabCountEl.textContent = `(${total})`;
    }

    function reviewItemHTML(review) {
        const initial = escapeHTML((review.name || "?").trim().charAt(0).toUpperCase() || "?");
        return `
            <div class="pd-review-item">
                <div class="pd-review-item-top">
                    <div class="review-avatar">${initial}</div>
                    <div>
                        <h4>${escapeHTML(review.name || "Anonim")}</h4>
                        <span class="pd-review-date">${formatDate(review.createdAt)}</span>
                    </div>
                </div>
                ${starsHTML(review.rating)}
                ${review.message ? `<p class="review-message">${escapeHTML(review.message)}</p>` : ""}
            </div>
        `;
    }

    function renderList(reviews) {
        const listEl = document.getElementById("pdReviewList");
        if (!listEl) return;

        if (!reviews.length) {
            listEl.innerHTML = `<p class="pd-review-empty">Belum ada ulasan untuk produk ini. Jadilah yang pertama menulis ulasan!</p>`;
            return;
        }

        listEl.innerHTML = reviews.map(reviewItemHTML).join("");
    }

    // ---- Realtime listener, difilter berdasarkan nama produk ----
    // (diurutkan di sisi klien supaya tidak perlu index komposit Firestore)
    const reviewsQuery = query(collection(db, "reviews"), where("product", "==", productName));

    onSnapshot(reviewsQuery, (snapshot) => {
        const reviews = [];
        snapshot.forEach((docSnap) => reviews.push({ id: docSnap.id, ...docSnap.data() }));
        reviews.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));

        renderSummary(reviews);
        renderList(reviews);
    }, (error) => {
        console.error("Gagal memuat ulasan produk:", error);
        const listEl = document.getElementById("pdReviewList");
        if (listEl) {
            listEl.innerHTML = `<p class="pd-review-empty">Gagal memuat ulasan. Silakan refresh halaman.</p>`;
        }
    });

    // ---- Submit form ulasan ----
    document.getElementById("pdReviewForm")?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("pdReviewName").value.trim();
        const email = document.getElementById("pdReviewEmail").value.trim();
        const message = document.getElementById("pdReviewMessage").value.trim();
        const rating = Number(ratingInput.value);

        if (!name || !email || !message) {
            alert("Nama, email, dan ulasan wajib diisi.");
            return;
        }
        if (!rating || rating < 1 || rating > 5) {
            alert("Silakan pilih rating bintang (1-5) terlebih dahulu.");
            return;
        }

        const submitBtn = document.getElementById("pdReviewSubmitBtn");
        submitBtn.disabled = true;
        submitBtn.textContent = "Mengirim...";

        try {
            // PENTING: firestore.rules hanya mengizinkan field
            // name, product, message, rating, createdAt untuk koleksi
            // "reviews" (lihat hasOnly(...) di firestore.rules). Field
            // "email" di form ini sengaja TIDAK dikirim ke Firestore -
            // hanya dipakai sebagai validasi wajib isi di sisi form,
            // supaya submit ulasan tidak ditolak oleh security rules.
            await addDoc(collection(db, "reviews"), {
                name,
                product: productName,
                message,
                rating,
                createdAt: serverTimestamp()
            });

            window.showToast?.("Ulasan berhasil dikirim, terima kasih!", "fa-solid fa-star");

            document.getElementById("pdReviewForm").reset();
            ratingInput.value = "0";
            paintStars(0);

        } catch (error) {
            console.error(error);
            alert("Gagal mengirim ulasan. Silakan coba lagi.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Kirim Ulasan";
        }
    });
}
