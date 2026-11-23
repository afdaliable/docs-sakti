# 07 — Deploy & Operasional

## Hosting (default: Cloudflare Pages)

- Repo GitHub → Cloudflare Pages (build `pnpm build:pages`, output `dist/`). `build:pages` melengkapi riwayat git yang diambil dangkal oleh Pages, lalu menjalankan `pnpm build`.
- Langkah pemilik (membuat proyek, variabel lingkungan, custom domain, cek pasca-deploy, rollback): `docs/deploy-cloudflare.md`. Agent tidak men-deploy dan tidak memanggil API Cloudflare.
- Preview deploy otomatis per PR (reviewer konten bisa melihat hasil sebelum merge).
- Pages Functions untuk `/api/search`, `/api/tanya`, dan Keystatic.
- Domain produksi: `https://docs.sakti.ai.id` (K3, dijawab 23 Nov 2026). `site` di `astro.config.mjs` memakai `SITUS_URL` (`src/lib/situs.ts`) sebagai dasar canonical, sitemap, dan `robots.txt` (`src/pages/robots.txt.ts`). Alamat `*.pages.dev` tetap ada tetapi diberi `X-Robots-Tag: noindex`.
- Halaman tidak ditemukan: `404.html` di akar hasil build; Pages menyajikannya dengan status 404.

Alternatif jika harus di infrastruktur sendiri: build statis → Nginx/Caddy di VPS, API search sebagai service Node terpisah (Docker Compose).

## CI — `.github/workflows/ci.yml`

Jalan pada setiap PR dan push ke `main`:

1. `pnpm install --frozen-lockfile`
2. `pnpm check:content`
3. `pnpm build` (termasuk index Pagefind)
4. `pnpm check:links`
5. `pnpm search:eval --level 1` (wajib lolos ambang setelah fase 4)
6. Lighthouse CI di 3 halaman (landing, halaman modul, satu artikel) — peringatan saja

Workflow terpisah `embeddings.yml` (push ke `main`): jalankan `scripts/search/build-embeddings.ts` untuk chunk yang berubah.

Workflow terjadwal `cek-sumber.yml` (mingguan): cek apakah URL sumber asli masih hidup dan apakah `modifiedTime` file Drive berubah sejak dimigrasi → buka issue otomatis "Sumber berubah: <judul>".

## Environment variables

| Nama | Dipakai | Keterangan |
|---|---|---|
| `KEYSTATIC_*` | Keystatic | lihat `06-kontributor-admin.md` |
| `CF_ACCOUNT_ID`, `CF_API_TOKEN` | build embeddings (CI) | scope minimal: Vectorize + Workers AI |
| `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` | Tanya AI | endpoint OpenAI-compatible |
| `GOOGLE_API_KEY` | migrasi (lokal saja) | Drive API read-only, jangan masuk CI |
| `NODE_VERSION`, `PNPM_VERSION` | build Cloudflare Pages | bukan secret; nilainya sama dengan `.nvmrc` dan `packageManager` (lihat `deploy-cloudflare.md`) |

Simpan di `.env` lokal (di-.gitignore) + secret di Cloudflare/GitHub. Sediakan `.env.example`.

## Analitik & pemeliharaan

- Analitik tanpa cookie (Cloudflare Web Analytics atau Umami self-host).
- Event: `search` (query ternormalisasi, jumlah hasil, level), `search_zero`, `feedback` (👍/👎 + url), `tanya_ai`.
- Laporan bulanan otomatis (fase 6): 20 query tanpa hasil teratas, artikel dengan 👎 terbanyak, artikel `terakhir_diverifikasi` > 12 bulan → buka issue.

## Keamanan

- Header keamanan via `public/_headers`: CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`; cache panjang (`immutable`) hanya untuk `/_astro/*`, HTML selalu divalidasi ulang.
- CSP: `script-src 'self' 'wasm-unsafe-eval'` + hash sha256 setiap skrip inline, tanpa `'unsafe-inline'`/`'unsafe-eval'`. Hash diisi saat build oleh `scripts/csp-headers.ts` (K71). `style-src` memakai `'unsafe-inline'` karena atribut `style` Starlight.
- API: rate limit, validasi input, tanpa log IP.
- Dependabot aktif.
