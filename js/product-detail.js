// ==============================================================
// PRODUCT-DETAIL.JS
// Logika untuk product.html — halaman detail 1 produk yang bisa
// dibuka lewat link langsung (mis. dibagikan ke media sosial),
// atau dari kartu produk di halaman utama & Shop.
//
// CATATAN JUJUR soal SEO: karena StarTone adalah situs statis tanpa
// server-side rendering, konten di halaman ini dimuat lewat
// JavaScript setelah halaman terbuka. Sebagian mesin pencari modern
// (termasuk Google) tetap bisa merender & mengindeks halaman seperti
// ini, tapi hasilnya tidak sekuat halaman yang benar-benar di-render
// di server. Manfaat utama halaman ini adalah URL yang rapi & bisa
// dibagikan langsung ke 1 produk spesifik, bukan jaminan peringkat SEO.
// ==============================================================

import { getProductById, formatPrice, escapeHTML, galleryHTML } from "./product-shared.js";
import { initProductReviews } from "./product-reviews.js";

const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

const loadingEl = document.getElementById("productDetailLoading");
const notFoundEl = document.getElementById("productDetailNotFound");
const contentEl = document.getElementById("productDetailContent");

const MAX_QTY = 10;

// ==============================================================
// LIGHTBOX POPUP GALERI (layar 9:16) — dipakai bersama oleh
// tombol search di pojok thumbnail utama & tombol kaca pembesar
// di galeri Before/After. Thumbnail utama sendiri SENGAJA tidak
// bisa diklik langsung untuk membuka popup ini — hanya lewat
// tombol search yang disediakan.
// ==============================================================
const pdLightbox = document.getElementById("pdLightbox");
const pdLightboxStage = document.getElementById("pdLightboxStage");
const pdLightboxImage = document.getElementById("pdLightboxImage");
const pdLightboxCounter = document.getElementById("pdLightboxCounter");
const pdLightboxCaption = document.getElementById("pdLightboxCaption");
const pdLightboxPrevBtn = document.getElementById("pdLightboxPrevBtn");
const pdLightboxNextBtn = document.getElementById("pdLightboxNextBtn");
const pdLightboxCloseBtn = document.getElementById("pdLightboxCloseBtn");
const pdLightboxZoomBtn = document.getElementById("pdLightboxZoomBtn");
const pdLightboxFullscreenBtn = document.getElementById("pdLightboxFullscreenBtn");

let lightboxItems = [];
let lightboxIndex = 0;
let lightboxTransitioning = false;

function renderLightboxContent() {
    const item = lightboxItems[lightboxIndex];
    if (!item || !pdLightboxImage) return;

    pdLightboxImage.src = item.src;
    pdLightboxImage.alt = item.caption || "";
    if (pdLightboxCounter) pdLightboxCounter.textContent = `${lightboxIndex + 1} / ${lightboxItems.length}`;
    if (pdLightboxCaption) pdLightboxCaption.textContent = item.caption || "";
    if (pdLightboxPrevBtn) pdLightboxPrevBtn.disabled = lightboxIndex <= 0;
    if (pdLightboxNextBtn) pdLightboxNextBtn.disabled = lightboxIndex >= lightboxItems.length - 1;
}

function openLightbox(items, startIndex = 0) {
    if (!pdLightbox || !items?.length) return;

    lightboxItems = items;
    lightboxIndex = Math.min(Math.max(startIndex, 0), items.length - 1);

    pdLightboxStage?.classList.remove("zoomed", "slide-out-left", "slide-out-right", "slide-in-left", "slide-in-right");
    pdLightboxZoomBtn?.classList.remove("active");

    renderLightboxContent();

    pdLightbox.classList.add("active");
    pdLightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}

function closeLightbox() {
    if (!pdLightbox) return;

    pdLightbox.classList.remove("active");
    pdLightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";

    if (document.fullscreenElement === pdLightbox) {
        document.exitFullscreen?.().catch(() => {});
    }
}

