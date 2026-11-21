import fs from 'node:fs';
import path from 'node:path';
import type { ItemManifest } from '../inventory/tipe.ts';
import { htmlKeMarkdown } from './html.ts';
import { GalatUnduh, unduhFile, unduhTeks, urlUnduhDrive } from './unduh.ts';
import { csvKeMarkdown, dirEkstrak, jalankan, perluOcr, PROFIL_LO, PYTHON } from './util.ts';

export interface HasilEkstrak {
	md: string;
	jumlahHalaman: number | null;
	jumlahGambar: number;
	halamanOcr: number[];
	peringatan: string[];
}

function kosong(md = ''): HasilEkstrak {
	return { md, jumlahHalaman: null, jumlahGambar: 0, halamanOcr: [], peringatan: [] };
}

async function renderPng(pdf: string, dirTujuan: string) {
	fs.mkdirSync(dirTujuan, { recursive: true });
	await jalankan('pdftoppm', ['-r', '110', '-png', pdf, path.join(dirTujuan, 's')], 300000);
}

async function infoHalamanPdf(pdf: string): Promise<number> {
	const { stdout } = await jalankan('pdfinfo', [pdf]);
	return parseInt(stdout.match(/Pages:\s*(\d+)/)?.[1] ?? '0');
}

async function teksHalamanPdf(pdf: string, n: number): Promise<string> {
	const { stdout } = await jalankan('pdftotext', ['-layout', '-f', String(n), '-l', String(n), pdf, '-']);
	return stdout;
}

async function ocrPng(png: string): Promise<string> {
	try {
		const { stdout } = await jalankan('tesseract', [png, '-', '-l', 'ind+eng'], 120000);
		return stdout;
	} catch {
		return '';
	}
}

interface SlideTeks { n: number; teks: string[]; catatan: string }

async function teksPptx(jalur: string): Promise<SlideTeks[]> {
	const skrip = path.resolve(process.cwd(), 'scripts/extract/pptx_teks.py');
	const { stdout } = await jalankan(PYTHON, [skrip, jalur], 180000);
	return (JSON.parse(stdout) as { slides: SlideTeks[] }).slides;
}

function mdDariSlides(slides: SlideTeks[]): string {
	const bagian = slides.map((s) => {
		let md = `## Slide ${s.n}\n\n${s.teks.join('\n\n')}`;
		if (s.catatan) md += `\n\nCatatan pembicara: ${s.catatan}`;
		return md;
	});
	return bagian.join('\n\n');
}

export async function ekstrakSlides(item: ItemManifest): Promise<HasilEkstrak> {
	const hasil = kosong();
	const dir = dirEkstrak(item.id);
	const id = item.drive_id!;
	let pdf: string | null = null;
	let pptx: string | null = null;
	try {
		pptx = await unduhFile(item, `https://docs.google.com/presentation/d/${id}/export/pptx`, 'pptx');
	} catch (e) {
		if (e instanceof GalatUnduh && e.login) throw e;
		hasil.peringatan.push(`export pptx gagal: ${String(e).slice(0, 120)}`);
	}
	pdf = await unduhFile(item, `https://docs.google.com/presentation/d/${id}/export/pdf`, 'pdf');
	hasil.jumlahHalaman = await infoHalamanPdf(pdf);
	try {
		await renderPng(pdf, path.join(dir, 'slides'));
		hasil.jumlahGambar = hasil.jumlahHalaman;
	} catch (e) {
		hasil.peringatan.push(`render slide gagal: ${String(e).slice(0, 120)}`);
	}
	if (pptx) {
		const slides = await teksPptx(pptx);
		hasil.md = mdDariSlides(slides);
	} else {
		hasil.peringatan.push('teks diambil dari PDF (tanpa catatan pembicara)');
		const bagian: string[] = [];
		for (let n = 1; n <= (hasil.jumlahHalaman ?? 0); n++) {
			bagian.push(`## Slide ${n}\n\n${(await teksHalamanPdf(pdf, n)).trim()}`);
		}
		hasil.md = bagian.join('\n\n');
	}
	return hasil;
}

