# 06 — Kontributor & Admin

## Peran pengelola

| Peran | Siapa | Akses | Alur |
|---|---|---|---|
| **Admin** | Pemilik proyek + 1–2 orang | Maintainer repo, bisa merge ke `main` | Review & merge, kelola Keystatic, CODEOWNERS |
| **Pemilik modul** | 1–2 orang per modul | Write ke repo, wajib review PR modulnya | Ditetapkan di `.github/CODEOWNERS` |
| **Editor** | Tim internal non-teknis | Write ke repo (via Keystatic) | Tulis/edit di `/keystatic` → branch → PR |
| **Kontributor publik** | Siapa saja (pengguna SAKTI) | Tidak ada akses tulis | Tombol "Edit halaman ini" → fork → PR, atau isi issue "Laporkan kesalahan" |

## 1. Tombol "Edit halaman ini" (Starlight bawaan)

```js
// astro.config.mjs
starlight({
  editLink: { baseUrl: 'https://github.com/<org>/<repo>/edit/main/' },
  lastUpdated: true,
})
```

Tambahkan link kedua "Laporkan kesalahan" → `https://github.com/<org>/<repo>/issues/new?template=koreksi-konten.yml&title=[Koreksi]%20<judul>&url=<url>` (override komponen `EditLink` atau `Footer`).

## 2. Keystatic (`/keystatic`)

- Pasang `@keystatic/core` dan `@keystatic/astro`. Keystatic butuh route server, jadi aktifkan adapter (Cloudflare) dengan output hybrid/server hanya untuk route `/keystatic` dan `/api/keystatic`; halaman docs tetap prerender statis.
- `keystatic.config.ts`:
  - `storage: { kind: 'github', repo: '<org>/<repo>', branchPrefix: 'konten/' }` → setiap editan masuk branch `konten/...`, lalu PR.
  - Satu collection per modul (`path: 'src/content/docs/<modul>/**'`, `format: { contentField: 'isi' }`, ekstensi `.mdx`), field sesuai skema frontmatter di `02-arsitektur-informasi.md` (pilihan `modul`/`peran`/`jenis` dibaca dari `config/modul.yaml`).
  - Komponen MDX yang tersedia di editor: `Aside` (note/tip/caution/danger), `Steps`, `Tabs`, `MenuSakti`, gambar.
  - Gambar diunggah ke `src/assets/<modul>/<slug>/`.
- Login dengan GitHub App (ikuti dokumentasi Keystatic GitHub mode). Simpan secret di environment hosting (`KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`, `KEYSTATIC_SECRET`, `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`).
- Tulis panduan editor di `/kontribusi/editor-keystatic/` dengan screenshot.

## 3. Aturan repo GitHub

- Branch protection `main`: wajib PR, minimal 1 approval dari CODEOWNERS, CI hijau, tidak boleh force-push.
- `.github/CODEOWNERS` dibangkitkan dari `config/modul.yaml` (tambahkan field `pemilik` per modul setelah K5 dijawab):
  ```
  /src/content/docs/komitmen/   @pemilik-komitmen
  /src/content/docs/persediaan/ @pemilik-persediaan
  *                             @admin
  ```
- Template:
  - `.github/pull_request_template.md` — checklist review (lihat `03-migrasi-konten.md` tahap 5).
  - `.github/ISSUE_TEMPLATE/koreksi-konten.yml` — URL halaman, apa yang salah, versi SAKTI, screenshot (ingatkan untuk blur data pribadi).
  - `.github/ISSUE_TEMPLATE/usulan-artikel.yml` — query yang dicari, modul, peran.
- Label: `modul:<slug>`, `jenis:koreksi|baru|migrasi`, `perlu-review`.

## 4. Halaman `/kontribusi/`

- `index.mdx` — cara kontribusi (3 jalur), etika (tanpa data pribadi), standar penulisan ringkas.
- `panduan-menulis.mdx` — salinan aturan konten `CLAUDE.md` §6 versi manusia + contoh baik/buruk.
- `editor-keystatic.mdx` — langkah memakai editor.
- `lewat-github.mdx` — langkah edit + PR untuk yang terbiasa GitHub.
