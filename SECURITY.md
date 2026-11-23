# Kebijakan Keamanan

## Versi yang didukung

Hanya branch `main`, yaitu yang terbit di <https://docs.sakti.ai.id>. Tidak ada rilis bernomor atau branch lain yang dipelihara.

## Yang dilaporkan lewat kebijakan ini

1. **Kebocoran data pribadi atau rahasia di konten — prioritas tertinggi.** NIK, NIP lengkap, nama pegawai, nomor HP atau email
   pribadi, password, token, kode MFA/OTP, atau nomor rekening yang tampil di teks artikel, gambar atau tangkapan layar, riwayat
   git, issue, atau pull request.
2. **Kerentanan situs.** Misalnya XSS, celah pada header keamanan atau CSP (`public/_headers`), dependensi yang rentan, atau
   masalah pada workflow CI dan konfigurasi deploy.

Di luar lingkup: kerentanan atau kendala pada aplikasi SAKTI sendiri. Repo ini tidak mengelola aplikasi SAKTI; sampaikan ke
HAI DJPb (<https://hai.kemenkeu.go.id/>). Kesalahan isi artikel yang tidak menyangkut data pribadi dilaporkan lewat formulir
"Laporkan kesalahan konten" (lihat [CONTRIBUTING.md](CONTRIBUTING.md)).

## Cara melapor

**Jangan menulis detail di issue, pull request, atau komentar publik, dan jangan menyalin data yang bocor ke dalam laporan.**
Cukup sebut lokasinya (URL halaman, nama berkas, baris atau gambar).

1. **Formulir privat GitHub (private vulnerability reporting).** Buka tab **Security** di
   [repo ini](https://github.com/afdaliable/docs-sakti/security) lalu klik **Report a vulnerability**. Isi laporan hanya terlihat
   oleh pemelihara repo.
2. **Bila tombol itu tidak tampil** (fitur belum diaktifkan), buka [issue baru](https://github.com/afdaliable/docs-sakti/issues/new)
   berjudul "Laporan keamanan: minta kontak privat" yang ditujukan kepada `@afdaliable`. Sebutkan jenis masalahnya secara umum saja
   (misalnya "data pribadi tampil di sebuah artikel"), **tanpa lokasi persis dan tanpa isi datanya**. Pemelihara akan menanggapi
   untuk menyepakati saluran privat.

## Penanganan

- **Data pribadi atau rahasia: dihapus segera.** Begitu laporan terverifikasi, pemelihara menghapus atau menutup data itu di
  `main` tanpa menunggu alur review biasa; situs terbit ulang otomatis setelah perubahan masuk ke `main`. Bila data ikut tersimpan
  di riwayat git, issue, atau pull request, pemelihara menilai langkah pembersihan lanjutan.
- Password, token, atau kode yang pernah tampil harus dianggap sudah tidak aman. Pemiliknya perlu menggantinya, karena
  penghapusan dari repo tidak menarik salinan yang sudah beredar.
- **Kerentanan situs:** diperbaiki di `main`. Pelapor diberi kabar lewat saluran laporannya.
- Proyek ini belum menetapkan tenggat tanggapan.
