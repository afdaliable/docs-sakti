import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { muatKonfigurasi } from '../lib/modul.ts';
import { bentukDokumenLite } from '../lib/cari/lite.ts';

export const GET: APIRoute = async () => {
	const entri = await getCollection('docs');
	const konfigurasi = muatKonfigurasi();
	const base = import.meta.env.BASE_URL;
	const dokumen = entri
		.filter(
			(e) =>
				(!import.meta.env.PROD || !e.data.draft) &&
				(e.data as { pagefind?: boolean }).pagefind !== false,
		)
		.map((e) =>
			bentukDokumenLite(
				{ id: e.id, body: (e as { body?: string }).body, data: e.data },
				konfigurasi,
				base,
			),
		)
		.sort((a, b) => a.url.localeCompare(b.url));
	return new Response(JSON.stringify(dokumen), {
		headers: { 'content-type': 'application/json; charset=utf-8' },
	});
};
