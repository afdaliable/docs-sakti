import { getCollection, type CollectionEntry } from 'astro:content';

export type Artikel = CollectionEntry<'docs'>;

export async function artikelTampil(): Promise<Artikel[]> {
	const entri = await getCollection('docs');
	return entri.filter(
		(e) => e.data.jenis !== 'indeks' && (!import.meta.env.PROD || !e.data.draft),
	);
}

export async function hitungPerModul(): Promise<Map<string, number>> {
	const hitung = new Map<string, number>();
	for (const artikel of await artikelTampil()) {
		const modul = artikel.data.modul;
		if (modul) hitung.set(modul, (hitung.get(modul) ?? 0) + 1);
	}
	return hitung;
}
