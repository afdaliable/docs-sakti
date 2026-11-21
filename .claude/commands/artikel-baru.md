---
description: Buat satu artikel baru dari file/URL sumber
argument-hint: <modul>/<sub>/<slug> <url-atau-path-sumber>
---

Buat artikel baru: $ARGUMENTS

1. Argumen pertama = `target_path`, sisanya = sumber (URL atau path file di `sources/raw/manual/`).
2. Jika sumber belum ada di `sources/manifest.json`, tambahkan item baru lalu unduh dan ekstrak sesuai `docs/03-migrasi-konten.md`.
3. Tulis artikel memakai `templates/artikel-juknis.mdx` dan aturan `CLAUDE.md` §6.
4. Tambahkan baris ke `sources/peta-konten.csv` dan minimal 1 query uji di `tests/search/queries.yaml`.
5. Jalankan `pnpm check:content && pnpm build`, lalu commit `content(<modul>): tambah <slug>`.
