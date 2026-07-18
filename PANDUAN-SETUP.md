# 📋 Panduan Setup Fitur Baru — StarTone

Dokumen ini menjelaskan fitur-fitur baru yang ditambahkan ke website kamu.
Sebagian fitur **langsung aktif** tanpa perlu setting apa pun, sebagian lagi
**butuh kamu daftar akun gratis** ke layanan pihak ketiga dulu.

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

### 6. Sitemap Dinamis
- File baru: `functions/sitemap.xml.js` (Cloudflare Pages Function).
- Setelah kamu deploy ulang, otomatis mengganti sitemap.xml jadi dinamis —
  setiap kali ada produk baru, sitemap ikut update sendiri tanpa kamu edit manual.
- **Tidak perlu setting tambahan**, cukup pastikan folder `functions/` ikut
  ter-upload saat deploy ke Cloudflare Pages.

### 7. Link Download Produk Tersimpan Permanen
- Form produk di Admin sekarang punya field **"Link Download Produk"**.
- Manfaatnya: saat memverifikasi order manual, link download ini otomatis
  muncul sebagai saran (tidak perlu ketik ulang tiap kali ada order untuk
  produk yang sama) — kamu tetap bisa mengubahnya manual sebelum konfirmasi
  kalau perlu.

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
| `RESEND_API_KEY` | Dashboard Resend | Email otomatis |
| `SENDER_EMAIL` | Domain email kamu | Email otomatis |

Semua fitur lain di daftar "✅ Langsung Aktif" di atas **tidak butuh**
environment variable tambahan apa pun.

---

Kalau ada langkah yang membingungkan atau butuh bantuan waktu setup akun
Resend/Turnstile, tinggal tanya lagi ke saya kapan saja.
