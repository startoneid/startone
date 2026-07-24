# 📋 Panduan Setup Fitur Baru — StarTone

Dokumen ini menjelaskan fitur-fitur baru yang ditambahkan ke website kamu.
Sebagian fitur **langsung aktif** tanpa perlu setting apa pun, sebagian lagi
**butuh kamu daftar akun gratis** ke layanan pihak ketiga dulu.

---

## 💳 WAJIB DILAKUKAN — Ganti Metode Pembayaran ke iPaymu

QRIS statis + upload bukti manual **sudah dihapus total** dari situs ini.
Sekarang semua transaksi diproses lewat **iPaymu** (Virtual Account,
E-Wallet, QRIS, Transfer Bank, dll — pembeli tinggal pilih sendiri di
halaman iPaymu), dan verifikasi pembayaran terjadi **otomatis** (Admin
tidak perlu klik "Verifikasi" manual lagi untuk order lewat iPaymu).

### File yang berubah/baru untuk fitur ini

| File | Keterangan |
|---|---|
| `functions/api/ipaymu-create.js` | **Baru.** Cloudflare Function yang membuat transaksi pembayaran ke iPaymu, dipanggil otomatis oleh `checkout.js`. |
| `functions/api/ipaymu-callback.js` | **Baru.** Cloudflare Function yang menerima notifikasi otomatis dari iPaymu, mengecek ulang status ke server iPaymu, lalu menandai order sebagai "verified" + mengirim email konfirmasi. |
| `payment-success.html` | **Baru.** Halaman tujuan setelah pembeli kembali dari halaman pembayaran iPaymu (menggantikan `payment.html` lama). |
| `js/payment-status.js` | **Baru.** Script realtime status pembayaran untuk `payment-success.html` (menggantikan `js/payment.js` lama). |
| `js/checkout.js` | Diubah: setelah order tersimpan, sekarang memanggil `/api/ipaymu-create` lalu mengarahkan pembeli ke halaman pembayaran iPaymu (bukan lagi ke `payment.html`). |
| `guide.html` | Diubah: teks langkah pembayaran disesuaikan (bukan lagi "scan QRIS"). |
| `Admin/admin.js` | Diubah sedikit: kolom bukti bayar menampilkan "✅ iPaymu (Otomatis)" untuk order yang lunas lewat iPaymu. |
| `firestore.rules` | Diubah: izin publik untuk mengisi bukti transfer manual dihapus (sudah tidak dibutuhkan). **Wajib di-publish ulang**, lihat bagian di bawah. |
| `payment.html`, `js/payment.js` | **Dihapus.** Halaman QRIS manual + upload bukti lama, sudah tidak dipakai. |
| `images/QRIS.png`, `images/qris tester.png`, `Admin/images/QRIS.png`, `Admin/images/qris tester.png` | **Dihapus.** Gambar QRIS statis, sudah tidak dipakai di mana pun. |

### Langkah 1 — Daftar akun iPaymu & ambil kredensial

1. Buka **https://my.ipaymu.com/register** dan daftar akun (gratis).
2. Untuk **testing dulu** (sangat disarankan sebelum transaksi asli), daftar
   juga akun terpisah di **https://sandbox.ipaymu.com** (mode sandbox
   memakai VA & API Key yang BERBEDA dari mode production/live).
3. Setelah login, buka menu **Integrasi / API** di dashboard iPaymu kamu.
   Catat dua hal ini:
   - **VA** (nomor Virtual Account akun kamu)
   - **API Key**
4. Kalau situs kamu punya lebih dari satu domain, tambahkan juga domainnya
   di menu **API Integrasi → Multi Domain**.

### Langkah 2 — Buat Service Account Firebase (supaya verifikasi bisa otomatis)

Ini dibutuhkan supaya `functions/api/ipaymu-callback.js` bisa menandai
order sebagai "verified" secara otomatis di Firestore begitu iPaymu
mengonfirmasi pembayaran, **tanpa perlu melonggarkan Firestore Rules**
untuk pengunjung biasa (yang justru akan membuka celah keamanan besar).