export async function ekstrakPdf(item: ItemManifest): Promise<HasilEkstrak> {
	const hasil = kosong();
	const dir = dirEkstrak(item.id);
	const pdf = await unduhFile(item, urlUnduhDrive(item.drive_id!), 'pdf');
	hasil.jumlahHalaman = await infoHalamanPdf(pdf);
	const dirImg = path.join(dir, 'slides');
	try {
		await renderPng(pdf, dirImg);
		hasil.jumlahGambar = hasil.jumlahHalaman;
	} catch (e) {
		hasil.peringatan.push(`render halaman gagal: ${String(e).slice(0, 120)}`);
	}
	const bagian: string[] = [];
	for (let n = 1; n <= (hasil.jumlahHalaman ?? 0); n++) {
		let teks = (await teksHalamanPdf(pdf, n)).trim();
		if (perluOcr(teks)) {
			const kandidat = fs.existsSync(dirImg) ? fs.readdirSync(dirImg).sort() : [];
			const berkas = kandidat[n - 1] ? path.join(dirImg, kandidat[n - 1]) : null;
			if (berkas) {
				const hasilOcr = (await ocrPng(berkas)).trim();
				if (hasilOcr) {
					teks = hasilOcr;
					hasil.halamanOcr.push(n);
				}
			}
		}
		bagian.push(`## Halaman ${n}\n\n${teks}`);
	}
	hasil.md = bagian.join('\n\n');
	return hasil;
}

export async function ekstrakPptx(item: ItemManifest): Promise<HasilEkstrak> {
	const hasil = kosong();
	const dir = dirEkstrak(item.id);
	const pptx = await unduhFile(item, urlUnduhDrive(item.drive_id!), 'pptx');
	const slides = await teksPptx(pptx);
	hasil.md = mdDariSlides(slides);
	hasil.jumlahHalaman = slides.length;
	try {
		await jalankan('soffice', ['--headless', `-env:UserInstallation=${PROFIL_LO}`, '--convert-to', 'pdf', '--outdir', dir, pptx], 300000);
		const pdf = path.join(dir, `${path.basename(pptx, '.pptx')}.pdf`);
		if (fs.existsSync(pdf)) {
			await renderPng(pdf, path.join(dir, 'slides'));
			hasil.jumlahGambar = slides.length;
		} else {
			hasil.peringatan.push('soffice tidak menghasilkan pdf untuk render slide');
		}
	} catch (e) {
		hasil.peringatan.push(`render slide gagal: ${String(e).slice(0, 120)}`);
	}
	return hasil;
}

export async function ekstrakDocs(item: ItemManifest): Promise<HasilEkstrak> {
	const id = item.drive_id!;
	try {
		const md = await unduhTeks(`https://docs.google.com/document/d/${id}/export?format=md`);
		return kosong(md.trim());
	} catch {
		const txt = await unduhTeks(`https://docs.google.com/document/d/${id}/export?format=txt`);
		return kosong(txt.trim());
	}
}

export async function ekstrakDocx(item: ItemManifest): Promise<HasilEkstrak> {
	const hasil = kosong();
	const dir = dirEkstrak(item.id);
	const docx = await unduhFile(item, urlUnduhDrive(item.drive_id!), 'docx');
	try {
		const { stdout } = await jalankan('pandoc', ['-t', 'gfm', docx]);
		hasil.md = stdout.trim();
	} catch {
		await jalankan('soffice', ['--headless', `-env:UserInstallation=${PROFIL_LO}`, '--convert-to', 'html', '--outdir', dir, docx], 300000);
		const html = path.join(dir, `${path.basename(docx, '.docx')}.html`);
		hasil.md = fs.existsSync(html) ? htmlKeMarkdown(fs.readFileSync(html, 'utf8')) : '';
		if (!hasil.md) hasil.peringatan.push('konversi docx menghasilkan konten kosong');
	}
	return hasil;
}

