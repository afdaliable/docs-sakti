import fs from 'node:fs';
import path from 'node:path';
import { chromium, type Page } from 'playwright';
import { acakJeda } from './http.ts';
import { buangGoogleRedirect } from './resolver.ts';
import { petakanTarget } from './pemetaan.ts';
import { itemBaru, type ItemManifest, type Sumber } from './tipe.ts';

export interface Situs {
	sumber: 'A' | 'C';
	nama: string;
	base: string;
}

export const SITUS: Situs[] = [
	{ sumber: 'A', nama: 'saktiadm', base: 'https://sites.google.com/view/saktiadm' },
	{ sumber: 'C', nama: 'saktipelaporan', base: 'https://sites.google.com/view/saktipelaporan' },
];

export interface EntriNav {
	url: string;
	label: string;
	penanda: '✅' | '🟡' | null;
}

export interface HasilHalaman {
	url: string;
	pathSetelahBase: string;
	judul: string;
	jumlah_kata: number;
	jumlah_gambar: number;
	modified: string | null;
	teksHash: string;
	tautanInternal: string[];
	tautanKeluar: { url: string; teks: string }[];
	embed: { url: string | null; docId: string | null; openUrl: string | null; aria: string | null }[];
}

export interface HasilCrawl {
	halaman: Map<string, HasilHalaman>;
	navMap: Map<string, EntriNav>;
	idDihapus: string[];
}

function normalisasiInternal(url: string, situs: Situs): string | null {
	let u = buangGoogleRedirect(url);
	try {
		const p = new URL(u);
		if (p.hostname !== 'sites.google.com') return null;
		if (!p.pathname.startsWith(`/view/${situs.nama}`)) return null;
		p.search = '';
		p.hash = '';
		let hasil = p.origin + p.pathname;
		if (hasil.endsWith('/')) hasil = hasil.slice(0, -1);
		return hasil;
	} catch {
		return null;
	}
}

