import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { MODUL_SLUGS, PERAN_SLUGS } from './lib/modul.ts';

export const collections = {
	docs: defineCollection({
		loader: docsLoader(),
		schema: (context) => docsSchema({
			extend: z.object({
				modul: z.enum(MODUL_SLUGS).optional(),
				menu_sakti: z.string().optional(),
				peran: z.array(z.enum(PERAN_SLUGS)).default([]),
				jenis: z
					.enum([
						'juknis',
						'faq',
						'troubleshooting',
						'referensi',
						'konsep',
						'peraturan',
						'video',
						'indeks',
					])
					.default('juknis'),
				kata_kunci: z.array(z.string()).default([]),
				status: z.enum(['draft', 'review', 'terbit']).default('draft'),
				perlu_review: z.boolean().default(false),
				terakhir_diverifikasi: z.coerce.date().optional(),
				pemilik: z.string().optional(),
				sumber: z
					.array(
						z.object({
							judul: z.string(),
							url: z.string().url(),
							jenis: z.enum([
								'google-sites',
								'google-slides',
								'google-drive',
								'pdf',
								'pptx',
								'sheets',
								'lainnya',
							]),
							diambil: z.coerce.date(),
							id_manifest: z.string().optional(),
						}),
					)
					.default([]),
			}),
		})(context).transform((data) => {
			const draft = data.draft || data.status === 'draft';
			const banner =
				data.status === 'review' && data.banner === undefined
					? { content: 'Artikel ini sedang ditinjau. Isi dapat berubah setelah verifikasi.' }
					: data.banner;
			return { ...data, draft, banner };
		}),
	}),
};