1. Buka **https://console.firebase.google.com** → pilih project `startone-d8aee`.
2. Klik ikon ⚙️ (Project Settings) → tab **Service accounts**.
3. Klik **Generate new private key** → sebuah file `.json` akan terdownload.
   **Simpan file ini baik-baik dan JANGAN dibagikan ke siapa pun** — file ini
   setara dengan akses penuh ke database Firestore kamu.
4. Buka file `.json` tersebut, cari dua field ini:
   - `"client_email"` → nilainya akan kamu isi ke `FIREBASE_SERVICE_ACCOUNT_EMAIL`
   - `"private_key"` → nilainya akan kamu isi ke `FIREBASE_SERVICE_ACCOUNT_KEY`
     (copy **apa adanya**, termasuk baris `-----BEGIN PRIVATE KEY-----` dan
     `-----END PRIVATE KEY-----`, serta karakter `\n` di dalamnya — jangan
     diedit/dirapikan manual).

### Langkah 3 — Isi Environment Variables di Cloudflare Pages

Buka dashboard Cloudflare Pages project kamu → **Settings → Environment
variables**, lalu tambahkan:

| Variable | Isi | Keterangan |
|---|---|---|
| `IPAYMU_VA` | Nomor VA dari Langkah 1 | |
| `IPAYMU_API_KEY` | API Key dari Langkah 1 | |
| `IPAYMU_MODE` | `sandbox` atau `production` | Pakai `sandbox` dulu untuk uji coba, baru ganti ke `production` setelah yakin semua berjalan lancar |
| `IPAYMU_CALLBACK_TOKEN` | String acak bebas buatanmu sendiri (mis. `str0n3-x8f2kq...`) | Untuk mencegah endpoint callback dipanggil sembarang orang. Harus SAMA persis di kedua function (otomatis, karena keduanya membaca variable yang sama) |
| `FIREBASE_SERVICE_ACCOUNT_EMAIL` | `client_email` dari file JSON Langkah 2 | |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | `private_key` dari file JSON Langkah 2 | Paste apa adanya |

Setelah semua terisi, **redeploy project**.

### Langkah 4 — Uji coba di Sandbox

1. Pastikan `IPAYMU_MODE` masih `sandbox`.
2. Lakukan checkout percobaan di situsmu sampai diarahkan ke halaman
   pembayaran iPaymu (sandbox).
3. Selesaikan pembayaran di halaman sandbox tersebut. Kalau status belum
   otomatis "Bayar", buka **https://sandbox.ipaymu.com** → klik **"Tes
   Notify"** → masukkan Session ID/Trx ID dari transaksi tadi (lihat
   tutorial resmi iPaymu soal ini kalau perlu).
4. Cek halaman **Tracking** di situsmu (atau panel Admin) — status order
   seharusnya berubah otomatis menjadi **"verified"** dalam beberapa detik,
   dan email konfirmasi (kalau Resend sudah di-setup) otomatis terkirim.
5. **Kalau belum berubah otomatis**: buka **Cloudflare Pages dashboard →
   tab Functions/Logs (real-time logs)** untuk melihat pesan error dari
   `/api/ipaymu-callback`. Field nama notifikasi dari iPaymu kadang sedikit
   berbeda antar versi API — kalau ada error di sini, kirimkan pesan error
   tersebut ke saya supaya bisa saya sesuaikan.
6. Kalau sudah lancar di sandbox, ganti `IPAYMU_MODE` menjadi `production`
   dan ganti `IPAYMU_VA`/`IPAYMU_API_KEY` dengan yang dari akun **production**
   (BUKAN sandbox), lalu redeploy.

### Catatan keamanan

- File JSON Service Account dari Langkah 2 memberi akses penuh ke database.
  Jangan pernah diunggah ke folder project/GitHub — cukup dipakai untuk
  mengisi 2 environment variable di atas, lalu file aslinya disimpan aman
  di luar project (mis. password manager), tidak perlu disimpan di server.
