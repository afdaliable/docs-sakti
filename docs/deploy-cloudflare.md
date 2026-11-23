# Deploy ke Cloudflare (Worker + static assets) — panduan pemilik

## 1. Ringkasan

Repo ini sudah berisi semua yang bisa disiapkan sebagai kode: alamat situs
(`https://docs.sakti.ai.id`), `robots.txt`, sitemap, halaman 404, header keamanan
(`public/_headers`), konfigurasi Worker (`wrangler.jsonc`), dan perintah build untuk
Cloudflare (`pnpm build:pages`).

Proyek ini berjalan sebagai **Worker `docs-sakti` dengan static assets**, dibangun oleh
**Workers Builds** langsung dari repo GitHub — bukan proyek Pages. Pada setiap push ke
`main`, Cloudflare menjalankan build command lalu deploy command.

Yang hanya bisa dilakukan pemilik lewat dashboard Cloudflare dan pengelola DNS:
memastikan pengaturan build, memasang domain `docs.sakti.ai.id`, dan memeriksa hasilnya.
Agent tidak men-deploy dan tidak memanggil API atau akun Cloudflare.

Nama menu di dashboard Cloudflare dapat sedikit berbeda dari yang tertulis di sini; rujukan
resminya ada di bagian 9.

| Pengaturan | Nilai |
|---|---|
| Jenis proyek | Worker + static assets (Workers Builds) |
| Nama Worker | `docs-sakti` (harus sama dengan `name` di `wrangler.jsonc`) |
| Repo | `afdaliable/docs-sakti` |
| Production branch | `main` |
| Build command | `pnpm build:pages` |
| Deploy command | `npx wrangler deploy` |
| Direktori aset | `./dist` (diisi `assets.directory` di `wrangler.jsonc`, bukan di dashboard) |
| Root directory | (kosong) |
| Build variables | `NODE_VERSION` = `26`, `PNPM_VERSION` = `12.21.0` |
| Domain produksi | `docs.sakti.ai.id` |
| Secret | Tidak ada |

## 2. Sebelum mulai

- [ ] Gerbang rilis di `docs/09-keputusan-terbuka.md` sudah dijawab: K3 (domain, sudah), K4
      (izin publikasi), K9 (repo publik, sudah), K69 (nama pemegang hak cipta, sudah
      diisi: `afdaliable`).
- [ ] CI di GitHub hijau pada commit `main` terakhir (tab **Actions**).
- [ ] Anda punya akses ke akun Cloudflare pemilik Worker `docs-sakti`, dan ke pengelola DNS
      `sakti.ai.id`.

Catatan: Workers Builds men-deploy **setiap push ke `main`** tanpa menunggu hasil CI GitHub.
Ruleset `main-protection` (`docs/setup-github.md` bagian 5) mewajibkan pull request dan CI
lolos bagi kontributor, tetapi admin yang memakai bypass tetap bisa push langsung; jalankan
gerbang lokal sebelum push seperti itu.

## 3. Proyek Worker dan pengaturan build

Worker `docs-sakti` sudah dibuat di akun Cloudflare. Yang perlu dilakukan pemilik:

1. Buka dashboard Cloudflare > **Workers & Pages** > Worker `docs-sakti`.
2. Buka **Settings** > **Build** dan pastikan nilainya sama dengan tabel di bagian 1:
   - Git repository: `afdaliable/docs-sakti`, production branch `main`.
   - **Build command**: `pnpm build:pages`.
   - **Deploy command**: `npx wrangler deploy`.
   - **Root directory**: kosong.
3. Bila suatu saat proyek harus dibuat ulang: **Workers & Pages** > **Create application**,
   impor/hubungkan repository Git (pilih hanya `docs-sakti` saat memasang aplikasi GitHub),
   isi nama proyek `docs-sakti`, lalu isi kedua perintah di atas.
4. **Preview Builds** (pratinjau per branch/PR) berada di **Settings** > **Build** >
   **Branch control** > **Enable Preview Builds** dengan perintah bawaan
   `npx wrangler preview`. Fitur ini belum diuji untuk proyek ini dan boleh tetap mati
   sampai preview per PR dibutuhkan (tugas 6.1).

### Mengapa ada `wrangler.jsonc` (galat `ERR_PNPM_IGNORED_BUILDS`)

