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
    orderBy,
    doc,
    getDoc
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
// GALERI BEFORE/AFTER (slider geser) — dipakai oleh modal cepat
// (Featured Collections/Shop) DAN halaman detail product.html.
//
// Data produk: product.gallery = [{ before: "url", after: "url" }, ...]
// Diatur oleh admin lewat halaman Admin > Edit Produk (bisa upload
// gambar langsung atau tempel link foto).
// ==============================================================
export function galleryHTML(product) {
    const items = Array.isArray(product?.gallery)
        ? product.gallery.filter(g => g && g.before && g.after)
        : [];

    if (!items.length) return "";

    const slides = items.map((g) => `
        <div class="ba-slider" style="--pos:50%;">
            <img class="ba-img ba-after" src="${escapeHTML(g.after)}" alt="Sesudah pakai preset ${escapeHTML(product.name)}" loading="lazy" draggable="false">
            <img class="ba-img ba-before" src="${escapeHTML(g.before)}" alt="Sebelum pakai preset ${escapeHTML(product.name)}" loading="lazy" draggable="false">
            <span class="ba-line"></span>
            <span class="ba-handle-btn"><i class="fa-solid fa-arrows-left-right"></i></span>
            <span class="ba-tag ba-tag-before">Before</span>
            <span class="ba-tag ba-tag-after">After</span>
        </div>
    `).join("");

    return `
        <div class="ba-gallery-wrap">
            <h4 class="ba-gallery-title"><i class="fa-solid fa-image"></i> Before &amp; After</h4>
            <p class="ba-gallery-hint">Geser tiap foto untuk lihat perbandingan sebelum &amp; sesudah pakai preset ini.</p>
            <div class="ba-gallery">${slides}</div>
        </div>
    `;
}

// Interaksi geser (mouse & touch) untuk semua .ba-slider di halaman.
// Dipasang sekali secara global (delegasi lewat document) supaya tetap
// jalan meskipun kontennya baru saja dibuat ulang lewat innerHTML
// (mis. setiap kali modal produk dibuka).
(function initBeforeAfterSliderDrag() {
    let activeSlider = null;

    function setSliderPos(slider, clientX) {
        const rect = slider.getBoundingClientRect();
        let pct = ((clientX - rect.left) / rect.width) * 100;
        pct = Math.max(0, Math.min(100, pct));
        slider.style.setProperty("--pos", pct + "%");
    }

    function handleDown(e) {
        const slider = e.target.closest?.(".ba-slider");
        if (!slider) return;
        activeSlider = slider;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        setSliderPos(slider, clientX);
    }

    function handleMove(e) {
        if (!activeSlider) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        setSliderPos(activeSlider, clientX);
    }

    function handleUp() {
        activeSlider = null;
    }

    document.addEventListener("mousedown", handleDown);
    document.addEventListener("touchstart", handleDown, { passive: true });
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("touchmove", handleMove, { passive: true });
    document.addEventListener("mouseup", handleUp);
    document.addEventListener("touchend", handleUp);
})();

// ==============================================================
// RENDER KARTU PRODUK (dipakai oleh Featured Collections & Shop)
// ==============================================================
export function cardHTML(p, index = 0) {
    const wished = isWishlisted(p.id);
    const category = (p.category || "").trim();

    return `
    <div class="card" data-id="${p.id}" style="animation-delay:${Math.min(index, 6) * 60}ms">
        <div class="card-img-wrap">
            <img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" loading="lazy">
            <div class="card-img-scrim"></div>
            ${category ? `<span class="card-tag">${escapeHTML(category)}</span>` : ""}
            <button class="wishlist-btn ${wished ? "active" : ""}" data-id="${p.id}" aria-label="Favorit" type="button">
                <i class="fa-solid fa-heart"></i>
            </button>
        </div>
        <div class="card-content">
            <h3>${escapeHTML(p.name)}</h3>
            <p>${escapeHTML(p.shortDesc)}</p>
            <span class="card-sold"><i class="fa-solid fa-fire"></i> ${Number(p.itemsSold || 0).toLocaleString("id-ID")} Terjual</span>
            <div class="card-footer">
                <div class="card-price">
                    <span class="card-price-label">Harga</span>
                    <span class="price">${formatPrice(p.price)}</span>
                </div>
                <button
                    class="buy"
                    data-name="${escapeHTML(p.name)}"
                    data-price="${p.price}"
                    data-id="${p.id}">
                    <span>Buy</span><i class="fa-solid fa-arrow-right"></i>
                </button>
            </div>
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

            ${galleryHTML(product)}

            <h4>Detail Produk</h4>
            <p>${escapeHTML(product.detail || "Belum ada detail untuk produk ini.").replace(/\n/g, "<br>")}</p>

            <h4>Tips Penggunaan</h4>
            <p>${escapeHTML(product.tips || "Belum ada tips untuk produk ini.").replace(/\n/g, "<br>")}</p>

            <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:15px;">
                <button
                    class="btn btn-primary buy-modal-btn"
                    data-name="${escapeHTML(product.name)}"
                    data-price="${product.price}">
                    Buy Now
                </button>
                <a href="product.html?id=${encodeURIComponent(product.id)}" class="btn btn-outline" style="color:#fff;border-color:rgba(255,255,255,.3);">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i> Buka Halaman Produk
                </a>
            </div>
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
// AMBIL 1 PRODUK LEWAT ID (dipakai oleh halaman detail product.html
// supaya produk bisa dibuka lewat link langsung/dibagikan)
// ==============================================================
export async function getProductById(id) {
    if (!id) return null;
    const snap = await getDoc(doc(db, "products", id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
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
