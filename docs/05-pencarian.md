# 05 — Pencarian

Target: pengguna menemukan artikel walau kata yang diketik berbeda dari judul. Contoh: "gak bisa login" → MFA / reset user; "batal spm" → Koreksi SPM; "barang rusak" → Persediaan › Transaksi Keluar › Rusak.

Dibangun bertahap. **Setiap level harus tetap berfungsi walau level di atasnya mati** (degradasi bertahap).

## Level 1 — Keyword + fuzzy + sinonim (statis, wajib MVP)

- **Pagefind** (bawaan Starlight) sebagai index full-text.
- `BigSearch` memakai Pagefind JS API (`/pagefind/pagefind.js` → `pagefind.search()` / `debouncedSearch()`), bukan modal bawaan.
- Bobot: judul (`data-pagefind-weight="10"`), `kata_kunci` (weight 7, dirender tersembunyi), heading (5), isi (1).
- Filter Pagefind: `data-pagefind-filter="modul"`, `peran`, `jenis`.
- **Ekspansi sinonim di sisi klien**: sebelum query dikirim, cocokkan token dengan `src/data/sinonim.json`; jalankan query asli + query hasil ekspansi, gabungkan hasil (dedup URL, ambil skor tertinggi).
- Kata sehari-hari dan kata umum kueri ("gak" → "tidak", "cara", "sakti") diatur di `src/data/kata-kueri.json` (K61), terpisah dari glosarium.
- **Toleransi typo**: jika Pagefind memberi < 3 hasil, jalankan pencocokan fuzzy (Fuse.js atau MiniSearch `fuzzy: 0.2`) terhadap index ringan berisi judul + kata_kunci + heading (`/search-lite.json`, dibuat saat build).

## Level 2 — Semantik / hybrid (target MVP)

Mencari berdasarkan makna dengan embedding multilingual.

### Pilihan arsitektur (default: Opsi A)

**Opsi A — Cloudflare (tanpa server sendiri)**
- Build: `scripts/search/build-embeddings.ts` memecah artikel terbit menjadi chunk per heading (200–400 token, overlap 50), membuat embedding dengan model multilingual (`@cf/baai/bge-m3` di Workers AI, atau model lain yang mendukung bahasa Indonesia), lalu upsert ke **Cloudflare Vectorize** dengan metadata `{url, judul, heading, modul, peran, jenis}`. Hanya chunk yang berubah yang diproses ulang (hash konten).
- Runtime: Pages Function `functions/api/search.ts` — embed query → query Vectorize top-20 → kembalikan hasil.
- Klien: `BigSearch` menjalankan Pagefind (Level 1) dan `/api/search` **paralel**, lalu menggabungkan dengan **Reciprocal Rank Fusion** (k=60). Jika API timeout > 800 ms atau error, tampilkan hasil Level 1 saja.

**Opsi B — Self-host di VPS/Synology**
- Meilisearch (hybrid search dengan embedder) atau Typesense (ada plugin `starlight-docsearch-typesense`), di belakang reverse proxy + rate limit.
- Embedding via endpoint OpenAI-compatible (misal 9Router milik pemilik proyek) atau model lokal.

**Opsi C — Sepenuhnya statis**
- Orama dengan vektor yang dihitung saat build; query di-embed di browser dengan transformers.js. Kekurangan: model multilingual berukuran puluhan MB untuk diunduh pengguna → hanya bila A/B tidak memungkinkan.

> Agent: verifikasi API/model terbaru (nama model, batas gratis, dimensi vektor) di dokumentasi resmi sebelum implementasi. Jangan pakai model embedding yang hanya berbahasa Inggris.

### Kontrak API (berlaku untuk semua opsi)

```
GET /api/search?q=<query>&modul=<slug>&peran=<slug>&limit=20
200 → { "hasil": [ { "url": "/komitmen/ruh/pencatatan-kontrak/#langkah", "judul": "...", "heading": "...", "cuplikan": "...", "modul": "komitmen", "skor": 0.83 } ], "ms": 120 }
```

Rate limit: 30 request/menit per IP. Query dicatat **tanpa IP** untuk analitik (fase 6).

## Level 3 — Tanya AI (fase 5, opsional)

- Endpoint `POST /api/tanya` `{ pertanyaan }` → ambil 5 chunk teratas (Level 2) → LLM (endpoint OpenAI-compatible; env `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`) dengan system prompt:
  - Jawab **hanya** dari konteks yang diberikan, bahasa Indonesia, langkah bernomor.
  - Jika konteks tidak cukup: katakan tidak tahu dan sarankan kontak HAI DJPb.
  - Selalu sertakan daftar link artikel sumber.
- UI: tombol "Tanya AI" di bawah hasil BigSearch dan di halaman `/cari/`; jawaban di-stream; label "Jawaban dibuat AI — periksa artikel sumber".
- Cache jawaban per pertanyaan ternormalisasi (KV, 7 hari), rate limit 5/menit per IP, batas panjang pertanyaan 300 karakter.

## Evaluasi (`pnpm search:eval`)

`tests/search/queries.yaml` — minimal 40 query, ditulis dengan bahasa pengguna nyata:

```yaml
- q: "gak bisa login sakti"
  harap: ["/mulai/mfa/", "/mulai/pendaftaran-user/"]
- q: "cara batal spm"
  harap: ["/akuntansi-pelaporan/koreksi-spm-jurnal-manual/"]
- q: "barang persediaan rusak"
  harap: ["/persediaan/transaksi-keluar/rusak/"]
- q: "input kontrak"
  harap: ["/komitmen/ruh/pencatatan-kontrak/"]
- q: "tutup buku akhir tahun"
  harap: ["/akuntansi-pelaporan/tutup-buku/tutup-buku/", "/persediaan/tutup-buku/tutup-periode-persediaan/"]
```

Script menjalankan setiap query ke Level 1 dan ke pipeline hybrid, lalu melaporkan hit@3 dan MRR. CI gagal jika hit@3 hybrid < 0,80 (setelah fase 4 selesai).
