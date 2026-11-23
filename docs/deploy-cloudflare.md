# Deploy ke Cloudflare Pages — panduan pemilik

## 1. Ringkasan

Repo ini sudah berisi semua yang bisa disiapkan sebagai kode: alamat situs
(`https://docs.sakti.ai.id`), `robots.txt`, sitemap, halaman 404, header keamanan
(`public/_headers`), dan perintah build untuk Cloudflare Pages (`pnpm build:pages`).

Yang **belum** dilakukan dan hanya bisa dilakukan pemilik lewat dashboard Cloudflare dan pengelola
DNS: membuat proyek Pages, menghubungkannya ke repo GitHub, memasang domain `docs.sakti.ai.id`,
dan memeriksa hasilnya. Agent tidak membuat proyek, tidak men-deploy, dan tidak memanggil API
atau akun Cloudflare.

Nama menu di dashboard Cloudflare dapat sedikit berbeda dari yang tertulis di sini; rujukan
resminya ada di bagian 9.

| Pengaturan | Nilai |
|---|---|
| Repo | `afdaliable/docs-sakti` |
| Production branch | `main` |
| Build command | `pnpm build:pages` |
| Build output directory | `dist` |
| Root directory | (kosong) |
| Variabel lingkungan | `NODE_VERSION` = `26`, `PNPM_VERSION` = `12.21.0` |
| Domain produksi | `docs.sakti.ai.id` |
| Secret | Tidak ada |

## 2. Sebelum mulai

- [ ] Gerbang rilis di `docs/09-keputusan-terbuka.md` sudah dijawab: K3 (domain, sudah), K4
      (izin publikasi), K9 (repo publik atau privat), K69 (nama pemegang hak cipta, sudah
      diisi: `afdaliable`).
- [ ] CI di GitHub hijau pada commit `main` terakhir (tab **Actions**).
- [ ] Anda punya akses ke akun Cloudflare yang akan memiliki proyek, dan ke pengelola DNS
      `sakti.ai.id`.

Catatan: Cloudflare Pages men-deploy **setiap push ke `main`** tanpa menunggu hasil CI GitHub.
Agar perubahan yang gagal CI tidak ikut terbit, aktifkan branch protection `main` seperti di
`docs/setup-github.md` bagian 5.

## 3. Membuat proyek Pages dari repo GitHub

1. Buka dashboard Cloudflare, pilih **Workers & Pages**.
2. Pilih **Create application** > **Pages** > **Connect to Git**.
3. Pilih **GitHub** dan masuk ke akun GitHub bila diminta. Saat memasang aplikasi GitHub
   Cloudflare Pages, pilih **Only select repositories** lalu pilih `docs-sakti` saja.
4. Pilih repo `docs-sakti`, lalu **Install & Authorize** dan **Begin setup**.
5. Isi **Set up builds and deployments**:
   - **Project name**: `docs-sakti` (menjadi alamat `docs-sakti.pages.dev`; bila nama itu sudah
     dipakai, pilih nama lain dan pakai nama itu di semua perintah di bawah).
   - **Production branch**: `main`.
   - **Framework preset**: `Astro` (atau `None`), lalu ganti **Build command** menjadi
     `pnpm build:pages`.
   - **Build output directory**: `dist`.
   - **Root directory (advanced)**: biarkan kosong.
6. Buka **Environment variables (optional)** dan tambahkan dua variabel di bagian 4.
7. Pilih **Save and Deploy**, tunggu log build selesai, lalu **Continue to project**.

### Mengapa `pnpm build:pages`, bukan `pnpm build`

Cloudflare Pages mengambil repo secara dangkal (hanya commit terakhir). Tanggal "Terakhir
diperbarui" di setiap artikel dan daftar "Baru diperbarui" di beranda dibaca dari riwayat git,
sehingga dengan riwayat dangkal semua artikel akan menampilkan tanggal commit terakhir.
`pnpm build:pages` melengkapi riwayat dulu (`git fetch --unshallow`, hanya bila repo dangkal) lalu
menjalankan `pnpm build`.

