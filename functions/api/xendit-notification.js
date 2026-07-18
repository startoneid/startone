// ==============================================================
// CLOUDFLARE PAGES FUNCTION — Webhook Notifikasi Xendit
// ==============================================================
// Endpoint: POST /api/xendit-notification
// Didaftarkan di dashboard Xendit sebagai Webhook URL untuk event
// "Invoice Paid". Setiap kali pembeli berhasil membayar, Xendit
// otomatis mengirim data ke sini, lalu fungsi ini:
//   1. Memverifikasi keaslian webhook (x-callback-token)
//   2. Mencari order terkait di Firestore lewat invoiceNumber
//   3. Mengambil link download dari data produk terkait
//   4. Update status order jadi "verified" + downloadURL otomatis
//   5. Mengirim email konfirmasi otomatis ke pembeli
//
// Setup: lihat komentar di functions/api/create-transaction.js dan
// PANDUAN-SETUP.md untuk langkah lengkap.
// ==============================================================

const FIREBASE_PROJECT_ID = "startone-d8aee";
const FIREBASE_API_KEY = "AIzaSyCe_fBo7M-2kROpNPpMfnI6qbZPXfHj8dE";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

export async function onRequestPost({ request, env }) {
    try {
        if (!env.XENDIT_CALLBACK_TOKEN) {
            return jsonResponse({ success: false, error: "XENDIT_CALLBACK_TOKEN belum di-setup." }, 200);
        }

        // 1. Verifikasi token webhook supaya notifikasi benar-benar dari Xendit,
        //    bukan dari pihak lain yang mencoba memalsukan status "berhasil".
        const incomingToken = request.headers.get("x-callback-token");
        if (incomingToken !== env.XENDIT_CALLBACK_TOKEN) {
            return jsonResponse({ success: false, error: "Callback token tidak valid." }, 403);
        }

        const notification = await request.json();
        const { external_id: externalId, status } = notification;

        // 2. Hanya proses kalau pembayaran benar-benar sukses
        if (status !== "PAID" && status !== "SETTLED") {
            return jsonResponse({ success: true, info: `Status "${status}" diabaikan.` });
        }

        // external_id yang kita kirim saat create-transaction formatnya:
        // "{invoiceNumber}-{timestamp}" -> ambil invoiceNumber-nya lagi
        const invoiceNumber = externalId.substring(0, externalId.lastIndexOf("-"));

        // 3. Cari dokumen order berdasarkan invoiceNumber
        const queryResponse = await fetch(
            `${FIRESTORE_BASE}:runQuery?key=${FIREBASE_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    structuredQuery: {
                        from: [{ collectionId: "orders" }],
                        where: {
                            fieldFilter: {
                                field: { fieldPath: "invoiceNumber" },
                                op: "EQUAL",
                                value: { stringValue: invoiceNumber }
                            }
                        },
                        limit: 1
                    }
                })
            }
        );

        const queryResult = await queryResponse.json();
        const match = queryResult.find(r => r.document);

        if (!match) {
            return jsonResponse({ success: false, error: `Order dengan invoice ${invoiceNumber} tidak ditemukan.` }, 200);
        }

        const orderDoc = match.document;
        const orderFields = orderDoc.fields;
        const orderDocPath = orderDoc.name; // path lengkap dokumen
        const productId = orderFields.productId?.stringValue || "";

        // 4. Ambil link download dari data produk (kalau productId tersimpan)
        let downloadURL = "";
        if (productId) {
            const productResp = await fetch(
                `${FIRESTORE_BASE}/products/${productId}?key=${FIREBASE_API_KEY}`
            );
            if (productResp.ok) {
                const productData = await productResp.json();
                downloadURL = productData.fields?.downloadURL?.stringValue || "";
            }
        }

        // 5. Update status order jadi verified + isi downloadURL otomatis
        const updateMask = "updateMask.fieldPaths=status&updateMask.fieldPaths=downloadReady&updateMask.fieldPaths=downloadURL";
        await fetch(
            `${orderDocPath.replace(`projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/`, `${FIRESTORE_BASE}/`)}?${updateMask}&key=${FIREBASE_API_KEY}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fields: {
                        status: { stringValue: "verified" },
                        downloadReady: { booleanValue: true },
                        downloadURL: { stringValue: downloadURL }
                    }
                })
            }
        );

        // 6. Kirim email konfirmasi otomatis (kalau RESEND_API_KEY sudah di-setup)
        const origin = new URL(request.url).origin;
        await fetch(`${origin}/api/send-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: orderFields.email?.stringValue || "",
                customerName: orderFields.customerName?.stringValue || "",
                product: orderFields.product?.stringValue || "",
                invoiceNumber,
                downloadURL
            })
        }).catch(() => {});

        return jsonResponse({ success: true });

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