Tanpa berkas konfigurasi Wrangler di repo, `wrangler deploy` menjalankan "automatic project
configuration": Wrangler mendeteksi Astro lalu menjalankan `astro add cloudflare`, yang
memasang `wrangler` dan `@astrojs/cloudflare` dengan pnpm. Dependensi `wrangler`
(`workerd`) punya postinstall build script, sedangkan `allowBuilds` di
`pnpm-workspace.yaml` hanya mengizinkan `esbuild`, sehingga pnpm 12 berhenti dengan
`ERR_PNPM_IGNORED_BUILDS`. Deploy pertama proyek ini gagal karena hal itu.

Situs ini statis murni dan tidak butuh adapter, jadi perbaikannya adalah `wrangler.jsonc`
di akar repo yang mendeklarasikan direktori aset:

- `name`: `docs-sakti` — harus sama dengan nama Worker di dashboard.
- `compatibility_date`: `2026-11-23`.
- `assets.directory`: `./dist`.
- `assets.not_found_handling`: `404-page` (halaman 404 terdekat disajikan dengan status 404).

Dengan berkas ini `wrangler deploy` melewati auto-config dan langsung menerbitkan aset.
Aturan yang mengikuti:

- Jangan menambahkan `@astrojs/cloudflare` atau `wrangler` ke `package.json`.
- Jangan melonggarkan `allowBuilds` di `pnpm-workspace.yaml`.
- Jangan menghapus `wrangler.jsonc`.
- Bila Cloudflare membuka pull request otomatis "configure for Cloudflare", jangan di-merge.
- Bila Worker diganti nama di dashboard, ganti juga `name` di `wrangler.jsonc`.

### Mengapa `pnpm build:pages`, bukan `pnpm build`

Workers Builds mengambil repo secara dangkal (hanya commit terakhir). Tanggal "Terakhir
diperbarui" di setiap artikel dan daftar "Baru diperbarui" di beranda dibaca dari riwayat
git, sehingga dengan riwayat dangkal semua artikel akan menampilkan tanggal commit
terakhir. `pnpm build:pages` melengkapi riwayat dulu (`git fetch --unshallow`, hanya bila
repo dangkal) lalu menjalankan `pnpm build`. Nama skrip ini tetap `build:pages` walau
proyek bukan Pages.

Bila langkah `git fetch --unshallow` gagal di log build (misalnya karena akses repo
privat), build sengaja berhenti agar tanggal yang salah tidak terbit. Jalan keluar
sementara: ganti **Build command** menjadi `pnpm build` dan terima bahwa tanggal belum
akurat, lalu catat masalahnya sebagai issue.

## 4. Variabel lingkungan dan versi alat

Variabel ditambahkan di **Settings** > **Build** > **Build variables and secrets**. Ini
variabel *build*, bukan **Variables and Secrets** runtime Worker — jangan diisi di sana.

| Nama | Nilai | Keterangan |
|---|---|---|
| `NODE_VERSION` | `26` | Sama dengan isi `.nvmrc`. Workers Builds juga membaca `.nvmrc`; variabel ini penegasan. |
| `PNPM_VERSION` | `12.21.0` | Sama dengan `packageManager` di `package.json`. Workers Builds menjalankan pnpm lewat Corepack dan `packageManager` menang atas variabel ini, jadi `PNPM_VERSION` hanya penegasan dan harus tetap sama. |

- Tidak ada secret yang perlu diisi. Jangan memasukkan isi `.env` ke proyek.
- Setelah build pertama, periksa baris awal log build: versi Node harus 26.x dan pnpm
  12.21.0.
- Bila `.nvmrc` atau `packageManager` berubah, ubah juga variabel ini dan tabel di atas
  (`tests/deploy.test.ts` menjaga dokumen ini tetap sama dengan kedua berkas itu).

## 5. Custom domain `docs.sakti.ai.id`

Selalu mulai dari Worker di dashboard. Custom domain sengaja tidak ditulis sebagai
`routes` di `wrangler.jsonc`; domain ditambahkan lewat dashboard.

1. Buka Worker `docs-sakti` > **Settings** > **Domains & Routes**.
2. Pilih **Add** > **Custom Domain**, isi `docs.sakti.ai.id`, lalu **Add Custom Domain**.
3. Cloudflare membuat record DNS dan sertifikatnya sendiri. Syaratnya: zona `sakti.ai.id`
   harus aktif di akun Cloudflare yang sama, dan hostname `docs` belum punya record CNAME
   (hapus dulu record itu bila ada).

