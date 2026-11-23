# 02 — Arsitektur Informasi

## Prinsip

1. **Navigasi utama = modul menu SAKTI** (`config/modul.yaml`). Pengguna SAKTI sudah hafal menu aplikasi, jadi KB mengikuti jalur yang sama: `Modul > Sub-menu > Tugas`.
2. **Navigasi kedua = peran pengguna**, dibentuk otomatis dari tag `peran` di frontmatter. Tidak ada artikel duplikat per peran.
3. **Satu artikel = satu tugas.** Judul diawali kata kerja: "Mencatat Kontrak", "Membatalkan Transfer Keluar Online".

## Skema URL

```
/                                   landing page (help center)
/<modul>/                           halaman modul (ringkasan + daftar sub-menu)
/<modul>/<sub>/                     indeks sub-menu
/<modul>/<sub>/<tugas>/             artikel
/peran/<peran>/                     daftar artikel untuk peran tsb (otomatis)
/glosarium/  /faq/  /peraturan/  /bantuan/  /kontribusi/
```

Contoh:
- `/komitmen/ruh/pencatatan-kontrak/`
- `/persediaan/transaksi-masuk/pembelian/`
- `/aset-tetap/ruh/perolehan-bmn/pembelian/`
- `/akuntansi-pelaporan/tutup-buku/tutup-buku/`

Aturan slug: huruf kecil, kata dipisah `-`, tanpa singkatan yang tidak ada di menu SAKTI, maksimal 5 kata.

## Pemetaan menu SAKTI → folder

Folder `src/content/docs/<modul>/<sub>/` mengikuti menu. Contoh Persediaan:

```
src/content/docs/persediaan/
├── index.mdx                       # halaman modul
├── transaksi-masuk/
│   ├── index.mdx
│   ├── saldo-awal.mdx
│   ├── pembelian.mdx
│   ├── transfer-masuk-online.mdx
│   └── ...
├── transaksi-keluar/
├── koreksi/
├── opname-fisik/
└── tutup-buku/
```

Untuk sub-menu yang dalam (Aset Tetap › RUH › Transaksi BMN › Perolehan BMN › 16 jenis), boleh 4 tingkat folder. Lebih dari itu: gabungkan ke satu artikel dengan tab/heading per jenis transaksi.

## Sidebar

Dibentuk dari `config/modul.yaml` melalui `astro.config.mjs` (helper `scripts/build-sidebar.ts` yang membaca YAML):

```ts
// gambaran — implementasi di fase 1
sidebar: [
  { label: 'Mulai & Administrasi', items: [modul('mulai'), modul('admin'), modul('referensi')] },
  { label: 'Pelaksanaan Anggaran', items: [modul('penganggaran'), modul('komitmen'), modul('pembayaran'), modul('bendahara')] },
  { label: 'Akuntansi & Pelaporan', items: [modul('persediaan'), modul('aset-tetap'), modul('piutang'), modul('akuntansi-pelaporan')] },
  { label: 'BUN', items: [modul('kppn-bun')] },
  { label: 'Lainnya', items: ['peran', 'peraturan', 'faq', 'glosarium', 'bantuan', 'kontribusi'] },
]
// modul(slug) => { label, collapsed: true, autogenerate: { directory: slug } }
```

Urutan item di dalam folder diatur dengan `sidebar.order` di frontmatter.

## Skema frontmatter

Perluas skema Starlight di `src/content.config.ts`:

