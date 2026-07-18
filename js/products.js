// ==============================================================
// PRODUCTS.JS
// Mengambil data produk dari Firestore (koleksi "products") secara
// realtime, lalu menampilkannya di Featured Collections.
// Juga menangani modal detail & tips saat kartu produk diklik,
// pencarian, sortir, wishlist (favorit), dan riwayat "Baru Saja Dilihat".
//
// Karena pakai onSnapshot, begitu Admin menambah/mengedit/menghapus
// produk di panel Admin, halaman utama ini akan otomatis update
// tanpa perlu refresh manual.
// ==============================================================

import { db } from "./firebase.js";

import {
    collection,
    onSnapshot,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const grid = document.getElementById("productsGrid");
const modal = document.getElementById("productModal");
const modalBody = document.getElementById("productModalBody");
const modalCloseBtn = document.getElementById("productModalClose");
const searchInput = document.getElementById("productSearch");
const sortSelect = document.getElementById("productSort");
const wishlistFilterBtn = document.getElementById("wishlistFilterBtn");
const recentlyViewedSection = document.getElementById("recentlyViewedSection");
const recentlyViewedGrid = document.getElementById("recentlyViewedGrid");
const categoryPills = document.getElementById("categoryPills");

// Cache lokal supaya saat kartu diklik kita tidak perlu fetch ulang
let productsCache = [];
let currentSearch = "";
let currentSort = "default";
let currentCategory = "all";
let wishlistOnly = false;

const WISHLIST_KEY = "startone_wishlist";
const RECENTLY_VIEWED_KEY = "startone_recently_viewed";
const MAX_RECENTLY_VIEWED = 4;

function getWishlist() {
    try {
        return JSON.parse(localStorage.getItem(WISHLIST_KEY)) || [];
    } catch {
        return [];
    }
}

function saveWishlist(list) {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
}

function isWishlisted(id) {
    return getWishlist().includes(id);
}

function toggleWishlist(id) {
    let list = getWishlist();
    if (list.includes(id)) {
        list = list.filter(x => x !== id);
    } else {
        list.push(id);
        window.showToast?.("Ditambahkan ke Favorit", "fa-solid fa-heart");
    }
    saveWishlist(list);
}

function formatPrice(price) {
    return "Rp" + Number(price || 0).toLocaleString("id-ID");
}

function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
}

// ==============================================================
// RECENTLY VIEWED (localStorage, murni sisi klien)
// ==============================================================
function getRecentlyViewed() {
    try {
        return JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY)) || [];
    } catch {
        return [];
    }
}

function addRecentlyViewed(id) {
    let list = getRecentlyViewed().filter(x => x !== id);
    list.unshift(id);
    list = list.slice(0, MAX_RECENTLY_VIEWED);
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(list));
    renderRecentlyViewed();
}

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

    recentlyViewedGrid.innerHTML = items.map(p => `
        <div class="card" data-id="${p.id}">
            <div class="card-img-wrap">
                <img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" loading="lazy">
                <button class="wishlist-btn ${isWishlisted(p.id) ? "active" : ""}" data-id="${p.id}" aria-label="Favorit" type="button">
                    <i class="fa-solid fa-heart"></i>
                </button>
            </div>
            <div class="card-content">
                <h3>${escapeHTML(p.name)}</h3>
                <p>${escapeHTML(p.shortDesc)}</p>
                <div class="price">${formatPrice(p.price)}</div>
                <button
                    class="buy"
                    data-name="${escapeHTML(p.name)}"
                    data-price="${p.price}"
                    data-id="${p.id}">
                    Buy Now
                </button>
            </div>
        </div>
    `).join("");
}

// Klik pada grid "Baru Saja Dilihat" pakai logika yang sama seperti grid utama
recentlyViewedGrid?.addEventListener("click", (e) => {
    const wishBtn = e.target.closest(".wishlist-btn");
    if (wishBtn) {
        e.stopPropagation();
        toggleWishlist(wishBtn.dataset.id);
        wishBtn.classList.toggle("active");
        wishBtn.classList.add("pop");
        setTimeout(() => wishBtn.classList.remove("pop"), 450);
        return;
    }

    const buyBtn = e.target.closest(".buy");
    if (buyBtn) {
        e.stopPropagation();
        window.buyProduct(buyBtn.dataset.name, Number(buyBtn.dataset.price), buyBtn.dataset.id);
        return;
    }

    const card = e.target.closest(".card");
    if (!card) return;

    const product = productsCache.find(p => p.id === card.dataset.id);
    if (product) openProductModal(product);
});

