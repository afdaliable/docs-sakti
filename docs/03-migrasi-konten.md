# 03 — Pipeline Migrasi Konten

Tujuan: semua isi tiga sumber menjadi artikel MDX per tugas, dengan jejak sumber yang bisa diaudit.

```
[1] Inventaris  →  [2] Unduh & ekstrak  →  [3] Pemetaan  →  [4] Draft MDX  →  [5] Review manusia  →  terbit
 manifest.json     sources/extracted/      peta-konten      src/content/      PR per modul
```

## Tahap 1 — Inventaris (`pnpm migrate:inventory`)

### 1a. Google Sites (Sumber A & C)
- Pakai **Playwright** (Google Sites dirender dengan JavaScript; fetch HTML biasa tidak cukup).
- Mulai dari base URL, kumpulkan semua link internal dari navigasi (termasuk menu bertingkat yang tersembunyi; klik/expand menu atau baca `nav` di DOM) dan dari isi halaman. BFS dengan dedup URL (hapus query `authuser`, `usp`).
- Per halaman simpan: URL, judul, breadcrumb (jalur menu), HTML konten utama, teks bersih, daftar gambar, daftar link keluar, daftar iframe/embed (Drive, Slides, YouTube, Docs, PDF).
- Simpan HTML mentah ke `sources/raw/gsites/<situs>/<path>.html` dan screenshot halaman penuh (untuk referensi reviewer).
- Jeda 1–2 detik antar request; user-agent wajar.

### 1b. Linktree (Sumber B)
- Ambil hanya link profil (abaikan link "Explore other Linktrees" dan footer). Saat ini ada 4 folder Drive (lihat `01-sumber-konten.md`).

### 1c. Google Drive folder
- Folder publik: coba `gdown --folder <url>` (Python) atau Google Drive API v3 dengan API key (`files.list` dengan `q='<folderId>' in parents`). Rekursif.
- Catat setiap file: id, nama, mimeType, modifiedTime, ukuran, jalur folder.

### 1d. Google Slides / Docs / Sheets yang ditautkan
- Slides publik bisa diekspor: `https://docs.google.com/presentation/d/<ID>/export/pptx` dan `/export/pdf`.
- Docs: `/document/d/<ID>/export?format=docx` atau `md`; Sheets: `/spreadsheets/d/<ID>/export?format=csv` (per sheet `&gid=`).
- Short link (`bit.ly/rolesakti`): ikuti redirect, catat URL akhir.

### Format `sources/manifest.json`

```json
{
  "dibuat": "2026-11-22T10:00:00+07:00",
  "item": [
    {
      "id": "C-persediaan-transaksi-masuk-pembelian",
      "sumber": "C",
      "jenis": "google-sites",
      "url": "https://sites.google.com/view/saktipelaporan/persediaan/transaksi-masuk/pembelian",
      "judul": "Pembelian",
      "jalur_menu": ["Persediaan", "Transaksi Masuk", "Pembelian"],
      "penanda_sumber": "✅",
      "modified": null,
      "file_lokal": "sources/raw/gsites/saktipelaporan/persediaan/transaksi-masuk/pembelian.html",
      "embed": ["gslides:1AbC..."],
      "target_modul": "persediaan",
      "target_path": "persediaan/transaksi-masuk/pembelian",
      "status": "terinventaris",
      "catatan": ""
    }
  ]
}
```

Status: `terinventaris` → `diunduh` → `diekstrak` → `didraft` → `dimigrasi` | `ditolak` (wajib isi `catatan`) | `gagal` (wajib isi `catatan`).

Hasilkan juga **`sources/laporan-inventaris.md`**: jumlah item per sumber/jenis/modul, daftar gagal, daftar link rusak, dan kandidat duplikat. Ini deliverable fase 2 untuk direview pemilik proyek.

## Tahap 2 — Unduh & ekstrak (`pnpm migrate:extract`)

| Jenis | Ekstraksi |
|---|---|
| Google Sites HTML | Ambil konten utama → Markdown (turndown). Pertahankan heading, list, tabel, gambar. |
| PPTX (dari Slides/Drive) | `python-pptx`: teks per slide + catatan pembicara + urutan. Render tiap slide ke PNG (`libreoffice --headless --convert-to pdf` lalu `pdftoppm -r 110`). |
| PDF | `pdftotext -layout` per halaman; render halaman ke PNG untuk screenshot; jika hasil teks kosong (hasil scan), jalankan OCR (`tesseract -l ind+eng`). |
| DOCX | `pandoc -t gfm` |
| Sheets/XLSX | CSV → tabel Markdown (jika ≤ 50 baris) atau komponen tabel yang bisa dicari |
| Video (YouTube/Drive) | Jangan diunduh. Embed dengan `<YouTube>`/link; ambil judul + deskripsi. |

