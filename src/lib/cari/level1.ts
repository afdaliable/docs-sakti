import { bentukVarian, type EntriSinonim, type KamusKueri } from './kueri.ts';

export interface FilterCari {
	modul?: string[];
	peran?: string;
	jenis?: string;
}

export interface DokumenLite {
	url: string;
	judul: string;
	deskripsi: string;
	kata_kunci: string[];
	heading: string[];
	modul: string;
	peran: string[];
	jenis: string;
	label_jenis: string;
	breadcrumb: string;
}

export interface DataHasil {
	url: string;
	judul: string;
	breadcrumb: string;
	jenis: string;
	cuplikan: string;
}

export interface ButirHasil {
	asal: 'pagefind' | 'mirip';
	skor: number;
	data(): Promise<DataHasil>;
}

export interface HasilLevel1 {
	butir: ButirHasil[];
	jumlahPagefind: number;
	varian: string[];
}

export interface HasilMesin {
	id: string;
	score: number;
	data(): Promise<{ url: string; excerpt: string; meta: Record<string, unknown> }>;
}

export interface MesinPagefind {
	search(q: string, opsi?: { filters?: Record<string, unknown> }): Promise<{ results: HasilMesin[] }>;
}

export interface Ketergantungan {
	pagefind: MesinPagefind;
	sinonim: EntriSinonim[];
	kamus: KamusKueri;
	cariMirip(kata: string): Promise<DokumenLite[]>;
}

export const AMBANG_MIRIP = 3;
export const MAKS_MIRIP = 20;

const ENTITAS: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function amankanHtml(teks: string): string {
	return teks.replace(/[&<>"']/g, (c) => ENTITAS[c]);
}

export function keFilterPagefind(filter: FilterCari): Record<string, unknown> {
	const hasil: Record<string, unknown> = {};
	if (filter.modul && filter.modul.length > 0) hasil.modul = { any: filter.modul };
	if (filter.peran) hasil.peran = filter.peran;
	if (filter.jenis) hasil.jenis = filter.jenis;
	return hasil;
}

export function lolosFilter(dok: DokumenLite, filter: FilterCari): boolean {
	if (filter.modul && filter.modul.length > 0 && !filter.modul.includes(dok.modul)) return false;
	if (filter.peran && !dok.peran.includes(filter.peran)) return false;
	if (filter.jenis && dok.jenis !== filter.jenis) return false;
	return true;
}

function butirPagefind(r: HasilMesin): ButirHasil {
	let janji: Promise<DataHasil> | undefined;
	return {
		asal: 'pagefind',
		skor: r.score,
		data: () =>
			(janji ??= r.data().then((d) => ({
				url: d.url,
				judul: String(d.meta.title ?? d.url),
				breadcrumb: String(d.meta.breadcrumb ?? ''),
				jenis: String(d.meta.jenis ?? ''),
				cuplikan: `…${d.excerpt}…`,
			}))),
	};
}

function butirMirip(dok: DokumenLite): ButirHasil {
	const data: DataHasil = {
		url: dok.url,
		judul: dok.judul,
		breadcrumb: dok.breadcrumb,
		jenis: dok.label_jenis,
		cuplikan: amankanHtml(dok.deskripsi),
	};
	return { asal: 'mirip', skor: 0, data: () => Promise.resolve(data) };
}

export async function cariLevel1(
	q: string,
	filter: FilterCari,
	dep: Ketergantungan,
): Promise<HasilLevel1> {
	const varian = bentukVarian(q, dep.sinonim, dep.kamus);
	const filters = keFilterPagefind(filter);
	const perVarian = await Promise.all(varian.semua.map((s) => dep.pagefind.search(s, { filters })));
	const terbaik = new Map<string, HasilMesin>();
	for (const hasil of perVarian) {
		for (const r of hasil.results) {
			const lama = terbaik.get(r.id);
			if (!lama || r.score > lama.score) terbaik.set(r.id, r);
		}
	}
	const butir = [...terbaik.values()].sort((a, b) => b.score - a.score).map(butirPagefind);
	const jumlahPagefind = butir.length;
	if (jumlahPagefind < AMBANG_MIRIP) {
		try {
			const kata = [...new Set([...varian.inti, ...varian.istilah.flatMap((s) => s.split(' '))])].join(' ');
			const [mirip, sudahAda] = await Promise.all([
				dep.cariMirip(kata),
				Promise.all(butir.map((b) => b.data().then((d) => d.url))),
			]);
			const terpakai = new Set(sudahAda);
			for (const dok of mirip) {
				if (butir.length - jumlahPagefind >= MAKS_MIRIP) break;
				if (terpakai.has(dok.url) || !lolosFilter(dok, filter)) continue;
				terpakai.add(dok.url);
				butir.push(butirMirip(dok));
			}
		} catch {
			/* indeks ringan tidak tersedia: hasil Pagefind tetap dipakai */
		}
	}
	return { butir, jumlahPagefind, varian: varian.semua };
}
