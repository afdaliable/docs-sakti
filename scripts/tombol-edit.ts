import fs from 'node:fs';
import { AWALAN_EDIT, LABEL_EDIT, REPO_URL } from '../src/lib/situs.ts';

export const AKAR_KONTEN = 'src/content/docs';

export function ruteDariHtml(rel: string): string {
	const p = rel.replace(/\\/g, '/');
	if (p === 'index.html') return '';
	if (p.endsWith('/index.html')) return p.slice(0, -'/index.html'.length);
	return p.replace(/\.html$/, '');
}

export function ruteDariBerkas(berkas: string): string {
	const rel = berkas.replace(/\\/g, '/').replace(new RegExp(`^${AKAR_KONTEN}/`), '');
	return rel.replace(/\.(mdx|md)$/, '').replace(/(^|\/)index$/, '');
}

export function kandidatSumber(rute: string): string[] {
	if (rute === '') {
		return [`${AKAR_KONTEN}/index.mdx`, `${AKAR_KONTEN}/index.md`];
	}
	return [
		`${AKAR_KONTEN}/${rute}.mdx`,
		`${AKAR_KONTEN}/${rute}.md`,
		`${AKAR_KONTEN}/${rute}/index.mdx`,
		`${AKAR_KONTEN}/${rute}/index.md`,
	];
}

export function sumberHalaman(
	rute: string,
	ada: (p: string) => boolean = fs.existsSync,
): string[] {
	return kandidatSumber(rute).filter(ada);
}

export interface TautanEdit {
	href: string;
	aksi?: string;
	teks: string;
}

export function tautanEditDiHtml(html: string): TautanEdit[] {
	const hasil: TautanEdit[] = [];
	for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
		const atribut = m[1];
		const href = atribut
			.match(/href="([^"]*)"/)?.[1]
			?.replace(/&amp;/g, '&');
		if (href === undefined || !href.startsWith(`${REPO_URL}/edit/`)) continue;
		const aksi = atribut.match(/data-aksi="([^"]*)"/)?.[1];
		hasil.push({
			href,
			aksi,
			teks: m[2].replace(/<[^>]*>/g, '').trim(),
		});
	}
	return hasil;
}

export function periksaTombolEdit(p: {
	html: string;
	sumber: string[];
	splash: boolean;
}): string[] {
	const masalah: string[] = [];
	if (p.sumber.length > 1) masalah.push(`sumber ganda: ${p.sumber.join(', ')}`);
	const tautan = tautanEditDiHtml(p.html);
	if (p.sumber.length === 0 || p.splash) {
		for (const t of tautan) {
			masalah.push(`tautan edit di halaman tanpa berkas sumber/splash: ${t.href}`);
		}
		return masalah;
	}
	const tombol = tautan.filter((t) => t.aksi === 'edit');
	if (tombol.length === 0) masalah.push('tanpa tombol edit');
	for (const t of tautan) {
		if (t.aksi !== 'edit') {
			masalah.push(`tautan edit di luar AksiHalaman: ${t.href}`);
			continue;
		}
		const harapan = `${AWALAN_EDIT}${p.sumber[0]}`;
		if (t.href !== harapan) {
			masalah.push(`href salah: ${t.href}, seharusnya ${harapan}`);
		}
		if (t.teks !== LABEL_EDIT) {
			masalah.push(`label salah: "${t.teks}", seharusnya "${LABEL_EDIT}"`);
		}
	}
	return masalah;
}
