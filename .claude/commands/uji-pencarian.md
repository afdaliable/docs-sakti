---
description: Jalankan dan analisis evaluasi kualitas pencarian
argument-hint: "[query tambahan opsional]"
---

1. Jalankan `pnpm build` lalu `pnpm search:eval` (Level 1 dan hybrid jika tersedia).
2. Jika ada argumen ($ARGUMENTS), jalankan juga sebagai query ad-hoc dan tampilkan top-5 dari tiap level.
3. Untuk setiap query yang gagal (artikel harapan tidak di top-3), diagnosis: apakah judul, `kata_kunci`, sinonim, atau chunking yang kurang tepat.
4. Usulkan perbaikan konkret (tambah kata_kunci, entri sinonim, ubah judul/heading). Terapkan hanya perbaikan pada `kata_kunci` dan `src/data/sinonim.json`; perubahan judul/isi cukup diusulkan.
5. Jalankan ulang eval dan laporkan hit@3 & MRR sebelum/sesudah.
