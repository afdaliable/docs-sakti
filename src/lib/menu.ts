import fs from 'node:fs';
import path from 'node:path';

export interface FormMenu {
	label: string;
	form: string;
	seq: number;
}

export interface SimpulMenu {
	kode: string;
	label: string;
	seq: number;
	forms: FormMenu[];
	children: SimpulMenu[];
}

let cache: SimpulMenu[] | undefined;

export function muatMenu(): SimpulMenu[] {
	if (!cache) {
		const jalur = path.resolve(process.cwd(), 'sources/menu.json');
		cache = JSON.parse(fs.readFileSync(jalur, 'utf8')) as SimpulMenu[];
	}
	return cache;
}

export function bersihLabel(label: string): string {
	return label.replace(/\s+/g, ' ').trim();
}

export function normalLabel(label: string): string {
	return label
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
}

export function cariJalurMenu(jalur: string): string[] | null {
	const segmen = jalur.split(' > ');
	if (segmen.some((s) => s.trim() === '')) return null;
	let level = muatMenu();
	let induk: SimpulMenu | undefined;
	const hasil: string[] = [];
	for (let i = 0; i < segmen.length; i++) {
		const target = normalLabel(segmen[i]);
		const simpul = level.find((n) => normalLabel(n.label) === target);
		if (simpul) {
			hasil.push(bersihLabel(simpul.label));
			induk = simpul;
			level = simpul.children ?? [];
			continue;
		}
		if (i === segmen.length - 1) {
			const form = induk?.forms?.find((f) => normalLabel(f.label) === target);
			if (form) {
				hasil.push(bersihLabel(form.label));
				continue;
			}
		}
		return null;
	}
	return hasil;
}

export function jalurMenuBaku(jalur: string): string | null {
	const hasil = cariJalurMenu(jalur);
	return hasil ? hasil.join(' > ') : null;
}
