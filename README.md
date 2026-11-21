# LaundryKu Supabase

Sistem Informasi Manajemen Laundry berbasis HTML, Bootstrap 5, JavaScript, dan Supabase. Aplikasi menggunakan hak akses berbasis peran dengan pembatasan data melalui Row Level Security.

**Aplikasi publik:** https://junizarmaulana.github.io/laundryku-supabase/

## Fitur

- Supabase Auth dengan email dan password
- Dashboard berbeda berdasarkan role
- CRUD layanan dan harga
- Pesanan laundry dan kalkulasi biaya
- Perubahan status oleh pegawai
- Pembayaran dan unggah bukti ke Supabase Storage
- Verifikasi pembayaran oleh staf berwenang
- Keluhan dan jawaban staf
- Laporan cetak
- Pengaturan hak akses pengguna secara internal

## Menyiapkan Supabase

1. Buat project Supabase.
2. Buka SQL Editor dan jalankan seluruh isi `supabase/schema.sql`.
3. Salin Project URL dan **publishable key** ke `dist/assets/config.js`.
4. Jangan pernah memasukkan secret key atau database password ke repository.

Semua pendaftaran publik otomatis menjadi pelanggan. Akun pegawai ditetapkan secara internal melalui menu Pengguna oleh pengelola yang berwenang.

Jika konfirmasi email Supabase aktif, pengguna harus membuka email konfirmasi sebelum login pertama.

## Menjalankan lokal

```powershell
cd dist
php -S 127.0.0.1:8090
```

Buka `http://127.0.0.1:8090`.

## Deployment

Workflow `.github/workflows/pages.yml` menerbitkan isi folder `dist` ke GitHub Pages setiap kali branch `main` diperbarui. Di repository GitHub, buka Settings → Pages dan pilih **GitHub Actions** sebagai source jika belum aktif.

## Keamanan

- Publishable key memang aman dipakai di browser jika RLS aktif.
- Semua tabel memiliki RLS.
- Pelanggan hanya dapat membaca pesanan, pembayaran, dan keluhan miliknya.
- Bukti pembayaran disimpan di bucket privat dan diakses menggunakan signed URL.
- Perubahan role dilindungi trigger dan hanya dapat dilakukan pengelola berwenang.
