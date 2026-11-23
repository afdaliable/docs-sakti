# 06 — Kontributor & Admin

> **Status 23 Nov 2026.** Dokumen ini rancangan. Yang sudah berjalan: tombol **Edit halaman** dan tautan **Laporkan
> kesalahan** (bagian 1), CODEOWNERS/templat/`labels.yml` sebagai berkas dan ruleset `main-protection` (bagian 3), halaman
> `/kontribusi/` (bagian 4), dan dokumen komunitas di akar repo (`CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`).
> Yang belum: Keystatic (bagian 2, tugas 5.4), pemilik modul (K5), dan label di repo. Panduan kontributor:
> `CONTRIBUTING.md`; langkah pemilik: `docs/setup-github.md`.

## Peran pengelola

| Peran | Siapa | Akses | Alur |
|---|---|---|---|
| **Admin** | Pemilik proyek + 1–2 orang | Maintainer repo, bisa merge ke `main` | Review & merge, kelola Keystatic, CODEOWNERS |
| **Pemilik modul** | 1–2 orang per modul | Write ke repo, wajib review PR modulnya | Ditetapkan di `.github/CODEOWNERS` |
| **Editor** | Tim internal non-teknis | Write ke repo (via Keystatic) | Tulis/edit di `/keystatic` → branch → PR |
| **Kontributor publik** | Siapa saja (pengguna SAKTI) | Tidak ada akses tulis | Tombol "Edit halaman" → fork → PR, atau isi issue "Laporkan kesalahan" |

Saat ini admin = `@afdaliable`; belum ada pemilik modul maupun editor. Peran Editor baru berlaku setelah Keystatic aktif.

## 1. Tombol "Edit halaman" (Starlight bawaan)

Sudah terpasang: `editLink.baseUrl` = `` `${REPO_URL}/edit/main/` `` (`astro.config.mjs`) dengan `REPO_URL`
(`src/lib/situs.ts`) = `https://github.com/afdaliable/docs-sakti`. Tautan **Laporkan kesalahan** dibentuk oleh
`tautanKoreksi()` di berkas yang sama dan ditampilkan lewat override `Footer` (`src/components/overrides/Footer.astro`).

## 2. Keystatic (`/keystatic`)

**Status: belum dipasang** (tugas 5.4 ditunda; butuh GitHub App). Catatan: situs kini statis murni di Cloudflare Worker +
static assets tanpa adapter (K71), dan `docs/deploy-cloudflare.md` melarang menambahkan `@astrojs/cloudflare`; memasang
Keystatic berarti meninjau ulang aturan itu.

- Pasang `@keystatic/core` dan `@keystatic/astro`. Keystatic butuh route server, jadi aktifkan adapter (Cloudflare) dengan output hybrid/server hanya untuk route `/keystatic` dan `/api/keystatic`; halaman docs tetap prerender statis.
- `keystatic.config.ts`:
  - `storage: { kind: 'github', repo: '<org>/<repo>', branchPrefix: 'konten/' }` → setiap editan masuk branch `konten/...`, lalu PR.
  - Satu collection per modul (`path: 'src/content/docs/<modul>/**'`, `format: { contentField: 'isi' }`, ekstensi `.mdx`), field sesuai skema frontmatter di `02-arsitektur-informasi.md` (pilihan `modul`/`peran`/`jenis` dibaca dari `config/modul.yaml`).
  - Komponen MDX yang tersedia di editor: `Aside` (note/tip/caution/danger), `Steps`, `Tabs`, `MenuSakti`, gambar.
  - Gambar diunggah ke `src/assets/<modul>/<slug>/`.
- Login dengan GitHub App (ikuti dokumentasi Keystatic GitHub mode). Simpan secret di environment hosting (`KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`, `KEYSTATIC_SECRET`, `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`).
- Tulis panduan editor di `/kontribusi/editor-keystatic/` dengan screenshot.

## 3. Aturan repo GitHub

- Ruleset `main-protection` (aktif sejak 23 Nov 2026, K75): wajib PR, 1 approval, review Code Owners, check CI `Periksa
  konten, build, dan tes`, larang force-push dan penghapusan branch; admin repo boleh bypass. Rincian dan akibat:
  `docs/setup-github.md` bagian 5.
- `.github/CODEOWNERS` dibangkitkan dari `config/modul.yaml` (tambahkan field `pemilik` per modul setelah K5 dijawab);
  saat ini semua berkas ke `@afdaliable`, baris modul masih komentar sampai K5 dijawab:
  ```
  /src/content/docs/komitmen/   @pemilik-komitmen
  /src/content/docs/persediaan/ @pemilik-persediaan
  *                             @admin
  ```
- Template:
  - `.github/pull_request_template.md` — checklist review (lihat `03-migrasi-konten.md` tahap 5).
  - `.github/ISSUE_TEMPLATE/koreksi-konten.yml` — URL halaman, apa yang salah, versi SAKTI, screenshot (ingatkan untuk blur data pribadi).
  - `.github/ISSUE_TEMPLATE/usulan-artikel.yml` — query yang dicari, modul, peran.
  - `.github/ISSUE_TEMPLATE/config.yml` — tautan pengalihan (HAI DJPb, panduan kontribusi, kebijakan keamanan).
  - Dokumen komunitas di akar repo: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`.
- Label: `modul:<slug>`, `jenis:koreksi|baru|migrasi`, `perlu-review` — didefinisikan di `.github/labels.yml`; belum dibuat
  di repo.

## 4. Halaman `/kontribusi/`

- `index.mdx` — cara kontribusi (3 jalur), etika (tanpa data pribadi), standar penulisan ringkas.
- `panduan-menulis.mdx` — salinan aturan konten `CLAUDE.md` §6 versi manusia + contoh baik/buruk.
- `editor-keystatic.mdx` — langkah memakai editor.
- `lewat-github.mdx` — langkah edit + PR untuk yang terbiasa GitHub.

Keempat halaman sudah ada; `editor-keystatic.mdx` hanya menyatakan "belum tersedia".
