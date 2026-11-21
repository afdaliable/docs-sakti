import fs from 'node:fs';
import path from 'node:path';
import { bacaManifest, tulisManifest } from '../inventory/manifest.ts';
import type { ItemManifest } from '../inventory/tipe.ts';
import {
	ekstrakDocs,
	ekstrakDocx,
	ekstrakFolder,
	ekstrakLainnya,
	ekstrakPdf,
	ekstrakPptx,
	ekstrakSheets,
	ekstrakSlides,
	ekstrakVideo,
	ekstrakXlsx,
	type HasilEkstrak,
} from './dokumen.ts';
import { ekstrakSitus } from './situs.ts';
import { cariManual, dirEkstrak, jumlahKata, keputusan, tulisKonten, tulisMeta, type MetaEkstrak } from './util.ts';

function argumen() {
	const args = process.argv.slice(2);
	const ids = new Set<string>();
	const sumber = new Set<string>();
	const jenis = new Set<string>();
	let batas: number | undefined;
	let paksa = false;
	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--id') for (const s of args[++i].split(',')) ids.add(s.trim());
		else if (args[i] === '--sumber') for (const s of args[++i].split(',')) sumber.add(s.trim());
		else if (args[i] === '--jenis') for (const s of args[++i].split(',')) jenis.add(s.trim());
		else if (args[i] === '--batas') batas = parseInt(args[++i]);
		else if (args[i] === '--paksa') paksa = true;
	}
	return { ids, sumber, jenis, batas, paksa };
}

function tanggalWIB(): string {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, '0');
	const wib = new Date(d.getTime() + (7 * 60 + d.getTimezoneOffset()) * 60000);
	return `${wib.getFullYear()}-${pad(wib.getMonth() + 1)}-${pad(wib.getDate())}T${pad(wib.getHours())}:${pad(wib.getMinutes())}:${pad(wib.getSeconds())}+07:00`;
}

async function main() {
	const { ids, sumber, jenis, batas, paksa } = argumen();
	const manifest = bacaManifest();
	const petaItem = new Map(manifest.item.map((i) => [i.id, i]));
	const tanggal = tanggalWIB();

	const calon = manifest.item.filter((i) => {
		if (ids.size && !ids.has(i.id)) return false;
		if (sumber.size && !sumber.has(i.sumber)) return false;
		if (jenis.size && !jenis.has(i.jenis)) return false;
		if (paksa) return true;
		return keputusan(i) !== 'lewati';
	});

	let diproses = 0;
	for (const item of calon) {
		if (batas && diproses >= batas) break;
		if (item.status === 'diekstrak' && !paksa) continue;
		const manual = cariManual(item.id);
		if (item.status === 'gagal' && !manual && !item.catatan.startsWith('jaringan:')) continue;
		diproses++;
		const dir = dirEkstrak(item.id);
		console.log(`[${diproses}/${calon.length}] ${item.id} (${item.jenis}) — ${item.judul.slice(0, 60)}`);
		try {
			let hasil: HasilEkstrak;
			switch (item.jenis) {
				case 'google-sites': {
					const s = await ekstrakSitus(item, petaItem);
					hasil = { md: s.md, jumlahHalaman: null, jumlahGambar: s.jumlahGambar, halamanOcr: [], peringatan: s.peringatan };
					break;
				}
				case 'google-slides': hasil = await ekstrakSlides(item); break;
				case 'google-docs': hasil = await ekstrakDocs(item); break;
				case 'sheets': hasil = await ekstrakSheets(item); break;
				case 'pdf': hasil = await ekstrakPdf(item); break;
				case 'pptx': hasil = await ekstrakPptx(item); break;
				case 'docx': hasil = await ekstrakDocx(item); break;
				case 'xlsx': hasil = await ekstrakXlsx(item); break;
				case 'video': hasil = await ekstrakVideo(item); break;
				case 'google-drive': hasil = ekstrakFolder(item, petaItem); break;
				default: hasil = await ekstrakLainnya(item); break;
			}
			if (item.status !== 'diekstrak') item.status = 'diunduh';
			tulisManifest(manifest);
			tulisKonten(dir, hasil.md + '\n');
			const meta: MetaEkstrak = {
				id: item.id,
				jenis: item.jenis,
				judul: item.judul,
				url: item.url,
				diekstrak: tanggal,
				jumlah_halaman: hasil.jumlahHalaman,
				jumlah_kata: jumlahKata(hasil.md),
				jumlah_gambar: hasil.jumlahGambar,
				halaman_ocr: hasil.halamanOcr,
				peringatan: hasil.peringatan,
			};
			tulisMeta(dir, meta);
			item.jumlah_halaman = hasil.jumlahHalaman;
			if (item.jumlah_kata == null || item.jenis !== 'google-sites') item.jumlah_kata = meta.jumlah_kata;
			item.status = 'diekstrak';
			item.catatan = '';
		} catch (e) {
			item.status = 'gagal';
			item.catatan = `ekstraksi: ${String(e instanceof Error ? e.message : e).slice(0, 150)}`;
			console.log(`  GAGAL: ${item.catatan}`);
		}
		tulisManifest(manifest);
	}
	console.log(`selesai: ${diproses} diproses`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