// Animasi geser halus setiap kali tombol < atau > ditekan: gambar lama
// fade + geser keluar, baru gambar berikutnya di-set lalu fade + geser
// masuk dari arah berlawanan.
function animateLightboxChange(direction, updateFn) {
    if (!pdLightboxStage || lightboxTransitioning) {
        updateFn();
        return;
    }
    lightboxTransitioning = true;

    const outClass = direction === "next" ? "slide-out-left" : "slide-out-right";
    const inClass = direction === "next" ? "slide-in-right" : "slide-in-left";

    pdLightboxStage.classList.add(outClass);

    const handleOutEnd = () => {
        pdLightboxImage.removeEventListener("transitionend", handleOutEnd);
        pdLightboxStage.classList.remove(outClass);

        updateFn();
        pdLightboxStage.classList.add(inClass);

        // Paksa reflow supaya transisi masuk benar-benar dijalankan ulang
        void pdLightboxStage.offsetWidth;

        requestAnimationFrame(() => {
            pdLightboxStage.classList.remove(inClass);
            setTimeout(() => { lightboxTransitioning = false; }, 240);
        });
    };
    pdLightboxImage.addEventListener("transitionend", handleOutEnd, { once: true });
}

function goLightboxPrev() {
    if (lightboxIndex <= 0) return;
    animateLightboxChange("prev", () => {
        lightboxIndex--;
        renderLightboxContent();
    });
}

function goLightboxNext() {
    if (lightboxIndex >= lightboxItems.length - 1) return;
    animateLightboxChange("next", () => {
        lightboxIndex++;
        renderLightboxContent();
    });
}

pdLightboxPrevBtn?.addEventListener("click", goLightboxPrev);
pdLightboxNextBtn?.addEventListener("click", goLightboxNext);
pdLightboxCloseBtn?.addEventListener("click", closeLightbox);

pdLightbox?.addEventListener("click", (e) => {
    if (e.target === pdLightbox) closeLightbox();
});

pdLightboxZoomBtn?.addEventListener("click", () => {
    const zoomed = pdLightboxStage.classList.toggle("zoomed");
    pdLightboxZoomBtn.classList.toggle("active", zoomed);
});

pdLightboxImage?.addEventListener("click", () => {
    const zoomed = pdLightboxStage.classList.toggle("zoomed");
    pdLightboxZoomBtn?.classList.toggle("active", zoomed);
});

pdLightboxFullscreenBtn?.addEventListener("click", async () => {
    try {
        if (!document.fullscreenElement) {
            await pdLightbox.requestFullscreen?.();
        } else {
            await document.exitFullscreen?.();
        }
    } catch (error) {
        console.warn("Fullscreen tidak didukung di browser ini:", error);
    }
});

document.addEventListener("fullscreenchange", () => {
    const isFs = document.fullscreenElement === pdLightbox;
    pdLightboxFullscreenBtn?.classList.toggle("active", isFs);
    const icon = pdLightboxFullscreenBtn?.querySelector("i");
    if (icon) icon.className = isFs ? "fa-solid fa-compress" : "fa-solid fa-expand";
});

