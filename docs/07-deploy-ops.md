# 07 — Deploy & Operasional

## Hosting (default: Cloudflare Pages)

- Repo GitHub → Cloudflare Pages (build `pnpm build`, output `dist/`).
- Preview deploy otomatis per PR (reviewer konten bisa melihat hasil sebelum merge).
- Pages Functions untuk `/api/search`, `/api/tanya`, dan Keystatic.
- Domain: tunggu K3 (`09-keputusan-terbuka.md`). Sementara pakai `*.pages.dev`.

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

Simpan di `.env` lokal (di-.gitignore) + secret di Cloudflare/GitHub. Sediakan `.env.example`.

## Analitik & pemeliharaan

- Analitik tanpa cookie (Cloudflare Web Analytics atau Umami self-host).
- Event: `search` (query ternormalisasi, jumlah hasil, level), `search_zero`, `feedback` (👍/👎 + url), `tanya_ai`.
- Laporan bulanan otomatis (fase 6): 20 query tanpa hasil teratas, artikel dengan 👎 terbanyak, artikel `terakhir_diverifikasi` > 12 bulan → buka issue.

## Keamanan

- Header keamanan via `public/_headers` (CSP ketat, `X-Content-Type-Options`, `Referrer-Policy`).
- API: rate limit, validasi input, tanpa log IP.
- Dependabot aktif.
