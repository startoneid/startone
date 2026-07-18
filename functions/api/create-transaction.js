// ==============================================================
// CLOUDFLARE PAGES FUNCTION — Buat Invoice Xendit
// ==============================================================
// Endpoint: POST /api/create-transaction
// Dipanggil dari halaman payment.html saat pembeli klik
// "Bayar Otomatis". Fungsi ini membuat invoice pembayaran di Xendit
// (bisa QRIS, e-wallet [OVO/DANA/ShopeePay/LinkAja], Virtual Account
// bank, kartu kredit — semua otomatis terverifikasi tanpa admin
// perlu cek manual) dan mengarahkan pembeli ke halaman pembayaran
// hosted Xendit.
//
// KENAPA XENDIT (bukan Midtrans)?
// Xendit bisa didaftar sebagai akun "Individual/Perorangan" tanpa
// perlu nomor telepon bisnis/badan usaha — cocok untuk kamu yang
// belum punya nomor bisnis terpisah.
//
// CARA SETUP (wajib sebelum tombol "Bayar Otomatis" aktif):
// 1. Daftar gratis di https://dashboard.xendit.co/register
//    Saat proses onboarding, pilih tipe akun "Individual/Perorangan"
//    (bukan "Business") supaya tidak diminta nomor telepon bisnis.
// 2. Setelah masuk dashboard, mulai di mode **Test/Sandbox** dulu:
//    Settings -> Developers -> API Keys -> salin "Secret Key" (test mode).
// 3. Di Cloudflare Pages dashboard project kamu:
//    Settings -> Environment variables -> tambahkan:
//       XENDIT_SECRET_KEY = (Secret Key dari Xendit, mode test dulu)
// 4. Redeploy project.
// 5. Di dashboard Xendit: Settings -> Developers -> Webhooks, tambahkan:
//       URL   : https://startone.pages.dev/api/xendit-notification
//       Event : Invoice Paid
//    lalu salin "Verification Token" dan tambahkan juga sebagai
//    environment variable:
//       XENDIT_CALLBACK_TOKEN = (Verification Token dari Xendit)
// 6. Kalau sudah yakin semua jalan lancar di mode Test, ajukan aktivasi
//    akun (KYC) di dashboard Xendit untuk pindah ke mode Live, lalu
//    ganti XENDIT_SECRET_KEY dengan Secret Key mode Live.
//
// Selama XENDIT_SECRET_KEY belum diisi, endpoint ini akan
// mengembalikan error yang jelas dan tombol otomatis di halaman
// payment akan menyarankan pakai metode QRIS manual sebagai gantinya.
// ==============================================================

export async function onRequestPost({ request, env }) {
    try {
        const body = await request.json();
        const { orderId, invoiceNumber, price, customerName, email } = body;

        if (!orderId || !price) {
            return jsonResponse({ success: false, error: "Data transaksi tidak lengkap." }, 400);
        }

        if (!env.XENDIT_SECRET_KEY) {
            return jsonResponse({
                success: false,
                error: "XENDIT_SECRET_KEY belum di-setup di Environment Variables Cloudflare Pages. Silakan gunakan metode QRIS manual untuk sementara."
            }, 200);
        }

        const authString = btoa(`${env.XENDIT_SECRET_KEY}:`);
        const origin = new URL(request.url).origin;

        // external_id Xendit harus unik tiap percobaan transaksi
        const externalId = `${invoiceNumber || orderId}-${Date.now()}`;

        const xenditBody = {
            external_id: externalId,
            amount: Math.round(Number(price)),
            payer_email: email || undefined,
            description: `Pembayaran StarTone - Invoice ${invoiceNumber || orderId}`,
            customer: {
                given_names: customerName || "Pelanggan"
            },
            success_redirect_url: `${origin}/payment.html`,
            failure_redirect_url: `${origin}/payment.html`,
            currency: "IDR"
        };

        const response = await fetch("https://api.xendit.co/v2/invoices", {
            method: "POST",
            headers: {
                "Authorization": `Basic ${authString}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(xenditBody)
        });

        const result = await response.json();

        if (!response.ok) {
            return jsonResponse({ success: false, error: result }, 200);
        }

        return jsonResponse({
            success: true,
            invoice_url: result.invoice_url,
            invoice_id: result.id
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
