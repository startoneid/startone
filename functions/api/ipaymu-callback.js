// ==============================================================
// CLOUDFLARE PAGES FUNCTION — Callback / Notify Pembayaran iPaymu
// ==============================================================
// Endpoint: POST /api/ipaymu-callback
//
// iPaymu akan memanggil endpoint ini secara otomatis (server-ke-server,
// bukan dari browser pembeli) setiap kali status transaksi berubah.
//
// KEAMANAN: fungsi ini TIDAK langsung percaya isi notifikasi yang masuk.
// Sebelum menandai order sebagai "verified", fungsi ini mengecek ULANG
// status transaksi tersebut LANGSUNG ke server iPaymu (Check Transaction
// API) memakai VA + API Key kamu sendiri. Ini mencegah orang lain
// memalsukan panggilan ke endpoint ini untuk mendapat produk gratis.
//
// Begitu status pembayaran terkonfirmasi ASLI dan berhasil:
// 1. Order di Firestore otomatis diubah ke status "verified"
//    (Admin TIDAK perlu klik "Verifikasi" manual lagi untuk order iPaymu).
// 2. Link download diambil otomatis dari koleksi "productSecrets".
// 3. Email konfirmasi otomatis dikirim ke pembeli lewat /api/send-email.
// 4. Notifikasi Telegram otomatis dikirim ke admin.
//
// SETUP WAJIB (Environment Variables di Cloudflare Pages — lihat
// PANDUAN-SETUP.md untuk cara mendapatkan semuanya):
//   IPAYMU_VA                      = sama dengan di ipaymu-create.js
//   IPAYMU_API_KEY                 = sama dengan di ipaymu-create.js
//   IPAYMU_MODE                    = "sandbox" atau "production"
//   IPAYMU_CALLBACK_TOKEN          = sama dengan di ipaymu-create.js
//   FIREBASE_SERVICE_ACCOUNT_EMAIL = "client_email" dari file JSON Service Account Firebase
//   FIREBASE_SERVICE_ACCOUNT_KEY   = "private_key" dari file JSON Service Account Firebase
//                                    (paste apa adanya, termasuk -----BEGIN PRIVATE KEY-----)
//
// CATATAN JUJUR: dokumentasi publik iPaymu untuk nama field notify &
// Check Transaction API tidak selalu konsisten antar versi. Kode di
// bawah sudah dibuat fleksibel (mencoba beberapa kemungkinan nama
// field), tapi SANGAT disarankan untuk diuji dulu di mode sandbox +
// dicek log real-time Cloudflare Function-nya, supaya kalau ada nama
// field yang meleset, gampang disesuaikan.
// ==============================================================

const FIREBASE_PROJECT_ID = "startone-d8aee";
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;
const TELEGRAM_WORKER_URL = "https://startone-notification.startone-id.workers.dev";

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

