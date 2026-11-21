import fs from 'node:fs';
import path from 'node:path';
import { ambil } from '../inventory/http.ts';
import type { ItemManifest } from '../inventory/tipe.ts';
import { cariManual, DIR_RAW_DOK } from './util.ts';

export class GalatUnduh extends Error {
	constructor(
		pesan: string,
		public login = false,
	) {
		super(pesan);
	}
}

export function urlUnduhDrive(driveId: string): string {
	return `https://drive.usercontent.google.com/download?id=${driveId}&export=download&confirm=t`;
}

export async function unduhFile(item: ItemManifest, url: string, ext: string): Promise<string> {
	const manual = cariManual(item.id);
	const jalur = path.join(DIR_RAW_DOK, `${item.id}.${ext}`);
	if (manual) return manual;
	fs.mkdirSync(DIR_RAW_DOK, { recursive: true });
	const res = await ambil(url, { timeout: 60000 });
	if (res.url.includes('accounts.google.com')) {
		res.body?.cancel().catch(() => {});
		throw new GalatUnduh('butuh login', true);
	}
	if (res.status === 404) {
		res.body?.cancel().catch(() => {});
		throw new GalatUnduh('HTTP 404');
	}
	if (res.status >= 400) {
		res.body?.cancel().catch(() => {});
		throw new GalatUnduh(`HTTP ${res.status}`);
	}
	const tipe = res.headers.get('content-type') ?? '';
	const buf = Buffer.from(await res.arrayBuffer());
	if (tipe.includes('text/html') && /<html/i.test(buf.subarray(0, 4096).toString('utf8'))) {
		throw new GalatUnduh('mendapat halaman HTML (login/peringatan) alih-alih berkas');
	}
	fs.writeFileSync(jalur, buf);
	return jalur;
}

export async function unduhTeks(url: string, timeout = 30000): Promise<string> {
	const res = await ambil(url, { timeout });
	if (res.url.includes('accounts.google.com')) {
		res.body?.cancel().catch(() => {});
		throw new GalatUnduh('butuh login', true);
	}
	if (res.status >= 400) {
		res.body?.cancel().catch(() => {});
		throw new GalatUnduh(`HTTP ${res.status}`);
	}
	return res.text();
}
