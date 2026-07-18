// ==============================================================
// CLOUDFLARE PAGES FUNCTION — Buat Transaksi Midtrans Snap
// ==============================================================
// Endpoint: POST /api/create-transaction
// Dipanggil dari halaman payment.html saat pembeli klik
// "Bayar Otomatis". Fungsi ini membuat transaksi di Midtrans dan
// mengembalikan Snap Token untuk memunculkan popup pembayaran
// (bisa QRIS, e-wallet, kartu, transfer bank — semua otomatis
// terverifikasi tanpa admin perlu cek manual).
//
// CARA SETUP (wajib sebelum tombol "Bayar Otomatis" aktif):
// 1. Daftar akun di https://midtrans.com (gratis, tanpa biaya bulanan,
//    hanya potongan per transaksi berhasil).
// 2. Ambil "Server Key" dari Settings -> Access Keys (pakai Sandbox
//    dulu untuk uji coba, baru pindah ke Production kalau sudah siap).
// 3. Di Cloudflare Pages dashboard project kamu:
//    Settings -> Environment variables -> tambahkan:
//       MIDTRANS_SERVER_KEY     = (Server Key dari Midtrans)
//       MIDTRANS_IS_PRODUCTION  = false   (ganti "true" kalau sudah live)
// 4. Redeploy project.
// 5. Di dashboard Midtrans, set juga "Payment Notification URL" ke:
//       https://startone.pages.dev/api/midtrans-notification
//    supaya status pembayaran otomatis ter-update di Firestore.
//
// Selama MIDTRANS_SERVER_KEY belum diisi, endpoint ini akan
// mengembalikan error yang jelas dan tombol otomatis di halaman
// payment akan menyarankan pakai metode QRIS manual sebagai gantinya.
// ==============================================================

export async function onRequestPost({ request, env }) {
    try {
        const body = await request.json();
        const { orderId, invoiceNumber, price, customerName, email, phone } = body;

        if (!orderId || !price) {
            return jsonResponse({ success: false, error: "Data transaksi tidak lengkap." }, 400);
        }

        if (!env.MIDTRANS_SERVER_KEY) {
            return jsonResponse({
                success: false,
                error: "MIDTRANS_SERVER_KEY belum di-setup di Environment Variables Cloudflare Pages. Silakan gunakan metode QRIS manual untuk sementara."
            }, 200);
        }

        const isProduction = env.MIDTRANS_IS_PRODUCTION === "true";
        const midtransURL = isProduction
            ? "https://app.midtrans.com/snap/v1/transactions"
            : "https://app.sandbox.midtrans.com/snap/v1/transactions";

        const authString = btoa(`${env.MIDTRANS_SERVER_KEY}:`);

        const nameParts = (customerName || "").split(" ");

        const midtransBody = {
            transaction_details: {
                // order_id Midtrans harus unik & berbeda tiap percobaan transaksi,
                // jadi kita tempel invoice + timestamp singkat.
                order_id: `${invoiceNumber || orderId}-${Date.now()}`,
                gross_amount: Math.round(Number(price))
            },
            customer_details: {
                first_name: nameParts[0] || "Pelanggan",
                last_name: nameParts.slice(1).join(" ") || "",
                email: email || undefined,
                phone: phone || undefined
            },
            credit_card: { secure: true }
        };

        const response = await fetch(midtransURL, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": `Basic ${authString}`
            },
            body: JSON.stringify(midtransBody)
        });

        const result = await response.json();

        if (!response.ok) {
            return jsonResponse({ success: false, error: result }, 200);
        }

        return jsonResponse({
            success: true,
            token: result.token,
            redirect_url: result.redirect_url
        });

    } catch (error) {
        return jsonResponse({ success: false, error: error.message }, 500);
    }
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" }
    });
}
