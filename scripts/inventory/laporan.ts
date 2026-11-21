import fs from 'node:fs';
import path from 'node:path';
import type { ItemManifest, Manifest } from './tipe.ts';

function hitungPer<T extends string>(items: ItemManifest[], fn: (i: ItemManifest) => T): Record<T, number> {
	const hasil = {} as Record<T, number>;
	for (const i of items) {
		const k = fn(i);
		hasil[k] = (hasil[k] ?? 0) + 1;
	}
	return hasil;
}

function normalisasiJudul(judul: string): Set<string> {
	return new Set(
		judul
			.toLowerCase()
			.replace(/\.(pdf|pptx|docx|xlsx|csv|mp4)$/i, '')
			.replace(/\b(19|20)\d{2}\b/g, ' ')
			.replace(/juknis|sakti|petunjuk|modul/g, ' ')
			.replace(/[^a-z0-9\s]/g, ' ')
			.split(/\s+/)
			.filter(Boolean),
	);
}

function jaccard(a: Set<string>, b: Set<string>): number {
	if (a.size === 0 || b.size === 0) return 0;
	let irisan = 0;
	for (const t of a) if (b.has(t)) irisan++;
	return irisan / (a.size + b.size - irisan);
}

function parseCsv(csv: string): string[][] {
	const baris: string[][] = [];
	let sel = '';
	let kolom: string[] = [];
	let dalamKutip = false;
	for (let i = 0; i < csv.length; i++) {
		const c = csv[i];
		if (dalamKutip) {
			if (c === '"' && csv[i + 1] === '"') {
				sel += '"';
				i++;
			} else if (c === '"') {
				dalamKutip = false;
			} else {
				sel += c;
			}
		} else if (c === '"') {
			dalamKutip = true;
		} else if (c === ',') {
			kolom.push(sel);
			sel = '';
		} else if (c === '\n' || c === '\r') {
			if (c === '\r' && csv[i + 1] === '\n') i++;
			kolom.push(sel);
			sel = '';
			if (kolom.length > 1 || kolom[0] !== '') baris.push(kolom);
			kolom = [];
		} else {
			sel += c;
		}
	}
	kolom.push(sel);
	if (kolom.length > 1 || kolom[0] !== '') baris.push(kolom);
	return baris;
}

