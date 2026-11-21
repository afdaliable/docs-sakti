# 04 — Tampilan & UX

## Landing page (`src/content/docs/index.mdx`, `template: splash`)

```
┌──────────────────────────────────────────────────────────┐
│ [Logo] SAKTI Knowledge Base        Modul  Peran  Bantuan 🌙│
├──────────────────────────────────────────────────────────┤
│                                                          │
│              Ada yang bisa kami bantu?                   │
│   ┌──────────────────────────────────────────────────┐   │
│   │ 🔍  Cari panduan SAKTI, mis. "cara batal SPM"     │   │  ← BigSearch
│   └──────────────────────────────────────────────────┘   │
│   Populer: Pendaftaran user · MFA · Tutup buku · Kontrak │
│                                                          │
├──────────────────────────────────────────────────────────┤
│ Mulai & Administrasi                                     │
│ [🚀 Mulai] [⚙ Admin] [📖 Referensi]                      │
│ Pelaksanaan Anggaran                                     │
│ [📄 Penganggaran] [✏ Komitmen] [✔ Pembayaran] [≡ Bendahara]│
│ Akuntansi & Pelaporan                                    │
│ [🧩 Persediaan] [💻 Aset Tetap] [ℹ Piutang] [⚙ GLP]       │
│ BUN                                                      │
│ [★ KPPN (BUN)]                                           │
├──────────────────────────────────────────────────────────┤
│ Cari berdasarkan peran:  Satker · KPPN/Kanwil · DJPb ·   │
│ DJA · DJKN · Bappenas · BPK · APIP · Widyaiswara         │
├──────────────────────────────────────────────────────────┤
│ Baru diperbarui          │ Butuh bantuan lebih lanjut?   │
│ • Juknis PKIPA 2025      │ HAI Kemenkeu · hai.djpb@...   │
│ • ...                    │ [Hubungi kami]                │
└──────────────────────────────────────────────────────────┘
```

### Komponen

| Komponen | File | Perilaku |
|---|---|---|
| `BigSearch` | `src/components/BigSearch.astro` (+ island TS) | Input besar, autofocus di desktop. Hasil muncul **langsung di bawah input** (dropdown/panel, bukan modal) setelah 2 karakter, debounce 150 ms. Tiap hasil: judul, breadcrumb modul › sub, cuplikan dengan highlight, label `jenis`. Keyboard: ↑↓ Enter Esc. Tombol "Lihat semua hasil" → `/cari/?q=`. Pintasan `/` atau `Ctrl+K` fokus ke input. |
| `ModuleGrid` | `src/components/ModuleGrid.astro` | Dibangkitkan dari `config/modul.yaml`, dikelompokkan per `kelompok`. Kartu: ikon, nama, ringkasan, jumlah artikel terbit. |
| `RoleChips` | `src/components/RoleChips.astro` | Chip per peran → `/peran/<slug>/`. |
| `RecentlyUpdated` | `src/components/RecentlyUpdated.astro` | 6 artikel terbaru berdasarkan `lastUpdated`/`terakhir_diverifikasi`. |
| `PopularLinks` | `src/data/populer.json` | Diisi manual oleh admin (fase 6: dari analitik). |
| `HelpBox` | `src/components/HelpBox.astro` | Kontak resmi dari `src/data/kontak-resmi.json`. |

## Halaman pencarian penuh `/cari/`

- Query dari `?q=`. Filter: modul (multi), peran, jenis. Hasil 20 per halaman.
- Jika tidak ada hasil: tampilkan saran (ejaan, istilah glosarium terdekat), tombol "Tanya AI" (fase 5), dan link "Usulkan artikel" (GitHub issue template dengan query terisi).

## Halaman modul (`/<modul>/index.mdx`)

- Ringkasan modul (1 paragraf dari sumber), kotak search yang otomatis terfilter ke modul tersebut, daftar sub-menu sebagai `CardGrid`/`LinkCard`, "Tugas paling sering" (manual), FAQ modul.

## Halaman artikel

Layout docs Starlight standar (sidebar, daftar isi kanan) ditambah:
- **Breadcrumb** sesuai `menu_sakti` (override komponen `PageTitle`).
- **Badge**: jenis, peran, status `review` ("Sedang ditinjau").
- **Kotak "Menu di SAKTI"**: menampilkan `menu_sakti` dalam format jalur menu.
- Footer artikel: "Terakhir diverifikasi", **Sumber**, "Unduh juknis asli", tombol **Edit halaman ini**, dan widget "Apakah artikel ini membantu? 👍 👎" (kirim event ke analitik; fase 6).

## Halaman peran `/peran/<slug>/`

Dibuat dengan route dinamis Astro (`src/pages/peran/[slug].astro` memakai `StarlightPage`), mengelompokkan artikel per modul berdasarkan frontmatter `peran`.

## Branding & aksesibilitas

- Warna aksen, logo, favicon: tunggu keputusan K4 (`09-keputusan-terbuka.md`). Sementara pakai warna netral biru tua dan teks "SAKTI Knowledge Base".
- Kontras WCAG AA, semua komponen bisa dioperasikan dengan keyboard, label ARIA pada BigSearch (`role="combobox"`, `aria-expanded`, `aria-activedescendant`).
- Mobile-first: BigSearch full-width, kartu modul 2 kolom di HP.
- Jangan memakai logo resmi Kemenkeu/DJPb sebelum ada izin (K4).