- Fungsi callback **tidak langsung percaya** notifikasi yang masuk — ia
  selalu mengecek ulang status transaksi tersebut langsung ke server
  iPaymu sebelum menandai order sebagai lunas, supaya tidak bisa
  dipalsukan orang lain.

---

## ⚠️ WAJIB DILAKUKAN — Update Keamanan Data Pelanggan

Update kali ini memperbaiki beberapa celah keamanan yang cukup serius.
**Tanpa langkah di bawah ini, sebagian perbaikan belum benar-benar aktif**,
jadi mohon jangan dilewati.

### 1. Deploy `firestore.rules` (PALING PENTING)

Sebelumnya, Firestore project kamu kemungkinan memakai rules yang longgar
(atau default), yang berarti:
- **Link download semua produk** bisa dibaca siapa saja lewat DevTools
  browser, walaupun belum bayar.
- **Seluruh data pelanggan** (nama, email, no. HP, bukti transfer) di
  koleksi `orders` berpotensi bisa "di-dump" sekaligus oleh siapa saja yang
  tahu cara memanggil Firestore langsung dari browser — bukan cuma lewat
  tampilan Tracking yang terlihat normal.

File `firestore.rules` di folder utama project ini berisi aturan baru yang
menutup celah tersebut. **File ini TIDAK otomatis aktif** hanya karena ada
di folder project (Cloudflare Pages cuma hosting file statis, bukan
Firestore). Cara mengaktifkannya:

1. Buka **https://console.firebase.google.com** → pilih project
   `startone-d8aee`.
2. Menu kiri: **Firestore Database → tab "Rules"**.
3. Hapus isi yang ada, lalu copy-paste **seluruh isi file `firestore.rules`**
   ke sana.
4. Klik **Publish**.
5. Coba lagi alur lengkap situs (lihat produk di Shop, checkout sampai
   payment, cek Tracking, dan buka Admin panel) untuk memastikan tidak ada
   pesan error "Missing or insufficient permissions".

### 2. Migrasi Link Download Lama — Otomatis, Tidak Perlu Aksi

Produk yang sudah kamu buat sebelumnya (sebelum update ini) menyimpan link
downloadnya langsung di data produk yang bisa dibaca publik. Admin panel
sekarang **otomatis memindahkan** link-link lama itu ke koleksi baru yang
lebih aman (`productSecrets`) begitu Admin panel dibuka pertama kali setelah
update — kamu tidak perlu edit produk satu-satu secara manual.

### 3. Format Nomor Invoice Sedikit Berubah

Supaya nomor invoice tidak mudah ditebak orang lain (sebelumnya berurutan
polos: `STR-19072026-0001`, `0002`, `0003`, ...), sekarang ditambah akhiran
acak: `STR-19072026-0001-K3F9`. Ini otomatis, tidak mengubah cara kerja
checkout/tracking dari sisi pembeli.

### 4. Cloudflare Function Baru: `/api/next-invoice`

Nomor invoice sekarang dibuat di server (Cloudflare Function), bukan lagi
dihitung di browser pengunjung (yang sebelumnya butuh membaca seluruh data
order pelanggan lain hanya untuk menghitung nomor urut hari ini). Tidak
butuh setting tambahan, cukup pastikan folder `functions/` ikut ter-upload
saat deploy (sama seperti fungsi `send-email` dan `sitemap` yang sudah ada).

---

## ✅ LANGSUNG AKTIF (tidak perlu setting apa-apa)

### 1. Kebijakan Privasi & Refund
- File baru: `privacy-policy.html`, `refund-policy.html`
- Sudah otomatis muncul linknya di footer semua halaman.

### 2. Kategori & Filter Produk
- Saat menambah/edit produk di Admin, sekarang ada field **Kategori**
  (Travel, Portrait, Cinematic, dst) dan **Kompatibilitas** (Mobile/Desktop).
- Di halaman utama, filter kategori (pills) otomatis muncul berdasarkan
  kategori yang kamu isi di Admin — kalau belum ada produk dengan kategori
  terisi, filter ini otomatis tersembunyi.

