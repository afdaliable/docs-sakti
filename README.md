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
docs/07-deploy-ops.md           Cloudflare Pages, CI, env, analitik, keamanan
docs/08-rencana-kerja.md        tugas per fase + gerbang
docs/09-keputusan-terbuka.md    keputusan yang perlu dijawab pemilik proyek
templates/                      template artikel juknis & FAQ
.claude/commands/               /migrasi-modul, /artikel-baru, /audit-konten, /uji-pencarian
prompts/00-KICKOFF.md           prompt pembuka + prompt lanjutan
```
