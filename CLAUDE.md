# CLAUDE.md — SAKTI Knowledge Base (Starlight)

File ini adalah instruksi tetap untuk agent Claude Code di repo ini. Baca seluruhnya sebelum mengerjakan apa pun.

## 1. Tujuan proyek

Membangun **satu knowledge base publik** untuk aplikasi **SAKTI** (Sistem Aplikasi Keuangan Tingkat Instansi, DJPb Kemenkeu). KB ini menggabungkan tiga sumber yang saat ini tersebar:

1. `https://sites.google.com/view/saktiadm/beranda` (SAKTI Admin)
2. `https://linktr.ee/juknissaktipelaksanaan` (Juknis Pelaksanaan: folder Google Drive)
3. `https://sites.google.com/view/saktipelaporan` (SAKTI Pelaporan)

Konten disusun **per modul sesuai menu SAKTI** (lihat `config/modul.yaml`), dengan tampilan ala help center: search bar besar di tengah halaman awal, pencarian yang memahami makna (bukan hanya teks yang sama persis), dan alur kontribusi untuk admin dan kontributor.

## 2. Urutan baca dokumen

| Urutan | File | Isi |
|---|---|---|
| 1 | `docs/00-prd.md` | Tujuan, pengguna, ruang lingkup, metrik sukses |
| 2 | `docs/01-sumber-konten.md` | Inventaris sumber beserta URL |
| 3 | `docs/02-arsitektur-informasi.md` | Struktur modul, URL, sidebar, taksonomi |
| 4 | `docs/03-migrasi-konten.md` | Pipeline scraping → ekstraksi → MDX |
| 5 | `docs/04-tampilan-ux.md` | Landing page, halaman modul, halaman artikel |
| 6 | `docs/05-pencarian.md` | Pencarian keyword + semantik + Tanya AI |
| 7 | `docs/06-kontributor-admin.md` | Edit link, Keystatic, PR, CODEOWNERS |
| 8 | `docs/07-deploy-ops.md` | CI/CD, hosting, analitik |
| 9 | `docs/08-rencana-kerja.md` | **Daftar tugas per fase + kriteria selesai** |
| 10 | `docs/09-keputusan-terbuka.md` | Hal yang harus ditanyakan ke pemilik proyek |

Kerjakan tugas **berurutan sesuai `docs/08-rencana-kerja.md`**. Centang `[x]` setiap tugas yang selesai di file itu.

## 3. Stack

- **Astro + Starlight** (versi stabil terbaru; cek changelog sebelum memasang)
- TypeScript, Node.js LTS, pnpm
- Konten: MDX di `src/content/docs/`, skema frontmatter divalidasi Zod (`src/content.config.ts`)
- CMS: **Keystatic** (mode GitHub) di `/keystatic`
- Pencarian: Pagefind (bawaan) + layer semantik (lihat `docs/05-pencarian.md`)
- Hosting: Cloudflare Workers + static assets (Workers Builds, `wrangler.jsonc`) di `https://docs.sakti.ai.id` (K3, K71; langkah pemilik di `docs/deploy-cloudflare.md`)
- Skrip migrasi: Node/TS di `scripts/`, Playwright untuk Google Sites

## 4. Perintah

Butuh Node ≥ 22.23.4 (lihat `.nvmrc`) dan pnpm versi `packageManager` di `package.json`.

```bash
pnpm install
pnpm dev                 # server lokal
pnpm build               # build + index Pagefind
pnpm build:pages         # build di Cloudflare Workers Builds (lengkapi riwayat git, lalu build)
pnpm preview
pnpm check:content       # lint frontmatter + aturan konten (scripts/check-content.ts)
pnpm check:links         # starlight-links-validator
pnpm check:dist          # periksa dist/: sitemap, robots, _headers/CSP, 404, perlu_review
pnpm search:eval         # uji kualitas pencarian (tests/search/queries.yaml)
pnpm migrate:inventory   # crawl sumber → sources/manifest.json
pnpm migrate:extract     # unduh & ekstrak file → sources/extracted/
pnpm migrate:draft       # ubah hasil ekstraksi → MDX draft
```

