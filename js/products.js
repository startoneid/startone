// ==============================================================
// PRODUCTS.JS
// Mengambil data produk dari Firestore (koleksi "products") secara
// realtime, lalu menampilkannya di Featured Collections.
// Juga menangani modal detail & tips saat kartu produk diklik.
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

// Cache lokal supaya saat kartu diklik kita tidak perlu fetch ulang
let productsCache = [];

function formatPrice(price) {
    return "Rp" + Number(price || 0).toLocaleString("id-ID");
}

function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
}

function renderProducts(products) {
    if (!grid) return;

    if (products.length === 0) {
        grid.innerHTML = `
            <p style="grid-column:1/-1;text-align:center;color:#bbb;">
                Belum ada produk tersedia saat ini.
            </p>
        `;
        return;
    }

    grid.innerHTML = products.map(p => `
        <div class="card" data-id="${p.id}">
            <img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}">
            <div class="card-content">
                <h3>${escapeHTML(p.name)}</h3>
                <p>${escapeHTML(p.shortDesc)}</p>
                <div class="price">${formatPrice(p.price)}</div>
                <button
                    class="buy"
                    data-name="${escapeHTML(p.name)}"
                    data-price="${p.price}">
                    Buy Now
                </button>
            </div>
        </div>
    `).join("");
}

// ==============================================================
// REALTIME LISTENER
// ==============================================================
const productsQuery = query(collection(db, "products"), orderBy("order", "asc"));

onSnapshot(productsQuery, (snapshot) => {
    productsCache = [];

    snapshot.forEach((docSnap) => {
        productsCache.push({ id: docSnap.id, ...docSnap.data() });
    });

    renderProducts(productsCache);

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
// KLIK KARTU -> BUKA MODAL DETAIL & TIPS
// KLIK TOMBOL "BUY NOW" -> LANGSUNG KE ALUR CHECKOUT (tidak buka modal)
// ==============================================================
if (grid) {
    grid.addEventListener("click", (e) => {

        const buyBtn = e.target.closest(".buy");
        if (buyBtn) {
            e.stopPropagation();
            window.buyProduct(buyBtn.dataset.name, Number(buyBtn.dataset.price));
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
        window.buyProduct(product.name, product.price);
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