Output per item: `sources/extracted/<id>/content.md`, `sources/extracted/<id>/slides/NN.png`, `meta.json`.

## Tahap 3 — Pemetaan (`sources/peta-konten.csv`)

Satu baris per **artikel target** (bukan per file sumber):

```
target_path,judul_artikel,modul,menu_sakti,peran,jenis,id_sumber(;),catatan
komitmen/ruh/pencatatan-kontrak,Mencatat Kontrak,komitmen,"Komitmen > RUH > Pencatatan Kontrak",satker,juknis,B-kom-012;C-kom-ruh-kontrak,"B lebih baru (2025)"
```

Aturan:
- Deck slide panjang (misal Juknis SAKTI Admin 2024) dipecah per bagian/menu → beberapa artikel.
- **Dedup**: jika dua sumber membahas tugas yang sama, pakai yang `modified` paling baru sebagai isi utama; tambahkan informasi unik dari yang lain; cantumkan keduanya di `sumber`.
- Jika tanggal tidak diketahui, prioritas: Drive (B) > Google Sites (C) > Sites Admin (A) untuk modul pelaksanaan; tandai `perlu_review: true`.

## Tahap 4 — Draft MDX (`pnpm migrate:draft`)

Untuk setiap baris peta konten, agent menulis artikel memakai `templates/artikel-juknis.mdx`:

1. Baca semua `content.md` + gambar slide dari id sumber terkait.
2. Tulis ulang menjadi langkah bernomor sesuai aturan di `CLAUDE.md` §6. **Isi harus setia pada sumber**; tidak menambah langkah, nilai, atau aturan yang tidak ada.
3. Pilih screenshot yang relevan dari slide (jangan semua), crop ke area penting, konversi WebP, blur data pribadi (NIK, NIP, nama, nomor) — gunakan `sharp`; jika area data pribadi tidak bisa dideteksi otomatis dengan yakin, **jangan pakai gambar itu** dan tandai `perlu_review`.
4. Isi frontmatter lengkap: `modul`, `menu_sakti`, `peran`, `jenis`, `kata_kunci` (3–8 istilah yang mungkin diketik pengguna, termasuk bahasa sehari-hari), `sumber`, `status: review`.
5. Tambahkan bagian "Unduh juknis asli" berisi link ke file sumber.
6. Update status manifest → `didraft`.

Batch per modul. Setelah satu modul selesai: `pnpm build && pnpm check:content && pnpm check:links`, lalu buka PR `content(<modul>): migrasi awal`.

## Tahap 5 — Review manusia

Checklist reviewer (masuk ke `.github/pull_request_template.md`):
- [ ] Langkah sesuai dengan SAKTI versi terbaru
- [ ] Nama menu/tombol persis seperti di aplikasi
- [ ] Tidak ada data pribadi di teks maupun gambar
- [ ] Sumber tercantum dan bisa dibuka
- [ ] `peran` dan `kata_kunci` tepat
- [ ] Jika lolos: ubah `status: terbit`, isi `terakhir_diverifikasi`

## Pemeriksaan otomatis (`scripts/check-content.ts`)

Gagal (exit 1) jika:
- Artikel di folder modul tidak punya `modul` atau `sumber`.
- `modul` tidak cocok dengan folder.
- Ada pola data pribadi di teks: NIK 16 digit (`\b\d{16}\b`), NIP 18 digit (`\b\d{18}\b`), nomor HP (`\b(\+62|08)\d{8,12}\b`) — kecuali nomor yang ada di allowlist `src/data/kontak-resmi.json`.
- Gambar tanpa `alt`, atau gambar > 400 KB.
- Link ke `sites.google.com/view/saktiadm|saktipelaporan` di badan artikel (harus ke halaman KB internal; link asli hanya boleh di `sumber`/bagian "Unduh juknis asli").

Peringatan (tidak gagal): `perlu_review: true`, `terakhir_diverifikasi` > 12 bulan, artikel tanpa `kata_kunci`.