### 3. Dashboard Analitik Admin
- Buka Admin panel, sekarang ada 2 grafik: **Revenue 30 Hari Terakhir**
  dan **Produk Terlaris**, dihitung otomatis dari data order yang ada.

### 4. Export CSV & Backup JSON
- Tombol baru di bagian atas Admin panel:
  - **Export Orders (CSV)** — download semua data order ke Excel.
  - **Export Produk (CSV)** — download semua data produk ke Excel.
  - **Backup Data (JSON)** — download seluruh data (produk + order) sebagai
    file JSON, simpan di Google Drive/penyimpanan lain sebagai cadangan
    rutin (disarankan sebulan sekali).

### 5. Rate Limiting & Honeypot Anti-Spam (Checkout)
- Sudah aktif otomatis: kalau ada yang mencoba checkout berkali-kali dalam
  waktu singkat (kurang dari 30 detik), sistem akan menahan submit berikutnya.
- Ada juga "honeypot" (jebakan bot) tersembunyi di form — bot otomatis yang
  asal isi form akan otomatis diblokir tanpa mengganggu pengguna asli.
- Validasi email & nomor telepon juga sekarang lebih ketat (format harus
  benar sebelum order bisa dikirim).

### 6. Sitemap Dinamis
- File baru: `functions/sitemap.xml.js` (Cloudflare Pages Function).
- Setelah kamu deploy ulang, otomatis mengganti sitemap.xml jadi dinamis —
  setiap kali ada produk baru, sitemap ikut update sendiri tanpa kamu edit manual.
- **Tidak perlu setting tambahan**, cukup pastikan folder `functions/` ikut
  ter-upload saat deploy ke Cloudflare Pages.
- Sekarang setiap produk juga otomatis punya halaman detailnya sendiri yang
  bisa dibagikan (lihat poin "Halaman Detail Produk" di bawah).

### 7. Link Download Produk Tersimpan Permanen (Lebih Aman)
- Form produk di Admin masih punya field **"Link Download Produk"**.
- Bedanya sekarang: link ini disimpan di koleksi terpisah yang **hanya bisa
  dibaca oleh Admin**, bukan lagi ikut terbaca publik dari halaman utama/Shop.
- Manfaatnya tetap sama: saat memverifikasi order manual, link download ini
  otomatis muncul sebagai saran (tidak perlu ketik ulang tiap kali ada order
  untuk produk yang sama) — kamu tetap bisa mengubahnya manual kalau perlu.

### 8. Halaman Detail Produk (`product.html`)
- Setiap produk sekarang punya halaman sendiri yang bisa dibuka lewat link
  langsung, contoh: `product.html?id=xxxxx` — cocok untuk dibagikan ke
  Instagram/WhatsApp/dll, karena judul & gambar halaman ikut menyesuaikan
  produknya.
- Di dalam modal "quick view" (klik kartu produk seperti biasa di halaman
  utama/Shop) sekarang ada tombol **"Buka Halaman Produk"** yang mengarah
  ke halaman ini.
- Catatan jujur: karena situs ini statis (bukan server-rendered), manfaat
  utamanya adalah link yang rapi & bisa dibagikan langsung ke 1 produk —
  bukan jaminan peringkat SEO instan, walau tetap membantu dibanding
  sebelumnya (yang hanya modal, tanpa URL tersendiri sama sekali).

### 9. Tombol "Kembali" Lebih Pintar
- Tombol kembali di pojok kiri atas (Shop, Tracking, Panduan, dst) sekarang
  memeriksa dari mana pengunjung datang — kalau mereka baru saja datang
  langsung dari luar (misalnya dari hasil pencarian Google), tombol akan
  membawa ke Beranda StarTone, bukan malah keluar ke situs sebelumnya.

### 10. Halaman Tracking Lebih Cepat & Aman
- Pencarian status order sekarang mengambil datanya lebih efisien (tidak
  lagi membaca-baca banyak data yang tidak perlu), dengan indikator loading
  yang lebih jelas dan jeda otomatis kalau tombol "Cek Status" ditekan
  berkali-kali terlalu cepat.

