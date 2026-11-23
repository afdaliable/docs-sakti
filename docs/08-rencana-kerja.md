# 08 — Rencana Kerja

Kerjakan berurutan. Centang `[x]` saat selesai. Setiap fase diakhiri **gerbang** (kriteria selesai) — jangan lanjut sebelum gerbang lolos.

---

## Fase 0 — Persiapan repo

- [x] 0.1 Inisialisasi Astro + Starlight dengan pnpm (`pnpm create astro@latest -- --template starlight`), TypeScript strict.
- [x] 0.2 Pindahkan isi paket kickoff (CLAUDE.md, docs/, config/, templates/, .claude/) ke root repo.
- [x] 0.3 `.gitignore`: `sources/raw/`, `sources/extracted/`, `.env`, `dist/`, `.astro/`.
- [x] 0.4 `.env.example` sesuai `07-deploy-ops.md`.
- [x] 0.5 Konfigurasi dasar Starlight: `title: 'SAKTI Knowledge Base'`, `defaultLocale: 'root'` dengan `locales.root = { label: 'Bahasa Indonesia', lang: 'id' }`, `lastUpdated: true`, `editLink`.
- [x] 0.6 Tambah script `package.json` sesuai `CLAUDE.md` §4 (boleh berupa placeholder yang di-isi di fase berikutnya).
- [x] 0.7 Commit awal.

**Gerbang 0:** `pnpm dev` jalan, halaman default tampil dalam bahasa Indonesia.

---

## Fase 1 — Kerangka informasi

- [x] 1.1 Loader `config/modul.yaml` (`src/lib/modul.ts`) dengan tipe TS.
- [x] 1.2 Sidebar dibangkitkan dari YAML (`02-arsitektur-informasi.md`).
- [x] 1.3 Skema frontmatter diperluas di `src/content.config.ts`.
- [x] 1.4 Buat `index.mdx` untuk setiap modul, setiap `sub`, dan bagian lintas (peran, peraturan, faq, glosarium, bantuan, kontribusi) — isi placeholder ringkas, `status: terbit` khusus halaman indeks.
- [x] 1.5 Route `/peran/[slug]` dan `/glosarium/` dari `src/data/sinonim.json`.
- [x] 1.6 `scripts/check-content.ts` sesuai `03-migrasi-konten.md`, termasuk deteksi data pribadi.
- [x] 1.7 Filter `status: draft` dari build produksi; banner untuk `status: review`.
  - 23 Nov 2026: keputusan pemilik — artikel `perlu_review` tetap tampil di produksi dan pencarian; hanya `status: draft` yang disembunyikan (K70). Aturan filter dipusatkan di `src/lib/status.ts` dan dijaga `tests/perlu-review.test.ts`.

**Gerbang 1:** `pnpm build && pnpm check:content` lolos; sidebar menampilkan semua modul dalam urutan YAML.

---

## Fase 2 — Inventaris & ekstraksi sumber

- [x] 2.1 `scripts/inventory/gsites.ts` (Playwright) untuk Sumber A dan C.
- [x] 2.2 `scripts/inventory/linktree.ts` + `scripts/inventory/gdrive.ts` untuk Sumber B (rekursif).
- [x] 2.3 Resolver link Slides/Docs/Sheets/short-link yang ditemukan di halaman.
- [x] 2.4 Tulis `sources/manifest.json` + `sources/laporan-inventaris.md`.
- [x] 2.5 `scripts/extract/*` untuk HTML, PPTX, PDF (+OCR), DOCX, Sheets.
- [x] 2.6 Jalankan ekstraksi untuk semua item; item gagal dicatat.
- [x] 2.7 Buat `sources/peta-konten.csv` (pemetaan ke artikel target + dedup).
- [x] 2.8 **Berhenti dan minta review** pemilik proyek atas `laporan-inventaris.md` dan `peta-konten.csv` (keputusan K1, K2, K6).
  - 21 Nov 2026: review selesai. Jawaban K1, K2, K6, K21–K24 dicatat di `09-keputusan-terbuka.md`; `config/modul.yaml`, sidebar, dan `menu_sakti` di peta konten diselaraskan dengan `sources/menu.json` (default tambahan: K25–K31).

**Gerbang 2:** setiap item manifest berstatus `diekstrak`, `ditolak`, atau `gagal` (dengan catatan); peta konten disetujui.

---

## Fase 3 — Tampilan help center