// -------------------- Cek ulang status transaksi LANGSUNG ke iPaymu --------------------
async function verifyTransactionWithIpaymu(trxId, env) {
    const isProduction = (env.IPAYMU_MODE || "sandbox").toLowerCase() === "production";
    const baseUrl = isProduction ? "https://my.ipaymu.com" : "https://sandbox.ipaymu.com";
    const va = env.IPAYMU_VA;
    const apiKey = env.IPAYMU_API_KEY;

    const body = { transactionId: String(trxId) };
    const bodyString = JSON.stringify(body);
    const bodyHash = (await sha256Hex(bodyString)).toLowerCase();
    const stringToSign = `POST:${va}:${bodyHash}:${apiKey}`;
    const signature = await hmacSha256Hex(stringToSign, apiKey);

    const res = await fetch(`${baseUrl}/api/v2/transaction`, {
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

    const result = await res.json().catch(() => ({}));
    const data = result?.Data || {};

    const statusText = String(data.Status ?? data.status ?? data.StatusDesc ?? data.statusDesc ?? "").toLowerCase();
    const isPaid = statusText.includes("berhasil") || statusText.includes("success") || statusText === "1" || data.Status === 1;

    return { isPaid, raw: result };
}

// -------------------- Auth Google (Service Account) untuk akses Firestore --------------------
// Dipakai supaya fungsi ini punya akses PENUH ke Firestore (melewati
// Security Rules) tanpa perlu melonggarkan rules untuk pengunjung biasa.
function pemToArrayBuffer(pem) {
    const b64 = pem
        .replace(/-----BEGIN PRIVATE KEY-----/, "")
        .replace(/-----END PRIVATE KEY-----/, "")
        .replace(/\s/g, "");
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
}

function base64url(input) {
    const str = typeof input === "string"
        ? btoa(input)
        : btoa(String.fromCharCode(...new Uint8Array(input)));
    return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getGoogleAccessToken(env) {
    const email = env.FIREBASE_SERVICE_ACCOUNT_EMAIL;
    const privateKeyPem = env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (!email || !privateKeyPem) {
        throw new Error("FIREBASE_SERVICE_ACCOUNT_EMAIL / FIREBASE_SERVICE_ACCOUNT_KEY belum di-setup di Cloudflare Pages.");
    }

    const header = { alg: "RS256", typ: "JWT" };
    const now = Math.floor(Date.now() / 1000);
    const claim = {
        iss: email,
        scope: "https://www.googleapis.com/auth/datastore",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600
    };

    const encHeader = base64url(JSON.stringify(header));
    const encClaim = base64url(JSON.stringify(claim));
    const unsigned = `${encHeader}.${encClaim}`;

    const keyData = pemToArrayBuffer(privateKeyPem.replace(/\\n/g, "\n"));
    const cryptoKey = await crypto.subtle.importKey(
        "pkcs8", keyData, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(unsigned)
    );
    const jwt = `${unsigned}.${base64url(signatureBuffer)}`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${jwt}`
    });

    const tokenData = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || !tokenData.access_token) {
        throw new Error("Gagal mendapatkan Google Access Token: " + JSON.stringify(tokenData));
    }
    return tokenData.access_token;
}

// -------------------- Helper konversi format Firestore REST <-> objek biasa --------------------
function fsValueToJs(value) {
    if (value == null) return null;
    if ("stringValue" in value) return value.stringValue;
    if ("integerValue" in value) return Number(value.integerValue);
    if ("doubleValue" in value) return Number(value.doubleValue);
    if ("booleanValue" in value) return value.booleanValue;
    return null;
}

function fsDocToJs(doc) {
    const out = {};
    const fields = doc?.fields || {};
    for (const key in fields) out[key] = fsValueToJs(fields[key]);
    return out;
}

function jsToFsValue(value) {
    if (typeof value === "string") return { stringValue: value };
    if (typeof value === "number") {
        return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
    }
    if (typeof value === "boolean") return { booleanValue: value };
    return { stringValue: String(value) };
}

async function firestoreGet(path, accessToken) {
    const res = await fetch(`${FIRESTORE_BASE_URL}/${path}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!res.ok) return null;
    return await res.json();
}

async function firestorePatch(path, fieldsObj, accessToken) {
    const fields = {};
    for (const key in fieldsObj) fields[key] = jsToFsValue(fieldsObj[key]);

    const maskParams = Object.keys(fieldsObj)
        .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
        .join("&");

    const res = await fetch(`${FIRESTORE_BASE_URL}/${path}?${maskParams}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ fields })
    });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
}

// -------------------- Link download fallback produk lama --------------------
// Sama seperti fallback di Admin/admin.js, untuk order produk lama yang
// belum sempat diisi field downloadURL-nya di koleksi productSecrets.
function legacyDownloadURL(productName) {
    if (productName === "Summer Tone") return "https://drive.google.com/file/d/1sFhbUASwvK7Qvn75zmkxohk2jDgWJFr7/view?usp=sharing";
    if (productName === "Korean Collection") return "downloads/korean-collection.zip";
    if (productName === "Cinematic Collection") return "downloads/cinematic-collection.zip";
    return "";
}

export async function onRequestPost({ request, env }) {
    try {
        // 1. Validasi token rahasia (mencegah endpoint ini dipanggil sembarang orang)
        const url = new URL(request.url);
        if (env.IPAYMU_CALLBACK_TOKEN) {
            const token = url.searchParams.get("token");
            if (token !== env.IPAYMU_CALLBACK_TOKEN) {
                return jsonResponse({ success: false, error: "Token callback tidak valid." }, 401);
            }
        }

        // 2. Ambil data notifikasi (iPaymu bisa mengirim form-urlencoded atau JSON)
        let payload = {};
        const contentType = request.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            payload = await request.json().catch(() => ({}));
        } else {
            const form = await request.formData().catch(() => null);
            if (form) form.forEach((v, k) => { payload[k] = v; });
        }

        const trxId = payload.trx_id || payload.trxId || payload.sid || payload.SessionID;
        const referenceId = payload.reference_id || payload.referenceId;

        if (!trxId || !referenceId) {
            return jsonResponse({ success: false, error: "Data notifikasi tidak lengkap.", payload }, 400);
        }

        // 3. Cek ulang status transaksi LANGSUNG ke server iPaymu (jangan percaya body notify begitu saja)
        const { isPaid, raw } = await verifyTransactionWithIpaymu(trxId, env);

        if (!isPaid) {
            return jsonResponse({ success: true, message: "Status belum berhasil, tidak ada perubahan.", raw });
        }

        // 4. Ambil Google Access Token (Service Account) untuk akses Firestore penuh
        const accessToken = await getGoogleAccessToken(env);

        // 5. Ambil data order dari Firestore
        const orderDoc = await firestoreGet(`orders/${referenceId}`, accessToken);
        if (!orderDoc) {
            return jsonResponse({ success: false, error: "Order tidak ditemukan: " + referenceId }, 404);
        }
        const order = fsDocToJs(orderDoc);

        // Kalau order ini sudah pernah diverifikasi sebelumnya (notify terpanggil 2x oleh iPaymu), hentikan di sini.
        if (order.status === "verified") {
            return jsonResponse({ success: true, message: "Order sudah diverifikasi sebelumnya." });
        }

        // 6. Ambil link download dari productSecrets (fallback ke link lama kalau belum diisi)
        let downloadURL = "";
        if (order.productId) {
            const secretDoc = await firestoreGet(`productSecrets/${order.productId}`, accessToken);
            if (secretDoc) downloadURL = fsDocToJs(secretDoc).downloadURL || "";
        }
        if (!downloadURL) downloadURL = legacyDownloadURL(order.product);

        // 7. Tandai order sebagai verified — otomatis, tanpa perlu Admin klik manual
        await firestorePatch(`orders/${referenceId}`, {
            status: "verified",
            downloadReady: true,
            downloadURL,
            paymentMethod: "ipaymu"
        }, accessToken);

        // 8. Kirim email konfirmasi otomatis ke pembeli
        if (order.email) {
            await fetch(`${url.origin}/api/send-email`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: order.email,
                    customerName: order.customerName,
                    product: order.product,
                    invoiceNumber: order.invoiceNumber || referenceId,
                    downloadURL
                })
            }).catch(() => {});
        }

        // 9. Kirim notifikasi Telegram ke admin
        fetch(TELEGRAM_WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: "✅ PEMBAYARAN BERHASIL (iPaymu)",
                name: order.customerName || "-",
                email: order.email || "-",
                phone: order.phone || "-",
                product: order.product || "-",
                total: "Rp " + Number(order.price || 0).toLocaleString("id-ID"),
                invoice: order.invoiceNumber || referenceId
            })
        }).catch(() => {});

        return jsonResponse({ success: true, message: "Order berhasil diverifikasi otomatis lewat iPaymu." });

    } catch (error) {
        return jsonResponse({ success: false, error: error.message }, 500);
    }
}