document.addEventListener("keydown", (e) => {
    if (!pdLightbox?.classList.contains("active")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") goLightboxPrev();
    if (e.key === "ArrowRight") goLightboxNext();
});

// Susun daftar gambar Before/After (berselang-seling) untuk lightbox,
// dipakai saat tombol kaca pembesar di galeri Before/After ditekan.
function buildGalleryLightboxItems(product) {
    const items = Array.isArray(product.gallery)
        ? product.gallery.filter((g) => g && g.before && g.after)
        : [];

    const result = [];
    items.forEach((g, i) => {
        result.push({ src: g.before, caption: `${product.name} — Before (${i + 1})` });
        result.push({ src: g.after, caption: `${product.name} — After (${i + 1})` });
    });
    return result;
}

// ==============================================================
// Kumpulkan gambar untuk galeri utama (foto utama produk + foto
// "sesudah" dari galeri before/after), tanpa duplikat.
// ==============================================================
function collectGalleryImages(product) {
    const images = [];
    if (product.image) images.push(product.image);

    if (Array.isArray(product.gallery)) {
        product.gallery.forEach((g) => {
            if (g?.after && !images.includes(g.after)) images.push(g.after);
        });
    }

    return images.length ? images : [product.image].filter(Boolean);
}

function renderProduct(product) {
    document.title = `${product.name} | StarTone`;

    const metaDescTag = document.querySelector('meta[name="description"]');
    const shortDesc = product.shortDesc || `Preset Lightroom ${product.name} dari StarTone.`;
    if (metaDescTag) metaDescTag.setAttribute("content", shortDesc);

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", `${product.name} | StarTone`);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute("content", shortDesc);

    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage && product.image) ogImage.setAttribute("content", product.image);

    const images = collectGalleryImages(product);

    const thumbsHTML = images.length > 1
        ? images.map((src, i) => `
            <div class="pd-thumb ${i === 0 ? "active" : ""}" data-src="${escapeHTML(src)}">
                <img src="${escapeHTML(src)}" alt="${escapeHTML(product.name)} ${i + 1}" loading="lazy">
            </div>
        `).join("")
        : "";

    contentEl.innerHTML = `
        <div class="pd-top">
            <div class="pd-gallery">
                <div class="pd-main">
                    <img id="pdMainImage" src="${escapeHTML(images[0] || "")}" alt="${escapeHTML(product.name)}">
                    <button type="button" class="pd-search-btn" id="pdSearchBtn" aria-label="Lihat gambar produk lebih jelas">
                        <i class="fa-solid fa-magnifying-glass"></i>
                    </button>
                </div>
                ${thumbsHTML ? `<div class="pd-thumbs" id="pdThumbs">${thumbsHTML}</div>` : ""}
            </div>

            <div class="pd-info">
                ${product.category ? `<span class="pill">${escapeHTML(product.category)}</span>` : ""}
                <h1>${escapeHTML(product.name)}</h1>

                <div class="pd-rating-row">
                    <span class="pd-stars" id="pdHeaderStars"></span>
                    <span class="pd-rating-count" id="pdHeaderCount">(Memuat ulasan...)</span>
                </div>

                <div class="price">${formatPrice(product.price)}</div>
                <div class="pd-sold"><i class="fa-solid fa-fire"></i> ${Number(product.itemsSold || 0).toLocaleString("id-ID")} terjual</div>
                <p class="short-desc">${escapeHTML(product.shortDesc || "")}</p>

                ${product.compatibility ? `<p class="pd-compat"><i class="fa-solid fa-mobile-screen"></i>Kompatibel: ${escapeHTML(product.compatibility)}</p>` : ""}

                <div class="pd-qty-row">
                    <div class="pd-qty-box">
                        <button type="button" class="pd-qty-btn" id="pdQtyMinus" aria-label="Kurangi jumlah">−</button>
                        <input type="text" id="pdQtyInput" value="1" readonly inputmode="numeric" aria-label="Jumlah">
                        <button type="button" class="pd-qty-btn" id="pdQtyPlus" aria-label="Tambah jumlah">+</button>
                    </div>
                    <div class="pd-actions">
                        <button class="btn btn-primary" id="productDetailBuyBtn"><i class="fa-solid fa-bolt"></i> Buy Now</button>
                        <button class="btn btn-outline" id="productDetailShareBtn">
                            <i class="fa-solid fa-link"></i> Salin Link
                        </button>
                    </div>
                </div>

                ${product.category ? `<p class="pd-category-line">Kategori: <b>${escapeHTML(product.category)}</b></p>` : ""}
            </div>
        </div>

        ${galleryHTML(product)}

        <div class="pd-tabs-section">
            <div class="pd-tabs" role="tablist">
                <button class="pd-tab active" type="button" data-tab="desc" role="tab" aria-selected="true">Deskripsi</button>
                <button class="pd-tab" type="button" data-tab="reviews" role="tab" aria-selected="false">Ulasan <span id="pdTabReviewCount">(0)</span></button>
            </div>

            <div class="pd-panel" data-panel="desc">
                <h3>Detail Produk</h3>
                <p>${escapeHTML(product.detail || "Belum ada detail untuk produk ini.").replace(/\n/g, "<br>")}</p>

                <h3>Tips Penggunaan</h3>
                <p>${escapeHTML(product.tips || "Belum ada tips untuk produk ini.").replace(/\n/g, "<br>")}</p>
            </div>

            <div class="pd-panel" data-panel="reviews" style="display:none;">
                <div id="pdReviewsRoot"></div>
            </div>
        </div>
    `;

    // ---- Kuantitas beli ----
    const qtyInput = document.getElementById("pdQtyInput");
    let qty = 1;

    document.getElementById("pdQtyMinus")?.addEventListener("click", () => {
        qty = Math.max(1, qty - 1);
        qtyInput.value = qty;
    });
    document.getElementById("pdQtyPlus")?.addEventListener("click", () => {
        qty = Math.min(MAX_QTY, qty + 1);
        qtyInput.value = qty;
    });

    // ---- Ganti foto utama lewat thumbnail ----
    let currentThumbIndex = 0;

    document.getElementById("pdThumbs")?.addEventListener("click", (e) => {
        const thumb = e.target.closest(".pd-thumb");
        if (!thumb) return;

        const allThumbs = Array.from(document.querySelectorAll(".pd-thumb"));
        allThumbs.forEach((t) => t.classList.remove("active"));
        thumb.classList.add("active");
        document.getElementById("pdMainImage").src = thumb.dataset.src;
        currentThumbIndex = allThumbs.indexOf(thumb);
    });

    // ---- Tombol search di pojok thumbnail utama -> buka lightbox
    // berisi semua foto utama produk (bukan galeri before/after) ----
    document.getElementById("pdSearchBtn")?.addEventListener("click", () => {
        const mainItems = images.map((src, i) => ({
            src,
            caption: `${product.name} — Foto ${i + 1}`
        }));
        openLightbox(mainItems, currentThumbIndex);
    });

    // ---- Klik tombol kaca pembesar di galeri Before/After -> buka
    // lightbox berisi hasil preview (before & after), bukan thumbnail ----
    contentEl.querySelector(".ba-gallery")?.addEventListener("click", (e) => {
        const expandBtn = e.target.closest(".ba-expand-btn");
        if (!expandBtn) return;

        const galleryIndex = Number(expandBtn.dataset.galleryIndex) || 0;
        const galleryItems = buildGalleryLightboxItems(product);
        openLightbox(galleryItems, galleryIndex * 2 + 1);
    });

    // ---- Tab Deskripsi / Ulasan ----
    document.querySelectorAll(".pd-tab").forEach((tab) => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".pd-tab").forEach((t) => {
                t.classList.remove("active");
                t.setAttribute("aria-selected", "false");
            });
            tab.classList.add("active");
            tab.setAttribute("aria-selected", "true");

            const target = tab.dataset.tab;
            document.querySelectorAll(".pd-panel").forEach((panel) => {
                panel.style.display = panel.dataset.panel === target ? "block" : "none";
            });
        });
    });

    // ---- Buy Now (jumlah ikut dikalikan ke harga yang dikirim) ----
    document.getElementById("productDetailBuyBtn")?.addEventListener("click", () => {
        window.buyProduct?.(product.name, Number(product.price) * qty, product.id);
    });

    document.getElementById("productDetailShareBtn")?.addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            window.showToast?.("Link produk disalin", "fa-solid fa-link");
        } catch {
            window.showToast?.("Gagal menyalin link", "fa-solid fa-triangle-exclamation");
        }
    });

    // ---- Ulasan produk (ringkasan rating + daftar + form) ----
    initProductReviews(product, {
        rootEl: document.getElementById("pdReviewsRoot"),
        headerStarsEl: document.getElementById("pdHeaderStars"),
        headerCountEl: document.getElementById("pdHeaderCount"),
        tabCountEl: document.getElementById("pdTabReviewCount")
    });

    loadingEl.style.display = "none";
    contentEl.style.display = "block";
}

async function init() {
    if (!productId) {
        loadingEl.style.display = "none";
        notFoundEl.style.display = "block";
        return;
    }

    try {
        const product = await getProductById(productId);

        if (!product) {
            loadingEl.style.display = "none";
            notFoundEl.style.display = "block";
            return;
        }

        renderProduct(product);
    } catch (error) {
        console.error("Gagal memuat produk:", error);
        loadingEl.style.display = "none";
        notFoundEl.style.display = "block";
    }
}

init();
