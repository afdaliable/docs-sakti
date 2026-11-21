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

export interface HasilHalaman {
	url: string;
	pathSetelahBase: string;
	judul: string;
	judulNav: string;
	jumlah_kata: number;
	jumlah_gambar: number;
	modified: string | null;
	tautanInternal: string[];
	tautanKeluar: { url: string; teks: string }[];
	embed: { url: string | null; docId: string | null; openUrl: string | null; aria: string | null }[];
	htmlUtama: string;
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

function stripPenanda(teks: string): { label: string; penanda: '✅' | '🟡' | null } {
	const m = teks.trim().match(/^([✅🟡])\s*(.*)$/);
	if (m) return { label: m[2].trim(), penanda: m[1] as '✅' | '🟡' };
	return { label: teks.trim(), penanda: null };
}

async function ekstrakHalaman(page: Page, situs: Situs, tanpaScreenshot: boolean, dirRaw: string) {
	await page.waitForSelector('[role="main"]', { timeout: 20000 }).catch(() => {});

	const data = await page.evaluate(() => {
		const utama = document.querySelector('[role="main"]') ?? document.body;
		const h1 = utama.querySelector('h1')?.textContent?.trim() ?? '';
		const judulDok = document.title ?? '';
		const teks = (utama as HTMLElement).innerText ?? '';
		const gambar = [...utama.querySelectorAll('img')].map((img) => ({
			src: img.src,
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
			judulDok,
			teks,
			htmlUtama: utama.innerHTML,
			gambar,
			tautan,
			iframe,
			embed,
			modified,
		};
	});

	// URL iframe yang dimuat lazy juga terlihat di page.frames().
	for (const frame of page.frames()) {
		if (frame === page.mainFrame()) continue;
		const url = frame.url();
		if (url && !data.iframe.some((f) => f.src === url || f.dataSrc === url)) {
			data.iframe.push({ src: url, dataSrc: null, aria: null });
		}
	}

	const urlPage = page.url().split(/[?#]/)[0].replace(/\/$/, '');
	const pathSetelahBase = urlPage.slice(situs.base.length).replace(/^\//, '');

	return { data, urlPage, pathSetelahBase };
}

export interface OpsiCrawl {
	batas?: number;
	tanpaScreenshot?: boolean;
	hanyaUrl?: Set<string>;
}

export async function crawlSitus(
	situs: Situs,
	opsi: OpsiCrawl,
	padaItem: (item: ItemManifest, hasil: HasilHalaman) => void | Promise<void>,
): Promise<Map<string, HasilHalaman>> {
	const dirRaw = path.resolve(process.cwd(), 'sources/raw/gsites', situs.nama);
	fs.mkdirSync(dirRaw, { recursive: true });

	const browser = await chromium.launch({ headless: true });
	const konteks = await browser.newContext({
		userAgent:
			'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
	});
	const page = await konteks.newPage();

	const hasil = new Map<string, HasilHalaman>();
	const antrean: string[] = [situs.base];
	const terlihat = new Set<string>();
	const penandaPerUrl = new Map<string, '✅' | '🟡' | null>();
	const jalurPerUrl = new Map<string, string[]>();

	while (antrean.length > 0 && hasil.size < (opsi.batas ?? 1000)) {
		const url = antrean.shift()!;
		const kunci = url.replace(/\/$/, '');
		if (terlihat.has(kunci)) continue;
		terlihat.add(kunci);

		await acakJeda();
		try {
			try {
				await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
			} catch {
				await page.goto(url, { waitUntil: 'load', timeout: 30000 });
			}
		} catch (e) {
			await padaItem(
				itemBaru({
					id: `${situs.sumber}-gagal-${terlihat.size}`,
					sumber: situs.sumber,
					jenis: 'google-sites',
					url,
					status: 'gagal',
					catatan: `gagal memuat: ${String(e).slice(0, 120)}`,
				}),
				{} as HasilHalaman,
			);
			continue;
		}

		const { data, urlPage, pathSetelahBase } = await ekstrakHalaman(page, situs, !!opsi.tanpaScreenshot, dirRaw);
		const id = idHalaman(situs.sumber, pathSetelahBase);

		const tautanInternal = new Set<string>();
		const tautanKeluar: { url: string; teks: string }[] = [];
		for (const t of data.tautan) {
			const internal = normalisasiInternal(t.href, situs);
			if (internal) {
				tautanInternal.add(internal);
				const pathBaru = internal.slice(situs.base.length).replace(/^\//, '');
				if (!terlihat.has(internal.replace(/\/$/, '')) && !antrean.includes(internal)) {
					antrean.push(internal);
				}
				if (t.diNav && t.teks) {
					const { label, penanda } = stripPenanda(t.teks);
					if (penanda && !penandaPerUrl.has(internal)) penandaPerUrl.set(internal, penanda);
					if (label && !jalurPerUrl.has(internal)) {
						const jalurInduk = jalurPerUrl.get(urlPage) ?? [];
						if (!jalurInduk.includes(label)) {
							jalurPerUrl.set(internal, [...jalurInduk, label]);
						}
					}
				}
			} else {
				tautanKeluar.push({ url: buangGoogleRedirect(t.href), teks: t.teks });
			}
		}

		const judulNav = (() => {
			const j = jalurPerUrl.get(urlPage);
			return j?.[j.length - 1] ?? '';
		})();
		let judul = data.h1 || data.judulDok.replace(new RegExp(`^${situs.nama}\\s*[-–—:]?\\s*`, 'i'), '').trim() || judulNav;
		const { label: judulBersih, penanda } = stripPenanda(judul);
		judul = judulBersih;

		const jalurMenu = jalurPerUrl.get(urlPage) ?? (judul ? [judul] : []);
		const jumlahKata = data.teks.split(/\s+/).filter(Boolean).length;

		const namaBerkas = pathSetelahBase.replace(/\//g, '_') || 'beranda';
		const jalurHtml = path.join(dirRaw, `${namaBerkas}.html`);
		fs.writeFileSync(jalurHtml, data.htmlUtama);
		const jalurJson = path.join(dirRaw, `${namaBerkas}.json`);
		fs.writeFileSync(
			jalurJson,
			JSON.stringify(
				{ url: urlPage, teks: data.teks, gambar: data.gambar, tautan: data.tautan, embed: data.embed, iframe: data.iframe },
				null,
				1,
			),
		);
		if (!opsi.tanpaScreenshot) {
			await page.screenshot({ path: path.join(dirRaw, `${namaBerkas}.png`), fullPage: true }).catch(() => {});
		}

		const target = petakanTarget(situs.sumber, pathSetelahBase);
		const embed = data.iframe
			.map((f) => ({ url: f.dataSrc ?? f.src, docId: null, openUrl: null, aria: f.aria }))
			.concat(data.embed.map((e) => ({ url: null, docId: e.docId, openUrl: e.openUrl, aria: e.aria })));

		const hasilHalaman: HasilHalaman = {
			url: urlPage,
			pathSetelahBase,
			judul,
			judulNav,
			jumlah_kata: jumlahKata,
			jumlah_gambar: data.gambar.length,
			modified: data.modified ? new Date(Number(data.modified)).toISOString() : null,
			tautanInternal: [...tautanInternal],
			tautanKeluar,
			embed,
			htmlUtama: data.htmlUtama,
		};
		hasil.set(kunci, hasilHalaman);

		await padaItem(
			itemBaru({
				id,
				sumber: situs.sumber,
				jenis: 'google-sites',
				url: urlPage,
				judul,
				jalur_menu: jalurMenu,
				penanda_sumber: penandaPerUrl.get(urlPage) ?? penanda,
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

	await browser.close();
	return hasil;
}
