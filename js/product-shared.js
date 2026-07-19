// ==============================================================
// PRODUCT-SHARED.JS
// Logika bersama (format harga, wishlist, modal detail produk,
// render kartu, listener realtime Firestore) yang dipakai oleh
// js/products.js (Featured Collections di index.html) DAN
// js/shop.js (halaman Shop, shop.html).
//
// Menyimpannya di satu tempat memastikan kartu produk di kedua
// halaman punya fitur yang identik (favorit, buy now, modal
// detail & tips, animasi).
// ==============================================================

import { db } from "./firebase.js";

import {
    collection,
    onSnapshot,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const WISHLIST_KEY = "startone_wishlist";
export const RECENTLY_VIEWED_KEY = "startone_recently_viewed";
export const MAX_RECENTLY_VIEWED = 4;

export function formatPrice(price) {
    return "Rp" + Number(price || 0).toLocaleString("id-ID");
}

export function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
}

// ==============================================================
// WISHLIST (favorit) - localStorage, dipakai bersama di semua halaman
// ==============================================================
export function getWishlist() {
    try {
        return JSON.parse(localStorage.getItem(WISHLIST_KEY)) || [];
    } catch {
        return [];
    }
}

export function saveWishlist(list) {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
}

export function isWishlisted(id) {
    return getWishlist().includes(id);
}

export function toggleWishlist(id) {
    let list = getWishlist();
    if (list.includes(id)) {
        list = list.filter(x => x !== id);
    } else {
        list.push(id);
        window.showToast?.("Ditambahkan ke Favorit", "fa-solid fa-heart");
    }
    saveWishlist(list);
}

// ==============================================================
// RECENTLY VIEWED (localStorage, murni sisi klien)
// ==============================================================
export function getRecentlyViewed() {
    try {
        return JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY)) || [];
    } catch {
        return [];
    }
}

export function addRecentlyViewed(id) {
    let list = getRecentlyViewed().filter(x => x !== id);
    list.unshift(id);
    list = list.slice(0, MAX_RECENTLY_VIEWED);
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(list));
}

// ==============================================================
// RENDER KARTU PRODUK (dipakai oleh Featured Collections & Shop)
// ==============================================================
export function cardHTML(p, index = 0) {
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
}

// ==============================================================
// EVENT HANDLER GENERIK UNTUK GRID KARTU PRODUK
// (klik favorit / buy now / kartu untuk modal)
// ==============================================================
export function attachGridEvents(gridEl, { getProductById, onOpenModal, onWishlistToggled } = {}) {
    if (!gridEl) return;

    gridEl.addEventListener("click", (e) => {
        const wishBtn = e.target.closest(".wishlist-btn");
        if (wishBtn) {
            e.stopPropagation();
            toggleWishlist(wishBtn.dataset.id);
            wishBtn.classList.toggle("active");
            wishBtn.classList.add("pop");
            setTimeout(() => wishBtn.classList.remove("pop"), 450);
            onWishlistToggled?.(wishBtn.dataset.id);
            return;
        }

        const buyBtn = e.target.closest(".buy");
        if (buyBtn) {
            e.stopPropagation();
            window.buyProduct?.(buyBtn.dataset.name, Number(buyBtn.dataset.price), buyBtn.dataset.id);
            return;
        }

        const card = e.target.closest(".card");
        if (!card) return;

        const product = getProductById?.(card.dataset.id);
        if (product) onOpenModal?.(product);
    });
}

// ==============================================================
// MODAL DETAIL & TIPS PRODUK (dipakai bersama)
// ==============================================================
export function createProductModalController(modal, modalBody, modalCloseBtn) {
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
            window.buyProduct?.(product.name, product.price, product.id);
        });
    }

    function closeProductModal() {
        if (!modal) return;
        modal.classList.remove("active");
        document.body.style.overflow = "";
    }

    modalCloseBtn?.addEventListener("click", closeProductModal);

    modal?.addEventListener("click", (e) => {
        if (e.target === modal) closeProductModal();
    });

    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeProductModal();
    });

    return { openProductModal, closeProductModal };
}

// ==============================================================
// LISTENER REALTIME FIRESTORE (dipakai bersama)
// ==============================================================
export function subscribeToProducts(onChange, onError) {
    const productsQuery = query(collection(db, "products"), orderBy("order", "asc"));

    return onSnapshot(productsQuery, (snapshot) => {
        const products = [];
        snapshot.forEach((docSnap) => {
            products.push({ id: docSnap.id, ...docSnap.data() });
        });
        onChange(products);
    }, (error) => {
        console.error("Gagal memuat produk:", error);
        onError?.(error);
    });
}