Bila langkah `git fetch --unshallow` gagal di log build (misalnya karena akses repo privat),
build sengaja berhenti agar tanggal yang salah tidak terbit. Jalan keluar sementara: ganti
**Build command** menjadi `pnpm build` dan terima bahwa tanggal belum akurat, lalu catat
masalahnya sebagai issue.

## 4. Variabel lingkungan dan versi alat

Tambahkan di **Settings** > **Environment variables**, untuk lingkungan **Production** dan
**Preview**:

| Nama | Nilai | Keterangan |
|---|---|---|
| `NODE_VERSION` | `26` | Sama dengan isi `.nvmrc`. Pages juga membaca `.nvmrc`; variabel ini penegasan. |
| `PNPM_VERSION` | `12.21.0` | Sama dengan `packageManager` di `package.json`. Pages tidak membaca versi pnpm dari `pnpm-lock.yaml` maupun `engines`, jadi variabel ini wajib. |

- Tidak ada secret yang perlu diisi. Jangan memasukkan isi `.env` ke proyek Pages.
- Pastikan **Build system version** proyek adalah **v3** (bawaan proyek baru).
- Setelah build pertama, periksa baris awal log build: versi Node harus 26.x dan pnpm 12.21.0.
  Bila Pages menolak nilai `26`, isi versi lengkap (misalnya `26.13.0`) dan samakan `.nvmrc`.
- Bila `.nvmrc` atau `packageManager` berubah, ubah juga dua variabel ini dan tabel di atas
  (`tests/deploy.test.ts` menjaga dokumen ini tetap sama dengan kedua berkas itu).

## 5. Custom domain `docs.sakti.ai.id`

Selalu mulai dari dashboard Pages. Membuat CNAME lebih dulu tanpa mendaftarkan domain di proyek
Pages membuat domain gagal dibuka (galat 522).

1. Buka proyek Pages > **Custom domains** > **Set up a domain**.
2. Isi `docs.sakti.ai.id`, pilih **Continue**.
3. Lanjutkan sesuai tempat DNS `sakti.ai.id` dikelola:

### 5a. DNS `sakti.ai.id` dikelola di Cloudflare (akun yang sama)

1. Cloudflare menawarkan pembuatan CNAME secara otomatis; konfirmasi.
2. Tunggu status domain menjadi **Active** (sertifikat TLS diterbitkan otomatis).
3. Karena domain lewat proxy Cloudflare, pengaturan zona `sakti.ai.id` ikut berlaku. Periksa:
   - **Rocket Loader**: harus mati (fitur ini menyisipkan skrip yang diblokir CSP).
   - **Email Address Obfuscation**: matikan untuk `docs.sakti.ai.id`, agar alamat email kontak
     resmi tetap tampil setelah pindah halaman tanpa muat ulang.
   - **Cache Rules/Page Rules**: jangan membuat aturan cache untuk host ini; aturan cache zona
     bisa menyajikan halaman lama setelah deploy.
   - **Web Analytics** otomatis: jangan diaktifkan dulu. Skrip analitik diblokir CSP dan analitik
     adalah keputusan tersendiri (tugas 6.3).

### 5b. DNS `sakti.ai.id` dikelola di luar Cloudflare

1. Di pengelola DNS `sakti.ai.id`, buat record:

   | Type | Name | Content |
   |---|---|---|
   | `CNAME` | `docs` | `docs-sakti.pages.dev` |

2. Kembali ke dashboard Pages dan tunggu status domain menjadi **Active**.
3. Bila `sakti.ai.id` memiliki record CAA, pastikan record itu mengizinkan penerbit sertifikat
   yang dipakai Cloudflare (`letsencrypt.org`, `pki.goog`, `ssl.com`); kalau tidak, sertifikat
   untuk `docs.sakti.ai.id` tidak dapat diterbitkan.
4. Dengan DNS di luar Cloudflare, pengaturan zona (WAF, cache, Rocket Loader) tidak berlaku;
   tidak ada yang perlu diatur selain record di atas.

### Alamat `*.pages.dev`

