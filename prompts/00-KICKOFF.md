# Prompt pembuka untuk Claude Code

Salin isi folder paket ini ke root repo baru (folder kosong), buka Claude Code di folder itu, lalu tempel prompt di bawah.

---

```
Kamu akan membangun SAKTI Knowledge Base berbasis Astro Starlight.

1. Baca CLAUDE.md sampai selesai, lalu baca semua file di docs/ sesuai urutan di CLAUDE.md §2, serta config/modul.yaml dan templates/.
2. Ringkas pemahamanmu dalam maksimal 15 poin: tujuan, struktur modul, pipeline migrasi, pencarian, alur kontribusi. Sebutkan juga risiko atau bagian dokumen yang menurutmu tidak konsisten.
3. Kerjakan docs/08-rencana-kerja.md mulai Fase 0. Kerjakan berurutan, centang tugas yang selesai, satu tugas satu commit.
4. Di setiap gerbang fase, jalankan pemeriksaan yang disebut, laporkan hasilnya singkat, lalu lanjut ke fase berikutnya, kecuali di Gerbang 2 (wajib berhenti untuk review saya) atau jika menemui keputusan bertanda "Blokir? Ya" di docs/09-keputusan-terbuka.md.
5. Jika akses ke Google Sites/Drive gagal dari lingkungan ini, catat di manifest, laporkan daftar URL yang perlu saya unduh manual ke sources/raw/manual/, lalu lanjutkan tugas lain yang tidak bergantung pada itu.

Mulai sekarang dari langkah 1.
```

---

## Prompt lanjutan yang berguna

- Lanjut setelah review inventaris:
  `Inventaris dan peta konten sudah saya review (lihat komentar di sources/peta-konten.csv). Lanjutkan Fase 3, lalu Fase 4 dimulai dari /migrasi-modul mulai.`
- Migrasi satu modul: `/migrasi-modul persediaan`
- Artikel baru: `/artikel-baru komitmen/ruh/registrasi-escrow https://drive.google.com/file/d/...`
- Audit: `/audit-konten` atau `/audit-konten aset-tetap`
- Uji pencarian: `/uji-pencarian "gak bisa login"`
- Menjawab keputusan: `Jawaban K1: ... K3: ... Perbarui docs/09-keputusan-terbuka.md dan config/modul.yaml lalu sesuaikan pekerjaan yang terdampak.`
