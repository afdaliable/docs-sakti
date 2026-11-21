import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { muatKonfigurasi } from '../src/lib/modul.ts';

export interface Temuan {
	berkas: string;
	baris?: number;
	tingkat: 'galat' | 'peringatan';
	kode: string;
	pesan: string;
}

export interface KontakResmi {
	nomor_diizinkan: string[];
	email_diizinkan: string[];
}

interface HasilFrontmatter {
	data: Record<string, unknown>;
	barisSelesai: number;
}

function pisahFrontmatter(isi: string): HasilFrontmatter {
	const baris = isi.split('\n');
	if (baris[0]?.trim() !== '---') return { data: {}, barisSelesai: 0 };
	for (let i = 1; i < baris.length; i++) {
		if (baris[i].trim() === '---') {
			const data = (parse(baris.slice(1, i).join('\n')) ?? {}) as Record<string, unknown>;
			return { data, barisSelesai: i + 1 };
		}
	}
	return { data: {}, barisSelesai: 0 };
}

function hapusUrlDanTarget(teks: string): string {
	return teks
		.replace(/\]\([^)]*\)/g, ']()')
		.replace(/(?:src|href)\s*=\s*"[^"]*"/g, '')
		.replace(/(?:src|href)\s*=\s*'[^']*'/g, '')
		.replace(/https?:\/\/\S+/g, '');
}

function normalisasiDigit(teks: string): string {
	let hasil = '';
	for (let i = 0; i < teks.length; i++) {
		const c = teks[i];
		if (/\d/.test(c) || (c === '+' && hasil === '')) {
			hasil += c;
			continue;
		}
		if (/[\s.\-]/.test(c)) {
			let j = i + 1;
			while (j < teks.length && /[\s.\-]/.test(teks[j])) j++;
			if (j < teks.length && /\d/.test(teks[j]) && /\d|\+/.test(teks[i - 1] ?? '')) continue;
		}
		hasil += c;
	}
	return hasil;
}

const RE_NIK = /\b\d{16}\b/;
const RE_NIP = /\b\d{18}\b/;
const RE_HP = /(?:\+62|08)\d{8,12}\b/g;
const RE_HP_KANDIDAT = /(?:\+62|08)[\d\s.\-]{8,20}/g;
const RE_EMAIL = /\b[\w.+-]+@(gmail|yahoo|ymail|hotmail|outlook|live|icloud)\.com\b/gi;
const RE_SITUS_LAMA = /sites\.google\.com\/view\/(?:saktiadm|saktipelaporan)/;

function temuanPii(
	teks: string,
	baris: number | undefined,
	kontak: KontakResmi,
): Omit<Temuan, 'berkas'>[] {
	const temuan: Omit<Temuan, 'berkas'>[] = [];
	const bersih = normalisasiDigit(hapusUrlDanTarget(teks));
	if (RE_NIP.test(bersih)) {
		temuan.push({ baris, tingkat: 'galat', kode: 'data-pribadi-nip', pesan: 'Nomor 18 digit terdeteksi (kemungkinan NIP).' });
	} else if (RE_NIK.test(bersih)) {
		temuan.push({ baris, tingkat: 'galat', kode: 'data-pribadi-nik', pesan: 'Nomor 16 digit terdeteksi (kemungkinan NIK).' });
	}
	for (const cocok of bersih.matchAll(RE_HP)) {
		const nomor = cocok[0].replace(/^\+62/, '0');
		if (kontak.nomor_diizinkan.includes(cocok[0]) || kontak.nomor_diizinkan.includes(nomor)) continue;
		temuan.push({ baris, tingkat: 'galat', kode: 'data-pribadi-hp', pesan: `Nomor HP terdeteksi: ${cocok[0]}` });
	}
	for (const cocok of bersih.matchAll(RE_EMAIL)) {
		if (kontak.email_diizinkan.includes(cocok[0].toLowerCase())) continue;
		temuan.push({ baris, tingkat: 'galat', kode: 'data-pribadi-email', pesan: `Alamat email pribadi terdeteksi: ${cocok[0]}` });
	}
	return temuan;
}

