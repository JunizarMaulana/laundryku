# LaundryKu

Sistem Informasi Manajemen Laundry berbasis web untuk mengelola layanan, pesanan, pembayaran, keluhan, pengguna, dan laporan dalam satu aplikasi. Website dibuat dengan HTML, CSS, Bootstrap 5, JavaScript, dan Supabase.

**Website publik:** https://junizarmaulana.github.io/laundry-ku/

> Dibuat oleh **Kelompok 3 — Mata Kuliah Analisis Perancangan**.

## Fitur utama

- Login, pendaftaran pelanggan, dan pemulihan password melalui Supabase Auth.
- Dashboard berbeda untuk admin, pegawai, dan pelanggan.
- Pengelolaan layanan serta harga laundry.
- Pembuatan pesanan dan perhitungan biaya berdasarkan berat.
- Pembaruan status cucian oleh pegawai.
- Pembayaran dan unggah bukti pembayaran.
- Verifikasi pembayaran oleh pengelola.
- Keluhan pelanggan dan jawaban dari pengelola.
- Pengelolaan role pengguna secara internal.
- Laporan transaksi yang dapat dicetak atau disimpan sebagai PDF.
- Tampilan responsif untuk desktop dan perangkat seluler.

## Cara menggunakan aplikasi

### Pelanggan

1. Buka website publik LaundryKu.
2. Pilih **Buat akun baru** jika belum mempunyai akun.
3. Masuk menggunakan email dan password yang telah didaftarkan.
4. Pilih **Pesan Laundry** untuk membuat pesanan.
5. Tentukan layanan, berat cucian, dan estimasi pengerjaan.
6. Pantau status melalui menu **Pesanan Saya**.
7. Unggah bukti pada menu **Pembayaran**.
8. Gunakan menu **Keluhan** apabila terdapat masalah pada pesanan.

### Pegawai

1. Masuk menggunakan akun yang sudah diberi role `pegawai` oleh pengelola.
2. Buka **Daftar Pesanan**.
3. Perbarui status pesanan dari diterima, dicuci, disetrika, siap diambil, hingga selesai.
4. Perubahan tersimpan langsung ke Supabase.

### Pengelola

1. Masuk menggunakan akun pengelola yang telah tersedia.
2. Kelola jenis layanan dan harga melalui **Layanan & Harga**.
3. Pantau seluruh pesanan melalui menu **Pesanan**.
4. Verifikasi bukti pembayaran melalui **Verifikasi Pembayaran**.
5. Jawab keluhan pelanggan melalui menu **Keluhan**.
6. Kelola role pegawai melalui menu **Pengguna**.
7. Buka **Laporan** untuk mencetak ringkasan transaksi.

## Cara membuat dan menjalankan website

### 1. Persiapan

Siapkan Git, browser modern, PHP atau server lokal lain, akun Supabase, dan akun GitHub.

### 2. Unduh source code

```powershell
git clone https://github.com/JunizarMaulana/laundry-ku.git
cd laundry-ku
```

### 3. Membuat database Supabase

1. Buat project baru di Supabase.
2. Buka **SQL Editor**.
3. Salin dan jalankan seluruh isi `supabase/schema.sql`.
4. Pastikan tabel, trigger, policy RLS, dan bucket storage berhasil dibuat.
5. Buka **Project Settings → API**.
6. Salin Project URL dan publishable/anon key.

### 4. Menghubungkan website ke Supabase

Buka `dist/assets/config.js`, kemudian isi konfigurasi:

```js
export const SUPABASE_URL = "https://PROJECT-ANDA.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "PUBLISHABLE_KEY_ANDA";
```

Jangan memasukkan service-role key atau database password ke repository.

### 5. Menjalankan secara lokal

```powershell
php -S 127.0.0.1:8090 -t dist
```

Buka `http://127.0.0.1:8090` pada browser.

### 6. Mengubah website

- Struktur halaman: `dist/index.html`
- Desain dan animasi: `dist/assets/app.css`
- Fitur dan koneksi data: `dist/assets/app.js`
- Konfigurasi Supabase: `dist/assets/config.js`
- Logo: `dist/assets/laundry-machine-logo.svg`
- Ilustrasi utama: `dist/assets/laundry-hero-v1.png`

### 7. Publikasi ke GitHub Pages

1. Push source code ke branch `main`.
2. Buka **Settings → Pages** pada repository GitHub.
3. Pilih **GitHub Actions** sebagai sumber publikasi.
4. Workflow `.github/workflows/pages.yml` akan menerbitkan folder `dist` secara otomatis.
5. Tunggu workflow **Deploy GitHub Pages** selesai dengan status hijau.

## Struktur folder

```text
laundry-ku/
├── .github/workflows/pages.yml
├── dist/
│   ├── index.html
│   └── assets/
│       ├── app.css
│       ├── app.js
│       ├── config.js
│       └── laundry-machine-logo.svg
└── supabase/schema.sql
```

## Keamanan

- Semua tabel menggunakan Row Level Security.
- Pendaftaran publik otomatis mendapatkan role pelanggan.
- Pelanggan hanya dapat mengakses data miliknya.
- Bukti pembayaran tersimpan pada bucket privat.
- Perubahan role dilindungi oleh aturan database.
- Publishable key boleh digunakan pada browser selama RLS aktif.
- Service-role key dan database password tidak boleh disimpan di source code.

## Teknologi

- HTML5, CSS3, Bootstrap 5, dan JavaScript ES Modules
- Supabase Auth, Database, dan Storage
- GitHub Pages dan GitHub Actions

## Kredit

**Dibuat oleh Kelompok 3 — Mata Kuliah Analisis Perancangan.**
