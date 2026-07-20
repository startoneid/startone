// ==============================================================
// CLOUDFLARE PAGES FUNCTION — Generate Nomor Invoice
// ==============================================================
// Endpoint: POST /api/next-invoice
//
// KENAPA FUNGSI INI ADA:
// Sebelumnya, checkout.js mengambil SELURUH isi koleksi "orders"
// langsung dari browser pengunjung (getDocs(collection(db,"orders")))
// hanya untuk menghitung urutan invoice hari ini. Ini artinya nama,
// email, nomor HP, bahkan bukti pembayaran SEMUA pelanggan bisa
// terbaca oleh siapa saja yang membuka halaman checkout.html dan
// membuka DevTools/Network tab — kebocoran data yang serius.
//
// Fungsi ini memindahkan penghitungan nomor urut ke server (Cloudflare
// Function), memakai dokumen counter terpisah ("invoiceCounters") yang
// TIDAK berisi data pribadi apapun. Browser pengunjung tidak lagi perlu
// (dan tidak diberi izin oleh Firestore Security Rules) membaca koleksi
// "orders" sama sekali untuk proses ini.
//
// Nomor invoice juga diberi akhiran acak (random suffix) supaya tidak
// mudah ditebak/di-enumerasi secara berurutan (mis. STR-19072026-0001,
// 0002, 0003, ...) oleh pihak luar.
// ==============================================================

const FIREBASE_PROJECT_ID = "startone-d8aee";
const FIREBASE_API_KEY = "AIzaSyCe_fBo7M-2kROpNPpMfnI6qbZPXfHj8dE";
const FIRESTORE_BASE_URL =
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

function pad(num, len) {
    return String(num).padStart(len, "0");
}

function randomSuffix(length = 4) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // tanpa 0/O/1/I biar tidak rancu
    let out = "";
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i++) {
        out += chars[bytes[i] % chars.length];
    }
    return out;
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" }
    });
}

export async function onRequestPost() {
    try {
        const today = new Date();
        const day = pad(today.getDate(), 2);
        const month = pad(today.getMonth() + 1, 2);
        const year = today.getFullYear();
        const dateString = `${day}${month}${year}`;

        const counterPath = `invoiceCounters/${dateString}`;
        const counterURL = `${FIRESTORE_BASE_URL}/${counterPath}?key=${FIREBASE_API_KEY}`;

        // 1. Ambil counter hari ini (kalau belum ada, anggap 0)
        let currentCount = 0;
        const getRes = await fetch(counterURL);

        if (getRes.ok) {
            const data = await getRes.json();
            currentCount = Number(data.fields?.count?.integerValue || 0);
        } else if (getRes.status !== 404) {
            throw new Error("Gagal membaca counter invoice (status " + getRes.status + ")");
        }

        const nextCount = currentCount + 1;

        // 2. Simpan counter baru (PATCH otomatis membuat dokumen jika belum ada)
        const patchRes = await fetch(counterURL, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fields: {
                    count: { integerValue: String(nextCount) },
                    updatedDate: { stringValue: dateString }
                }
            })
        });

        if (!patchRes.ok) {
            const errText = await patchRes.text().catch(() => "");
            throw new Error("Gagal menyimpan counter invoice: " + errText);
        }

        const queueNumber = pad(nextCount, 4);
        const suffix = randomSuffix(4);
        const invoiceNumber = `STR-${dateString}-${queueNumber}-${suffix}`;

        return jsonResponse({ success: true, invoiceNumber });

    } catch (error) {
        return jsonResponse({ success: false, error: error.message }, 500);
    }
}
