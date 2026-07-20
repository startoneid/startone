// ==============================================================
// PRODUCT-DETAIL.JS
// Logika untuk product.html — halaman detail 1 produk yang bisa
// dibuka lewat link langsung (mis. dibagikan ke media sosial),
// berbeda dari modal cepat di Featured Collections/Shop.
//
// CATATAN JUJUR soal SEO: karena StarTone adalah situs statis tanpa
// server-side rendering, konten di halaman ini dimuat lewat
// JavaScript setelah halaman terbuka. Sebagian mesin pencari modern
// (termasuk Google) tetap bisa merender & mengindeks halaman seperti
// ini, tapi hasilnya tidak sekuat halaman yang benar-benar di-render
// di server. Manfaat utama halaman ini adalah URL yang rapi & bisa
// dibagikan langsung ke 1 produk spesifik, bukan jaminan peringkat SEO.
// ==============================================================

import { getProductById, formatPrice, escapeHTML } from "./product-shared.js";

const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

const loadingEl = document.getElementById("productDetailLoading");
const notFoundEl = document.getElementById("productDetailNotFound");
const contentEl = document.getElementById("productDetailContent");

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

    contentEl.innerHTML = `
        <div class="product-detail-grid">
            <div class="product-detail-image">
                <img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}">
            </div>
            <div class="product-detail-info">
                ${product.category ? `<span class="pill" style="cursor:default;">${escapeHTML(product.category)}</span>` : ""}
                <h1>${escapeHTML(product.name)}</h1>
                <div class="price">${formatPrice(product.price)}</div>
                <p class="short-desc">${escapeHTML(product.shortDesc || "")}</p>

                ${product.compatibility ? `<p class="compat"><i class="fa-solid fa-mobile-screen"></i> Kompatibel: ${escapeHTML(product.compatibility)}</p>` : ""}

                <div class="product-detail-actions">
                    <button class="btn btn-primary" id="productDetailBuyBtn">Buy Now</button>
                    <button class="btn btn-outline" id="productDetailShareBtn">
                        <i class="fa-solid fa-link"></i> Salin Link
                    </button>
                </div>

                <h3>Detail Produk</h3>
                <p>${escapeHTML(product.detail || "Belum ada detail untuk produk ini.").replace(/\n/g, "<br>")}</p>

                <h3>Tips Penggunaan</h3>
                <p>${escapeHTML(product.tips || "Belum ada tips untuk produk ini.").replace(/\n/g, "<br>")}</p>
            </div>
        </div>
    `;

    document.getElementById("productDetailBuyBtn")?.addEventListener("click", () => {
        window.buyProduct?.(product.name, product.price, product.id);
    });

    document.getElementById("productDetailShareBtn")?.addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            window.showToast?.("Link produk disalin", "fa-solid fa-link");
        } catch {
            window.showToast?.("Gagal menyalin link", "fa-solid fa-triangle-exclamation");
        }
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
