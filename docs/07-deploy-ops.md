# 07 — Deploy & Operasional

## Hosting (Cloudflare Workers + static assets)

- Repo GitHub → Cloudflare Workers Builds (build `pnpm build:pages`, deploy `npx wrangler deploy`, aset `dist/` sesuai `wrangler.jsonc`). `build:pages` melengkapi riwayat git yang diambil dangkal oleh Workers Builds, lalu menjalankan `pnpm build`.
- Langkah pemilik (membuat proyek, variabel lingkungan, custom domain, cek pasca-deploy, rollback): `docs/deploy-cloudflare.md`. Agent tidak men-deploy dan tidak memanggil API Cloudflare.
- Preview deploy otomatis per PR (Preview Builds, belum diaktifkan; reviewer konten bisa melihat hasil sebelum merge).
- Skrip Worker (`main`) untuk `/api/search`, `/api/tanya`, dan Keystatic (belum ada; situs statis murni).
- Domain produksi: `https://docs.sakti.ai.id` (K3, dijawab 23 Nov 2026). `site` di `astro.config.mjs` memakai `SITUS_URL` (`src/lib/situs.ts`) sebagai dasar canonical, sitemap, dan `robots.txt` (`src/pages/robots.txt.ts`). Alamat `*.workers.dev` tetap ada tetapi diberi `X-Robots-Tag: noindex`.
- Halaman tidak ditemukan: `404.html` di akar hasil build, disajikan dengan status 404 via `not_found_handling: "404-page"`.

Alternatif jika harus di infrastruktur sendiri: build statis → Nginx/Caddy di VPS, API search sebagai service Node terpisah (Docker Compose).

## CI — `.github/workflows/ci.yml`

Jalan pada setiap PR dan push ke `main`:

1. `pnpm install --frozen-lockfile`
2. `pnpm check:content`
3. `pnpm build` (termasuk index Pagefind)
4. `pnpm check:links`
5. `pnpm check:dist` (sitemap, `robots.txt`, `_headers` dan hash CSP, 404, tanpa alamat localhost/`pages.dev`/`workers.dev`, artikel `perlu_review` tetap tampil)
6. `pnpm search:eval --level 1` (wajib lolos ambang setelah fase 4)
7. Lighthouse CI di 3 halaman (landing, halaman modul, satu artikel) — peringatan saja

Workflow terpisah `embeddings.yml` (push ke `main`): jalankan `scripts/search/build-embeddings.ts` untuk chunk yang berubah.

Workflow terjadwal `cek-sumber.yml` (mingguan): cek apakah URL sumber asli masih hidup dan apakah `modifiedTime` file Drive berubah sejak dimigrasi → buka issue otomatis "Sumber berubah: <judul>".

## Environment variables

| Nama | Dipakai | Keterangan |
|---|---|---|
| `KEYSTATIC_*` | Keystatic | lihat `06-kontributor-admin.md` |
| `CF_ACCOUNT_ID`, `CF_API_TOKEN` | build embeddings (CI) | scope minimal: Vectorize + Workers AI |
| `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` | Tanya AI | endpoint OpenAI-compatible |
| `GOOGLE_API_KEY` | migrasi (lokal saja) | Drive API read-only, jangan masuk CI |
| `NODE_VERSION`, `PNPM_VERSION` | build Cloudflare (Workers Builds) | bukan secret; nilainya sama dengan `.nvmrc` dan `packageManager` (lihat `deploy-cloudflare.md`) |

Simpan di `.env` lokal (di-.gitignore) + secret di Cloudflare/GitHub. Sediakan `.env.example`.

## Analitik & pemeliharaan

- Analitik tanpa cookie (Cloudflare Web Analytics atau Umami self-host).
- Event: `search` (query ternormalisasi, jumlah hasil, level), `search_zero`, `feedback` (👍/👎 + url), `tanya_ai`.
- Laporan bulanan otomatis (fase 6): 20 query tanpa hasil teratas, artikel dengan 👎 terbanyak, artikel `terakhir_diverifikasi` > 12 bulan → buka issue.

## Keamanan

- Header keamanan via `public/_headers`: CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`; cache panjang (`immutable`) hanya untuk `/_astro/*`, HTML selalu divalidasi ulang.
- CSP: `script-src 'self' 'wasm-unsafe-eval'` + hash sha256 setiap skrip inline, tanpa `'unsafe-inline'`/`'unsafe-eval'`. Hash diisi saat build oleh `scripts/csp-headers.ts` (K71). `style-src` memakai `'unsafe-inline'` karena atribut `style` Starlight.
- Tes e2e dan `search:eval` menyajikan hasil build dengan header dari `_headers` (`tests/e2e/server.ts`) dan gagal bila ada pelanggaran CSP.
- API: rate limit, validasi input, tanpa log IP.
- Dependabot aktif.