export function periksaBerkas({
	jalur,
	isi,
	konfigurasi,
	kontak,
}: {
	jalur: string;
	isi: string;
	konfigurasi: ReturnType<typeof muatKonfigurasi>;
	kontak: KontakResmi;
}): Temuan[] {
	const temuan: Temuan[] = [];
	const relatif = path.relative(path.resolve(process.cwd(), 'src/content/docs'), jalur);
	const segmen = relatif.split(path.sep);
	const slugFolderModul = konfigurasi.modul.some((m) => m.slug === segmen[0]) ? segmen[0] : undefined;
	const adalahIndeks = /^index\.mdx?$/.test(segmen[segmen.length - 1]);
	const adalahArtikelModul = slugFolderModul !== undefined && !adalahIndeks;

	const { data, barisSelesai } = pisahFrontmatter(isi);
	const badan = isi.split('\n').slice(barisSelesai).join('\n');

	// Pemeriksaan frontmatter.
	if (adalahArtikelModul) {
		if (!data.modul) {
			temuan.push({ berkas: relatif, baris: 1, tingkat: 'galat', kode: 'modul-kosong', pesan: 'Artikel modul wajib mengisi `modul`.' });
		}
		const sumber = data.sumber;
		if (!Array.isArray(sumber) || sumber.length === 0) {
			temuan.push({ berkas: relatif, baris: 1, tingkat: 'galat', kode: 'sumber-kosong', pesan: 'Artikel modul wajib mengisi `sumber`.' });
		}
		if (!Array.isArray(data.kata_kunci) || (data.kata_kunci as unknown[]).length === 0) {
			temuan.push({ berkas: relatif, baris: 1, tingkat: 'peringatan', kode: 'tanpa-kata-kunci', pesan: 'Artikel tidak mengisi `kata_kunci`.' });
		}
	}
	if (slugFolderModul !== undefined) {
		if (adalahIndeks && segmen.length === 2 && data.modul !== slugFolderModul) {
			temuan.push({ berkas: relatif, baris: 1, tingkat: 'galat', kode: 'modul-tidak-cocok', pesan: `Halaman indeks modul harus memakai modul: ${slugFolderModul}.` });
		} else if (!adalahIndeks && data.modul !== undefined && data.modul !== slugFolderModul) {
			temuan.push({ berkas: relatif, baris: 1, tingkat: 'galat', kode: 'modul-tidak-cocok', pesan: `Nilai modul "${String(data.modul)}" tidak cocok dengan folder "${slugFolderModul}".` });
		}
	}
	if (data.perlu_review === true) {
		temuan.push({ berkas: relatif, baris: 1, tingkat: 'peringatan', kode: 'perlu-review', pesan: 'Artikel ditandai `perlu_review: true`.' });
	}
	if (data.terakhir_diverifikasi) {
		const tanggal = new Date(String(data.terakhir_diverifikasi));
		if (!Number.isNaN(tanggal.getTime()) && Date.now() - tanggal.getTime() > 365 * 24 * 60 * 60 * 1000) {
			temuan.push({ berkas: relatif, baris: 1, tingkat: 'peringatan', kode: 'verifikasi-kedaluwarsa', pesan: '`terakhir_diverifikasi` lebih dari 12 bulan.' });
		}
	}

	// PII di nilai string frontmatter (selain sumber.url yang sudah dibersihkan dari URL).
	for (const [kunci, nilai] of Object.entries(data)) {
		const nilaiTeks = JSON.stringify(nilai);
		for (const t of temuanPii(nilaiTeks, 1, kontak)) {
			temuan.push({ ...t, berkas: relatif });
		}
	}

	// PII per baris di badan.
	badan.split('\n').forEach((baris, i) => {
		const nomorBaris = barisSelesai + i + 1;
		for (const t of temuanPii(baris, nomorBaris, kontak)) {
			temuan.push({ ...t, berkas: relatif });
		}
	});

	// Gambar tanpa alt.
	badan.split('\n').forEach((baris, i) => {
		const nomorBaris = barisSelesai + i + 1;
		for (const cocok of baris.matchAll(/!\[([^\]]*)\]\([^)]*\)/g)) {
			if (!cocok[1].trim()) {
				temuan.push({ berkas: relatif, baris: nomorBaris, tingkat: 'galat', kode: 'gambar-tanpa-alt', pesan: 'Gambar Markdown tanpa teks alt.' });
			}
		}
		for (const cocok of baris.matchAll(/<(?:img|Image)\b[^>]*>/g)) {
			const tag = cocok[0];
			const alt = tag.match(/\balt\s*=\s*["'{]([^"'}]*)["'}]/);
			if (!alt || !alt[1].trim()) {
				temuan.push({ berkas: relatif, baris: nomorBaris, tingkat: 'galat', kode: 'gambar-tanpa-alt', pesan: 'Tag gambar tanpa atribut alt.' });
			}
		}
	});

	// Tautan situs lama di badan, kecuali di bawah heading "Unduh juknis asli".
	let diBagianUnduh = false;
	let levelUnduh = 0;
	badan.split('\n').forEach((baris, i) => {
		const nomorBaris = barisSelesai + i + 1;
		const heading = baris.match(/^(#{1,6})\s+(.*)$/);
		if (heading) {
			const level = heading[1].length;
			if (diBagianUnduh && level <= levelUnduh) diBagianUnduh = false;
			if (heading[2].trim() === 'Unduh juknis asli') {
				diBagianUnduh = true;
				levelUnduh = level;
			}
		}
		if (!diBagianUnduh && RE_SITUS_LAMA.test(baris)) {
			temuan.push({ berkas: relatif, baris: nomorBaris, tingkat: 'galat', kode: 'tautan-situs-lama', pesan: 'Tautan ke situs lama hanya boleh di `sumber` atau bagian "Unduh juknis asli".' });
		}
	});

	return temuan;
}

export function periksaIndeksHilang(konfigurasi: ReturnType<typeof muatKonfigurasi>): Temuan[] {
	const temuan: Temuan[] = [];
	const docs = path.resolve(process.cwd(), 'src/content/docs');
	const ada = (...segmen: string[]) =>
		fs.existsSync(path.join(docs, ...segmen, 'index.mdx')) ||
		fs.existsSync(path.join(docs, ...segmen, 'index.md'));
	for (const modul of konfigurasi.modul) {
		if (!ada(modul.slug)) {
			temuan.push({ berkas: `${modul.slug}/index.mdx`, tingkat: 'galat', kode: 'indeks-hilang', pesan: `Modul "${modul.slug}" tidak punya index.` });
		}
		for (const sub of modul.sub) {
			if (!ada(modul.slug, sub.slug)) {
				temuan.push({ berkas: `${modul.slug}/${sub.slug}/index.mdx`, tingkat: 'galat', kode: 'indeks-hilang', pesan: `Sub-menu "${sub.slug}" modul "${modul.slug}" tidak punya index.` });
			}
		}
	}
	return temuan;
}

export function periksaUkuranGambar(batasKb = 400): Temuan[] {
	const temuan: Temuan[] = [];
	const aset = path.resolve(process.cwd(), 'src/assets');
	if (!fs.existsSync(aset)) return temuan;
	const susun = (dir: string): string[] =>
		fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
			e.isDirectory() ? susun(path.join(dir, e.name)) : [path.join(dir, e.name)],
		);
	for (const berkas of susun(aset)) {
		const ukuran = fs.statSync(berkas).size;
		if (ukuran > batasKb * 1024) {
			temuan.push({
				berkas: path.relative(process.cwd(), berkas),
				tingkat: 'galat',
				kode: 'gambar-terlalu-besar',
				pesan: `Ukuran ${(ukuran / 1024).toFixed(0)} KB melebihi ${batasKb} KB.`,
			});
		}
	}
	return temuan;
}

