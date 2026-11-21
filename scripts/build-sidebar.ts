import fs from 'node:fs';
import path from 'node:path';
import { muatKonfigurasi } from '../src/lib/modul.ts';

const DOCS = path.resolve(process.cwd(), 'src/content/docs');

function adaIndeks(segmen: string[]): boolean {
	return (
		fs.existsSync(path.join(DOCS, ...segmen, 'index.mdx')) ||
		fs.existsSync(path.join(DOCS, ...segmen, 'index.md'))
	);
}

function isiFolder(segmen: string[]): string[] {
	const jalur = path.join(DOCS, ...segmen);
	if (!fs.existsSync(jalur)) return [];
	return fs.readdirSync(jalur);
}

function itemSub(slugModul: string, sub: { slug: string; nama: string }) {
	const berkas = isiFolder([slugModul, sub.slug]);
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

function itemModul(modul: { slug: string; nama: string; sub: { slug: string; nama: string }[] }) {
	const berkas = isiFolder([modul.slug]);
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
		.map((sub) => itemSub(modul.slug, sub))
		.filter((item) => item !== null);
	return {
		label: modul.nama,
		collapsed: true,
		items: [{ label: 'Ringkasan', slug: modul.slug }, ...itemSubMenu],
	};
}

export function bangunSidebar() {
	const konfigurasi = muatKonfigurasi();
	const kelompok = konfigurasi.kelompok.map((k) => ({
		label: k.nama,
		items: konfigurasi.modul
			.filter((m) => m.kelompok === k.id)
			.map((m) => itemModul(m))
			.filter((item) => item !== null),
	}));
	return [
		...kelompok,
		{
			label: 'Lainnya',
			items: konfigurasi.lintas
				.filter((l) => adaIndeks([l.slug]))
				.map((l) => ({ label: l.nama, slug: l.slug })),
		},
	];
}