### 5a. Zona `sakti.ai.id` aktif di Cloudflare (akun yang sama)

Setelah domain **Active**, karena domain lewat proxy Cloudflare, pengaturan zona
`sakti.ai.id` ikut berlaku. Periksa:

- **Rocket Loader**: harus mati (fitur ini menyisipkan skrip yang diblokir CSP).
- **Email Address Obfuscation**: matikan untuk `docs.sakti.ai.id`, agar alamat email kontak
  resmi tetap tampil setelah pindah halaman tanpa muat ulang.
- **Cache Rules/Page Rules**: jangan membuat aturan cache untuk host ini; aturan cache zona
  bisa menyajikan halaman lama setelah deploy.
- **Web Analytics** otomatis: jangan diaktifkan dulu. Skrip analitik diblokir CSP dan
  analitik adalah keputusan tersendiri (tugas 6.3).

### 5b. DNS `sakti.ai.id` dikelola di luar Cloudflare

Custom Domain Worker tidak bisa dipakai dengan DNS di luar Cloudflare: record CNAME dari
pengelola DNS eksternal ke `*.workers.dev` tidak berfungsi. Pilihannya:

1. Pindahkan zona `sakti.ai.id` ke Cloudflare (ubah nameserver di registrar ke nameserver
   Cloudflare), lalu ikuti 5a.
2. Bila pemindahan zona tidak memungkinkan, berhenti dan catat di
   `docs/09-keputusan-terbuka.md` — bentuk hosting harus berubah (misalnya proyek Pages),
   dan itu perubahan tersendiri.

### Alamat `*.workers.dev`

Alamat `docs-sakti.<subdomain-akun>.workers.dev` tetap bisa dibuka setelah custom domain
aktif. `public/_headers` mengirim `X-Robots-Tag: noindex` untuk semua host
`*.*.workers.dev` (aturan `https://:version.:subdomain.workers.dev/*`), sehingga mesin
pencari hanya mengindeks `docs.sakti.ai.id`. Bila workers.dev ingin dimatikan permanen,
tambahkan `"workers_dev": false` ke `wrangler.jsonc` lewat pull request setelah custom
domain aktif — mematikannya hanya di dashboard akan dibatalkan deploy berikutnya. Aturan
pages.dev di `_headers` dibiarkan dan tidak berbahaya.

## 6. Cek pasca-deploy

Jalankan setelah deploy pertama dan setelah custom domain aktif. Ambil alamat workers.dev
yang sebenarnya dari **Domains & Routes** Worker.

### 6a. Daftar URL

| URL | Yang diharapkan |
|---|---|
| `https://docs.sakti.ai.id/` | Beranda tampil, kotak pencarian besar dan kartu modul ada |
| `https://docs.sakti.ai.id/komitmen/` | Halaman modul tampil |
| `https://docs.sakti.ai.id/komitmen/ruh/pencatatan-kontrak/kontrak-tahunan/` | Artikel tampil, ada penanda "Sedang ditinjau" dan kotak "Perlu verifikasi" |
| `https://docs.sakti.ai.id/cari/?q=kontrak` | Hasil pencarian muncul |
| `https://docs.sakti.ai.id/peran/satker/` | Halaman peran tampil |
| `https://docs.sakti.ai.id/glosarium/` | Glosarium tampil |
| `https://docs.sakti.ai.id/robots.txt` | Teks dengan baris `Sitemap:` |
| `https://docs.sakti.ai.id/sitemap-index.xml` | XML yang menunjuk `sitemap-0.xml` |
| `https://docs.sakti.ai.id/halaman-yang-tidak-ada/` | Halaman "404 — Halaman tidak ditemukan" |
| `https://docs-sakti.<subdomain-akun>.workers.dev/` | Situs yang sama (dengan header `noindex`) |

### 6b. Perintah curl

```bash
# 1. Header keamanan dan cache HTML
curl -sI https://docs.sakti.ai.id/ | grep -i -E '^(HTTP|content-security-policy|x-content-type-options|x-frame-options|referrer-policy|permissions-policy|cache-control)'
```

