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
    subscribeToProducts
} from "./product-shared.js";

const grid = document.getElementById("productsGrid");

// Cache lokal supaya saat kartu diklik kita tidak perlu fetch ulang
let productsCache = [];

// Kartu produk di halaman utama sekarang langsung membuka halaman
// detail produk (product.html) alih-alih modal cepat, supaya
// tampilan detail produk (gambar, before/after, deskripsi & ulasan)
// selalu memakai halaman lengkap.
function goToProductPage(product) {
    if (!product?.id) return;
    window.location.href = `product.html?id=${encodeURIComponent(product.id)}`;
}

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
// REALTIME LISTENER
// ==============================================================
subscribeToProducts((products) => {
    productsCache = products;
    renderProducts();
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
    onOpenModal: goToProductPage
});
