// ==============================================================
// SHOP.JS
// Menampilkan SEMUA produk yang ditandai admin untuk tampil di
// halaman Shop (field showInShop di Firestore), lengkap dengan
// pencarian, kategori, urutan, dan filter favorit.
//
// Fitur kartu produk (favorit, buy now, modal detail & tips, efek
// hover) identik dengan Featured Collections karena memakai modul
// bersama js/product-shared.js.
// ==============================================================

import {
    cardHTML,
    attachGridEvents,
    createProductModalController,
    subscribeToProducts,
    getWishlist
} from "./product-shared.js";

const grid = document.getElementById("shopProductsGrid");
const modal = document.getElementById("productModal");
const modalBody = document.getElementById("productModalBody");
const modalCloseBtn = document.getElementById("productModalClose");
const searchInput = document.getElementById("shopProductSearch");
const sortSelect = document.getElementById("shopProductSort");
const wishlistFilterBtn = document.getElementById("shopWishlistFilterBtn");
const categoryPills = document.getElementById("shopCategoryPills");

let productsCache = [];
let currentSearch = "";
let currentSort = "default";
let currentCategory = "all";
let wishlistOnly = false;

const { openProductModal } = createProductModalController(modal, modalBody, modalCloseBtn);

function getShopProducts() {
    // Produk lama yang belum punya field showInShop tetap dianggap
    // tampil di halaman Shop (kompatibel ke belakang).
    return productsCache.filter(p => p.showInShop !== false);
}

function getVisibleProducts() {
    let list = getShopProducts();

    if (currentCategory !== "all") {
        list = list.filter(p => p.category === currentCategory);
    }

    if (currentSearch.trim()) {
        const q = currentSearch.trim().toLowerCase();
        list = list.filter(p =>
            (p.name || "").toLowerCase().includes(q) ||
            (p.shortDesc || "").toLowerCase().includes(q)
        );
    }

    if (wishlistOnly) {
        const wl = getWishlist();
        list = list.filter(p => wl.includes(p.id));
    }

    switch (currentSort) {
        case "price-asc":
            list.sort((a, b) => (a.price || 0) - (b.price || 0));
            break;
        case "price-desc":
            list.sort((a, b) => (b.price || 0) - (a.price || 0));
            break;
        case "name-asc":
            list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
            break;
        default:
            break; // urutan bawaan (field "order")
    }

    return list;
}

function renderProducts() {
    if (!grid) return;

    const products = getVisibleProducts();

    if (products.length === 0) {
        grid.innerHTML = `
            <p style="grid-column:1/-1;text-align:center;color:#bbb;padding:20px 0;">
                ${wishlistOnly
                    ? "Belum ada produk favorit. Klik ikon hati pada produk untuk menyimpannya."
                    : "Belum ada produk yang cocok dengan pencarianmu."}
            </p>
        `;
        return;
    }

    grid.innerHTML = products.map((p, index) => cardHTML(p, index)).join("");
}

// ==============================================================
// CATEGORY PILLS (dibuat otomatis dari kategori produk yang ada)
// ==============================================================
function renderCategoryPills() {
    if (!categoryPills) return;

    const categories = [...new Set(
        getShopProducts().map(p => p.category).filter(Boolean)
    )];

    if (categories.length === 0) {
        categoryPills.style.display = "none";
        return;
    }

    categoryPills.style.display = "flex";

    const escape = (s) => {
        const div = document.createElement("div");
        div.textContent = s ?? "";
        return div.innerHTML;
    };

    categoryPills.innerHTML = `
        <button class="pill ${currentCategory === "all" ? "active" : ""}" data-category="all" type="button">Semua</button>
        ${categories.map(cat => `
            <button class="pill ${currentCategory === cat ? "active" : ""}" data-category="${escape(cat)}" type="button">${escape(cat)}</button>
        `).join("")}
    `;
}

categoryPills?.addEventListener("click", (e) => {
    const pill = e.target.closest(".pill");
    if (!pill) return;

    currentCategory = pill.dataset.category;

    categoryPills.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
    pill.classList.add("active");

    renderProducts();
});

// ==============================================================
// REALTIME LISTENER
// ==============================================================
subscribeToProducts((products) => {
    productsCache = products;
    renderProducts();
    renderCategoryPills();
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
// SEARCH & SORT & WISHLIST FILTER CONTROLS
// ==============================================================
let searchDebounce;
searchInput?.addEventListener("input", (e) => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
        currentSearch = e.target.value;
        renderProducts();
    }, 200);
});

sortSelect?.addEventListener("change", (e) => {
    currentSort = e.target.value;
    renderProducts();
});

wishlistFilterBtn?.addEventListener("click", () => {
    wishlistOnly = !wishlistOnly;
    wishlistFilterBtn.classList.toggle("active", wishlistOnly);
    renderProducts();
});

// ==============================================================
// KLIK KARTU -> BUKA MODAL DETAIL & TIPS / FAVORIT / BUY NOW
// ==============================================================
attachGridEvents(grid, {
    getProductById: (id) => productsCache.find(p => p.id === id),
    onOpenModal: openProductModal,
    onWishlistToggled: () => { if (wishlistOnly) renderProducts(); }
});
