# 00 — Product Requirements: SAKTI Knowledge Base

## Latar belakang

Panduan SAKTI saat ini tersebar di dua Google Sites dan satu Linktree yang berisi folder Google Drive. Masalahnya:

- Pengguna harus tahu situs mana yang harus dibuka (Admin vs Pelaksanaan vs Pelaporan).
- Isi utamanya berupa Google Slides/PDF/folder Drive, jadi **tidak bisa dicari** per langkah.
- Tidak ada pencarian lintas sumber; Google Sites hanya mencari teks yang sama persis.
- Tidak ada riwayat perubahan, alur review, maupun kepemilikan konten per modul.
- Ada link yang salah arah (contoh: tombol Direktorat PA, DJKN, dan Bappenas di SAKTI Admin; lihat `01-sumber-konten.md`).

## Tujuan

1. Satu pintu: semua panduan SAKTI di satu situs, disusun per modul menu SAKTI.
2. Pengguna menemukan jawaban dalam ≤ 2 kali pencarian, walau memakai kata yang berbeda dari judul artikel.
3. Konten berupa teks langkah demi langkah (bisa dicari, dibaca di HP, di-link per bagian), bukan sekadar link ke slide.
4. Kontributor per modul bisa memperbarui konten tanpa menyentuh kode, dengan review sebelum publish.

## Pengguna

Diambil dari tipe pengguna di SAKTI Admin:

| Kelompok | Kebutuhan utama |
|---|---|
| Satker K/L (operator, PPK, PPSPM, bendahara, KPA) | Juknis per modul, troubleshooting, FAQ |
| KPPN (Kuasa BUN) & Kanwil DJPb | Modul BUN, validasi, pendaftaran user |
| DJPb Kantor Pusat | Admin, kebijakan, rekap |
| DJA, Bappenas (penelaah) | Akses penganggaran/penelaahan |
| DJKN (pembina) | Aset Tetap, Persediaan, Piutang |
| BPK (auditor), APIP | Akses baca, laporan |
| Widyaiswara Kemenkeu | Materi pelatihan |
| Tim pengelola KB (admin, kontributor) | Menulis, mereview, publish |

## Ruang lingkup (MVP)

- Situs Starlight berbahasa Indonesia, publik tanpa login.
- Landing page help center: search besar, kartu modul, artikel populer, kontak bantuan.
- Halaman per modul (sesuai `config/modul.yaml`) dan halaman "Menurut peran pengguna".
- Migrasi seluruh konten tiga sumber menjadi artikel MDX, dengan link ke file asli tetap disertakan.
- Pencarian: keyword (Pagefind) + semantik/hybrid + glosarium sinonim istilah SAKTI.
- Kontribusi: tombol "Edit di GitHub", Keystatic `/keystatic`, PR wajib review, CODEOWNERS per modul.
- CI: build, validasi konten, cek link, uji pencarian.

## Di luar ruang lingkup MVP

- Login pengguna / konten privat.
- Integrasi langsung ke aplikasi SAKTI atau MyIntress.
- Multi-bahasa (struktur i18n tetap disiapkan agar bisa ditambah).
- Versioning per rilis SAKTI (bisa fase lanjutan dengan `starlight-versions`).

## Fitur lanjutan (fase 5)

- **Tanya AI**: jawaban kalimat berbasis artikel KB (RAG), selalu menyertakan link sumber.
- Analitik query tanpa hasil → backlog penulisan artikel.

## Metrik sukses

| Metrik | Target |
|---|---|
| Cakupan migrasi | 100% item di `sources/manifest.json` berstatus `dimigrasi` atau `ditolak` (dengan alasan) |
| Kualitas pencarian (`pnpm search:eval`) | Artikel yang diharapkan muncul di top-3 untuk ≥ 80% query uji |
| Lighthouse (mobile) | Performance ≥ 90, Accessibility ≥ 95 |
| Waktu review PR konten | Median ≤ 3 hari kerja |
| Query tanpa hasil | Turun bulan ke bulan |
