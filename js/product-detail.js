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
    document.getElementById("pdThumbs")?.addEventListener("click", (e) => {
        const thumb = e.target.closest(".pd-thumb");
        if (!thumb) return;

        document.querySelectorAll(".pd-thumb").forEach((t) => t.classList.remove("active"));
        thumb.classList.add("active");
        document.getElementById("pdMainImage").src = thumb.dataset.src;
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