// ==============================================================
// FILTER + SORT sebelum render
// ==============================================================
function getVisibleProducts() {
    let list = [...productsCache];

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

    grid.innerHTML = products.map((p, index) => {
        const wished = isWishlisted(p.id);

        return `
        <div class="card" data-id="${p.id}" style="animation-delay:${Math.min(index, 6) * 60}ms">
            <div class="card-img-wrap">
                <img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" loading="lazy">
                <button class="wishlist-btn ${wished ? "active" : ""}" data-id="${p.id}" aria-label="Favorit" type="button">
                    <i class="fa-solid fa-heart"></i>
                </button>
            </div>
            <div class="card-content">
                <h3>${escapeHTML(p.name)}</h3>
                <p>${escapeHTML(p.shortDesc)}</p>
                <div class="price">${formatPrice(p.price)}</div>
                <button
                    class="buy"
                    data-name="${escapeHTML(p.name)}"
                    data-price="${p.price}"
                    data-id="${p.id}">
                    Buy Now
                </button>
            </div>
        </div>
    `;
    }).join("");
}

// ==============================================================
// CATEGORY PILLS (dibuat otomatis dari kategori produk yang ada)
// ==============================================================
function renderCategoryPills() {
    if (!categoryPills) return;

    const categories = [...new Set(
        productsCache.map(p => p.category).filter(Boolean)
    )];

    if (categories.length === 0) {
        categoryPills.style.display = "none";
        return;
    }

    categoryPills.style.display = "flex";

    categoryPills.innerHTML = `
        <button class="pill ${currentCategory === "all" ? "active" : ""}" data-category="all" type="button">Semua</button>
        ${categories.map(cat => `
            <button class="pill ${currentCategory === cat ? "active" : ""}" data-category="${escapeHTML(cat)}" type="button">${escapeHTML(cat)}</button>
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
const productsQuery = query(collection(db, "products"), orderBy("order", "asc"));

onSnapshot(productsQuery, (snapshot) => {
    productsCache = [];

    snapshot.forEach((docSnap) => {
        productsCache.push({ id: docSnap.id, ...docSnap.data() });
    });

    renderProducts();
    renderCategoryPills();
    renderRecentlyViewed();

}, (error) => {
    console.error("Gagal memuat produk:", error);

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
// KLIK KARTU -> BUKA MODAL DETAIL & TIPS
// KLIK TOMBOL "BUY NOW" -> LANGSUNG KE ALUR CHECKOUT (tidak buka modal)
// KLIK ICON HATI -> TOGGLE WISHLIST (tidak buka modal)
// ==============================================================
if (grid) {
    grid.addEventListener("click", (e) => {

        const wishBtn = e.target.closest(".wishlist-btn");
        if (wishBtn) {
            e.stopPropagation();
            toggleWishlist(wishBtn.dataset.id);
            wishBtn.classList.toggle("active");
            wishBtn.classList.add("pop");
            setTimeout(() => wishBtn.classList.remove("pop"), 450);
            if (wishlistOnly) renderProducts();
            return;
        }

        const buyBtn = e.target.closest(".buy");
        if (buyBtn) {
            e.stopPropagation();
            window.buyProduct(buyBtn.dataset.name, Number(buyBtn.dataset.price), buyBtn.dataset.id);
            return;
        }

        const card = e.target.closest(".card");
        if (!card) return;

        const product = productsCache.find(p => p.id === card.dataset.id);
        if (product) openProductModal(product);
    });
}

function openProductModal(product) {
    if (!modal || !modalBody) return;

    addRecentlyViewed(product.id);

    modalBody.innerHTML = `
        <img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}">
        <h2>${escapeHTML(product.name)}</h2>
        <div class="price">${formatPrice(product.price)}</div>

        <h4>Detail Produk</h4>
        <p>${escapeHTML(product.detail || "Belum ada detail untuk produk ini.").replace(/\n/g, "<br>")}</p>

        <h4>Tips Penggunaan</h4>
        <p>${escapeHTML(product.tips || "Belum ada tips untuk produk ini.").replace(/\n/g, "<br>")}</p>

        <button
            class="btn btn-primary buy-modal-btn"
            data-name="${escapeHTML(product.name)}"
            data-price="${product.price}">
            Buy Now
        </button>
    `;

    modal.classList.add("active");
    document.body.style.overflow = "hidden";

    modalBody.querySelector(".buy-modal-btn").addEventListener("click", () => {
        window.buyProduct(product.name, product.price, product.id);
    });
}

function closeProductModal() {
    if (!modal) return;
    modal.classList.remove("active");
    document.body.style.overflow = "";
}

if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", closeProductModal);
}

if (modal) {
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeProductModal();
    });
}

window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeProductModal();
});
