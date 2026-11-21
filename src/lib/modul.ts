import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { z } from 'astro/zod';

export interface Kelompok {
	id: string;
	nama: string;
}

export interface SubMenu {
	slug: string;
	nama: string;
}

export interface Modul {
	slug: string;
	nama: string;
	kelompok: string;
	ikon: string;
	ringkasan: string;
	sumber: ('A' | 'B' | 'C')[];
	sub: SubMenu[];
}

export interface Lintas {
	slug: string;
	nama: string;
}

export interface Peran {
	slug: string;
	nama: string;
}

export interface KonfigurasiModul {
	kelompok: Kelompok[];
	modul: Modul[];
	lintas: Lintas[];
	peran: Peran[];
}

export function labelDariSlug(slug: string): string {
	return slug
		.split('-')
		.map((kata) => kata.charAt(0).toUpperCase() + kata.slice(1))
		.join(' ');
}

const subSchema = z
	.union([z.string(), z.object({ slug: z.string(), nama: z.string().optional() })])
	.transform((sub): SubMenu =>
		typeof sub === 'string'
			? { slug: sub, nama: labelDariSlug(sub) }
			: { slug: sub.slug, nama: sub.nama ?? labelDariSlug(sub.slug) },
	);

const konfigurasiSchema = z
	.object({
		kelompok: z.array(z.object({ id: z.string(), nama: z.string() })),
		modul: z.array(
			z.object({
				slug: z.string(),
				nama: z.string(),
				kelompok: z.string(),
				ikon: z.string(),
				ringkasan: z.string(),
				sumber: z.array(z.enum(['A', 'B', 'C'])),
				sub: z.array(subSchema),
			}),
		),
		lintas: z.array(z.object({ slug: z.string(), nama: z.string() })),
		peran: z.array(z.object({ slug: z.string(), nama: z.string() })),
	})
	.superRefine((konfigurasi, ctx) => {
		const idKelompok = new Set(konfigurasi.kelompok.map((k) => k.id));
		const lihatDuplikat = (slugs: string[], jenis: string) => {
			const terlihat = new Set<string>();
			for (const slug of slugs) {
				if (terlihat.has(slug)) {
					ctx.addIssue({ code: 'custom', message: `${jenis} ganda: ${slug}` });
				}
				terlihat.add(slug);
			}
		};
		lihatDuplikat(konfigurasi.modul.map((m) => m.slug), 'slug modul');
		lihatDuplikat(konfigurasi.peran.map((p) => p.slug), 'slug peran');
		lihatDuplikat(konfigurasi.lintas.map((l) => l.slug), 'slug lintas');
		for (const modul of konfigurasi.modul) {
			if (!idKelompok.has(modul.kelompok)) {
				ctx.addIssue({
					code: 'custom',
					message: `Modul "${modul.slug}" memakai kelompok yang tidak dikenal: ${modul.kelompok}`,
				});
			}
			lihatDuplikat(modul.sub.map((s) => s.slug), `slug sub modul "${modul.slug}"`);
		}
	});

let cache: KonfigurasiModul | undefined;

export function muatKonfigurasi(): KonfigurasiModul {
	if (!cache) {
		const jalur = path.resolve(process.cwd(), 'config/modul.yaml');
		const mentah = parse(fs.readFileSync(jalur, 'utf8'));
		cache = konfigurasiSchema.parse(mentah) as KonfigurasiModul;
	}
	return cache;
}

export const MODUL_SLUGS = muatKonfigurasi().modul.map((m) => m.slug) as [
	string,
	...string[],
];

export const PERAN_SLUGS = muatKonfigurasi().peran.map((p) => p.slug) as [
	string,
	...string[],
];
