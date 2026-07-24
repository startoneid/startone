// ==============================================================
// CLOUDFLARE PAGES FUNCTION — Buat Transaksi Pembayaran iPaymu
// ==============================================================
// Endpoint: POST /api/ipaymu-create
//
// Dipanggil oleh checkout.js begitu order berhasil disimpan di Firestore.
// Fungsi ini membuat transaksi "Payment Redirect" ke iPaymu dan
// mengembalikan URL halaman pembayaran iPaymu — pembeli akan diarahkan
// ke sana untuk memilih metode bayar apa pun yang didukung iPaymu
// (Virtual Account, E-Wallet, QRIS, Transfer Bank, dll), semua
// ditangani otomatis oleh iPaymu, bukan lagi QRIS statis manual.
//
// SETUP WAJIB (Environment Variables di Cloudflare Pages — lihat
// PANDUAN-SETUP.md untuk cara mendapatkannya):
//   IPAYMU_VA             = Nomor VA akun iPaymu kamu
//   IPAYMU_API_KEY        = API Key akun iPaymu kamu
//   IPAYMU_MODE           = "sandbox" (untuk uji coba) atau "production" (transaksi asli)
//   IPAYMU_CALLBACK_TOKEN = kode rahasia buatan sendiri (harus SAMA dengan
//                           yang dipakai di functions/api/ipaymu-callback.js)
// ==============================================================

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" }
    });
}

async function sha256Hex(message) {
    const enc = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", enc);
    return [...new Uint8Array(hashBuffer)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256Hex(message, key) {
    const enc = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
        "raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const sigBuffer = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
    return [...new Uint8Array(sigBuffer)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function timestampNow() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

export async function onRequestPost({ request, env }) {
    try {
        if (!env.IPAYMU_VA || !env.IPAYMU_API_KEY) {
            return jsonResponse({
                success: false,
                error: "IPAYMU_VA / IPAYMU_API_KEY belum di-setup di Environment Variables Cloudflare Pages. Lihat PANDUAN-SETUP.md."
            }, 200);
        }

        const payload = await request.json().catch(() => ({}));
        const { invoiceNumber, product, price, customerName, email, phone } = payload;

        if (!invoiceNumber || !product || !price || !customerName || !email || !phone) {
            return jsonResponse({ success: false, error: "Data order tidak lengkap untuk membuat transaksi iPaymu." }, 400);
        }

        const origin = new URL(request.url).origin;
        const isProduction = (env.IPAYMU_MODE || "sandbox").toLowerCase() === "production";
        const baseUrl = isProduction ? "https://my.ipaymu.com" : "https://sandbox.ipaymu.com";
        const va = env.IPAYMU_VA;
        const apiKey = env.IPAYMU_API_KEY;

        const notifyUrl = env.IPAYMU_CALLBACK_TOKEN
            ? `${origin}/api/ipaymu-callback?token=${encodeURIComponent(env.IPAYMU_CALLBACK_TOKEN)}`
            : `${origin}/api/ipaymu-callback`;

        const body = {
            product: [String(product)],
            qty: [1],
            price: [Number(price)],
            returnUrl: `${origin}/payment-success.html`,
            cancelUrl: `${origin}/checkout.html`,
            notifyUrl,
            referenceId: String(invoiceNumber),
            buyerName: String(customerName),
            buyerEmail: String(email),
            buyerPhone: String(phone)
        };

        const bodyString = JSON.stringify(body);
        const bodyHash = (await sha256Hex(bodyString)).toLowerCase();
        const stringToSign = `POST:${va}:${bodyHash}:${apiKey}`;
        const signature = await hmacSha256Hex(stringToSign, apiKey);

        const ipaymuRes = await fetch(`${baseUrl}/api/v2/payment`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "va": va,
                "signature": signature,
                "timestamp": timestampNow()
            },
            body: bodyString
        });

        const result = await ipaymuRes.json().catch(() => ({}));
        const redirectUrl = result?.Data?.Url;

        if (!ipaymuRes.ok || !redirectUrl) {
            return jsonResponse({
                success: false,
                error: result?.Message || "Gagal membuat transaksi iPaymu. Cek kembali IPAYMU_VA/IPAYMU_API_KEY/IPAYMU_MODE.",
                raw: result
            }, 200);
        }

        return jsonResponse({
            success: true,
            url: redirectUrl,
            sessionId: result?.Data?.SessionID || null
        });

    } catch (error) {
        return jsonResponse({ success: false, error: error.message }, 500);
    }
}
