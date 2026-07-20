# 📋 Panduan Setup Fitur Baru — StarTone

Dokumen ini menjelaskan fitur-fitur baru yang ditambahkan ke website kamu.
Sebagian fitur **langsung aktif** tanpa perlu setting apa pun, sebagian lagi
**butuh kamu daftar akun gratis** ke layanan pihak ketiga dulu.

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
| `RESEND_API_KEY` | Dashboard Resend | Email otomatis |
| `SENDER_EMAIL` | Domain email kamu | Email otomatis |

Semua fitur lain di daftar "✅ Langsung Aktif" di atas **tidak butuh**
environment variable tambahan apa pun. Yang **wajib** kamu lakukan secara
manual adalah men-deploy `firestore.rules` (lihat bagian "⚠️ WAJIB
DILAKUKAN" di atas) — itu satu-satunya langkah yang tidak bisa otomatis
lewat file di project ini.

---

Kalau ada langkah yang membingungkan atau butuh bantuan waktu setup akun
Resend/Turnstile, atau ada pesan error soal "insufficient permissions"
setelah publish rules, tinggal tanya lagi ke saya kapan saja.
