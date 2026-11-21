import fs from 'node:fs';
import path from 'node:path';
import { ambil } from '../inventory/http.ts';
import type { ItemManifest } from '../inventory/tipe.ts';
import { htmlKeMarkdown } from './html.ts';
import { dirEkstrak } from './util.ts';

function ekstensiGambar(url: string, tipe: string | null): string {
	if (tipe?.includes('/')) {
		const e = tipe.split('/')[1].split(';')[0];
		if (/^[a-z0-9]+$/i.test(e) && e !== 'jpeg') return e;
		if (e === 'jpeg') return 'jpg';
	}
	const m = new URL(url).pathname.match(/\.(png|jpe?g|gif|webp|svg)$/i);
	return m ? m[1].toLowerCase() : 'png';
}

export async function ekstrakSitus(item: ItemManifest, petaItem: Map<string, ItemManifest>): Promise<{ md: string; peringatan: string[]; jumlahGambar: number }> {
	const peringatan: string[] = [];
	const dir = dirEkstrak(item.id);
	const html = fs.readFileSync(path.resolve(process.cwd(), item.file_lokal!), 'utf8');
	let md = htmlKeMarkdown(html);

	const jalurJson = path.resolve(process.cwd(), item.file_lokal!.replace(/\.html$/, '.json'));
	const gambar: { src: string; alt: string }[] = fs.existsSync(jalurJson)
		? (JSON.parse(fs.readFileSync(jalurJson, 'utf8')) as { gambar?: { src: string; alt: string }[] }).gambar ?? []
		: [];

	if (gambar.length > 0) {
		const dirImg = path.join(dir, 'img');
		fs.mkdirSync(dirImg, { recursive: true });
		let n = 0;
		for (const g of gambar) {
			if (!g.src?.startsWith('http')) continue;
			n++;
			const nama = `img/${String(n).padStart(2, '0')}`;
			try {
				const res = await ambil(g.src, { timeout: 30000 });
				if (res.status >= 400) {
					res.body?.cancel().catch(() => {});
					peringatan.push(`gambar ${n} gagal: HTTP ${res.status}`);
					continue;
				}
				const buf = Buffer.from(await res.arrayBuffer());
				const namaFile = `${nama}.${ekstensiGambar(g.src, res.headers.get('content-type'))}`;
				fs.writeFileSync(path.join(dir, namaFile), buf);
				md = md.split(`(${g.src})`).join(`(${namaFile})`);
			} catch {
				peringatan.push(`gambar ${n} gagal: jaringan`);
			}
		}
	}

	if (item.embed?.length) {
		const baris = item.embed
			.map((id) => petaItem.get(id))
			.filter((e): e is ItemManifest => !!e)
			.map((e) => `[Sematan: ${e.judul || e.id}](${e.url})`);
		if (baris.length) md += `\n\n${baris.join('\n')}`;
	}
	return { md, peringatan, jumlahGambar: gambar.length };
}
