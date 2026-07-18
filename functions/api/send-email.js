// ==============================================================
// CLOUDFLARE PAGES FUNCTION — Kirim Email Konfirmasi Order
// ==============================================================
// Endpoint: POST /api/send-email
// Dipanggil otomatis oleh Admin panel setelah order diverifikasi secara
// manual (Admin klik tombol "Verifikasi").
//
// CARA SETUP (wajib sebelum fitur ini aktif):
// 1. Daftar gratis di https://resend.com
// 2. Verifikasi domain email kamu (atau pakai domain testing bawaan Resend
//    untuk uji coba awal).
// 3. Ambil API Key dari dashboard Resend.
// 4. Di Cloudflare Pages dashboard project kamu:
//    Settings -> Environment variables -> tambahkan:
//       RESEND_API_KEY   = (API key dari Resend)
//       SENDER_EMAIL     = (email pengirim, contoh: noreply@startone.id)
// 5. Redeploy project. Selesai — email akan otomatis terkirim.
//
// Selama RESEND_API_KEY belum diisi, fungsi ini akan mengembalikan
// { success:false } tapi TIDAK membuat proses verifikasi order gagal
// (Admin panel akan tetap jalan normal, cuma email tidak terkirim).
// ==============================================================

export async function onRequestPost({ request, env }) {
    try {
        const body = await request.json();
        const { email, customerName, product, invoiceNumber, downloadURL } = body;

        if (!email) {
            return jsonResponse({ success: false, error: "Email tujuan kosong." }, 400);
        }

        if (!env.RESEND_API_KEY) {
            return jsonResponse({
                success: false,
                error: "RESEND_API_KEY belum di-setup di Environment Variables Cloudflare Pages."
            }, 200);
        }

        const senderEmail = env.SENDER_EMAIL || "onboarding@resend.dev";

        const htmlBody = `
            <div style="font-family:sans-serif;background:#28282B;color:#fff;padding:30px;border-radius:16px;max-width:520px;margin:auto;">
                <h2 style="color:#FFD166;">Pembayaran Berhasil! 🎉</h2>
                <p>Halo <strong>${escapeHtml(customerName || "")}</strong>,</p>
                <p>Terima kasih sudah berbelanja di <strong>StarTone</strong>. Pesananmu untuk produk <strong>${escapeHtml(product || "")}</strong> sudah kami verifikasi.</p>
                <p><strong>Nomor Invoice:</strong> ${escapeHtml(invoiceNumber || "-")}</p>
                ${downloadURL ? `<p style="margin-top:20px;"><a href="${escapeHtml(downloadURL)}" style="background:#FFD166;color:#222;padding:12px 26px;border-radius:30px;text-decoration:none;font-weight:bold;display:inline-block;">Download Preset</a></p>` : ""}
                <p style="margin-top:25px;color:#aaa;font-size:13px;">Simpan email ini sebagai bukti pembelian. Kalau ada kendala, balas email ini atau hubungi kami lewat Instagram @startone.id.</p>
            </div>
        `;

        const resendResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${env.RESEND_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                from: `StarTone <${senderEmail}>`,
                to: [email],
                subject: `Pesananmu (${invoiceNumber || ""}) sudah siap diunduh — StarTone`,
                html: htmlBody
            })
        });

        const result = await resendResponse.json();

        if (!resendResponse.ok) {
            return jsonResponse({ success: false, error: result }, 200);
        }

        return jsonResponse({ success: true, id: result.id });

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

function escapeHtml(str) {
    return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}
