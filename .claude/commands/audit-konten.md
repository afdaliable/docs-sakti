---
description: Audit kualitas dan cakupan konten knowledge base
argument-hint: "[slug-modul opsional]"
---

Audit konten untuk modul: "$ARGUMENTS" (jika kosong, audit semua modul). Jangan mengubah file; hasilkan laporan `reports/audit-<tanggal>.md` berisi:

1. **Cakupan:** item manifest per status per modul; item `terinventaris`/`gagal` yang belum ditangani.
2. **Kualitas:** artikel tanpa `kata_kunci`, `perlu_review: true`, `status: review` > 30 hari, `terakhir_diverifikasi` > 12 bulan, artikel < 80 kata, artikel tanpa langkah bernomor (untuk `jenis: juknis`).
3. **Data pribadi:** hasil pemindaian pola NIK/NIP/HP/email pribadi di teks, dan daftar gambar yang belum dicek blur.
4. **Struktur:** sub-menu di `config/modul.yaml` yang belum punya artikel; artikel yang `modul`-nya tidak cocok dengan folder.
5. **Pencarian:** hasil `pnpm search:eval`; query uji yang gagal beserta dugaan penyebab (judul, kata_kunci, sinonim).
6. **Rekomendasi:** 10 tindakan prioritas, urut dampak.
