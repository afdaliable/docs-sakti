# 09 — Keputusan Terbuka

Agent: jika keputusan belum dijawab, pakai **Default** dan lanjutkan, kecuali kolom "Blokir?" berisi Ya. Tambahkan keputusan baru di bawah dengan nomor berikutnya.

| No | Pertanyaan | Default sementara | Blokir? | Jawaban |
|---|---|---|---|---|
| K1 | Daftar & urutan modul persis seperti menu SAKTI saat ini? Apakah Penganggaran, Referensi, dan modul lain (mis. Monitoring) perlu ada walau belum ada sumber? | Pakai `config/modul.yaml`; modul tanpa sumber cukup halaman indeks "segera hadir" | Tidak (blokir di gerbang 2) | |
| K2 | Arti penanda ✅ dan 🟡 di situs SAKTI Pelaporan? | Simpan di manifest, tidak ditampilkan | Tidak | |
| K3 | Domain & hosting: subdomain pribadi, domain komunitas, atau infrastruktur resmi DJPb? | `*.pages.dev` | **Ya** untuk rilis publik | |
| K4 | Izin publikasi & branding: apakah KB ini resmi (atas nama Dit. SITP/DJPb) atau komunitas? Boleh pakai logo? Perlu persetujuan atasan? | Netral, tanpa logo resmi, ada disclaimer "bukan situs resmi" sampai dijawab | **Ya** untuk rilis publik | |
| K5 | Siapa admin & pemilik tiap modul (username GitHub)? | Semua ke pemilik repo | Tidak | |
| K6 | Konten mana yang **tidak boleh** dipublikasikan (internal, data rollout, kelompok pengguna)? | Sheets "Kelompok Pengguna Untuk Rollout" & formulir berisi data → jangan dipublikasikan, hanya ditautkan | Tidak (blokir di gerbang 2) | |
| K7 | Opsi pencarian semantik: A (Cloudflare), B (VPS/Synology + 9Router), C (statis)? | A | Tidak | |
| K8 | Aktifkan Tanya AI? Model/endpoint mana dan siapa yang menanggung biaya? | Tidak di MVP | Tidak | |
| K9 | Repo GitHub di akun/organisasi mana, publik atau privat? | Privat sampai K4 dijawab | **Ya** untuk membuat repo publik | |
| K10 | Pengelola Google Sites lama: akan dipensiunkan, diberi banner ke KB baru, atau tetap jalan paralel? | Paralel; siapkan `peta-url-lama.csv` | Tidak | |