- [x] 3.1 `BigSearch` (Level 1 Pagefind dulu) sesuai `04-tampilan-ux.md`, termasuk aksesibilitas keyboard/ARIA.
- [x] 3.2 `ModuleGrid`, `RoleChips`, `RecentlyUpdated`, `HelpBox`, `PopularLinks`.
- [x] 3.3 Landing page `template: splash`.
  - 22 Nov 2026: atas permintaan pemilik, beranda memakai layout docs agar sidebar tampil (K48); isi beranda tidak berubah.
- [x] 3.4 Halaman `/cari/` dengan filter modul/peran/jenis.
- [x] 3.5 Override komponen artikel: breadcrumb `menu_sakti`, badge, kotak "Menu di SAKTI", footer sumber + feedback.
- [x] 3.6 Komponen MDX: `MenuSakti`, `SumberAsli`.
- [x] 3.7 Cek tampilan mobile (360px) dan dark mode; Lighthouse ≥ 90/95.
  - 22 Nov 2026: atas permintaan pemilik, pindah halaman tanpa muat ulang (`<ClientRouter />` + swap area konten, K60); uji `tests/e2e/navigasi.e2e.ts`.

**Gerbang 3:** landing page sesuai wireframe; BigSearch menampilkan hasil inline untuk halaman indeks yang ada.

---

## Fase 4 — Migrasi konten per modul

Urutan (yang sumbernya paling lengkap dulu): `mulai` → `admin` → `referensi` → `komitmen` → `pembayaran` → `bendahara` → `persediaan` → `aset-tetap` → `piutang` → `akuntansi-pelaporan` → `kppn-bun` → `peran/*` → `peraturan` → `faq`.

Untuk **setiap** modul (pakai perintah `/migrasi-modul <slug>`):
- [ ] Draft MDX semua baris peta konten modul tersebut (`templates/`).
- [ ] Gambar: pilih, crop, WebP, blur data pribadi.
- [ ] Lengkapi `kata_kunci` dan glosarium.
- [ ] Tambah ≥ 4 query uji modul ke `tests/search/queries.yaml`.
- [ ] `pnpm build && pnpm check:content && pnpm check:links` lolos.
- [ ] PR `content(<slug>): migrasi awal` → review pemilik modul.

Checklist modul:
- [x] mulai  - [ ] admin  - [ ] referensi  - [ ] komitmen  - [ ] pembayaran  - [ ] bendahara
- [ ] persediaan  - [ ] aset-tetap  - [ ] piutang  - [ ] akuntansi-pelaporan  - [ ] kppn-bun
- [ ] peran  - [ ] peraturan  - [ ] faq

