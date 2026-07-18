// ==============================================================
// SERVICE WORKER - StarTone
// Strategi: stale-while-revalidate untuk aset statis di domain
// sendiri (HTML, CSS, JS, ikon, gambar). Permintaan ke Firebase/
// Firestore/CDN pihak ketiga TIDAK disentuh sama sekali supaya
// data produk & status order tetap realtime, tidak basi.
//
// Manfaat: halaman seperti Panduan/Tutorial & Tracking tetap bisa
// dibuka (versi terakhir yang tersimpan) walau koneksi internet
// pengunjung sedang lemah/putus.
// ==============================================================

const CACHE_NAME = "startone-cache-v1";

const CORE_ASSETS = [
    "index.html",
    "guide.html",
    "tracking.html",
    "terms.html",
    "404.html",
    "manifest.json",
    "CSS/index.css",
    "CSS/guide.css",
    "CSS/tracking.css",
    "js/index.js",
    "icon/StarTone Circle.png",
    "icon/S.png"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(CORE_ASSETS))
            .catch((err) => console.warn("SW precache dilewati:", err))
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    const req = event.request;
    const url = new URL(req.url);

    // Hanya tangani GET request ke domain sendiri.
    // Firebase/Firestore/Cloudinary/CDN font/ikon dibiarkan lewat
    // langsung ke jaringan tanpa campur tangan service worker ini.
    if (req.method !== "GET" || url.origin !== self.location.origin) {
        return;
    }

    // Jangan cache halaman Admin sama sekali (selalu harus versi terbaru & aman).
    if (url.pathname.includes("/Admin/")) {
        return;
    }

    event.respondWith(
        caches.match(req).then((cached) => {
            const networkFetch = fetch(req)
                .then((response) => {
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
                    }
                    return response;
                })
                .catch(() => cached);

            return cached || networkFetch;
        })
    );
});
