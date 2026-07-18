import { sendTelegramNotification } from "./telegram.js";

import { db } from "./firebase.js";

import {
    collection,
    addDoc,
    serverTimestamp,
    getDocs
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

    document.getElementById("loadingScreen").style.display = "flex";

    const firstName = document.querySelectorAll("input")[0].value;
    const lastName = document.querySelectorAll("input")[1].value;
    const email = document.querySelectorAll("input")[2].value;
    const phone = document.querySelectorAll("input")[3].value;

    const product = localStorage.getItem("productName");
    const price = Number(localStorage.getItem("productPrice"));
    const productId = localStorage.getItem("productId") || "";
    // Membuat tanggal DDMMYYYY
const today = new Date();

const day = String(today.getDate()).padStart(2, "0");
const month = String(today.getMonth() + 1).padStart(2, "0");
const year = today.getFullYear();

const dateString = `${day}${month}${year}`;

    try {

        // Mengambil seluruh order
const snapshot = await getDocs(collection(db, "orders"));

// Menghitung jumlah order hari ini
let todayCount = 0;

snapshot.forEach(doc => {

    const data = doc.data();

    if (data.invoiceNumber &&
        data.invoiceNumber.includes(dateString)) {

        todayCount++;

    }

});

// Nomor urut 4 digit
const queueNumber =
String(todayCount + 1).padStart(4, "0");

// Invoice
const invoiceNumber =
`STR-${dateString}-${queueNumber}`;

    const docRef = await addDoc(collection(db, "orders"), {
        invoiceNumber,
        customerName: firstName + " " + lastName,
        email,
        phone,
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
    name: firstName + " " + lastName,
    email: email,
    product: product,
    total: "Rp " + price.toLocaleString("id-ID"),
    invoice: invoiceNumber
});

    localStorage.setItem("orderID", docRef.id);
    localStorage.setItem(RATE_LIMIT_KEY, String(Date.now()));

    alert("Order berhasil disimpan");
window.location.href = "payment.html";

} catch (error) {

    console.error(error);

    alert(error.message);

}

});

