# Panduan Berkontribusi

Terima kasih sudah bersedia membantu. Panduan ini berlaku untuk semua kontribusi — koreksi, artikel baru, maupun kode situs — dan semua kontributor wajib mengikuti [Kode Etik](CODE_OF_CONDUCT.md).

Repo ini hanya memuat panduan. Kendala pada aplikasi SAKTI (transaksi, akun, galat) disampaikan ke HAI DJPb (<https://hai.kemenkeu.go.id/>). Kerentanan situs atau data pribadi/rahasia yang bocor dilaporkan menurut [SECURITY.md](SECURITY.md), bukan lewat issue biasa.

## Melaporkan kesalahan tanpa menulis PR

Cukup dengan akun GitHub:

1. **Di situs:** klik tautan **Laporkan kesalahan** di bagian bawah artikel. Formulir issue terbuka dengan judul dan URL halaman sudah terisi.
2. **Di GitHub:** buka <https://github.com/afdaliable/docs-sakti/issues/new/choose> lalu pilih **Laporkan kesalahan konten**.
3. **Panduan belum ada?** Pilih **Usulkan artikel**.

Sebutkan URL halaman, bagian yang salah, dan bila tahu yang benar beserta sumbernya. Jangan lampirkan data pribadi.

## Alur kontribusi

1. Cari issue yang sudah ada; bila belum ada, buat issue dengan formulir di atas. Perbaikan kecil seperti salah ketik boleh langsung lewat PR.
2. Tanpa akses tulis: fork repo ini. Kolaborator: buat branch baru di repo. Jangan bekerja di `main`.
3. Sunting. Di browser: buka artikel di situs, klik **Edit halaman**, lalu sunting berkas `.mdx` di GitHub. Di komputer: lihat bagian "Menyiapkan lingkungan lokal".
4. Jalankan pemeriksaan (lihat "Sebelum mengirim PR").
5. Buka pull request ke `main`, isi templat PR (ringkasan, jenis perubahan, checklist penulis), dan tautkan issue-nya.
6. Review: PR ditinjau pemilik modul menurut `.github/CODEOWNERS`. Pemilik modul belum ditetapkan, jadi saat ini semua PR ditinjau pemelihara repo `@afdaliable`. Reviewer memakai bagian "Checklist reviewer" di templat PR.
7. Setelah disetujui dan CI lolos, PR digabung dan situs terbit ulang otomatis.

## Aturan branch main

Branch `main` dilindungi ruleset `main-protection`: setiap perubahan wajib lewat pull request dengan minimal 1 approval, wajib review Code Owners, dan check CI `Periksa konten, build, dan tes` harus lolos. Push langsung ke `main` ditolak; force-push dan penghapusan branch dilarang. Admin repo dapat mem-bypass aturan ini; bypass dipakai untuk keadaan darurat seperti menghapus data pribadi yang bocor. Untuk PR dari fork milik kontributor yang baru pertama kali berkontribusi, CI baru berjalan setelah disetujui pemelihara.

CI menjalankan, berurutan: `pnpm install --frozen-lockfile`, `pnpm check:content`, `pnpm test`, `pnpm build`, `pnpm check:links`, `pnpm check:dist`, `pnpm exec playwright install --with-deps chromium`, `pnpm search:eval --level 1`, `pnpm test:e2e`, dan Lighthouse (peringatan saja).

## Aturan konten (wajib)

1. Bahasa Indonesia baku, kalimat aktif, langkah bernomor.
2. Nama menu dan tombol SAKTI ditulis persis seperti di aplikasi dan dicetak tebal. Contoh: klik **Simpan**, buka menu **Komitmen > RUH > Pencatatan Kontrak**.
3. Jangan mengarang prosedur SAKTI — setiap langkah harus berasal dari sumber. Bila sumber ambigu atau tidak lengkap, set `perlu_review: true` dan tulis catatan di kotak `:::caution[Perlu verifikasi]`. Artikel seperti itu tetap tampil; jangan dihapus dan jangan dikarang.
4. Kolom `sumber:` wajib di frontmatter: judul, URL asli, dan tanggal diambil.
5. Satu artikel = satu tugas pengguna (misalnya "Cara mencatat kontrak"), bukan satu file sumber.
6. Pakai templat [`templates/artikel-juknis.mdx`](templates/artikel-juknis.mdx) atau [`templates/faq.mdx`](templates/faq.mdx), dengan struktur: Ringkasan → Prasyarat → Langkah → Hasil yang diharapkan → Masalah umum → Terkait → Sumber.
7. Duplikat antarsumber digabung; versi yang lebih baru menang, dan versi yang digantikan dicatat di `sumber`.

Artikel baru memakai `status: review`; hanya reviewer yang mengubahnya menjadi `terbit` dan mengisi `terakhir_diverifikasi`. Rincian isian frontmatter dan contoh: <https://docs.sakti.ai.id/kontribusi/panduan-menulis/>.

## Larangan data pribadi dan rahasia

Dilarang menampilkan di teks, gambar, issue, pull request, maupun pesan commit: NIK, NIP lengkap, nama pegawai, nomor HP pribadi, email pribadi, password, token, kode MFA/OTP, dan nomor rekening. Kontak resmi (HAI DJPb, email atau hotline institusi) boleh.

Cara menutup data pada tangkapan layar:

1. Utamakan memotong (crop) bagian yang memuat data.
2. Bila tidak bisa dipotong, tutup dengan kotak warna pekat atau blur kuat sampai tidak terbaca, dengan penyunting gambar apa pun.
3. Lakukan SEBELUM berkas masuk ke commit — riwayat git dan PR menyimpan versi lama.
4. Periksa juga pojok layar, judul jendela, dan tab browser.

`pnpm check:content` mendeteksi sebagian pola (nomor 16/18 digit, nomor HP, email pribadi) tetapi tidak membaca gambar. Bila data terlanjur terunggah, jangan sekadar menimpanya dengan commit baru — laporkan menurut [SECURITY.md](SECURITY.md).

## Gambar

Format WebP, lebar maksimum 1600 px, disimpan di `src/assets/<modul>/<slug>/`, dengan `alt` yang deskriptif (pemeriksaan otomatis gagal bila `alt` kosong).

## Menyiapkan lingkungan lokal

Node.js 26 (sesuai `.nvmrc`) dan pnpm 12.21.0 (sesuai `packageManager` di `package.json`):

```bash
pnpm install
pnpm dev
```

Artikel berada di `src/content/docs/<modul>/…`.

## Sebelum mengirim PR

Wajib lolos: `pnpm check:content`, `pnpm test`, `pnpm build`, `pnpm check:links`. CI juga menjalankan `pnpm check:dist`, `pnpm search:eval --level 1`, dan `pnpm test:e2e` — boleh dijalankan lokal; dua yang terakhir butuh Chromium Playwright (`pnpm exec playwright install chromium`). Untuk suntingan lewat browser, pemeriksaan dijalankan CI pada PR.

## Pesan commit dan judul PR

Conventional Commits dalam bahasa Inggris, seperti riwayat repo. Tipe yang dipakai: `content` (artikel), `fix`, `feat`, `docs`, `test`, `chore`; scope opsional berupa modul atau bagian. Contoh: `content(komitmen): correct the contract recording steps`, `fix(search): …`. Satu PR = satu perubahan yang utuh; migrasi konten dikerjakan per modul. Untuk suntingan lewat browser, cukup judul PR yang mengikuti pola ini.

## Lisensi

Kode berlisensi MIT ([LICENSE](LICENSE)); tulisan berlisensi CC BY 4.0 ([LICENSE-CONTENT.md](LICENSE-CONTENT.md)). Lisensi konten tidak mencakup materi sumber pihak lain. Jangan memasukkan materi yang tidak boleh Anda bagikan, dan selalu cantumkan sumbernya.
