# Paket Kickoff — SAKTI Knowledge Base

Paket instruksi untuk agent Claude Code yang akan membangun knowledge base SAKTI (Astro Starlight) dari tiga sumber yang ada sekarang.

## Cara pakai

1. Buat folder/repo kosong, salin seluruh isi paket ini ke root-nya (termasuk folder tersembunyi `.claude/`).
2. Jawab sebanyak mungkin pertanyaan di `docs/09-keputusan-terbuka.md` (terutama K1, K3, K4, K6).
3. Periksa `config/modul.yaml` — sesuaikan nama dan urutan modul dengan menu SAKTI.
4. Buka Claude Code di folder itu dan tempel prompt dari `prompts/00-KICKOFF.md`.

## Isi

```
CLAUDE.md                       instruksi tetap agent (aturan, stack, perintah, aturan konten)
config/modul.yaml               daftar modul SAKTI → sidebar, kartu, taksonomi
docs/00-prd.md                  tujuan, pengguna, ruang lingkup, metrik
docs/01-sumber-konten.md        inventaris 3 sumber + URL + masalah link yang diketahui
docs/02-arsitektur-informasi.md URL, sidebar, skema frontmatter, glosarium
docs/03-migrasi-konten.md       pipeline scraping → ekstraksi → MDX → review
docs/04-tampilan-ux.md          landing page search besar, halaman modul/artikel/peran
docs/05-pencarian.md            keyword + sinonim + semantik hybrid + Tanya AI + evaluasi
docs/06-kontributor-admin.md    edit link, Keystatic, CODEOWNERS, template PR/issue
docs/07-deploy-ops.md           Cloudflare (Workers), CI, env, analitik, keamanan
docs/08-rencana-kerja.md        tugas per fase + gerbang
docs/09-keputusan-terbuka.md    keputusan yang perlu dijawab pemilik proyek
templates/                      template artikel juknis & FAQ
.claude/commands/               /migrasi-modul, /artikel-baru, /audit-konten, /uji-pencarian
prompts/00-KICKOFF.md           prompt pembuka + prompt lanjutan
```

## Sumber dan atribusi

Artikel di knowledge base ini adalah **ringkasan dan penulisan ulang** dari materi panduan SAKTI
yang tersebar di tiga sumber berikut (inventaris lengkap: `docs/01-sumber-konten.md`):

| Sumber | Alamat |
|---|---|
| A — SAKTI Admin Knowledge Base | <https://sites.google.com/view/saktiadm/beranda> |
| B — Juknis SAKTI Pelaksanaan (Linktree) | <https://linktr.ee/juknissaktipelaksanaan> |
| B — folder Modul Bendahara | <https://drive.google.com/drive/folders/1whfBfo_kT4hI69H6Jjnwy9DQPOqrLei3> |
| B — folder Modul Komitmen | <https://drive.google.com/drive/folders/1lg7qCe3dif4bbgG7CMg8w3GapRPXtsqE> |
| B — folder Modul Pembayaran | <https://drive.google.com/drive/folders/1Lo1jqUetojYZyMnsKTpaSDFoXcX6vXw2> |
| B — folder Modul KPPN BUN | <https://drive.google.com/drive/folders/1cOx-1D1y5bBZyhO67HcW0VyK1K6PK11p> |
| C — SAKTI Pelaporan | <https://sites.google.com/view/saktipelaporan> |

- Knowledge base ini **bukan dokumen resmi** dan bukan situs resmi Kementerian Keuangan.
- **Panduan resmi tetap berlaku.** Bila isi artikel berbeda dari petunjuk teknis, peraturan, atau
  pengumuman resmi, yang diikuti adalah sumber resminya.
- Setiap artikel mencantumkan dokumen asalnya (tautan dan tanggal diambil) di kolom `sumber` dan
  di bagian "Sumber" pada halaman artikel.
- Materi sumber tetap milik pemegang haknya masing-masing dan tidak ikut dilisensikan oleh repo
  ini (lihat "Lisensi").

## Lisensi

| Bagian | Lisensi | Berkas |
|---|---|---|
| Kode (`scripts/`, `src/components/`, `src/lib/`, `src/pages/`, `tests/`, konfigurasi) | MIT | `LICENSE` |
| Tulisan (`src/content/docs/`, `docs/`, `templates/`, `README.md`) | CC BY 4.0 | `LICENSE-CONTENT.md` |

Lisensi konten **tidak mencakup materi sumber pihak lain** (petunjuk teknis, slide, peraturan,
gambar dan tangkapan layar, nama dan logo instansi, label menu aplikasi SAKTI).

Pemegang hak cipta di kedua berkas lisensi adalah `afdaliable` (akun GitHub pemilik proyek).
