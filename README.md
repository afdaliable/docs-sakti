# SAKTI Knowledge Base

[![CI](https://github.com/afdaliable/docs-sakti/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/afdaliable/docs-sakti/actions/workflows/ci.yml)
[![Lisensi kode: MIT](https://img.shields.io/badge/kode-MIT-blue.svg)](LICENSE)
[![Lisensi konten: CC BY 4.0](https://img.shields.io/badge/konten-CC%20BY%204.0-lightgrey.svg)](LICENSE-CONTENT.md)

Knowledge base publik yang menyatukan panduan aplikasi SAKTI (Sistem Aplikasi Keuangan Tingkat Instansi), disusun per modul sesuai menu aplikasi dan dapat dicari per langkah.

**Situs:** <https://docs.sakti.ai.id>

> **Keterangan.** Proyek ini adalah kompilasi panduan SAKTI dari sumber publik dan dikelola komunitas. Hubungan proyek ini
> dengan DJPb/Kementerian Keuangan belum ditetapkan (K4 dan K73 di
> [`docs/09-keputusan-terbuka.md`](docs/09-keputusan-terbuka.md)), dan proyek ini tidak memakai logo instansi. Bila isi
> artikel berbeda dari petunjuk teknis, peraturan, atau pengumuman resmi, yang diikuti adalah sumber resminya.

## Isi

Knowledge base ini disusun per modul sesuai menu SAKTI (`config/modul.yaml`, 19 modul):

| Modul | Artikel |
|---|---|
| Mulai Menggunakan SAKTI | 20 |
| Administrasi | 11 |
| Referensi | 3 |
| Komitmen | 33 |
| Bendahara | 17 |
| Pembayaran | 41 |
| Persediaan | 38 |
| Aset Tetap | 103 |
| Piutang | 16 |
| Akuntansi dan Pelaporan | 20 |
| KPPN | 11 |

Delapan modul — Sinkronisasi Renja-RKA, Penganggaran, Bendahara Valas, Komitmen Valas, Bendahara Umum BLU, KPJM, Laporan, dan Transfer ke Daerah — baru berisi halaman indeks karena belum ada sumbernya.

Bagian lintas modul: halaman menurut peran pengguna (`/peran/`), Peraturan, FAQ, Glosarium, Bantuan & Kontak, dan Cara Berkontribusi (`/kontribusi/`).

Pencarian memakai Pagefind (indeks statis saat build) dengan ekspansi sinonim dan istilah SAKTI (`src/data/sinonim.json`, `src/data/kata-kueri.json`) serta fallback salah ketik berbasis MiniSearch. Belum ada pencarian semantik maupun Tanya AI.

Setiap artikel mencantumkan sumber dan tanggal diambil, tanggal terakhir diperbarui, tombol **Edit halaman**, dan tautan **Laporkan kesalahan**.

## Status proyek

Keadaan per 23 November 2026:

- Situs sudah terbit di <https://docs.sakti.ai.id> dan diperbarui otomatis pada setiap push ke `main`.
- Konten adalah hasil migrasi awal (draf pertama) dari sumber dan **belum seluruhnya diverifikasi**. Dari 400 halaman, 318
  adalah artikel dan semuanya masih berstatus `review` (tampil dengan penanda "Sedang ditinjau"); yang berstatus `terbit` baru
  71 halaman indeks.
- 149 halaman bertanda `perlu_review: true` karena sumbernya ambigu atau tidak lengkap. Halaman itu tetap tampil di situs dan
  pencarian dengan kotak "Perlu verifikasi"; hanya `status: draft` yang disembunyikan (K70).
- Pemilik modul belum ditetapkan (K5), sehingga belum ada artikel yang diverifikasi pemilik modulnya. Semua perubahan ditinjau
  pemelihara repo.
- Delapan modul belum punya sumber dan baru berisi halaman indeks.
- Belum ada: pencarian semantik, Tanya AI, editor berbasis web, dan analitik. Rencana dan statusnya ada di
  [`docs/08-rencana-kerja.md`](docs/08-rencana-kerja.md).

## Menjalankan secara lokal

Prasyarat: Node.js 26 sesuai `.nvmrc` (minimum `>=22.23.4`) dan pnpm 12.21.0 sesuai `packageManager` di `package.json`.

```bash
pnpm install
pnpm dev
```

| Perintah | Kegunaan |
|---|---|
| `pnpm dev` | Server pengembangan lokal |
| `pnpm build` | Build ke `dist/`; sekaligus membangun indeks Pagefind dan memvalidasi tautan internal |
| `pnpm preview` | Menyajikan hasil build secara lokal |
| `pnpm check:content` | Lint frontmatter dan aturan konten, termasuk pola data pribadi |
| `pnpm check:links` | Validasi tautan; menjalankan build |
| `pnpm check:dist` | Memeriksa `dist/` setelah build: sitemap, robots, `_headers`/CSP, 404 |
| `pnpm test` | Tes unit (`tests/*.test.ts`) |
| `pnpm search:eval --level 1` | Uji kualitas pencarian dari `tests/search/queries.yaml` |
| `pnpm test:e2e` | Tes end-to-end Playwright terhadap `dist/` |

Catatan: `pnpm search:eval` dan `pnpm test:e2e` memakai browser — keduanya butuh `dist/` hasil build dan Chromium (`pnpm exec playwright install chromium`). Skrip migrasi (`migrate:inventory`, `migrate:extract`) dan `build:github` hanya untuk pemelihara; `migrate:draft` belum tersedia.

## Struktur folder

```
config/modul.yaml            daftar modul SAKTI; sumber kebenaran sidebar dan CODEOWNERS
docs/                        dokumen perencanaan (lihat bagian "Dokumen perencanaan")
templates/                   template artikel
scripts/                     inventory/, extract/, search/, check-content.ts, check-dist.ts,
                             build-github.ts, dan skrip pemeliharaan lain
sources/                     hanya manifest.json, menu.json, peta-konten.csv, dan
                             laporan-inventaris.md yang di-commit; raw/ dan extracted/ tidak
src/content/docs/<modul>/    artikel (MDX)
src/assets/                  gambar artikel
src/components/              komponen situs, termasuk override Starlight
src/lib/                     logika situs (pencarian, status halaman, tautan repo)
src/pages/                   route non-konten (pencarian, peran, robots.txt)
src/data/                    sinonim.json, kata-kueri.json, dan data lain
public/_headers              header keamanan dan cache Cloudflare
tests/                       tes unit, e2e/, dan search/queries.yaml
.github/                     workflow CI, CODEOWNERS, labels.yml, template PR/issue
astro.config.mjs             konfigurasi Astro + Starlight
wrangler.jsonc               konfigurasi deploy Cloudflare Worker
CLAUDE.md, .claude/commands/, prompts/   instruksi untuk agent AI yang membantu mengerjakan repo ini
```

## Berkontribusi

Koreksi dan usulan artikel diterima. Tanpa menulis PR pun Anda bisa membantu lewat tautan **Laporkan kesalahan** di bagian bawah setiap artikel. Alur, aturan konten, dan larangan data pribadi ada di [CONTRIBUTING.md](CONTRIBUTING.md); semua kontributor mengikuti [Kode Etik](CODE_OF_CONDUCT.md). Kerentanan situs dan kebocoran data pribadi dilaporkan menurut [SECURITY.md](SECURITY.md). Kendala pada aplikasi SAKTI sendiri disampaikan ke HAI DJPb (<https://hai.kemenkeu.go.id/>).

## Deploy

Situs <https://docs.sakti.ai.id> dijalankan sebagai Cloudflare Worker `docs-sakti` dengan static assets lewat Workers Builds: setiap push ke `main` membangun dengan `pnpm build:pages` lalu men-deploy `npx wrangler deploy` memakai `wrangler.jsonc` — tanpa adapter dan tanpa secret. CI GitHub tidak men-deploy. Langkah pemilik dan cek pasca-deploy: [`docs/deploy-cloudflare.md`](docs/deploy-cloudflare.md).

## Sumber dan atribusi

Artikel di knowledge base ini adalah **ringkasan dan penulisan ulang** dari materi panduan SAKTI
yang tersebar di tiga sumber berikut (inventaris lengkap: `docs/01-sumber-konten.md`):

| Sumber | Alamat |
|---|---|
| A — SAKTI Admin Knowledge Base | <https://sites.google.com/view/saktiadm/beranda> |
| B — Juknis SAKTI Pelaksanaan (Linktree) | <https://linktr.ee/juknissaktipelaksanaan> |
| B — folder Modul Bendahara | <https://drive.google.com/drive/folders/1whfBfo_kT4hI69H6Jjnwy9DQPOqrLei3> |
| B — folder Modul Komitmen | <https://drive.google.com/drive/folders/1lg7qCe3dif4bbgG7CMg8w3GapRPXtsqE> |
| B — folder Modul Pembayaran | <https://drive.google.com/drive/folders/1Lo1jqUetojYZyMnsKTpaSDFoXcX6vXw2> |
| B — folder Modul KPPN BUN | <https://drive.google.com/drive/folders/1cOx-1D1y5bBZyhO67HcW0VyK1K6PK11p> |
| C — SAKTI Pelaporan | <https://sites.google.com/view/saktipelaporan> |

- **Panduan resmi tetap berlaku.** Bila isi artikel berbeda dari petunjuk teknis, peraturan, atau
  pengumuman resmi, yang diikuti adalah sumber resminya.
- Setiap artikel mencantumkan dokumen asalnya (tautan dan tanggal diambil) di kolom `sumber` dan
  di bagian "Sumber" pada halaman artikel.
- Materi sumber tetap milik pemegang haknya masing-masing dan tidak ikut dilisensikan oleh repo
  ini (lihat "Lisensi").

## Lisensi

| Bagian | Lisensi | Berkas |
|---|---|---|
| Kode (`scripts/`, `src/components/`, `src/lib/`, `src/pages/`, `tests/`, konfigurasi) | MIT | `LICENSE` |
| Tulisan (`src/content/docs/`, `docs/`, `templates/`, `README.md`) | CC BY 4.0 | `LICENSE-CONTENT.md` |

Repo ini berlisensi ganda. **Kode** (`scripts/`, `src/components/`, `src/lib/`, `src/pages/`, `tests/`, dan berkas
konfigurasi) berlisensi [MIT](LICENSE). **Tulisan** (artikel di `src/content/docs/`, dokumen di `docs/`, templat di
`templates/`, dan `README.md`) berlisensi [CC BY 4.0](LICENSE-CONTENT.md): boleh disalin dan diubah, termasuk untuk tujuan
komersial, asalkan mencantumkan atribusi. Lisensi konten **tidak mencakup materi sumber pihak lain** (petunjuk teknis, slide,
peraturan, gambar dan tangkapan layar, nama dan logo instansi, label menu aplikasi SAKTI); materi itu mengikuti ketentuan
pemegang haknya masing-masing. Pemegang hak cipta di kedua berkas lisensi adalah `afdaliable` (akun GitHub pemilik proyek).
`CODE_OF_CONDUCT.md` adalah terjemahan Contributor Covenant 2.1 dan mengikuti lisensinya sendiri (CC BY 4.0, atribusi di
berkas itu).

## Dokumen perencanaan

| Dokumen | Isi |
|---|---|
| [`docs/00-prd.md`](docs/00-prd.md) | Tujuan, pengguna, ruang lingkup, metrik sukses |
| [`docs/01-sumber-konten.md`](docs/01-sumber-konten.md) | Inventaris sumber beserta URL |
| [`docs/02-arsitektur-informasi.md`](docs/02-arsitektur-informasi.md) | Struktur modul, URL, sidebar, taksonomi |
| [`docs/03-migrasi-konten.md`](docs/03-migrasi-konten.md) | Pipeline scraping → ekstraksi → MDX |
| [`docs/04-tampilan-ux.md`](docs/04-tampilan-ux.md) | Landing page, halaman modul, halaman artikel |
| [`docs/05-pencarian.md`](docs/05-pencarian.md) | Pencarian keyword + semantik + Tanya AI |
| [`docs/06-kontributor-admin.md`](docs/06-kontributor-admin.md) | Edit link, CMS, PR, CODEOWNERS |
| [`docs/07-deploy-ops.md`](docs/07-deploy-ops.md) | CI/CD, hosting, analitik |
| [`docs/08-rencana-kerja.md`](docs/08-rencana-kerja.md) | Daftar tugas per fase + kriteria selesai |
| [`docs/09-keputusan-terbuka.md`](docs/09-keputusan-terbuka.md) | Hal yang harus ditanyakan ke pemilik proyek |
| [`docs/deploy-cloudflare.md`](docs/deploy-cloudflare.md) | Langkah pemilik untuk deploy Cloudflare |
| [`docs/setup-github.md`](docs/setup-github.md) | Langkah pemilik untuk pengaturan repo GitHub |
