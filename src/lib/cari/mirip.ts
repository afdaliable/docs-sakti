import MiniSearch from 'minisearch';
import { tokenisasi } from './kueri.ts';
import type { DokumenLite } from './level1.ts';

export function buatPencariMirip(dok: DokumenLite[]): (kata: string) => DokumenLite[] {
	const indeks = new MiniSearch<DokumenLite>({
		idField: 'url',
		fields: ['judul', 'kata_kunci', 'heading'],
		extractField: (d, nama) => {
			const nilai = d[nama as keyof DokumenLite];
			return Array.isArray(nilai) ? nilai.join(' , ') : String(nilai);
		},
		tokenize: tokenisasi,
		processTerm: (t) => t,
	});
	indeks.addAll(dok);
	const perUrl = new Map(dok.map((d) => [d.url, d]));
	return (kata) =>
		indeks
			.search(kata, { fuzzy: 0.2, prefix: true, combineWith: 'OR', boost: { judul: 3, kata_kunci: 2 } })
			.map((r) => perUrl.get(r.id as string)!);
}