Alamat `docs-sakti.pages.dev` tetap bisa dibuka setelah custom domain aktif. `public/_headers`
sudah mengirim `X-Robots-Tag: noindex` untuk semua alamat `*.pages.dev`, sehingga mesin pencari
hanya mengindeks `docs.sakti.ai.id`. Bila alamat itu ingin dialihkan sepenuhnya ke domain
produksi, buat **Bulk Redirect** di tingkat akun (opsional; lihat rujukan custom domain di
bagian 9).

## 6. Cek pasca-deploy

Jalankan setelah deploy pertama dan setelah custom domain aktif. Ganti `docs-sakti.pages.dev`
bila nama proyek berbeda.

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
| `https://docs-sakti.pages.dev/` | Situs yang sama (dengan header `noindex`) |

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
# 5. Alamat pages.dev tidak diindeks
curl -sI https://docs-sakti.pages.dev/ | grep -i '^x-robots-tag'
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

## 7. Rollback

Cara cepat (situs langsung kembali ke versi sebelumnya):

1. Buka proyek Pages > **Deployments** > **All deployments**.
2. Cari deployment produksi terakhir yang baik, buka menu tiga titik, pilih **Rollback to this
   deployment**, konfirmasi.
3. Ulangi cek 6b nomor 1 dan 6c.

Hal yang perlu diketahui:

- Hanya deployment **produksi** yang berhasil dibangun yang bisa menjadi tujuan rollback;
  deployment preview tidak bisa. Deployment lebih dari 30 hari dihapus, kecuali 100 yang terbaru.
- Rollback tidak mengubah repo. Push berikutnya ke `main` akan men-deploy isi `main` lagi,
  termasuk perubahan yang bermasalah. Setelah rollback, batalkan perubahannya di repo lewat pull
  request (`git revert <commit>`), tunggu CI hijau, lalu merge; deploy baru dari `main` yang
  sudah benar menggantikan rollback.
- Untuk menurunkan situs sepenuhnya: hapus custom domain di **Custom domains** dan record CNAME
  `docs` di DNS. Jangan mengarahkan CNAME ke tempat lain lalu mengembalikannya; domain akan
  nonaktif sampai diverifikasi ulang.

## 8. Yang ada di repo

| Berkas | Isi |
|---|---|
| `astro.config.mjs`, `src/lib/situs.ts` | `site` = `https://docs.sakti.ai.id` (`SITUS_URL`): dasar canonical, sitemap, `robots.txt`, dan tautan "Laporkan kesalahan" |
| `src/pages/robots.txt.ts` | `robots.txt` dengan baris `Sitemap:` |
| `public/_headers` | Header keamanan, cache, dan `noindex` untuk `*.pages.dev` |
| `scripts/csp-headers.ts` | Saat build, mengisi penanda hash di `dist/_headers` dengan hash sha256 semua skrip inline |
| `package.json` → `build:pages` | Perintah build untuk Pages (melengkapi riwayat git, lalu `pnpm build`) |
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

- `public/_redirects`: tidak diperlukan. Situs belum pernah terbit, jadi belum ada URL lama yang
  harus dialihkan; pengalihan antardomain (`*.pages.dev` → `docs.sakti.ai.id`) tidak bisa
  dilakukan lewat `_redirects`.
- Analitik, Pages Functions, dan secret: belum ada (tugas 5.2, 5.4, 6.3).
- Workflow deploy di GitHub Actions: tidak ada; deploy dijalankan oleh integrasi Git Cloudflare
  Pages.

## 9. Rujukan resmi Cloudflare

- Git integration: <https://developers.cloudflare.com/pages/get-started/git-integration/>
- Build configuration: <https://developers.cloudflare.com/pages/configuration/build-configuration/>
- Build image (versi Node dan pnpm): <https://developers.cloudflare.com/pages/configuration/build-image/>
- Custom domains: <https://developers.cloudflare.com/pages/configuration/custom-domains/>
- Headers (`_headers`): <https://developers.cloudflare.com/pages/configuration/headers/>
- Serving Pages (404, cache bawaan): <https://developers.cloudflare.com/pages/configuration/serving-pages/>
- Rollbacks: <https://developers.cloudflare.com/pages/configuration/rollbacks/>
