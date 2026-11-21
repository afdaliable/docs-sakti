# 01 — Inventaris Sumber Konten

Daftar ini dibuat dari pemeriksaan awal (21 Nov 2026) dan **belum lengkap**: hanya navigasi dan halaman beranda yang terbaca. Tugas pertama migrasi adalah crawl penuh dan mengisi `sources/manifest.json` (lihat `03-migrasi-konten.md`).

---

## Sumber A — SAKTI Admin Knowledge Base

Base URL: `https://sites.google.com/view/saktiadm`

### Halaman (menu atas)

| # | Halaman | URL | Target modul KB |
|---|---|---|---|
| 1 | Beranda | `/beranda` | `mulai`, `admin` |
| 2 | Satker K/L | `/satker-kl` | `peran/satker` + `admin` |
| 3 | KPPN (BUN) dan Kanwil DJPb | `/kppn-bun-dan-kanwil-djpb` | `peran/kppn-kanwil` + `admin` |
| 4 | DJPb (Kantor Pusat) | `/djpb-kantor-pusat` | `peran/djpb-pusat` |
| 5 | DJA (Penelaah) | `/dja-penelaah` | `peran/dja` |
| 6 | DJKN (Pembina) | `/djkn-pembina` | `peran/djkn` |
| 7 | Bappenas (Penelaah) | `/bappenas-penelaah` | `peran/bappenas` |
| 8 | BPK (Auditor) | `/bpk-auditor` | `peran/bpk` |
| 9 | APIP | `/apip` | `peran/apip` |
| 10 | Widyaiswara Kemenkeu | `/widyaiswara-kemenkeu` | `peran/widyaiswara` |
| 11 | Peraturan | `/peraturan` | `peraturan` |
| 12 | Hubungi Kami | `/hubungi-kami` | `bantuan` |
| 13 | Layanan | `/layanan` | `bantuan` |
| – | Unduh Form | `/download` | `admin/formulir` |

### Dokumen yang ditautkan dari Beranda

| Dokumen | Jenis | URL | Target |
|---|---|---|---|
| Juknis Pendaftaran User 2022 | Google Slides | https://docs.google.com/presentation/d/1C9gJgpqXILQQKPmW1gnSfnaPErf-odt4b6buJams854/ | `admin/pendaftaran-user` |
| Juknis Fitur MFA SAKTI | Google Slides | https://docs.google.com/presentation/d/1gcv8fPg_UEe-9Br4iLLH4ryo90idc5wZOlzsdfPjJXE/ | `admin/mfa` |
| Juknis PKIPA 2025 | Google Slides | https://docs.google.com/presentation/d/1je1dkw9lOiKs8gKzIOz0kl-g6XgJ9ibXQxWu2NXKtuk/ | `admin/pkipa` |
| Sosialisasi Monitoring Status DS | Google Slides | https://docs.google.com/presentation/d/1VWzsFNOT3jcePdzOZFHKJM16yVXkCZo3NsL_O88F6h4/ | `admin/monitoring-ds` |
| Juknis SAKTI Admin Updated 2024 | Google Slides | https://docs.google.com/presentation/d/1dbhAhtZ-uotv_CxZ5GefYlmeF11DCnZNaswn0Oym6PE/ | `admin/*` (dipecah) |
| Petunjuk Pembagian Role SAKTI | Short link | http://bit.ly/rolesakti | `admin/role` |
| Kelompok Pengguna Untuk Rollout | Google Sheets | https://drive.google.com/open?id=1lDSbhu_ey7W5JXNavMTdWneeWoMLd3CQreACcXGOfTA | `admin/role` (tabel) |
| Petunjuk Email SAKTI | Google Slides | https://docs.google.com/presentation/d/1k0KWXFd6InJNTdR_UOd8V4nii5BPn0zdfq5XnFgBLz0/ | `admin/email-sakti` |
| Juknis User Direktorat PA | Google Slides | https://docs.google.com/presentation/d/1uhQx7GCvFYp-o-ofriZX-ByE4xADKAJiwD_Uk23yLUQ/ | `peran/djpb-pusat` |
| Juknis User Kanwil DJPb (BUN) | Google Slides | https://docs.google.com/presentation/d/1VQvascq_77ChU9kZEWL6JVwpw-aOT7CO1_HehP35nxY/ | `peran/kppn-kanwil` |
| Juknis User KPPN (Kuasa BUN) | Google Slides | https://docs.google.com/presentation/d/1YdQGJaawc-a_mT49frmBOj0Os06Q8Tnb1nfiiQEijhw/ | `peran/kppn-kanwil` |

