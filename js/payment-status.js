import { db } from "./firebase.js";

import {
    doc,
    onSnapshot
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==============================================================
// STATUS PEMBAYARAN — Realtime (pengganti js/payment.js lama)
// ==============================================================
// Sebelumnya file ini juga mengurus upload bukti transfer manual
// (QRIS). Sekarang verifikasi pembayaran dilakukan otomatis oleh
// server lewat /api/ipaymu-callback begitu iPaymu mengonfirmasi
// pembayaran, jadi halaman ini hanya perlu mendengarkan (listen)
// perubahan status order secara realtime dan menampilkannya.
// ==============================================================

const orderID = localStorage.getItem("orderID");
const statusText = document.getElementById("paymentStatus");
const downloadBtn = document.getElementById("downloadBtn");

if (!orderID) {
    alert("Order tidak ditemukan");
    window.location.href = "checkout.html";
    throw new Error("Order kosong");
}

const orderRef = doc(db, "orders", orderID);

onSnapshot(orderRef, (snapshot) => {
    const data = snapshot.data();
    if (!data) return;

    document.getElementById("invoiceNumber").textContent = data.invoiceNumber || "-";

    switch (data.status) {

        case "waiting":
            statusText.innerHTML = "🟡 Menunggu Pembayaran";
            break;

        case "verified":
            statusText.innerHTML = "🟢 Pembayaran Berhasil";
            downloadBtn.style.display = "block";
            downloadBtn.href = data.downloadURL;
            break;

        case "rejected":
            statusText.innerHTML = "🔴 Pembayaran Gagal / Dibatalkan";
            break;

        default:
            statusText.innerHTML = "🟡 Menunggu Pembayaran";
    }
});

window.copyInvoice = async () => {
    const invoice = document.getElementById("invoiceNumber").textContent;
    try {
        await navigator.clipboard.writeText(invoice);
        alert("Invoice berhasil disalin.");
    } catch (error) {
        console.error(error);
        alert("Gagal menyalin invoice.");
    }
};
