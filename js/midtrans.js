// ==============================================================
// MIDTRANS.JS — Tombol "Bayar Otomatis" di halaman payment.html
// ==============================================================
// Alur:
// 1. Klik tombol -> panggil Cloudflare Pages Function /api/create-transaction
// 2. Dapat Snap Token dari Midtrans
// 3. Tampilkan popup pembayaran Midtrans (Snap.js)
// 4. Kalau pembayaran sukses, webhook /api/midtrans-notification akan
//    otomatis update status order -> halaman ini akan realtime berubah
//    jadi "Pembayaran Berhasil" lewat listener yang sudah ada di payment.js
// ==============================================================

const autoPayBtn = document.getElementById("autoPayBtn");
const orderID = localStorage.getItem("orderID");

autoPayBtn?.addEventListener("click", async () => {

    if (typeof snap === "undefined") {
        alert("Layanan pembayaran otomatis belum siap (Midtrans Snap.js gagal dimuat). Silakan pakai QRIS manual di bawah.");
        return;
    }

    autoPayBtn.disabled = true;
    autoPayBtn.textContent = "Memuat metode pembayaran...";

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

        if (!result.success || !result.token) {
            alert(
                (result.error && typeof result.error === "string" ? result.error : null) ||
                "Pembayaran otomatis belum tersedia saat ini. Silakan gunakan QRIS manual di bawah."
            );
            autoPayBtn.disabled = false;
            autoPayBtn.textContent = "⚡ Bayar Otomatis (E-Wallet / VA / Kartu)";
            return;
        }

        snap.pay(result.token, {
            onSuccess: () => {
                alert("Pembayaran berhasil! Status akan otomatis diperbarui.");
            },
            onPending: () => {
                alert("Pembayaran kamu sedang diproses. Halaman ini akan update otomatis begitu selesai.");
            },
            onError: () => {
                alert("Terjadi kesalahan saat pembayaran. Silakan coba lagi atau gunakan QRIS manual.");
            },
            onClose: () => {
                autoPayBtn.disabled = false;
                autoPayBtn.textContent = "⚡ Bayar Otomatis (E-Wallet / VA / Kartu)";
            }
        });

    } catch (error) {
        console.error(error);
        alert("Gagal menghubungi layanan pembayaran. Silakan gunakan QRIS manual di bawah.");
        autoPayBtn.disabled = false;
        autoPayBtn.textContent = "⚡ Bayar Otomatis (E-Wallet / VA / Kartu)";
    }
});