---

## ⚙️ PERLU SETUP AKUN (gratis, tapi wajib kamu lakukan sendiri)

### 1. 📧 Email Konfirmasi Otomatis (Resend)

Setelah kamu memverifikasi order secara manual di Admin panel (isi/konfirmasi
link download seperti biasa), pembeli akan otomatis menerima email berisi
link download tersebut — tanpa kamu perlu kirim manual lewat WhatsApp/chat.

**Langkah setup:**
1. Daftar gratis di **https://resend.com** (gratis untuk 3.000 email/bulan).
2. Verifikasi domain email kamu di dashboard Resend (atau pakai domain
   testing bawaan mereka dulu untuk uji coba).
3. Ambil **API Key** dari dashboard Resend.
4. Di Cloudflare Pages dashboard project kamu → **Settings → Environment
   variables**, tambahkan:
   - `RESEND_API_KEY` = (API Key dari Resend)
   - `SENDER_EMAIL` = (email pengirim, misalnya `noreply@startone.id`)
5. Redeploy project.

Selama langkah di atas belum dilakukan, sistem tetap berjalan normal seperti
biasa (order tetap tersimpan & bisa diverifikasi manual seperti sekarang),
hanya saja email otomatis belum terkirim — tidak ada yang rusak.

---

### 2. 🛡️ CAPTCHA Checkout (Cloudflare Turnstile)

Widget captcha gratis dari Cloudflare sudah dipasang di form checkout,
tinggal aktifkan Site Key-nya.

**Langkah setup:**
1. Buka dashboard Cloudflare → menu **Turnstile** → **Add Site**.
2. Masukkan domain kamu (`startone.pages.dev` atau domain custom kamu).
3. Salin **Site Key** yang diberikan.
4. Buka file `checkout.html`, cari baris:
   ```html
   <div class="cf-turnstile" data-sitekey="1x00000000000000000000AA" ...>
   ```
   Ganti `1x00000000000000000000AA` dengan Site Key asli kamu.
5. Redeploy project.

**Catatan:** Site Key `1x00000000000000000000AA` yang saat ini terpasang
adalah *dummy test key* resmi dari Cloudflare (selalu lolos, dipakai untuk
development) — form checkout tetap bisa dipakai normal sebelum kamu ganti,
jadi tidak akan mengganggu pembeli sebelum kamu sempat setting captcha asli.

---

## 📌 Ringkasan Environment Variables yang Perlu Diisi di Cloudflare Pages

| Variable | Dari mana | Wajib untuk fitur |
|---|---|---|
| `IPAYMU_VA` | Dashboard iPaymu | Pembayaran iPaymu |
| `IPAYMU_API_KEY` | Dashboard iPaymu | Pembayaran iPaymu |
| `IPAYMU_MODE` | `sandbox` atau `production` | Pembayaran iPaymu |
| `IPAYMU_CALLBACK_TOKEN` | Buatan sendiri (string acak) | Pembayaran iPaymu |
| `FIREBASE_SERVICE_ACCOUNT_EMAIL` | File JSON Service Account Firebase | Verifikasi otomatis iPaymu |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | File JSON Service Account Firebase | Verifikasi otomatis iPaymu |
| `RESEND_API_KEY` | Dashboard Resend | Email otomatis |
| `SENDER_EMAIL` | Domain email kamu | Email otomatis |

Semua fitur lain di daftar "✅ Langsung Aktif" di atas **tidak butuh**
environment variable tambahan apa pun. Yang **wajib** kamu lakukan secara
manual adalah men-deploy ulang `firestore.rules` (lihat bagian "⚠️ WAJIB
DILAKUKAN" di atas, isinya sudah diperbarui untuk mendukung penghapusan
QRIS manual) — itu satu-satunya langkah yang tidak bisa otomatis lewat
file di project ini.

---

Kalau ada langkah yang membingungkan atau butuh bantuan waktu setup akun
Resend/Turnstile, atau ada pesan error soal "insufficient permissions"
setelah publish rules, tinggal tanya lagi ke saya kapan saja.