function mdDariCsv(csv: string, dir: string): { md: string; peringatan: string[] } {
	const { markdown, jumlahBaris, ringkas } = csvKeMarkdown(csv);
	if (!ringkas) return { md: markdown, peringatan: [] };
	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(path.join(dir, 'data.csv'), csv);
	const header = csv.split(/\r?\n/)[0] ?? '';
	return {
		md: `Data CSV (${jumlahBaris} baris) disimpan di \`data.csv\`.\n\nKolom: \`${header.split(',').map((k) => k.trim()).join('`, `')}\``,
		peringatan: [],
	};
}

export async function ekstrakSheets(item: ItemManifest): Promise<HasilEkstrak> {
	const hasil = kosong();
	const dir = dirEkstrak(item.id);
	const csv = await unduhTeks(`https://docs.google.com/spreadsheets/d/${item.drive_id}/export?format=csv`);
	const { md } = mdDariCsv(csv, dir);
	hasil.md = md;
	return hasil;
}

export async function ekstrakXlsx(item: ItemManifest): Promise<HasilEkstrak> {
	const hasil = kosong();
	const dir = dirEkstrak(item.id);
	const xlsx = await unduhFile(item, urlUnduhDrive(item.drive_id!), 'xlsx');
	await jalankan('soffice', ['--headless', `-env:UserInstallation=${PROFIL_LO}`, '--convert-to', 'csv', '--outdir', dir, xlsx], 180000);
	const csv = path.join(dir, `${path.basename(xlsx, '.xlsx')}.csv`);
	if (!fs.existsSync(csv)) {
		hasil.peringatan.push('konversi xlsx ke csv gagal');
		return hasil;
	}
	const { md } = mdDariCsv(fs.readFileSync(csv, 'utf8'), dir);
	hasil.md = md;
	return hasil;
}

export async function ekstrakLainnya(item: ItemManifest): Promise<HasilEkstrak> {
	const hasil = kosong();
	const dir = dirEkstrak(item.id);
	const ext = /\.([a-z0-9]{1,5})$/i.exec(item.judul)?.[1]?.toLowerCase() ?? 'bin';
	if (ext === 'csv') {
		const jalur = await unduhFile(item, urlUnduhDrive(item.drive_id!), 'csv');
		const { md } = mdDariCsv(fs.readFileSync(jalur, 'utf8'), dir);
		hasil.md = md;
		return hasil;
	}
	await unduhFile(item, urlUnduhDrive(item.drive_id!), ext);
	hasil.md = `# ${item.judul}\n\nBerkas ${ext} diunduh ke \`sources/raw/dok/${item.id}.${ext}\`.`;
	hasil.peringatan.push(`jenis ${ext} belum bisa diekstrak ke teks`);
	return hasil;
}

export async function ekstrakVideo(item: ItemManifest): Promise<HasilEkstrak> {
	const hasil = kosong();
	const baris = [`# ${item.judul}`, '', `Tautan: ${item.url}`];
	if (item.ukuran) baris.push(`Ukuran: ${item.ukuran} byte`);
	if (item.modified) baris.push(`Terakhir diubah: ${item.modified}`);
	const yt = item.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{6,})/)?.[1];
	if (yt) {
		try {
			const res = await unduhTeks(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${yt}&format=json`);
			const data = JSON.parse(res) as { title?: string };
			if (data.title) baris.splice(0, 1, `# ${data.title}`);
		} catch {
			hasil.peringatan.push('oembed YouTube gagal');
		}
	}
	hasil.md = baris.join('\n');
	return hasil;
}

export function ekstrakFolder(item: ItemManifest, petaItem: Map<string, ItemManifest>): HasilEkstrak {
	const hasil = kosong();
	const anak = item.embed.map((id) => petaItem.get(id)).filter((e): e is ItemManifest => !!e);
	hasil.md = [`# ${item.judul}`, '', `Tautan: ${item.url}`, '', `Isi folder (${anak.length}):`, ...anak.map((a) => `- ${a.judul || a.id}`)].join('\n');
	return hasil;
}
