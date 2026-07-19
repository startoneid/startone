// ==============================================================
// PRODUCTS.JS
// Menampilkan produk Featured Collections di halaman utama
// (index.html), mengambil data dari Firestore secara realtime.
//
// Produk yang tampil di sini adalah produk yang ditandai admin
// untuk "Featured Collections" (field showInFeatured di Firestore).
// Pencarian, kategori, urutan, dan filter favorit sekarang berada
// di halaman Shop (shop.html) supaya tidak dobel di sini — di sini
// hanya menampilkan grid produk unggulan.
//
// Fitur kartu produk (favorit, buy now, modal detail & tips, efek
// hover) tetap identik dengan halaman Shop karena memakai modul
// bersama js/product-shared.js.
// ==============================================================

import {
    cardHTML,
    attachGridEvents,
    createProductModalController,
    subscribeToProducts,
    getRecentlyViewed
} from "./product-shared.js";

const grid = document.getElementById("productsGrid");
const modal = document.getElementById("productModal");
const modalBody = document.getElementById("productModalBody");
const modalCloseBtn = document.getElementById("productModalClose");
const recentlyViewedSection = document.getElementById("recentlyViewedSection");
const recentlyViewedGrid = document.getElementById("recentlyViewedGrid");

// Cache lokal supaya saat kartu diklik kita tidak perlu fetch ulang
let productsCache = [];

const { openProductModal } = createProductModalController(modal, modalBody, modalCloseBtn);

function getFeaturedProducts() {
    // Produk lama yang belum punya field showInFeatured tetap dianggap
    // tampil di Featured Collections (kompatibel ke belakang).
    return productsCache.filter(p => p.showInFeatured !== false);
}

function renderProducts() {
    if (!grid) return;

    const products = getFeaturedProducts();

    if (products.length === 0) {
        grid.innerHTML = `
            <p style="grid-column:1/-1;text-align:center;color:#bbb;padding:20px 0;">
                Belum ada produk unggulan yang ditambahkan.
            </p>
        `;
        return;
    }

    grid.innerHTML = products.map((p, index) => cardHTML(p, index)).join("");
}

// ==============================================================
// RECENTLY VIEWED
// ==============================================================
function renderRecentlyViewed() {
    if (!recentlyViewedGrid || !recentlyViewedSection) return;

    const ids = getRecentlyViewed();
    const items = ids
        .map(id => productsCache.find(p => p.id === id))
        .filter(Boolean);

    if (items.length === 0) {
        recentlyViewedSection.style.display = "none";
        return;
    }

    recentlyViewedSection.style.display = "";
    recentlyViewedGrid.innerHTML = items.map((p) => cardHTML(p, 0)).join("");
}

// ==============================================================
// REALTIME LISTENER
// ==============================================================
subscribeToProducts((products) => {
    productsCache = products;
    renderProducts();
    renderRecentlyViewed();
}, () => {
    if (grid) {
        grid.innerHTML = `
            <p style="grid-column:1/-1;text-align:center;color:#ff8080;">
                Gagal memuat produk. Silakan refresh halaman.
            </p>
        `;
    }
});

// ==============================================================
// KLIK KARTU (favorit, buy now, modal) - grid utama & recently viewed
// ==============================================================
attachGridEvents(grid, {
    getProductById: (id) => productsCache.find(p => p.id === id),
    onOpenModal: openProductModal
});

attachGridEvents(recentlyViewedGrid, {
    getProductById: (id) => productsCache.find(p => p.id === id),
    onOpenModal: openProductModal
});
