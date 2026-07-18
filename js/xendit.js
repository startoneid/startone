// ==============================================================
// XENDIT.JS — Tombol "Bayar Otomatis" di halaman payment.html
// ==============================================================
// Alur:
// 1. Klik tombol -> panggil Cloudflare Pages Function /api/create-transaction
// 2. Dapat invoice_url dari Xendit
// 3. Pembeli diarahkan (redirect) ke halaman pembayaran hosted Xendit
//    (bisa pilih QRIS, e-wallet, Virtual Account, kartu, dst)
// 4. Setelah bayar, webhook /api/xendit-notification otomatis update
//    status order -> halaman payment.html ini akan realtime berubah
//    jadi "Pembayaran Berhasil" lewat listener yang sudah ada di payment.js
// ==============================================================

const autoPayBtn = document.getElementById("autoPayBtn");
const orderID = localStorage.getItem("orderID");

autoPayBtn?.addEventListener("click", async () => {

    autoPayBtn.disabled = true;
    autoPayBtn.textContent = "Menyiapkan metode pembayaran...";

    try {
        const invoiceNumber = document.getElementById("invoiceNumber")?.textContent;
        const product = localStorage.getItem("productName");
        const price = Number(localStorage.getItem("productPrice"));

        const response = await fetch("/api/create-transaction", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                orderId: orderID,
                invoiceNumber,
                price,
                product
            })
        });

        const result = await response.json();

        if (!result.success || !result.invoice_url) {
            alert(
                (result.error && typeof result.error === "string" ? result.error : null) ||
                "Pembayaran otomatis belum tersedia saat ini. Silakan gunakan QRIS manual di bawah."
            );
            autoPayBtn.disabled = false;
            autoPayBtn.textContent = "⚡ Bayar Otomatis (E-Wallet / VA / Kartu)";
            return;
        }

        // Arahkan pembeli ke halaman pembayaran hosted Xendit
        window.location.href = result.invoice_url;

    } catch (error) {
        console.error(error);
        alert("Gagal menghubungi layanan pembayaran. Silakan gunakan QRIS manual di bawah.");
        autoPayBtn.disabled = false;
        autoPayBtn.textContent = "⚡ Bayar Otomatis (E-Wallet / VA / Kartu)";
    }
});
