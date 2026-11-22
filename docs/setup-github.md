# Setup GitHub — panduan pemilik repo

## 1. Ringkasan

Repo ini sudah berisi semua berkas yang bisa ditulis sebagai kode: `.github/CODEOWNERS`,
`.github/labels.yml`, template pull request, dan formulir issue. Pengaturan lain — kolaborator,
label di repo, branch protection, dan GitHub App — hanya bisa dilakukan pemilik lewat antarmuka
GitHub. Agent tidak mengubah pengaturan repo.

## 2. Peran dan akses

| Peran | Tingkat akses GitHub |
|---|---|
| Admin | Pemilik repo (di organisasi: Maintain/Admin) |
| Pemilik modul | Kolaborator (Write) |
| Editor | Kolaborator (Write) |
| Kontributor publik | Tanpa akses (memakai fork) |

Repo ini sekarang milik akun pribadi (`afdaliable`); repo akun pribadi hanya mengenal pemilik
dan kolaborator (setara Write) — tingkat Maintain/Triage hanya ada bila repo dipindah ke
organisasi (K9).

Langkah: **Settings → Collaborators**, tambahkan akun sesuai peran di atas.

## 3. Menetapkan pemilik modul (K5)

1. Isi `pemilik: ["@username"]` pada modul (atau bagian lintas) di `config/modul.yaml`.
2. Jalankan `pnpm build:github`.
3. Commit `.github/CODEOWNERS` yang diperbarui.

Catatan: handle di `pemilik` harus punya akses Write ke repo; kalau tidak, GitHub menandai baris
CODEOWNERS itu sebagai galat.

## 4. Label

Sumber kebenaran label: `.github/labels.yml` (dibangkitkan oleh `pnpm build:github`).

| Label | Warna | Kegunaan |
|---|---|---|
| `modul:<slug>` — satu per modul (`mulai`, `admin`, `referensi`, `sinkronisasi-renja-rka`, `penganggaran`, `komitmen`, `bendahara-valas`, `bendahara`, `komitmen-valas`, `pembayaran`, `persediaan`, `aset-tetap`, `piutang`, `akuntansi-pelaporan`, `bendahara-umum-blu`, `kpjm`, `kppn-bun`, `laporan`, `transfer-ke-daerah`) | `1d76db` | Modul artikel yang terdampak |
| `jenis:koreksi` | `d73a4a` | Koreksi isi artikel yang sudah ada |
| `jenis:baru` | `0e8a16` | Usulan atau penulisan artikel baru |
| `jenis:migrasi` | `5319e7` | Migrasi konten dari sumber lama |
| `perlu-review` | `fbca04` | Menunggu review pemilik modul |

Cara membuat: lewat UI GitHub (**Issues → Labels → New label**), atau tinjau lalu jalankan
keluaran `pnpm exec tsx scripts/build-github.ts --perintah-label` (butuh GitHub CLI `gh` yang
sudah login). Template issue memakai `jenis:koreksi`, `perlu-review`, dan `jenis:baru`; label
yang belum dibuat tidak akan terpasang otomatis pada issue baru.

## 5. Branch protection `main`

Settings → Branches → Add rule (atau Rulesets), untuk `main`:

- Wajib pull request sebelum merge.
- Minimal 1 approval.
- Wajib review dari Code Owners.
- Wajib status check lolos — nama check: `Periksa konten, build, dan tes` (job `periksa` di
  workflow `CI`, `.github/workflows/ci.yml`). Nama itu baru bisa dipilih di pengaturan setelah
  workflow pernah berjalan sekali.
- Larang force-push.

### Akibat yang perlu diketahui

Selama ini perubahan masuk lewat merge fast-forward lalu `git push origin main` langsung (K35).
Setelah aturan "wajib PR" aktif, push langsung ke `main` ditolak — termasuk dari agent — dan
alur kerja menjadi branch → pull request → review → merge.

GitHub tidak mengizinkan pembuat PR menyetujui PR-nya sendiri. Selama satu-satunya Code Owner
adalah admin (`@afdaliable`) dan belum ada kolaborator lain, PR buatan admin tidak bisa
memenuhi "1 approval + review Code Owners" kecuali admin diizinkan bypass atau sudah ada
pemilik modul/kolaborator kedua (K5).

Apakah aturan juga berlaku untuk admin ("Do not allow bypassing") belum diputuskan. Dua pilihan:

- Diberlakukan untuk admin: admin juga wajib lewat PR; tidak ada jalan darurat.
- Admin boleh bypass: admin tetap bisa push langsung, berguna untuk keadaan darurat, tetapi
  melewati semua pemeriksaan wajib.

## 6. Template issue dan PR

- `.github/pull_request_template.md` — checklist penulis dan reviewer.
- `.github/ISSUE_TEMPLATE/koreksi-konten.yml` — formulir "Laporkan kesalahan konten".
- `.github/ISSUE_TEMPLATE/usulan-artikel.yml` — formulir "Usulkan artikel".
- `.github/ISSUE_TEMPLATE/config.yml` — mengarahkan kendala aplikasi ke HAI DJPb.

Cara cek: buka **Issues → New issue** — dua formulir di atas harus tampil. Tautan **Laporkan
kesalahan** di bagian bawah setiap artikel dan **Usulkan artikel** di halaman pencarian tanpa
hasil mengisi formulir secara otomatis.

## 7. GitHub Actions

Workflow `CI` (`.github/workflows/ci.yml`) berjalan pada setiap pull request dan push ke
`main`. Job `periksa` menjalankan, berurutan:

1. `pnpm install --frozen-lockfile`
2. `pnpm check:content`
3. `pnpm test`
4. `pnpm build` (sekaligus indeks Pagefind)
5. `pnpm check:links`
6. `pnpm exec playwright install --with-deps chromium`
7. `pnpm search:eval --level 1`
8. `pnpm test:e2e`
9. Lighthouse lewat `@lhci/cli` — hanya **peringatan** (`continue-on-error`), laporan disimpan
   sebagai artifact `lighthouse` (retensi 14 hari).

Yang perlu diketahui:

- CI tidak memakai secret dan tidak men-deploy apa pun.
- Izin workflow cukup baca (`permissions: contents: read`); di **Settings → Actions →
  General → Workflow permissions** pilih "Read repository contents".
- Semua action dipin ke SHA commit; pembaruan dilakukan lewat PR yang mengganti SHA-nya.
- Mendorong perubahan di `.github/workflows/` butuh token/kredensial dengan scope `workflow`.

Belum ada, menunggu keputusan/kredensial: preview per PR dan deploy (K3), `embeddings.yml`
(5.2), `cek-sumber.yml` (6.4), Dependabot (6.5).

## 8. Belum diputuskan

- K5: pemilik tiap modul.
- K4: status resmi, branding, dan lisensi konten.
- K9: akun atau organisasi pemilik repo.
- 5.4: editor Keystatic (butuh GitHub App).

Lihat `docs/09-keputusan-terbuka.md`.