function* walk(dir: string): Generator<string> {
	if (!fs.existsSync(dir)) return;
	for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
		const jalur = path.join(dir, e.name);
		if (e.isDirectory()) yield* walk(jalur);
		else if (/\.mdx?$/.test(e.name)) yield jalur;
	}
}

function main() {
	const konfigurasi = muatKonfigurasi();
	const kontak = JSON.parse(
		fs.readFileSync(path.resolve(process.cwd(), 'src/data/kontak-resmi.json'), 'utf8'),
	) as KontakResmi;
	const temuan: Temuan[] = [
		...periksaIndeksHilang(konfigurasi),
		...periksaUkuranGambar(),
	];
	for (const jalur of walk(path.resolve(process.cwd(), 'src/content/docs'))) {
		temuan.push(
			...periksaBerkas({
				jalur,
				isi: fs.readFileSync(jalur, 'utf8'),
				konfigurasi,
				kontak,
			}),
		);
	}
	const perBerkas = new Map<string, Temuan[]>();
	for (const t of temuan) {
		const daftar = perBerkas.get(t.berkas) ?? [];
		daftar.push(t);
		perBerkas.set(t.berkas, daftar);
	}
	for (const [berkas, daftar] of perBerkas) {
		for (const t of daftar) {
			const baris = t.baris !== undefined ? `:${t.baris}` : '';
			const tingkat = t.tingkat === 'galat' ? 'GALAT' : 'PERINGATAN';
			console.log(`${berkas}${baris} [${tingkat}] ${t.kode}: ${t.pesan}`);
		}
	}
	const galat = temuan.filter((t) => t.tingkat === 'galat').length;
	const peringatan = temuan.filter((t) => t.tingkat === 'peringatan').length;
	console.log(`Selesai: ${galat} galat, ${peringatan} peringatan.`);
	if (galat > 0) process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]).endsWith('check-content.ts')) {
	main();
}