Status per modul:
- `mulai` (21 Nov 2026): 20 artikel + 3 halaman indeks didraf di branch lokal `konten/migrasi-mulai`; 5 artikel `perlu_review`; 2 gambar; 9 query uji; build, `check:content`, `check:links`, tes lolos. Di-merge fast-forward ke `main` dan di-push (7f450bb); 22 Nov 2026 pemilik menyatakan tidak ada koreksi gaya, modul dicentang (K35).
- `admin` (22 Nov 2026): 12 baris peta konten didraf di branch lokal `konten/migrasi-admin` — 9 artikel + 3 halaman berisi di indeks sub-menu (`pkipa`, `role`, `formulir`) + 5 halaman indeks; 9 `perlu_review`; 2 gambar (diagram alur, tanpa tangkapan layar aplikasi); 8 query uji; build, `check:content` (0 galat), `check:links`, tes lolos. Di-merge fast-forward ke `main` (K35). Belum dicentang: menunggu review pemilik modul.
- `referensi` (22 Nov 2026): 2 baris peta konten didraf di branch lokal `konten/migrasi-referensi` menjadi 3 artikel (baris Ruangan/Bendaharawan dipecah, K37) + 4 halaman indeks; 3 `perlu_review`; 1 gambar (diagram contoh kasus konsolidator); 5 query uji; build, `check:content` (0 galat), `check:links`, tes lolos. Di-merge fast-forward ke `main` (K35). Belum dicentang: menunggu review pemilik modul.
- `komitmen` (22 Nov 2026): 33 baris juknis peta konten didraf di branch lokal `konten/migrasi-komitmen` menjadi 33 artikel + 7 halaman indeks (modul, 3 sub-menu, 3 grup tingkat 3: Supplier, Kontrak, BAST/BAKP/BAPP/DYD — K38); 29 `perlu_review` (umumnya beda label/jalur menu juknis 2022 vs menu.json, K34/K41); tanpa gambar (K42); 13 query uji; 29 istilah glosarium; build, `check:content` (0 galat), `check:links`, tes lolos. Di-merge fast-forward ke `main` (K35). Belum dicentang: menunggu review pemilik modul.
- `pembayaran` (22 Nov 2026): 43 baris juknis peta konten didraf di branch lokal `konten/migrasi-pembayaran` menjadi 41 artikel (2 baris duplikat digabung ke artikel `komitmen`, K44) + 5 halaman indeks (modul, 2 sub-menu, 2 grup tingkat 3: Catat/Ubah SPP, Mencatat Perintah Bayar); 37 `perlu_review` (umumnya beda label/jalur menu juknis vs menu.json); tanpa gambar (K42); 14 query uji; 20 istilah glosarium; build, `check:content` (0 galat), `check:links`, tes lolos. Di-merge fast-forward ke `main` (K35). Belum dicentang: menunggu review pemilik modul.
- `bendahara` (22 Nov 2026): 17 baris juknis peta konten didraf di branch lokal `konten/migrasi-bendahara` menjadi 17 artikel + 1 halaman indeks modul (artikel langsung di bawah modul, dikelompokkan di indeks; K47); 11 `perlu_review`; tanpa gambar (K42); 11 query uji; 20 istilah glosarium; build, `check:content` (0 galat), `check:links`, tes lolos. Di-merge fast-forward ke `main` (K35). Belum dicentang: menunggu review pemilik modul.
- `persediaan` (22 Nov 2026): 37 baris juknis peta konten didraf di branch lokal `konten/migrasi-persediaan` menjadi 37 artikel + 8 halaman indeks (modul dan sub-menu; sub-menu berisi satu artikel memakai `index.mdx` sebagai artikelnya); 15 `perlu_review`; tanpa gambar (K42) — tabel overview yang di sumber berupa gambar ditranskripsi menjadi teks (K49); tahap persetujuan dari juknis satker BLU ditambahkan pada Pembelian dan Pemakaian (K50); 1 halaman yang semula ditolak dimigrasikan (K51); 14 query uji; 20 istilah glosarium; build, `check:content` (0 galat), `check:links`, tes lolos. Di-merge fast-forward ke `main` (K35). Belum dicentang: menunggu review pemilik modul.
- `aset-tetap` (22 Nov 2026): 104 baris juknis peta konten didraf di branch lokal `konten/migrasi-aset-tetap` menjadi 104 artikel + 21 halaman indeks (modul, sub-menu, dan grup tingkat 3 di bawah RUH dan Konsesi Jasa Mitra); 20 `perlu_review`; tanpa gambar (K42) — tabel overview ditranskripsi (K49); 6 halaman yang semula ditolak dimigrasikan dari transkripsi gambarnya (K51); tahap validasi dan persetujuan dari juknis satker BLU ditambahkan pada Pembelian (K52); 19 query uji; 15 istilah glosarium; build, `check:content` (0 galat), `check:links`, tes lolos. Di-merge fast-forward ke `main` (K35). Belum dicentang: menunggu review pemilik modul.
- `piutang` (22 Nov 2026): 16 baris juknis peta konten didraf di branch lokal `konten/migrasi-piutang` menjadi 16 artikel + 6 halaman indeks; 3 `perlu_review`; tanpa gambar (K42; tabel overview ditranskripsi, K49); format berkas unggah ditulis sebagai tabel kolom tanpa baris contoh (K54); 12 query uji; 12 istilah glosarium; build, `check:content` (0 galat), `check:links`, tes lolos. Di-merge fast-forward ke `main` (K35). Belum dicentang: menunggu review pemilik modul.
- `akuntansi-pelaporan` (22 Nov 2026): 17 baris juknis peta konten didraf di branch lokal `konten/migrasi-akuntansi-pelaporan` menjadi 17 artikel + 6 halaman indeks (tiga indeks grup yang sumbernya memuat juknis ditulis sebagai artikel, K55); 10 `perlu_review`; tanpa gambar (K42, K49); bagian Pelaporan juknis satker BLU dipakai sebagai sumber tambahan (K55); 14 query uji; 20 istilah glosarium; build, `check:content` (0 galat), `check:links`, tes lolos. Di-merge fast-forward ke `main` (K35). Belum dicentang: menunggu review pemilik modul.
- `kppn-bun` (22 Nov 2026): 4 baris juknis peta konten didraf di branch lokal `konten/migrasi-kppn-bun` menjadi 11 artikel (dua juknis panjang dipecah per tugas, K56) + 1 halaman indeks modul; 3 `perlu_review`; tanpa gambar (K42); 9 query uji; 9 istilah glosarium; build, `check:content` (0 galat), `check:links`, tes lolos. Di-merge fast-forward ke `main` (K35). Belum dicentang: menunggu review pemilik modul.
- `peraturan` (22 Nov 2026): 1 baris peta konten didraf di branch lokal `konten/migrasi-peraturan` menjadi halaman daftar + 2 halaman peraturan (identitas, susunan bab, ruang lingkup; teks peraturan tidak disalin, K57); 2 `perlu_review`; 2 query uji. Di-merge fast-forward ke `main` (K35). Belum dicentang: menunggu review pemilik.
- `faq` (22 Nov 2026): 1 baris peta konten (6 pertanyaan) dipecah per modul di branch lokal `konten/migrasi-faq` menjadi FAQ Modul Persediaan (4 pertanyaan) dan FAQ Modul Aset Tetap (2 pertanyaan) + halaman indeks FAQ (K58); 4 query uji. Di-merge fast-forward ke `main` (K35). Belum dicentang: menunggu review pemilik.
- `peran` (22 Nov 2026): tidak ada baris peta konten; halaman `/peran/<slug>/` dibangkitkan otomatis dari frontmatter `peran` (K59). Audit: satker 296 artikel, kppn-kanwil 35, djpb-pusat 14, dja/djkn/bappenas/bpk/apip/widyaiswara masing-masing 12; tidak ada peran tanpa artikel; semua artikel non-indeks sudah bertag `peran`. Belum dicentang: menunggu review pemilik.