Harapan: `HTTP/2 200`; `content-security-policy` memuat `script-src 'self' 'wasm-unsafe-eval'
'sha256-…'` dan **tidak** memuat `{{HASH_SKRIP_INLINE}}`; `x-content-type-options: nosniff`;
`x-frame-options: DENY`; `referrer-policy: strict-origin-when-cross-origin`;
`permissions-policy: accelerometer=(), camera=(), …`;
`cache-control: public, max-age=0, must-revalidate`.

```bash
# 2. Cache panjang untuk aset ber-hash
ASET=$(curl -s https://docs.sakti.ai.id/ | grep -o '/_astro/[^"]*\.css' | head -1)
curl -sI "https://docs.sakti.ai.id$ASET" | grep -i '^cache-control'
```

Harapan: `cache-control: public, max-age=31536000, immutable` saja (tidak tergabung dengan
`max-age=0`).

```bash
# 3. robots.txt dan sitemap
curl -s https://docs.sakti.ai.id/robots.txt
curl -s https://docs.sakti.ai.id/sitemap-index.xml
curl -s https://docs.sakti.ai.id/sitemap-0.xml | grep -o '<loc>[^<]*</loc>' | grep -v 'https://docs.sakti.ai.id/' | head
```

Harapan: `robots.txt` berisi `Sitemap: https://docs.sakti.ai.id/sitemap-index.xml`; sitemap hanya
memuat alamat `https://docs.sakti.ai.id/…` (perintah ketiga tidak mencetak apa pun).

```bash
# 4. Halaman tidak ditemukan
curl -s -o /dev/null -w '%{http_code}\n' https://docs.sakti.ai.id/halaman-yang-tidak-ada/
```

Harapan: `404` (bukan `200`).

```bash
# 5. Alamat workers.dev tidak diindeks
curl -sI https://docs-sakti.<subdomain-akun>.workers.dev/ | grep -i '^x-robots-tag'
curl -sI https://docs.sakti.ai.id/ | grep -i '^x-robots-tag'
```

Harapan: baris pertama `x-robots-tag: noindex`; baris kedua kosong.

```bash
# 6. HTTP dialihkan ke HTTPS
curl -sI http://docs.sakti.ai.id/ | head -3
```

Harapan: status 301 atau 308 dengan `location: https://docs.sakti.ai.id/`. Bila tidak dialihkan
dan zona dikelola di Cloudflare, aktifkan **SSL/TLS** > **Edge Certificates** > **Always Use
HTTPS**.

### 6c. Cek di browser

1. Buka `https://docs.sakti.ai.id/`, buka DevTools > **Console**. Tidak boleh ada pesan
   "Content Security Policy" atau "Refused to …".
2. Ketik `kontrak` di kotak pencarian beranda: hasil muncul di bawah kotak.
3. Klik satu artikel dari sidebar: halaman berganti tanpa muat ulang penuh dan Console tetap
   bersih.
4. Buka dua artikel dari modul berbeda: tanggal "Terakhir diperbarui" tidak selalu sama. Bila
   semua artikel bertanggal sama, riwayat git tidak lengkap saat build (lihat bagian 3).
5. Ulangi langkah 2–3 di ponsel.

Bila Console menampilkan pelanggaran CSP, jangan melonggarkan CSP di dashboard. Laporkan sebagai
issue dengan teks pesannya; perbaikannya ada di `public/_headers` (bagian 8).

### 6d. Setelah push berikutnya ke `main`

Setelah push ke `main` berikutnya, pastikan `docs.sakti.ai.id` masih tercantum dan aktif di
**Domains & Routes**. Deploy lewat `wrangler.jsonc` tanpa `routes` seharusnya tidak
menyentuh domain yang dipasang di dashboard, tetapi ini belum terbukti untuk proyek ini.

## 7. Rollback

Cara cepat (situs langsung kembali ke versi sebelumnya):

1. Buka Worker `docs-sakti` > **Deployments**.
2. Buka menu tiga titik pada versi terakhir yang baik, pilih **Rollback**, konfirmasi.
3. Ulangi cek 6b nomor 1 dan 6c.

Hal yang perlu diketahui:

- Hanya 100 versi yang paling baru diterbitkan yang bisa menjadi tujuan rollback; versi
  lebih tua dari 30 hari dapat dihapus kecuali 100 yang terbaru.
