import type { CollectionEntry } from 'astro:content';
import fs from 'node:fs';
import path from 'node:path';

export type Artikel = CollectionEntry<'docs'>;

export function adalahEntriKonten(entry: { filePath?: string | undefined }): boolean {
	const berkas = entry.filePath;
	if (typeof berkas !== 'string' || berkas === '') return false;
	const jalur = path.isAbsolute(berkas) ? berkas : path.resolve(process.cwd(), berkas);
	return fs.existsSync(jalur);
}

export async function artikelTampil(): Promise<Artikel[]> {
	const { getCollection } = await import('astro:content');
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
