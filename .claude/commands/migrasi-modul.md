---
description: Migrasi seluruh konten satu modul SAKTI dari sumber ke artikel MDX
argument-hint: <slug-modul>
---

Migrasikan modul **$ARGUMENTS** ke knowledge base.

1. Baca `CLAUDE.md`, `docs/03-migrasi-konten.md`, dan entri modul `$ARGUMENTS` di `config/modul.yaml`.
2. Ambil semua baris `sources/peta-konten.csv` dengan `modul = $ARGUMENTS`. Jika belum ada baris, berhenti dan laporkan.
3. Buat branch `konten/migrasi-$ARGUMENTS`.
4. Untuk setiap baris, buat atau perbarui artikel di `src/content/docs/<target_path>.mdx` memakai `templates/artikel-juknis.mdx` (atau `templates/faq.mdx` untuk FAQ):
   - Isi hanya dari `sources/extracted/<id>/` yang tercantum. Jangan menambah langkah yang tidak ada di sumber.
   - Gabungkan sumber duplikat sesuai aturan dedup.
   - Pilih screenshot seperlunya, crop, WebP, blur data pribadi. Jika ragu ada data pribadi, jangan pakai gambar itu.
   - Isi `kata_kunci` 3–8 istilah yang mungkin diketik pengguna; tambahkan istilah baru ke `src/data/sinonim.json`.
   - `status: review`; set `perlu_review: true` bila ada keraguan.
5. Perbarui status manifest menjadi `didraft`.
6. Tambahkan minimal 4 query uji untuk modul ini di `tests/search/queries.yaml`.
7. Jalankan `pnpm check:content`, `pnpm build`, `pnpm check:links`. Perbaiki sampai lolos.
8. Commit per sub-menu (`content($ARGUMENTS): <sub-menu>`), lalu buat PR berjudul `content($ARGUMENTS): migrasi awal` dengan ringkasan: jumlah artikel, artikel `perlu_review`, item yang ditolak beserta alasannya.
9. Centang modul ini di `docs/08-rencana-kerja.md` fase 4.
