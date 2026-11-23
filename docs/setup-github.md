# Setup GitHub — panduan pemilik repo

## 1. Ringkasan

Repo ini sudah berisi semua berkas yang bisa ditulis sebagai kode: `.github/CODEOWNERS`,
`.github/labels.yml`, template pull request, dan formulir issue. Pengaturan lain — kolaborator,
label di repo, ruleset, dan GitHub App — hanya bisa dilakukan pemilik lewat antarmuka
GitHub. Agent tidak mengubah pengaturan repo.

Keadaan 23 Nov 2026 (dibaca lewat `gh api`):

| Pengaturan | Keadaan |
|---|---|
| Visibilitas repo | Publik (K9) |
| Ruleset `main-protection` | Aktif (bagian 5) |
| Kolaborator | Hanya pemilik (`afdaliable`) |
| Label `modul:*`, `jenis:*`, `perlu-review` | Belum dibuat (hanya label bawaan GitHub) |
| Private vulnerability reporting | Belum aktif (bagian 8, K74) |
| Secret scanning dan push protection | Aktif |
| Persetujuan workflow untuk PR dari fork | Kontributor yang baru pertama kali |

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

## 5. Ruleset `main-protection`

Pemilik membuat ruleset `main-protection` pada 23 Nov 2026 (**Settings → Rules → Rulesets**). Isinya, dibaca lewat
`gh api repos/afdaliable/docs-sakti/rulesets`:

- Berlaku pada branch default (`main`), status aktif.
- Wajib pull request sebelum merge, minimal 1 approval, wajib review dari Code Owners. Cara merge yang diizinkan: merge,
  squash, rebase.
- Wajib status check lolos: `Periksa konten, build, dan tes` (job `periksa` di workflow `CI`, `.github/workflows/ci.yml`).
  Branch PR tidak wajib mutakhir terhadap `main`.
- Larang force-push dan penghapusan branch.
- Bypass: peran admin repo (selalu). Pada repo akun pribadi, itu berarti pemilik.

### Akibat yang perlu diketahui

- Kontributor (fork) dan kolaborator (Write) tidak bisa push langsung ke `main`. Perubahan mereka masuk lewat pull request,
  disetujui `@afdaliable` (satu-satunya Code Owner sampai K5 dijawab), dan CI harus lolos.
- Admin tetap bisa push langsung ke `main` dan menggabungkan pull request tanpa approval (bypass). GitHub tidak mengizinkan
  pembuat PR menyetujui PR-nya sendiri, jadi selama belum ada Code Owner lain, PR buatan admin hanya bisa digabung lewat bypass.
- Push dengan bypass melewati check CI, dan Workers Builds men-deploy setiap push ke `main` tanpa menunggu CI
  (`docs/deploy-cloudflare.md`). Karena itu sebelum push langsung jalankan gerbang lokal: `pnpm check:content`, `pnpm test`,
  `pnpm build`, `pnpm check:links`, `pnpm check:dist` (K75).
- Agent bekerja dengan kredensial pemilik, sehingga alur K35 (push ke `main` setelah gerbang lolos) tetap berjalan lewat bypass.
- Bila bypass dicabut (sunting ruleset), admin juga wajib lewat PR dan repo butuh Code Owner kedua agar PR admin bisa disetujui.

## 6. Template issue dan PR

- `.github/pull_request_template.md` — checklist penulis dan reviewer.
- `.github/ISSUE_TEMPLATE/koreksi-konten.yml` — formulir "Laporkan kesalahan konten".
- `.github/ISSUE_TEMPLATE/usulan-artikel.yml` — formulir "Usulkan artikel".
- `.github/ISSUE_TEMPLATE/config.yml` — mengarahkan kendala aplikasi ke HAI DJPb; kini juga menaut ke panduan kontribusi
  dan kebijakan keamanan.
- Dokumen komunitas di akar repo: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`.

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
6. `pnpm check:dist`
7. `pnpm exec playwright install --with-deps chromium`
8. `pnpm search:eval --level 1`
9. `pnpm test:e2e`
10. Lighthouse lewat `@lhci/cli` — hanya **peringatan** (`continue-on-error`), laporan disimpan
    sebagai artifact `lighthouse` (retensi 14 hari).

Yang perlu diketahui:

- CI tidak memakai secret dan tidak men-deploy apa pun.
- Izin workflow cukup baca (`permissions: contents: read`); di **Settings → Actions →
  General → Workflow permissions** pilih "Read repository contents".
- Semua action dipin ke SHA commit; pembaruan dilakukan lewat PR yang mengganti SHA-nya.
- Mendorong perubahan di `.github/workflows/` butuh token/kredensial dengan scope `workflow`.
- Workflow pada PR dari fork milik kontributor yang baru pertama kali menunggu persetujuan pemelihara (**Settings →
  Actions → General**).

Deploy tidak lewat GitHub Actions — Cloudflare Workers Builds membangun dan menerbitkan setiap push ke `main`
(`docs/deploy-cloudflare.md`). Belum ada: preview per PR (6.1), `embeddings.yml` (5.2), `cek-sumber.yml` (6.4), Dependabot
(6.5).

## 8. Private vulnerability reporting (K74)

Fitur ini belum aktif; `SECURITY.md` dan `CODE_OF_CONDUCT.md` menunjuk tombol **Report a vulnerability** di tab
**Security**. Langkah pemilik: **Settings → Advanced Security** (nama lama: *Code security and analysis*; nama menu dapat
berbeda) → **Private vulnerability reporting** → **Enable**. Setelah aktif, kedua dokumen itu tidak perlu diubah.

## 9. Belum diputuskan

- K5: pemilik tiap modul.
- K4: resmi atau komunitas, logo, persetujuan atasan — keterangan netral di README: K73.
- K74: saluran laporan privat, tenggat tanggapan.
- K76: lisensi dokumen komunitas dan kontribusi masuk.
- 5.4: editor Keystatic (butuh GitHub App).

K9 sudah dijawab: repo publik di akun pribadi `afdaliable`; lisensi sudah ditetapkan (K69).

Lihat `docs/09-keputusan-terbuka.md`.