**Gerbang 4:** semua item manifest `dimigrasi` atau `ditolak`; ≥ 40 query uji; tidak ada artikel `draft` yang tersisa tanpa issue.

Status Gerbang 4 (22 Nov 2026): semua modul dalam urutan Fase 4 sudah didraf dan di-merge ke `main`. Manifest: 602 `didraft`, 66 `ditolak`, 9 `gagal` (K29: 1 halaman unduhan SAKTI Admin, 5 dokumen Aset Tetap, 1 Piutang, 2 Akuntansi dan Pelaporan; menunggu berkas di `sources/raw/manual/`), 0 `diekstrak`. Belum ada item `dimigrasi` karena status itu diberikan setelah review pemilik modul (semua artikel masih `status: review`). Query uji: 134 (≥ 40). Artikel `draft`: 0. Gerbang belum dinyatakan lolos: menunggu review pemilik modul dan keputusan atas item `gagal`.

Perapian kerangka modul lama (23 Nov 2026, K66–K68): heading dan butir "Role yang dibutuhkan" pada `mulai`, `admin`, `referensi`, `komitmen`, `pembayaran` diselaraskan dengan `templates/artikel-juknis.mdx` (36 berkas, satu commit per modul). Temuan pemeriksa kerangka turun dari 50 berkas / 160 baris menjadi 42 berkas / 92 baris: mulai 19/69 → 16/28, admin 10/47 → 8/28, referensi 3/8 → 3/5, komitmen 11/29 → 9/25, pembayaran 7/7 → 6/6. Sisa: 83 heading tambahan yang sah (K66), 8 butir role yang tidak berlaku (K67), dan 1 `## Langkah` tanpa `<Steps>` (`komitmen/ruh/pencatatan-suplier/suplier-spm-kp-kompensasi`: sumber berupa uraian, bukan langkah bernomor). Role diisi dari sumber pada 8 artikel; `perlu_review` `mulai` menjadi 7 (K68). `check:content` 0 galat (149 peringatan), tes, build, `check:links`, e2e lolos; `search:eval` Level 1 tidak berubah (hit@1 0,811, hit@3 0,979, MRR 0,889).

---

## Fase 5 — Pencarian pintar & kontribusi

- [x] 5.1 Ekspansi sinonim + fuzzy fallback (Level 1 lengkap).
  - 23 Nov 2026: `src/lib/cari/` (varian kueri, gabungan Pagefind, fallback MiniSearch pada `/search-lite.json`), kamus `src/data/kata-kueri.json` (K61); dipakai `BigSearch` dan `/cari/`.
- [ ] 5.2 `scripts/search/build-embeddings.ts` + `/api/search` (Opsi sesuai K7) + fusion RRF di BigSearch + fallback.
- [ ] 5.3 `pnpm search:eval` untuk Level 1 dan hybrid; hit@3 hybrid ≥ 0,80.
  - 23 Nov 2026: Level 1 selesai (`scripts/search/eval.ts`, K62): 143 kueri, hit@1 0,811, hit@3 0,979, MRR 0,889 pada build `main` 99ca29c (Pagefind polos sebelum 5.1: 0,664 / 0,713 / 0,688). Tiga kueri belum masuk 3 teratas: "transfer keluar bmn ke satker lain", "input kontrak", "penghapusan piutng". Belum dicentang: bagian hybrid menunggu 5.2.
