## Ringkasan

<!-- Apa yang diubah dan mengapa. Sebutkan modul dan artikel yang terdampak. -->

## Jenis perubahan

- [ ] Koreksi artikel yang sudah ada
- [ ] Artikel baru
- [ ] Migrasi konten dari sumber lama
- [ ] Kode, tampilan, atau konfigurasi situs

## Pemeriksaan penulis

- [ ] `pnpm check:content` lolos
- [ ] `pnpm build` lolos (termasuk validasi tautan)
- [ ] Setiap langkah berasal dari sumber; bagian yang meragukan ditandai `perlu_review: true` dan kotak "Perlu verifikasi"
- [ ] Tidak ada data pribadi atau rahasia di teks maupun gambar (NIK, NIP, nama pegawai, nomor HP/email pribadi, password, token, kode MFA, nomor rekening)

## Checklist reviewer

- [ ] Langkah sesuai dengan SAKTI versi terbaru
- [ ] Nama menu/tombol persis seperti di aplikasi
- [ ] Tidak ada data pribadi di teks maupun gambar
- [ ] Sumber tercantum dan bisa dibuka
- [ ] `peran` dan `kata_kunci` tepat
- [ ] Jika lolos: ubah `status: terbit`, isi `terakhir_diverifikasi`
