import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { muatKonfigurasi } from '../src/lib/modul.ts';

const DOCS = path.resolve(process.cwd(), 'src/content/docs');

export interface OpsiSidebar {
	docsDir?: string;
	produksi?: boolean;
}

function frontmatterBerkas(jalur: string): Record<string, unknown> {
	const isi = fs.readFileSync(jalur, 'utf8');
	const baris = isi.split('\n');
	if (baris[0]?.trim() !== '---') return {};
	const batas = baris.findIndex((b, i) => i > 0 && b.trim() === '---');
	if (batas === -1) return {};
	return (parse(baris.slice(1, batas).join('\n')) ?? {}) as Record<string, unknown>;
}

function terbitDiProduksi(jalur: string): boolean {
	const data = frontmatterBerkas(jalur);
	if (data.draft === true) return false;
	return data.status === 'terbit' || data.status === 'review';
}

function adaIndeks(docsDir: string, segmen: string[]): boolean {
	return (
		fs.existsSync(path.join(docsDir, ...segmen, 'index.mdx')) ||
		fs.existsSync(path.join(docsDir, ...segmen, 'index.md'))
	);
}

function isiFolder(docsDir: string, segmen: string[]): string[] {
	const jalur = path.join(docsDir, ...segmen);
	if (!fs.existsSync(jalur)) return [];
	return fs.readdirSync(jalur);
}

function artikelAkar(docsDir: string, slugModul: string, produksi: boolean) {
	return isiFolder(docsDir, [slugModul])
		.filter((nama) => /\.mdx?$/.test(nama) && !/^index\.mdx?$/.test(nama))
		.sort()
		.filter((nama) => !produksi || terbitDiProduksi(path.join(docsDir, slugModul, nama)))
		.map((nama) => ({ slug: `${slugModul}/${nama.replace(/\.mdx?$/, '')}` }));
}

function itemSub(
	docsDir: string,
	slugModul: string,
	sub: { slug: string; nama: string },
) {
	const berkas = isiFolder(docsDir, [slugModul, sub.slug]);
	if (berkas.length === 0) return null;
	if (berkas.every((nama) => /^index\.mdx?$/.test(nama))) {
		return { label: sub.nama, slug: `${slugModul}/${sub.slug}` };
	}
	return {
		label: sub.nama,
		collapsed: true,
		items: [{ autogenerate: { directory: `${slugModul}/${sub.slug}` } }],
	};
}

function itemModul(
	docsDir: string,
	produksi: boolean,
	modul: { slug: string; nama: string; sub: { slug: string; nama: string }[] },
) {
	const berkas = isiFolder(docsDir, [modul.slug]);
	if (berkas.length === 0) return null;
	if (berkas.every((nama) => /^index\.mdx?$/.test(nama))) {
		return { label: modul.nama, slug: modul.slug };
	}
	if (modul.sub.length === 0) {
		return {
			label: modul.nama,
			collapsed: true,
			items: [{ autogenerate: { directory: modul.slug } }],
		};
	}
	const itemSubMenu = modul.sub
		.map((sub) => itemSub(docsDir, modul.slug, sub))
		.filter((item) => item !== null);
	return {
		label: modul.nama,
		collapsed: true,
		items: [
			{ label: 'Ringkasan', slug: modul.slug },
			...itemSubMenu,
			...artikelAkar(docsDir, modul.slug, produksi),
		],
	};
}

export function bangunSidebar(opsi: OpsiSidebar = {}) {
	const docsDir = opsi.docsDir ?? DOCS;
	const produksi =
		opsi.produksi ??
		(process.argv.includes('build') || process.env.NODE_ENV === 'production');
	const konfigurasi = muatKonfigurasi();
	const kelompok = konfigurasi.kelompok.map((k) => ({
		label: k.nama,
		items: konfigurasi.modul
			.filter((m) => m.kelompok === k.id)
			.map((m) => itemModul(docsDir, produksi, m))
			.filter((item) => item !== null),
	}));
	return [
		...kelompok,
		{
			label: 'Lainnya',
			items: konfigurasi.lintas
				.filter((l) => adaIndeks(docsDir, [l.slug]))
				.map((l) => ({ label: l.nama, slug: l.slug })),
		},
	];
}