Buat script-script ini jika belum ada (bagian dari fase 0–2).

## 5. Struktur folder target

```
.
├── CLAUDE.md
├── config/modul.yaml            # daftar modul SAKTI = sumber kebenaran sidebar
├── docs/                        # dokumen perencanaan (folder ini)
├── templates/                   # template artikel
├── scripts/
│   ├── inventory/               # crawler Google Sites, linktree, Drive
│   ├── extract/                 # pptx/pdf/slides → teks + gambar
│   ├── draft/                   # ekstraksi → MDX
│   ├── search/                  # build index semantik
│   └── check-content.ts
├── sources/                     # JANGAN di-commit kecuali manifest.json
│   ├── manifest.json
│   ├── raw/                     # .gitignore
│   └── extracted/               # .gitignore
├── src/
│   ├── content/docs/<modul>/... # artikel
│   ├── components/              # BigSearch, ModuleGrid, dsb.
│   ├── data/sinonim.json        # glosarium & sinonim istilah SAKTI
│   └── content.config.ts
├── public/
└── tests/search/queries.yaml
```

## 6. Aturan konten (WAJIB)

1. **Bahasa Indonesia baku**, kalimat aktif, langkah bernomor. Istilah menu SAKTI ditulis persis seperti di aplikasi, dicetak **tebal**: klik **Simpan**, buka menu **Komitmen > RUH > Pencatatan Kontrak**.
2. **Jangan mengarang prosedur SAKTI.** Setiap langkah harus berasal dari sumber. Jika sumber ambigu atau tidak lengkap: set `perlu_review: true`, lalu tulis catatan di bagian `:::caution[Perlu verifikasi]`. Artikel `perlu_review` tetap tampil di produksi dan pencarian; hanya `status: draft` yang disembunyikan (K70).
3. Setiap artikel **wajib** punya `sumber:` di frontmatter (URL asli + tanggal diambil).
4. **Data pribadi dan rahasia dilarang tampil**: NIK, NIP lengkap, nama pegawai, nomor HP pribadi, email pribadi, password, token, kode MFA, nomor rekening. Screenshot yang memuat data ini harus di-blur atau dipotong. Kontak resmi (HAI DJPb, email/hotline institusi) boleh.
5. Gambar: konversi ke WebP, lebar maksimum 1600px, simpan di `src/assets/<modul>/<slug>/`, beri `alt` yang deskriptif.
6. Satu artikel = satu tugas pengguna ("Cara mencatat kontrak"), bukan satu file sumber. Pecah file sumber yang besar menjadi beberapa artikel.
7. Gunakan template di `templates/`. Struktur standar: Ringkasan → Prasyarat → Langkah → Hasil yang diharapkan → Masalah umum → Terkait → Sumber.
8. Duplikat antar sumber digabung; versi yang lebih baru menang. Catat versi yang digantikan di `sumber`.

## 7. Cara kerja agent

- Kerjakan **satu tugas per commit**. Pesan commit gaya Conventional Commits dalam bahasa Inggris (`feat:`, `content:`, `fix:`, `chore:`).
- Sebelum menandai tugas selesai: jalankan `pnpm build`, `pnpm check:content`, dan `pnpm check:links`. Semuanya harus lolos.
- Migrasi konten dikerjakan **per modul** (satu modul = satu branch/PR), jangan sekaligus semua.
- Jika menemui keputusan yang tidak tercantum di dokumen, tambahkan ke `docs/09-keputusan-terbuka.md` dan pilih opsi paling sederhana yang mudah diubah. Jangan berhenti total kecuali keputusan itu tidak bisa dibatalkan (contoh: membeli domain, membuat repo publik, mempublikasikan ke domain resmi).
- Jangan pernah commit isi `sources/raw/` dan `sources/extracted/`, file `.env`, atau kredensial.
- Akses jaringan ke Google mungkin dibatasi. Jika crawl gagal, catat URL yang gagal di `sources/manifest.json` dengan `status: "gagal"` dan lanjutkan; pemilik proyek bisa mengunduh manual ke `sources/raw/manual/`.
