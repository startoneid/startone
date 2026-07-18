// ==============================================================
// CLOUDFLARE PAGES FUNCTION — Sitemap Dinamis
// ==============================================================
// File ini otomatis berjalan di Cloudflare Pages tanpa setup
// tambahan apa pun (tidak perlu deploy Worker terpisah), karena
// Pages secara otomatis mengenali folder /functions.
//
// Begitu file ini ada, request ke:
//     https://startone.pages.dev/sitemap.xml
// akan dijalankan oleh fungsi ini (menggantikan file statis
// sitemap.xml yang lama), dan otomatis menambahkan baris untuk
// setiap produk yang sedang aktif di koleksi Firestore "products" —
// jadi setiap kali Admin menambah produk baru, sitemap ikut update
// otomatis tanpa perlu edit manual.
//
// Tidak ada API key rahasia yang dipakai di sini — hanya membaca
// koleksi "products" yang memang sudah publik (sama seperti yang
// dibaca langsung oleh halaman utama).
// ==============================================================

const SITE_URL = "https://startone.pages.dev";
const FIREBASE_PROJECT_ID = "startone-d8aee";
const FIREBASE_API_KEY = "AIzaSyCe_fBo7M-2kROpNPpMfnI6qbZPXfHj8dE";

const STATIC_PAGES = [
    { path: "/", priority: "1.00" },
    { path: "/guide.html", priority: "0.80" },
    { path: "/tracking.html", priority: "0.60" },
    { path: "/terms.html", priority: "0.50" },
    { path: "/privacy-policy.html", priority: "0.30" },
    { path: "/refund-policy.html", priority: "0.30" },
];

function xmlEscape(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

export async function onRequestGet() {
    const today = new Date().toISOString().slice(0, 10);
    const urls = [];

    STATIC_PAGES.forEach((page) => {
        urls.push(
            `<url><loc>${SITE_URL}${page.path}</loc><lastmod>${today}</lastmod><priority>${page.priority}</priority></url>`
        );
    });

    try {
        const firestoreURL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/products?key=${FIREBASE_API_KEY}&pageSize=200`;
        const response = await fetch(firestoreURL);

        if (response.ok) {
            const data = await response.json();
            const documents = data.documents || [];

            documents.forEach((doc) => {
                // Setiap produk diarahkan ke halaman utama dengan anchor #shop
                // karena detail produk ditampilkan lewat modal di halaman utama,
                // bukan halaman terpisah per produk.
                const idSegments = doc.name.split("/");
                const docId = idSegments[idSegments.length - 1];
                urls.push(
                    `<url><loc>${SITE_URL}/#shop-${xmlEscape(docId)}</loc><lastmod>${today}</lastmod><priority>0.70</priority></url>`
                );
            });
        }
    } catch (err) {
        // Kalau Firestore gagal diakses (gangguan jaringan dsb), sitemap
        // tetap dikirim dengan halaman statis saja supaya tidak error total.
        console.error("Gagal mengambil produk untuk sitemap:", err);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;

    return new Response(xml, {
        headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
        },
    });
}
