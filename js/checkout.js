import { sendTelegramNotification } from "./telegram.js";

import { db } from "./firebase.js";

import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const form = document.getElementById("checkoutForm");

// ==============================================================
// ANTI-SPAM: Honeypot + Rate Limit + Cloudflare Turnstile (CAPTCHA)
// ==============================================================
const RATE_LIMIT_KEY = "startone_last_checkout";
const RATE_LIMIT_SECONDS = 30; // jeda minimum antar submit dari browser yang sama

function checkRateLimit() {
    const last = Number(localStorage.getItem(RATE_LIMIT_KEY) || 0);
    const now = Date.now();
    const diffSeconds = (now - last) / 1000;

    if (diffSeconds < RATE_LIMIT_SECONDS) {
        const remaining = Math.ceil(RATE_LIMIT_SECONDS - diffSeconds);
        alert(`Mohon tunggu ${remaining} detik lagi sebelum mencoba checkout kembali.`);
        return false;
    }
    return true;
}

// ==============================================================
// VALIDASI INPUT
// Sebelumnya form hanya mengandalkan HTML5 required/type, sekarang
// ditambah validasi eksplisit supaya data yang masuk ke database
// lebih bersih dan tidak mudah dimanipulasi lewat DevTools.
// ==============================================================
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+ -]{9,15}$/;

function validateCheckoutInput({ firstName, lastName, email, phone, product, price }) {
    if (!firstName || firstName.trim().length === 0) {
        return "Nama depan wajib diisi.";
    }
    if (!lastName || lastName.trim().length === 0) {
        return "Nama belakang wajib diisi.";
    }
    if (!email || !EMAIL_REGEX.test(email.trim())) {
        return "Format email tidak valid.";
    }
    if (!phone || !PHONE_REGEX.test(phone.trim())) {
        return "Format nomor telepon tidak valid (9-15 digit, boleh diawali +).";
    }
    if (!product || product.trim().length === 0) {
        return "Produk tidak ditemukan. Silakan pilih produk kembali dari halaman Shop.";
    }
    if (!Number.isFinite(price) || price <= 0) {
        return "Harga produk tidak valid. Silakan pilih produk kembali dari halaman Shop.";
    }
    return null; // valid
}

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    // 1. Honeypot: kalau field jebakan terisi, submission dianggap bot -> hentikan diam-diam
    const honeypot = document.getElementById("website");
    if (honeypot && honeypot.value.trim() !== "") {
        console.warn("Honeypot terisi, submission diblokir.");
        return;
    }

    // 2. Rate limit sisi klien (mencegah spam order berulang-ulang cepat)
    if (!checkRateLimit()) return;

    // 3. Verifikasi Cloudflare Turnstile (CAPTCHA) sudah diselesaikan
    const turnstileResponse = document.querySelector('[name="cf-turnstile-response"]')?.value;
    if (typeof turnstile !== "undefined" && !turnstileResponse) {
        alert("Mohon selesaikan verifikasi keamanan (centang captcha) sebelum lanjut.");
        return;
    }

    const firstName = document.getElementById("firstName").value;
    const lastName = document.getElementById("lastName").value;
    const email = document.getElementById("customerEmail").value;
    const phone = document.getElementById("customerPhone").value;

    const product = localStorage.getItem("productName");
    const price = Number(localStorage.getItem("productPrice"));
    const productId = localStorage.getItem("productId") || "";

    // 4. Validasi data sebelum dikirim ke database
    const validationError = validateCheckoutInput({ firstName, lastName, email, phone, product, price });
    if (validationError) {
        alert(validationError);
        return;
    }

    const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
    const loadingScreen = document.getElementById("loadingScreen");
    if (loadingScreen) loadingScreen.style.display = "flex";
    if (submitBtn) submitBtn.disabled = true;

    try {

        // 5. Minta nomor invoice ke server (Cloudflare Function) alih-alih
        //    membaca seluruh koleksi "orders" langsung dari browser.
        //    Ini menutup celah kebocoran data pelanggan lain.
        const invoiceRes = await fetch("/api/next-invoice", { method: "POST" });
        const invoiceResult = await invoiceRes.json().catch(() => ({}));

        if (!invoiceRes.ok || !invoiceResult.success || !invoiceResult.invoiceNumber) {
            throw new Error(invoiceResult.error || "Gagal membuat nomor invoice. Silakan coba lagi.");
        }

        const invoiceNumber = invoiceResult.invoiceNumber;

        // 6. Simpan order dengan ID dokumen = nomor invoice itu sendiri.
        //    Ini membuat halaman Tracking bisa mengambil 1 order lewat ID
        //    langsung (get), bukan query yang membutuhkan akses baca ke
        //    seluruh koleksi (list) — lebih aman untuk data pelanggan lain.
        await setDoc(doc(db, "orders", invoiceNumber), {
            invoiceNumber,
            customerName: firstName.trim() + " " + lastName.trim(),
            email: email.trim(),
            phone: phone.trim(),
            product,
            productId,
            price,
            status: "waiting",
            downloadReady: false,
            downloadURL: "",
            createdAt: serverTimestamp()
        });

        await sendTelegramNotification({
            title: "🛒 ORDER BARU",
            name: firstName.trim() + " " + lastName.trim(),
            email: email.trim(),
            product: product,
            total: "Rp " + price.toLocaleString("id-ID"),
            invoice: invoiceNumber
        });

        localStorage.setItem("orderID", invoiceNumber);
        localStorage.setItem(RATE_LIMIT_KEY, String(Date.now()));

        window.location.href = "payment.html";

    } catch (error) {

        console.error(error);
        alert(error.message || "Terjadi kesalahan saat memproses order. Silakan coba lagi.");

        if (loadingScreen) loadingScreen.style.display = "none";
        if (submitBtn) submitBtn.disabled = false;
    }

});
