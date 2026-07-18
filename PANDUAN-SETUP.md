# 📋 Panduan Setup Fitur Baru — StarTone

Dokumen ini menjelaskan fitur-fitur baru yang baru ditambahkan ke website kamu.
Sebagian fitur **langsung aktif** tanpa perlu setting apa pun, sebagian lagi
**butuh kamu daftar akun gratis** ke layanan pihak ketiga dulu (karena
melibatkan uang/email, ini butuh API key milikmu sendiri, bukan sesuatu
yang bisa saya buatkan otomatis).

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

### 5. Service Worker (Mode Offline)
- File baru: `sw.js`, otomatis aktif di halaman utama, Panduan, dan Tracking.
- Pengunjung yang koneksinya lemah/putus masih bisa membuka versi terakhir
  halaman-halaman tersebut. Data Firebase (harga, status order) tetap selalu
  realtime dan **tidak** ikut di-cache, supaya tidak basi.

### 6. Rate Limiting & Honeypot Anti-Spam (Checkout)
- Sudah aktif otomatis: kalau ada yang mencoba checkout berkali-kali dalam
  waktu singkat (kurang dari 30 detik), sistem akan menahan submit berikutnya.
- Ada juga "honeypot" (jebakan bot) tersembunyi di form — bot otomatis yang
  asal isi form akan otomatis diblokir tanpa mengganggu pengguna asli.

### 7. Sitemap Dinamis
- File baru: `functions/sitemap.xml.js` (Cloudflare Pages Function).
- Setelah kamu deploy ulang, otomatis mengganti sitemap.xml jadi dinamis —
  setiap kali ada produk baru, sitemap ikut update sendiri tanpa kamu edit manual.
- **Tidak perlu setting tambahan**, cukup pastikan folder `functions/` ikut
  ter-upload saat deploy ke Cloudflare Pages.

### 8. Link Download Produk Tersimpan Permanen
- Form produk di Admin sekarang punya field **"Link Download Produk"**.
- Manfaatnya: saat memverifikasi order manual, link download otomatis
  muncul (tidak perlu ketik ulang tiap kali ada order untuk produk yang sama).
  Field ini juga wajib diisi supaya fitur pembayaran & email otomatis di
  bawah bisa jalan.

---

## ⚙️ PERLU SETUP AKUN (gratis, tapi wajib kamu lakukan sendiri)

### 1. 💳 Pembayaran Otomatis (Midtrans)

Saat ini pembeli tetap bisa bayar manual pakai QRIS seperti biasa — fitur
ini menambahkan **opsi tambahan** "Bayar Otomatis" (e-wallet, virtual
account, kartu) yang langsung terverifikasi tanpa kamu cek manual satu-satu.

**Langkah setup:**
1. Daftar gratis di **https://midtrans.com**
2. Di dashboard, pilih mode **Sandbox** dulu untuk uji coba.
3. Ambil **Server Key** dan **Client Key** di menu *Settings → Access Keys*.
4. Buka dashboard project Cloudflare Pages kamu → **Settings → Environment
   variables**, tambahkan:
   - `MIDTRANS_SERVER_KEY` = (Server Key dari Midtrans)
   - `MIDTRANS_IS_PRODUCTION` = `false` (ganti ke `true` kalau sudah siap live)
5. Buka file `payment.html`, cari baris:
   ```html
   <script src="https://app.sandbox.midtrans.com/snap/snap.js"
       data-client-key="SB-Mid-client-XXXXXXXXXXXXXXXX">
   ```
   Ganti `SB-Mid-client-XXXXXXXXXXXXXXXX` dengan **Client Key** asli kamu.
6. Redeploy project di Cloudflare Pages.
7. Di dashboard Midtrans, set **Payment Notification URL** ke:
   `https://startone.pages.dev/api/midtrans-notification`
8. Kalau sudah yakin semua jalan lancar di Sandbox, ganti ke akun Production
   Midtrans + ganti Server/Client Key + `MIDTRANS_IS_PRODUCTION=true`.

**Catatan penting:** setiap produk **wajib** diisi field "Link Download
Produk" di Admin, karena sistem otomatis mengambil link ini saat pembayaran
lewat Midtrans berhasil.

---

### 2. 📧 Email Konfirmasi Otomatis (Resend)

Setelah order diverifikasi (baik manual oleh kamu, atau otomatis lewat
Midtrans), pembeli akan menerima email berisi link download.

**Langkah setup:**
1. Daftar gratis di **https://resend.com** (gratis untuk 3.000 email/bulan).
2. Verifikasi domain email kamu di dashboard Resend (atau pakai domain
   testing bawaan mereka dulu untuk uji coba).
3. Ambil **API Key** dari dashboard Resend.
4. Di Cloudflare Pages dashboard → **Settings → Environment variables**,
   tambahkan:
   - `RESEND_API_KEY` = (API Key dari Resend)
   - `SENDER_EMAIL` = (email pengirim, misalnya `noreply@startone.id`)
5. Redeploy project.

Selama kedua langkah di atas belum dilakukan, sistem tetap berjalan normal
seperti biasa (order tetap tersimpan & bisa diverifikasi manual), hanya
saja email otomatis belum terkirim — tidak ada yang rusak.

---

### 3. 🛡️ CAPTCHA Checkout (Cloudflare Turnstile)

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
| `MIDTRANS_SERVER_KEY` | Dashboard Midtrans | Pembayaran otomatis |
| `MIDTRANS_IS_PRODUCTION` | `true`/`false` | Pembayaran otomatis |
| `RESEND_API_KEY` | Dashboard Resend | Email otomatis |
| `SENDER_EMAIL` | Domain email kamu | Email otomatis |

Semua fitur lain di daftar "✅ Langsung Aktif" di atas **tidak butuh**
environment variable tambahan apa pun.

---

Kalau ada langkah yang membingungkan atau butuh bantuan waktu setup akun
Midtrans/Resend/Turnstile, tinggal tanya lagi ke saya kapan saja.