export function buatLaporan(manifest: Manifest, tanggal: string): string {
	const item = manifest.item;
	const baris: string[] = [];
	baris.push('# Laporan Inventaris Konten SAKTI', '');
	baris.push(`Dibuat: ${tanggal}`, '');

	baris.push('## Item per sumber dan jenis', '');
	const perSumberJenis = new Map<string, number>();
	for (const i of item) {
		const k = `${i.sumber} / ${i.jenis}`;
		perSumberJenis.set(k, (perSumberJenis.get(k) ?? 0) + 1);
	}
	for (const [k, n] of [...perSumberJenis.entries()].sort()) baris.push(`- ${k}: ${n}`);
	baris.push('');

	baris.push('## Item per target modul', '');
	const perModul = hitungPer(item, (i) => i.target_modul ?? '(belum dipetakan)');
	for (const [k, n] of Object.entries(perModul).sort()) baris.push(`- ${k}: ${n}`);
	baris.push('');

	baris.push('## Item per status', '');
	const perStatus = hitungPer(item, (i) => i.status);
	for (const [k, n] of Object.entries(perStatus).sort()) baris.push(`- ${k}: ${n}`);
	baris.push('');

	const penanda = hitungPer(
		item.filter((i) => i.penanda_sumber),
		(i) => i.penanda_sumber!,
	);
	baris.push('## Penanda sumber', '');
	for (const [k, n] of Object.entries(penanda)) baris.push(`- ${k}: ${n}`);
	baris.push('');

	const kosong = item.filter(
		(i) => i.jenis === 'google-sites' && (i.jumlah_kata ?? 0) < 30 && i.embed.length === 0,
	);
	baris.push('## Halaman kosong', '');
	for (const i of kosong) baris.push(`- [${i.judul || i.id}](${i.url}) (${i.jumlah_kata} kata)`);
	baris.push('');

	baris.push('## Gagal', '');
	for (const i of item.filter((i) => i.status === 'gagal')) {
		baris.push(`- ${i.id} — ${i.url} — ${i.catatan}`);
	}
	baris.push('');

	baris.push('## Ditolak', '');
	for (const i of item.filter((i) => i.status === 'ditolak')) {
		baris.push(`- ${i.id} — ${i.judul} — ${i.catatan}`);
	}
	baris.push('');

	baris.push('## Link rusak', '');
	for (const l of manifest.link_rusak) {
		baris.push(`- ${l.url} — ${l.status} (dari: ${l.dari.join(', ')})`);
	}
	baris.push('');

	baris.push('## Kandidat duplikat', '');
	const perDrive = new Map<string, ItemManifest[]>();
	for (const i of item) {
		if (!i.drive_id) continue;
		const d = perDrive.get(i.drive_id) ?? [];
		d.push(i);
		perDrive.set(i.drive_id, d);
	}
	for (const [driveId, daftar] of perDrive) {
		if (daftar.length > 1) {
			baris.push(`- drive_id ${driveId}: ${daftar.map((i) => i.id).join(', ')}`);
		}
	}
	const kandidat = item.filter((i) => i.jenis !== 'google-drive' && i.judul);
	const token = new Map<string, Set<string>>(kandidat.map((i) => [i.id, normalisasiJudul(i.judul)]));
	const dilaporkan = new Set<string>();
	for (let a = 0; a < kandidat.length; a++) {
		for (let b = a + 1; b < kandidat.length; b++) {
			const A = kandidat[a];
			const B = kandidat[b];
			if (A.target_modul !== B.target_modul || !A.target_modul) continue;
			if (A.drive_id && A.drive_id === B.drive_id) continue;
			const kunci = `${A.id}|${B.id}`;
			if (dilaporkan.has(kunci)) continue;
			const skor = jaccard(token.get(A.id)!, token.get(B.id)!);
			if (skor >= 0.6) {
				dilaporkan.add(kunci);
				baris.push(`- ${A.id} ~ ${B.id} (Jaccard ${skor.toFixed(2)}): "${A.judul}" / "${B.judul}"`);
			}
		}
	}
	baris.push('');

	baris.push('## Item tanpa target modul', '');
	for (const i of item.filter((i) => !i.target_modul && i.jenis === 'google-sites')) {
		baris.push(`- ${i.id} — ${i.url}`);
	}
	baris.push('');

	const jalurPeta = path.resolve(process.cwd(), 'sources/peta-konten.csv');
	if (fs.existsSync(jalurPeta)) {
		baris.push('## Ringkasan peta konten', '');
		const barisCsv = parseCsv(fs.readFileSync(jalurPeta, 'utf8'));
		const perJenis = new Map<string, number>();
		const perModulPeta = new Map<string, number>();
		const ditolak: string[][] = [];
		for (const r of barisCsv.slice(1)) {
			const [targetPath, judul, modul, , , jenis, idSumber, catatan] = r;
			if (!jenis) continue;
			perJenis.set(jenis, (perJenis.get(jenis) ?? 0) + 1);
			if (modul) perModulPeta.set(modul, (perModulPeta.get(modul) ?? 0) + 1);
			if (jenis === 'ditolak') ditolak.push([judul, idSumber, catatan]);
		}
		baris.push('Baris per jenis:');
		for (const [k, n] of [...perJenis.entries()].sort()) baris.push(`- ${k}: ${n}`);
		baris.push('');
		baris.push('Artikel target per modul:');
		for (const [k, n] of [...perModulPeta.entries()].sort()) baris.push(`- ${k}: ${n}`);
		baris.push('');
		baris.push('### Usulan ditolak', '');
		for (const [judul, idSumber, catatan] of ditolak) baris.push(`- ${judul} — ${idSumber} — ${catatan}`);
		baris.push('');
	}

	baris.push('## Perlu diunduh manual', '');
	baris.push('Simpan berkas ke `sources/raw/manual/<id>.<ekstensi>`, lalu jalankan `pnpm migrate:extract --id <id>`.', '');
	for (const i of item.filter((i) => i.status === 'gagal')) {
		baris.push(`- ${i.id} — ${i.judul} — ${i.url} — ${i.catatan} — ditautkan dari: ${i.ditautkan_dari.join(', ') || '-'}`);
	}
	baris.push('');

	const dirEkstrak = path.resolve(process.cwd(), 'sources/extracted');
	if (fs.existsSync(dirEkstrak)) {
		baris.push('## Hasil ekstraksi', '');
		const ocr: string[] = [];
		for (const d of fs.readdirSync(dirEkstrak).sort()) {
			const jalurMeta = path.join(dirEkstrak, d, 'meta.json');
			if (!fs.existsSync(jalurMeta)) continue;
			try {
				const meta = JSON.parse(fs.readFileSync(jalurMeta, 'utf8')) as { halaman_ocr?: number[] };
				if (meta.halaman_ocr?.length) ocr.push(`${d} (halaman ${meta.halaman_ocr.join(', ')})`);
			} catch {}
		}
		const perStatusEkstrak = hitungPer(item, (i) => i.status);
		baris.push(`- diekstrak: ${perStatusEkstrak['diekstrak'] ?? 0}`);
		baris.push(`- diunduh: ${perStatusEkstrak['diunduh'] ?? 0}`);
		baris.push(`- belum diproses: ${perStatusEkstrak['terinventaris'] ?? 0}`);
		baris.push(`- gagal: ${perStatusEkstrak['gagal'] ?? 0}`);
		baris.push('');
		baris.push(`Dokumen dengan halaman OCR (${ocr.length}):`);
		for (const o of ocr) baris.push(`- ${o}`);
		baris.push('');
	}
	return baris.join('\n');
}