```ts
import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

const MODUL = [/* dibaca dari config/modul.yaml saat build */] as const;
const PERAN = [/* dari config/modul.yaml */] as const;

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: z.object({
        modul: z.enum(MODUL).optional(),          // wajib untuk artikel di folder modul (dicek di check-content)
        menu_sakti: z.string().optional(),        // "Komitmen > RUH > Pencatatan Kontrak"
        peran: z.array(z.enum(PERAN)).default([]),
        jenis: z.enum(['juknis', 'faq', 'troubleshooting', 'referensi', 'konsep', 'peraturan', 'video']).default('juknis'),
        kata_kunci: z.array(z.string()).default([]),   // sinonim/istilah yang dicari pengguna → ikut diindeks
        status: z.enum(['draft', 'review', 'terbit']).default('draft'),
        perlu_review: z.boolean().default(false),
        terakhir_diverifikasi: z.coerce.date().optional(),
        pemilik: z.string().optional(),                // username GitHub penanggung jawab
        sumber: z.array(z.object({
          judul: z.string(),
          url: z.string().url(),
          jenis: z.enum(['google-sites', 'google-slides', 'google-drive', 'pdf', 'pptx', 'sheets', 'lainnya']),
          diambil: z.coerce.date(),
          id_manifest: z.string().optional(),
        })).min(1),
      }),
    }),
  }),
};
```

- Artikel `status: draft` **tidak tampil** di build produksi (filter di route middleware atau `draft: true` Starlight). Artikel `review` tampil dengan banner "Sedang ditinjau". Artikel `perlu_review: true` **tetap tampil** di build produksi dan di pencarian dengan kotak "Perlu verifikasi"; tanda itu tidak pernah dipakai sebagai filter (K70).
- `kata_kunci` dirender tersembunyi dengan atribut `data-pagefind-meta`/`data-pagefind-weight` agar ikut diindeks.

## Taksonomi

| Field | Nilai | Dipakai untuk |
|---|---|---|
| `modul` | slug dari `config/modul.yaml` | sidebar, filter pencarian, CODEOWNERS |
| `peran` | slug peran | halaman `/peran/<x>/`, filter pencarian |
| `jenis` | juknis, faq, troubleshooting, referensi, konsep, peraturan, video | ikon/label di hasil pencarian |

## Glosarium

`src/data/sinonim.json` adalah satu sumber untuk (1) halaman `/glosarium/`, (2) ekspansi query pencarian, (3) tooltip istilah (opsional). Contoh awal (agent melengkapi dari konten sumber):

```json
[
  { "istilah": "SPM", "panjang": "Surat Perintah Membayar", "sinonim": ["surat perintah membayar"] },
  { "istilah": "SP2D", "panjang": "Surat Perintah Pencairan Dana", "sinonim": ["pencairan dana"] },
  { "istilah": "BAST", "panjang": "Berita Acara Serah Terima", "sinonim": ["serah terima"] },
  { "istilah": "BMN", "panjang": "Barang Milik Negara", "sinonim": ["aset", "barang milik negara"] },
  { "istilah": "KDP", "panjang": "Konstruksi Dalam Pengerjaan", "sinonim": ["konstruksi dalam pengerjaan"] },
  { "istilah": "RUH", "panjang": "Rekam, Ubah, Hapus", "sinonim": ["rekam data", "input"] },
  { "istilah": "ADK", "panjang": "Arsip Data Komputer", "sinonim": ["file adk", "upload adk"] },
  { "istilah": "MFA", "panjang": "Multi-Factor Authentication", "sinonim": ["otp", "kode verifikasi", "authenticator", "tidak bisa login"] },
  { "istilah": "GLP", "panjang": "General Ledger dan Pelaporan", "sinonim": ["akuntansi", "pelaporan", "jurnal"] },
  { "istilah": "GPP", "panjang": "Gaji Pokok PNS", "sinonim": ["gaji", "belanja pegawai"] },
  { "istilah": "PKIPA", "panjang": "(lengkapi dari sumber)", "sinonim": [] },
  { "istilah": "DS", "panjang": "Digital Signature / Tanda Tangan Elektronik", "sinonim": ["tte", "sertifikat elektronik", "tanda tangan digital"] }
]
```

Arti singkatan yang tidak pasti **wajib dicek** dari isi sumber, jangan ditebak.
