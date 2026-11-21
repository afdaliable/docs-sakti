import fs from 'node:fs';
import path from 'node:path';

export interface BarisPeta {
	target_path: string;
	judul_artikel: string;
	modul: string;
	menu_sakti: string;
	peran: string;
	jenis: string;
	id_sumber: string;
	catatan: string;
}

const KOLOM = [
	'target_path',
	'judul_artikel',
	'modul',
	'menu_sakti',
	'peran',
	'jenis',
	'id_sumber',
	'catatan',
] as const;

export function uraiCsv(teks: string): string[][] {
	const baris: string[][] = [];
	let sel = '';
	let barisSel: string[] = [];
	let dalamKutip = false;
	let i = 0;
	while (i < teks.length) {
		const c = teks[i];
		if (dalamKutip) {
			if (c === '"') {
				if (teks[i + 1] === '"') {
					sel += '"';
					i += 2;
				} else {
					dalamKutip = false;
					i += 1;
				}
			} else {
				sel += c;
				i += 1;
			}
		} else if (c === '"') {
			dalamKutip = true;
			i += 1;
		} else if (c === ',') {
			barisSel.push(sel);
			sel = '';
			i += 1;
		} else if (c === '\r' || c === '\n') {
			if (c === '\r' && teks[i + 1] === '\n') i += 1;
			barisSel.push(sel);
			sel = '';
			baris.push(barisSel);
			barisSel = [];
			i += 1;
		} else {
			sel += c;
			i += 1;
		}
	}
	if (sel !== '' || barisSel.length > 0) {
		barisSel.push(sel);
		baris.push(barisSel);
	}
	return baris;
}

export function bacaPetaKonten(
	jalurCsv = path.resolve(process.cwd(), 'sources/peta-konten.csv'),
): BarisPeta[] {
	const tabel = uraiCsv(fs.readFileSync(jalurCsv, 'utf8'));
	return tabel.slice(1).map((kolom) => {
		const baris = {} as Record<(typeof KOLOM)[number], string>;
		KOLOM.forEach((kunci, indeks) => {
			baris[kunci] = kolom[indeks] ?? '';
		});
		return baris as BarisPeta;
	});
}
