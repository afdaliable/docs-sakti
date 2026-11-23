import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';

export const PENANDA_HASH = '{{HASH_SKRIP_INLINE}}';
export const BATAS_BARIS = 2000;

export function hashSkripInline(html: string): string[] {
	const hasil: string[] = [];
	for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
		const atribut = m[1];
		const isi = m[2];
		if (/\bsrc\s*=/.test(atribut)) continue;
		const tipe = atribut.match(/\btype\s*=\s*["']?([^"'\s>]+)/i)?.[1] ?? '';
		if (/json/i.test(tipe)) continue;
		if (isi.trim() === '') continue;
		const digest = createHash('sha256').update(isi, 'utf8').digest('base64');
		hasil.push(`'sha256-${digest}'`);
	}
	return hasil;
}

export function isiHeaders(templat: string, hash: string[]): string {
	if (!templat.includes(PENANDA_HASH)) {
		throw new Error(`_headers tidak memuat penanda ${PENANDA_HASH}`);
	}
	if (hash.length === 0) {
		throw new Error('tidak ada skrip inline untuk di-hash');
	}
	const token = [...new Set(hash)].sort().join(' ');
	const isi = templat.split(PENANDA_HASH).join(token);
	if (isi.includes('{{')) {
		throw new Error('_headers masih memuat penanda templat yang tidak dikenal');
	}
	for (const [i, baris] of isi.split('\n').entries()) {
		if (baris.length > BATAS_BARIS) {
			throw new Error(`baris ${i + 1} _headers melebihi ${BATAS_BARIS} karakter`);
		}
	}
	return isi;
}

function berkasHtml(dir: string): string[] {
	const hasil: string[] = [];
	for (const entri of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, entri.name);
		if (entri.isDirectory()) hasil.push(...berkasHtml(p));
		else if (entri.name.endsWith('.html')) hasil.push(p);
	}
	return hasil;
}

export function cspHeaders(): AstroIntegration {
	return {
		name: 'csp-headers',
		hooks: {
			'astro:build:done': ({ dir, logger }) => {
				const root = fileURLToPath(dir);
				const hash: string[] = [];
				for (const berkas of berkasHtml(root)) {
					hash.push(...hashSkripInline(fs.readFileSync(berkas, 'utf8')));
				}
				const unik = [...new Set(hash)];
				const berkasHeaders = path.join(root, '_headers');
				if (!fs.existsSync(berkasHeaders)) {
					throw new Error('_headers tidak ada di hasil build (public/_headers)');
				}
				const templat = fs.readFileSync(berkasHeaders, 'utf8');
				fs.writeFileSync(berkasHeaders, isiHeaders(templat, hash));
				logger.info(`CSP: ${unik.length} hash skrip inline ditulis ke _headers`);
			},
		},
	};
}