Kontak resmi di beranda (boleh dipublikasikan): HAI Kemenkeu `https://hai.kemenkeu.go.id/`, email `hai.djpb@kemenkeu.go.id`. Info box tentang konfirmasi nama dan NIK (Halo Dukcapil 1500537) → artikel `admin/pendaftaran-user` bagian masalah umum.

### Masalah data yang sudah diketahui (perbaiki saat migrasi)

- Tombol **Direktorat PA** memakai ID slide yang sama dengan deck Kanwil DJPb, sementara link "present"-nya memakai ID berbeda. Pakai ID `1uhQx7GC...` lalu verifikasi isinya.
- Tombol tipe **DJKN (GLP Pusat)** dan **Bappenas (Penelaah)** mengarah ke halaman DJA, bukan halamannya sendiri.
- Tombol **Tipe Unit** dan **Tipe Kementerian** mengarah ke halaman Satker K/L.
- Ada judul "Embedded Files" tanpa isi. Crawler harus menangkap iframe Drive/embed yang dimuat via JavaScript.

---

## Sumber B — Linktree Juknis SAKTI Pelaksanaan

URL: `https://linktr.ee/juknissaktipelaksanaan`

| Link | Folder Google Drive | Target modul |
|---|---|---|
| Modul Bendahara | https://drive.google.com/drive/folders/1whfBfo_kT4hI69H6Jjnwy9DQPOqrLei3 | `bendahara` |
| Modul Komitmen | https://drive.google.com/drive/folders/1lg7qCe3dif4bbgG7CMg8w3GapRPXtsqE | `komitmen` |
| Modul Pembayaran | https://drive.google.com/drive/folders/1Lo1jqUetojYZyMnsKTpaSDFoXcX6vXw2 | `pembayaran` |
| Modul KPPN BUN | https://drive.google.com/drive/folders/1cOx-1D1y5bBZyhO67HcW0VyK1K6PK11p | `kppn-bun` |

Isi folder belum diketahui (kemungkinan PDF/PPTX per menu). Crawl rekursif semua subfolder.

---

## Sumber C — SAKTI Pelaporan

Base URL: `https://sites.google.com/view/saktipelaporan`

Struktur navigasi (diringkas; crawl penuh untuk daftar lengkap):

### Persediaan `/persediaan` → modul `persediaan`
- Transaksi Masuk (12): Saldo Awal, Pembelian, Transfer Masuk Online/Manual, Hibah Masuk, Perolehan Lainnya, Reklasifikasi Masuk, Reklasifikasi dari Aset, Rampasan, Hibah Masuk BLU, Internal Transfer Masuk, Internal Transfer Masuk Non-Aktif Pembantu
- Transaksi Keluar (12): termasuk Pemakaian, Transfer Keluar Online, Hibah Keluar, Penghapusan, Usang, Rusak
- Koreksi: Koreksi Jumlah, Koreksi Nilai, Batal Transfer Keluar Online, Batal Penghapusan (Usang/Rusak), Batal Catat Usang/Rusak
- Opname Fisik: Cetak Bahan Opname Fisik, Rekam Hasil Opname Fisik
- Tutup Buku: Tutup Periode Persediaan
- Referensi: Mengelola Barang Persediaan, Metode Penilaian, Metode Pencatatan
- Persediaan dalam Proses: Penyelesaian, Laporan
- Pelaporan, Migrasi Data, Monitoring, Persediaan Tak Dikuasai, Likuidasi, Upload Data BLU