- Rollback tidak mengubah repo. Push berikutnya ke `main` akan men-deploy isi `main` lagi,
  termasuk perubahan yang bermasalah. Setelah rollback, batalkan perubahannya di repo lewat pull
  request (`git revert <commit>`), tunggu CI hijau, lalu merge; deploy baru dari `main` yang
  sudah benar menggantikan rollback.
- Untuk menurunkan situs sepenuhnya: hapus Custom Domain di **Domains & Routes**.

## 8. Yang ada di repo

| Berkas | Isi |
|---|---|
| `wrangler.jsonc` | Nama Worker, `compatibility_date`, direktori aset `./dist`, dan 404 handling; tidak ada skrip Worker |
| `astro.config.mjs`, `src/lib/situs.ts` | `site` = `https://docs.sakti.ai.id` (`SITUS_URL`): dasar canonical, sitemap, `robots.txt`, dan tautan "Laporkan kesalahan" |
| `src/pages/robots.txt.ts` | `robots.txt` dengan baris `Sitemap:` |
| `public/_headers` | Header keamanan, cache, dan `noindex` untuk `*.pages.dev` dan `*.workers.dev` |
| `scripts/csp-headers.ts` | Saat build, mengisi penanda hash di `dist/_headers` dengan hash sha256 semua skrip inline |
| `package.json` → `build:pages` | Perintah build untuk Workers Builds (melengkapi riwayat git, lalu `pnpm build`) |
| `.nvmrc`, `packageManager` | Versi Node dan pnpm |

### Tentang CSP

- `script-src` hanya mengizinkan berkas dari situs sendiri, WebAssembly (`'wasm-unsafe-eval'`,
  dipakai Pagefind), dan skrip inline yang hash-nya tercantum. Tidak ada `'unsafe-inline'` atau
  `'unsafe-eval'` untuk skrip.
- Hash skrip inline dihitung otomatis setiap build, jadi mengubah komponen atau memutakhirkan
  Starlight tidak perlu menyunting `public/_headers`. Build gagal bila baris CSP melebihi batas
  2.000 karakter per baris yang ditetapkan Cloudflare.
- `style-src` memakai `'unsafe-inline'` karena Starlight dan penyorot kode menulis atribut
  `style` pada elemen.
- Menambah layanan pihak ketiga (analitik, video sematan, font luar) berarti menambah asalnya ke
  direktif yang sesuai di `public/_headers`, lalu menjalankan `pnpm build`, `pnpm check:dist`, dan
  `pnpm test:e2e`. Tes e2e berjalan dengan header dari `_headers` dan gagal bila ada pelanggaran
  CSP.
- `Strict-Transport-Security` (HSTS) sengaja tidak dipasang (K71). Bila diinginkan dan zona
  dikelola di Cloudflare, aktifkan di **SSL/TLS** > **Edge Certificates**.

### Yang tidak dibuat

- Adapter `@astrojs/cloudflare` dan dependensi `wrangler`: situs statis murni; `npx`
  mengambil wrangler saat deploy (versi tidak dipin). `tests/deploy.test.ts` menjaga ini.
- `public/_redirects`: tidak diperlukan. Situs belum pernah terbit, jadi belum ada URL lama yang
  harus dialihkan; pengalihan antardomain (`*.workers.dev` → `docs.sakti.ai.id`) tidak bisa
  dilakukan lewat `_redirects`.
- Analitik, skrip Worker (`main`), dan secret: belum ada (tugas 5.2, 5.4, 6.3).
- Workflow deploy di GitHub Actions: tidak ada; deploy dijalankan oleh Workers Builds.

## 9. Rujukan resmi Cloudflare

- Workers Builds configuration: <https://developers.cloudflare.com/workers/ci-cd/builds/configuration/>
- Build image (versi Node dan pnpm): <https://developers.cloudflare.com/workers/ci-cd/builds/build-image/>
- Build branches: <https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/>
- Static assets dari SSG dan 404: <https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/>
- Headers (`_headers`): <https://developers.cloudflare.com/workers/static-assets/headers/>
- Custom Domains: <https://developers.cloudflare.com/workers/configuration/routing/custom-domains/>
- Rollbacks: <https://developers.cloudflare.com/workers/configuration/versions-and-deployments/rollbacks/>