- [ ] 5.4 Keystatic GitHub mode di `/keystatic` (`06-kontributor-admin.md`).
- [x] 5.5 CODEOWNERS, template PR/issue, label, branch protection (dokumentasikan langkah manual yang harus dilakukan pemilik repo di `docs/setup-github.md`).
  - 23 Nov 2026: berkas dibuat (K63); pengaturan repo (label, kolaborator, branch protection) belum dijalankan: langkah manual pemilik di `docs/setup-github.md`. Pemilik modul menunggu K5.
- [x] 5.6 Halaman `/kontribusi/*`.
  - 23 Nov 2026: indeks, `panduan-menulis`, `lewat-github`, `editor-keystatic` (K64); halaman Keystatic masih berupa keterangan "belum tersedia" sampai 5.4.
- [ ] 5.7 (Opsional, jika K8 = ya) Tanya AI `/api/tanya` + UI.

**Gerbang 5:** search eval lolos ambang; editor uji bisa membuat PR lewat Keystatic dari awal sampai merge.

Status Gerbang 5 (23 Nov 2026): 5.1, 5.5, 5.6 selesai; 5.3 selesai untuk Level 1 (lolos ambang 0,80). Ditunda: 5.2 (kredensial Cloudflare, K7), 5.4 (GitHub App Keystatic), 5.7 (K8). Gerbang belum lolos: bagian hybrid dan Keystatic belum ada.

---

## Fase 6 — Rilis & pemeliharaan

- [ ] 6.1 CI lengkap (`07-deploy-ops.md`), preview per PR.
  - 23 Nov 2026: workflow CI dibuat tanpa deploy dan tanpa secret (K65). Langkah `pnpm check:dist` ditambahkan setelah `check:links` (K71). Run pertama di GitHub (push 99ca29c) lolos semua langkah dalam ±3 menit. Belum dicentang: preview per PR menunggu hosting (K3).
- [ ] 6.2 Deploy produksi + domain (K3).
  - 23 Nov 2026: persiapan selesai tanpa men-deploy (K3, K71): `site` = `https://docs.sakti.ai.id`, `robots.txt`, `public/_headers`, `pnpm build:pages`, dan panduan pemilik `docs/deploy-cloudflare.md`. Belum dicentang: proyek Pages, variabel lingkungan, dan DNS `docs.sakti.ai.id` dibuat pemilik di dashboard.
- [ ] 6.3 Analitik + widget feedback + logging query tanpa hasil.
- [ ] 6.4 Workflow mingguan `cek-sumber.yml` dan laporan bulanan.
- [ ] 6.5 `public/_headers`, Dependabot.
  - 23 Nov 2026: `public/_headers` dibuat (K71). Belum dicentang: Dependabot belum ada.
- [ ] 6.6 README untuk maintainer: cara menjalankan, menambah modul, menambah artikel, rotasi secret.
- [ ] 6.7 Rencana komunikasi: daftar URL lama → URL baru (`sources/peta-url-lama.csv`) agar pengelola Google Sites bisa memasang banner/tautan ke KB baru.

**Gerbang 6:** situs produksi hidup, semua metrik di `00-prd.md` terpantau.

Verifikasi deploy lokal (23 Nov 2026, K71): `pnpm check:dist` ditambahkan (dan masuk CI setelah `check:links`); server e2e (`tests/e2e/server.ts`) kini menerapkan `dist/_headers` dan menyajikan `404.html` berstatus 404, dan keempat tes e2e gagal bila ada pelanggaran CSP (`tests/e2e/csp.ts`). Hasil pada build `dist/` dari `main`: `check:content` 0 galat (149 peringatan); 133 tes unit lolos; build 411 halaman, tautan valid; `check:dist` lolos 8 pemeriksaan (sitemap 411 URL di bawah `https://docs.sakti.ai.id`, `robots.txt`, `_headers` dengan 10 hash skrip inline yang cocok, `404.html`, tanpa alamat localhost/`pages.dev`, canonical, 149 artikel `perlu_review` tampil dan 0 draft, 409 halaman terindeks Pagefind); e2e pencarian, beranda, navigasi, kontribusi lolos dengan header produksi tanpa pelanggaran CSP dan tanpa galat konsol (Chromium); `search:eval` Level 1 tidak berubah (143 kueri, hit@1 0,811, hit@3 0,979, MRR 0,889). Uji banding: satu hash CSP dirusak → e2e beranda dan `check:dist` gagal. Belum diuji: perilaku di Cloudflare sendiri (lihat cek pasca-deploy di `docs/deploy-cloudflare.md`) dan browser selain Chromium.