export function idHalaman(sumber: 'A' | 'C', pathSetelahBase: string): string {
	const bersih = pathSetelahBase.replace(/^\/+|\/+$/g, '').replace(/\//g, '-') || 'beranda';
	return `${sumber}-${bersih}`;
}

export function stripPenanda(teks: string): { label: string; penanda: '✅' | '🟡' | null } {
	const m = teks.trim().match(/^([✅🟡])\s*(.*)$/u);
	if (m) return { label: m[2].trim(), penanda: m[1] as '✅' | '🟡' };
	return { label: teks.trim(), penanda: null };
}

function humanize(slug: string): string {
	return slug
		.split('-')
		.map((k) => k.charAt(0).toUpperCase() + k.slice(1))
		.join(' ');
}

export function jalurMenuDariPath(
	situs: Situs,
	pathSetelahBase: string,
	navMap: Map<string, EntriNav>,
): { jalur: string[]; penanda: '✅' | '🟡' | null } {
	const segmen = pathSetelahBase.split('/').filter(Boolean);
	const jalur: string[] = [];
	let penanda: '✅' | '🟡' | null = null;
	for (let i = 0; i < segmen.length; i++) {
		const prefiks = segmen.slice(0, i + 1).join('/');
		const nav = navMap.get(`${situs.base}/${prefiks}`);
		jalur.push(nav?.label ?? humanize(segmen[i]));
		if (i === segmen.length - 1) penanda = nav?.penanda ?? null;
	}
	return { jalur, penanda };
}

async function ekstrakHalaman(page: Page) {
	return page.evaluate(() => {
		const sections = [...document.querySelectorAll('section')].filter(
			(el) => !el.closest('header') && !el.closest('nav') && !el.closest('footer'),
		);
		let utama: Element | HTMLElement;
		if (sections.length > 0) {
			utama = document.createElement('div');
			for (const s of sections) utama.appendChild(s.cloneNode(true));
		} else {
			utama = (document.querySelector('[role="main"]') ?? document.body) as HTMLElement;
		}
		const htmlUtama = sections.length > 0
			? sections.map((s) => s.outerHTML).join('\n')
			: (utama as HTMLElement).innerHTML;
		const h1 =
			utama.querySelector('h1')?.textContent?.trim() ??
			document.querySelector('h1')?.textContent?.trim() ??
			'';
		const teks = ((utama as HTMLElement).innerText ?? '').replace(/\s+\n/g, '\n');
		const gambar = [...utama.querySelectorAll('img')].map((img) => ({
			src: (img as HTMLImageElement).src,
			alt: img.getAttribute('alt') ?? '',
		}));
		const tautan = [...document.querySelectorAll('a[href]')].map((a) => ({
			href: (a as HTMLAnchorElement).href,
			teks: (a.textContent ?? '').trim(),
			diNav: !!a.closest('nav'),
		}));
		const iframe = [...document.querySelectorAll('iframe')].map((f) => ({
			src: f.getAttribute('src'),
			dataSrc: f.getAttribute('data-src'),
			aria: f.getAttribute('aria-label'),
		}));
		const embed = [...document.querySelectorAll('[data-embed-doc-id],[data-embed-open-url]')].map((e) => ({
			docId: e.getAttribute('data-embed-doc-id'),
			openUrl: e.getAttribute('data-embed-open-url'),
			aria: e.getAttribute('aria-label'),
		}));
		const modified =
			document.querySelector('[data-last-updated-at-time]')?.getAttribute('data-last-updated-at-time') ?? null;
		return {
			h1,
			judulDok: document.title ?? '',
			teks,
			htmlUtama,
			fullHtml: document.documentElement.outerHTML,
			gambar,
			tautan,
			iframe,
			embed,
			modified,
		};
	});
}

function hashTeks(teks: string): string {
	let h = 0;
	const t = teks.replace(/\s+/g, ' ').trim();
	for (let i = 0; i < t.length; i++) {
		h = (Math.imul(h, 31) + t.charCodeAt(i)) >>> 0;
	}
	return `${t.length}:${h.toString(16)}`;
}

export interface OpsiCrawl {
	batas?: number;
	tanpaScreenshot?: boolean;
}

export async function crawlSitus(
	situs: Situs,
	opsi: OpsiCrawl,
	padaItem: (item: ItemManifest, hasil: HasilHalaman) => void | Promise<void>,
): Promise<HasilCrawl> {
	const dirRaw = path.resolve(process.cwd(), 'sources/raw/gsites', situs.nama);
	fs.mkdirSync(dirRaw, { recursive: true });

	async function buatHalaman(): Promise<Page> {
		const b = await chromium.launch({ headless: true });
		const k = await b.newContext({
			userAgent:
				'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
		});
		return k.newPage();
	}
	let page = await buatHalaman();

	const halaman = new Map<string, HasilHalaman>();
	const navMap = new Map<string, EntriNav>();
	const hashKeId = new Map<string, string>();
	const idDihapus: string[] = [];
	const antrean: string[] = [situs.base];
	const terlihat = new Set<string>();

	while (antrean.length > 0 && halaman.size < (opsi.batas ?? 1000)) {
		const url = antrean.shift()!;
		if (terlihat.has(url)) continue;
		terlihat.add(url);

		await acakJeda();
		let data: Awaited<ReturnType<typeof ekstrakHalaman>> | null = null;
		let errorTerakhir: unknown = null;
		for (let coba = 0; coba < 3 && data === null; coba++) {
			try {
				try {
					await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
				} catch {
					await page.goto(url, { waitUntil: 'load', timeout: 30000 });
				}
				data = await ekstrakHalaman(page);
			} catch (e) {
				errorTerakhir = e;
				if (/closed|crash|disposed/i.test(String(e))) {
					try {
						await page.context().browser()?.close();
					} catch {}
					page = await buatHalaman();
				}
				await acakJeda();
			}
		}
		if (data === null) {
			await padaItem(
				itemBaru({
					id: `${situs.sumber}-gagal-${terlihat.size}`,
					sumber: situs.sumber,
					jenis: 'google-sites',
					url,
					status: 'gagal',
					catatan: `gagal memuat: ${String(errorTerakhir).slice(0, 120)}`,
				}),
				{} as HasilHalaman,
			);
			continue;
		}

		for (const frame of page.frames()) {
			if (frame === page.mainFrame()) continue;
			const furl = frame.url();
			if (furl && !data.iframe.some((f) => f.src === furl || f.dataSrc === furl)) {
				data.iframe.push({ src: furl, dataSrc: null, aria: null });
			}
		}

		const urlPage = page.url().split(/[?#]/)[0].replace(/\/$/, '');
		const pathSetelahBase = urlPage.slice(situs.base.length).replace(/^\//, '');
		const id = idHalaman(situs.sumber, pathSetelahBase);

		for (const t of data.tautan) {
			if (!t.diNav) continue;
			const internal = normalisasiInternal(t.href, situs);
			if (!internal) continue;
			const { label, penanda } = stripPenanda(t.teks);
			const lama = navMap.get(internal);
			if (!lama || (!lama.penanda && penanda)) {
				navMap.set(internal, { url: internal, label, penanda });
			}
		}

		const tautanInternal = new Set<string>();
		const tautanKeluar: { url: string; teks: string }[] = [];
		for (const t of data.tautan) {
			const internal = normalisasiInternal(t.href, situs);
			if (internal) {
				tautanInternal.add(internal);
				if (!terlihat.has(internal) && !antrean.includes(internal)) {
					antrean.push(internal);
				}
			} else {
				tautanKeluar.push({ url: buangGoogleRedirect(t.href), teks: t.teks });
			}
		}

		let judul =
			data.h1 ||
			data.judulDok.replace(new RegExp(`\\s*[-–—:]?\\s*${situs.nama}\\s*$`, 'i'), '').trim();
		judul = stripPenanda(judul).label;

		const teksHash = hashTeks(data.teks);
		const lainnya = data.teks.trim().length < 100 ? undefined : hashKeId.get(teksHash);
		if (lainnya === undefined) {
			if (data.teks.trim().length >= 100) hashKeId.set(teksHash, id);
		} else if (lainnya !== id) {
			if (pathSetelahBase === '') {
				idDihapus.push(id);
			} else if (lainnya.endsWith('-beranda')) {
				idDihapus.push(lainnya);
			}
		}

		const { jalur, penanda } = jalurMenuDariPath(situs, pathSetelahBase, navMap);
		const jumlahKata = data.teks.split(/\s+/).filter(Boolean).length;

		const namaBerkas = pathSetelahBase.replace(/\//g, '_') || 'beranda';
		const jalurHtml = path.join(dirRaw, `${namaBerkas}.html`);
		fs.writeFileSync(jalurHtml, data.htmlUtama);
		fs.writeFileSync(path.join(dirRaw, `${namaBerkas}.full.html`), data.fullHtml);
		fs.writeFileSync(
			path.join(dirRaw, `${namaBerkas}.json`),
			JSON.stringify(
				{ url: urlPage, teks: data.teks, gambar: data.gambar, tautan: data.tautan, embed: data.embed, iframe: data.iframe },
				null,
				1,
			),
		);
		const jalurPng = path.join(dirRaw, `${namaBerkas}.png`);
		if (!opsi.tanpaScreenshot && !fs.existsSync(jalurPng)) {
			await page.screenshot({ path: jalurPng, fullPage: true }).catch(() => {});
		}

		const target = petakanTarget(situs.sumber, pathSetelahBase);
		const embed = data.iframe
			.map((f) => ({ url: f.dataSrc ?? f.src, docId: null, openUrl: null, aria: f.aria }))
			.concat(data.embed.map((e) => ({ url: null, docId: e.docId, openUrl: e.openUrl, aria: e.aria })));

		const hasilHalaman: HasilHalaman = {
			url: urlPage,
			pathSetelahBase,
			judul,
			jumlah_kata: jumlahKata,
			jumlah_gambar: data.gambar.length,
			modified: data.modified ? new Date(Number(data.modified)).toISOString() : null,
			teksHash,
			tautanInternal: [...tautanInternal],
			tautanKeluar,
			embed,
		};
		halaman.set(url, hasilHalaman);

		await padaItem(
			itemBaru({
				id,
				sumber: situs.sumber,
				jenis: 'google-sites',
				url: urlPage,
				judul,
				jalur_menu: jalur,
				penanda_sumber: penanda,
				modified: hasilHalaman.modified,
				file_lokal: path.relative(process.cwd(), jalurHtml),
				jumlah_kata: jumlahKata,
				jumlah_gambar: data.gambar.length,
				target_modul: target.target_modul,
				target_path: target.target_path,
				target_peran: target.target_peran,
				catatan: target.catatan ?? '',
			}),
			hasilHalaman,
		);
	}

	try {
		await page.context().browser()?.close();
	} catch {}
	return { halaman, navMap, idDihapus };
}