### Aset Tetap `/aset-tetap` → modul `aset-tetap`
- RUH › Transaksi BMN: Perolehan BMN (16), Perubahan BMN (13), BMN Hilang, Penghentian Penggunaan, Usulan Penghapusan, Penghapusan (11), Transfer Internal, BPYBDS, Aset Kemitraan, Aset Konsesi Jasa, Properti Investasi, BMN dalam Proses PMPP
- RUH › Transaksi KDP (15), Transaksi BMN Bersejarah (5), Transaksi Barang Pihak Ketiga (4), ATR – Menambah Masa Manfaat (5)
- Persetujuan: Validasi (Validator), Persetujuan Transaksi (Approver)
- Monitoring (Status Transaksi), Cetak, Penutupan Periode, ADK, Likuidasi
- Normalisasi: BMN, KDP, Tindak Lanjut Normalisasi BMN/KDP
- Konsesi Jasa Mitra: Transaksi Konjas Mitra (10), Transaksi KDP Konjas Mitra, Referensi
- Usul Hapus & Penghapusan Masal

### Piutang `/piutang` → modul `piutang`
- Pengelolaan Piutang: Referensi (Data Debitur); Pencatatan (Piutang/Tagihan, Upload Data Piutang); Transaksi (Settlement, Restrukturisasi, Penghapusan, Penyisihan, Surat Peringatan, Pelimpahan ke DJKN/PUPN); Koreksi (Koreksi Piutang, Hapus Piutang); Transfer, Laporan, Tutup Periode, Upload, Piutang Jangka Panjang
- Likuidasi

### Akuntansi dan Pelaporan `/akuntansi-dan-pelaporan` → modul `akuntansi-pelaporan`
- Proses: Jurnal Manual (Korolari BLU), Validasi Jurnal, Posting Jurnal, Jurnal Penyesuaian Khusus (Jurnal Balik), Monitoring Jurnal, Penerimaan dari Potongan SP2D Satker Lain, Jurnal BAST Void
- Tutup Buku: Tutup Buku, Monitoring Tutup Transaksi
- Transaksi Resiprokal, Laporan, Juknis MPHL-BJS SAKTI
- Likuidasi Satker: Persediaan, Aset Tetap, Piutang, GLP

### Halaman lain
- Daftar Akun untuk Perolehan dan Pengembangan BMN (Akun vs Kode Barang) → `aset-tetap/referensi/akun-vs-kode-barang`
- KOREKSI: Juknis Koreksi SPM yang memerlukan Jurnal Manual → `akuntansi-pelaporan/koreksi-spm-jurnal-manual`
- FAQ → dipecah per modul + `faq` umum

### SAKTI-Pelaksanaan (di dalam situs Pelaporan)
- Komitmen `/sakti-pelaksanaan/komitmen` → modul `komitmen`: RUH (17: Pencatatan Suplier, Kontrak, BAST/BG, Realisasi Kinerja Satker, ...), Proses Escrow (Registrasi Escrow), Cetak (Laporan TKDN/PDN, Resume Suplier/Kontrak/BAST, Laporan FA Detail 16 Segmen), ADK (Data Pegawai, Import Suplier, Import GPP Terpusat), Upload/Rekam (ADK NRS, ADK CAN), Monitoring (Karwas Kontrak, Monitoring ADK GPP, ADK Kontrak dan Supplier), Jurnal
- Pembayaran `/sakti-pelaksanaan/pembayaran` → modul `pembayaran`: RUH Pembayaran (4), Cetak (5), ADK, Catat/Upload (10), Monitoring (5), Referensi
- Bendahara → modul `bendahara`

**Tumpang tindih:** Komitmen, Pembayaran, dan Bendahara ada di Sumber B dan C. Gabungkan; versi terbaru menang (lihat aturan dedup di `03-migrasi-konten.md`).

**Penanda ✅ dan 🟡** di menu Pelaporan belum diketahui artinya (dugaan: ✅ = sudah ada juknis, 🟡 = sedang diperbarui). Simpan sebagai `penanda_sumber` di manifest dan tanyakan ke pemilik (lihat `09-keputusan-terbuka.md`).
