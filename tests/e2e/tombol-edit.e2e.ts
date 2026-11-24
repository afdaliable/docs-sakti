import { chromium, type Browser, type Page } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type http from 'node:http';
import { parse } from 'yaml';
import { buatServer } from './server.ts';
import { pantauCsp, pastikanCspAktif } from './csp.ts';
import { AWALAN_EDIT, LABEL_EDIT, REPO_URL } from '../../src/lib/situs.ts';
import { sumberHalaman } from '../../scripts/tombol-edit.ts';
import { muatKonfigurasi } from '../../src/lib/modul.ts';

declare global {
	interface Window {
		__muat?: number;
	}
}

let server: http.Server | undefined;
let BASE_URL = process.env.E2E_BASE_URL ?? '';
if (!BASE_URL) {
	({ server, url: BASE_URL } = await buatServer());
}

const ARTIKEL = '/komitmen/ruh/pencatatan-kontrak/kontrak-tahunan/';
const MODUL = '/komitmen/';

function frontmatter(isi: string): Record<string, unknown> {
	const cocok = isi.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	return cocok ? (parse(cocok[1]) ?? {}) : {};
}

function* semuaBerkas(dir: string): Generator<string> {
	for (const entri of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
		a.name.localeCompare(b.name),
	)) {
		const p = path.join(dir, entri.name);
		if (entri.isDirectory()) yield* semuaBerkas(p);
		else if (/\.(md|mdx)$/.test(entri.name)) yield p;
	}
}

interface Sampel {
	url: string;
	sumber: string;
	artikel: boolean;
}

const sampel: Sampel[] = [];
for (const entri of fs
	.readdirSync('src/content/docs', { withFileTypes: true })
	.filter((e) => e.isDirectory())
	.sort((a, b) => a.name.localeCompare(b.name))) {
	const folder = entri.name;
	const indeks = sumberHalaman(folder);
	if (indeks.length === 1) {
		sampel.push({ url: `/${folder}/`, sumber: indeks[0], artikel: false });
	}
	for (const f of semuaBerkas(path.join('src/content/docs', folder))) {
		const fm = frontmatter(fs.readFileSync(f, 'utf8'));
		if (fm.jenis === 'indeks' || fm.draft === true || fm.status === 'draft') continue;
		sampel.push({ url: `/${ruteDari(f)}/`, sumber: f, artikel: true });
		break;
	}
}

function ruteDari(berkas: string): string {
	return berkas
		.replace(/^src\/content\/docs\//, '')
		.replace(/\.(md|mdx)$/, '')
		.replace(/(^|\/)index$/, '');
}

// Kontras WCAG dari warna hasil komputasi (sama seperti dropdown.e2e.ts).
const UKUR_KONTRAS = String.raw`(() => {
	const angka = (s) => {
		if (!/^rgba?\(/.test(s)) throw new Error('format warna tidak dikenal: ' + s);
		return s.match(/[\d.]+/g).map(Number);
	};
	const lum = (c) => {
		const f = (v) => {
			v /= 255;
			return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
		};
		return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
	};
	const latar = (el) => {
		for (let e = el; e; e = e.parentElement) {
			const c = angka(getComputedStyle(e).backgroundColor);
			const alfa = c.length > 3 ? c[3] : 1;
			if (alfa === 0) continue;
			if (alfa < 1) throw new Error('latar semi-transparan pada <' + e.tagName + '>');
			return c;
		}
		throw new Error('latar tidak ditemukan');
	};
	return [...document.querySelectorAll('.aksi-halaman a')].map((a) => {
		const w = angka(getComputedStyle(a).color);
		const t = lum(w);
		const b = lum(latar(a));
		return Math.round(((Math.max(t, b) + 0.05) / (Math.min(t, b) + 0.05)) * 100) / 100;
	});
})()`;

async function periksaHalaman(page: Page, s: Sampel) {
	const label = `${s.url} (${s.sumber})`;
	const harapan = `${AWALAN_EDIT}${s.sumber}`;
	assert.ok(fs.existsSync(s.sumber), `sumber tidak ada: ${s.sumber}`);
	for (const posisi of ['atas', 'bawah']) {
		const wadah = page.locator(`.aksi-halaman[data-posisi="${posisi}"]`);
		await wadah.waitFor({ state: 'visible' });
		const edit = wadah.locator('a[data-aksi="edit"]');
		assert.equal(await edit.count(), 1, `${label}: tombol edit ${posisi} bukan satu`);
		assert.ok(await edit.isVisible(), `${label}: tombol edit ${posisi} tidak terlihat`);
		assert.equal(
			(await edit.textContent())!.trim(),
			LABEL_EDIT,
			`${label}: label tombol edit ${posisi}`,
		);
		assert.equal(await edit.locator('svg').count() > 0, true, `${label}: tanpa ikon ${posisi}`);
		assert.equal(await edit.getAttribute('href'), harapan, `${label}: href ${posisi}`);
	}
	assert.equal(
		await page.locator(`a[href^="${REPO_URL}/edit/"]`).count(),
		2,
		`${label}: jumlah tautan edit di halaman bukan 2`,
	);
	const lapor = page.locator('a[data-aksi="lapor"]');
	assert.equal(
		await lapor.count(),
		s.artikel ? 2 : 0,
		`${label}: jumlah tautan lapor salah`,
	);
	if (s.artikel) {
		const kotakEdit = await page
			.locator('.aksi-halaman[data-posisi="atas"] a[data-aksi="edit"]')
			.boundingBox();
		const kotakLapor = await page
			.locator('.aksi-halaman[data-posisi="atas"] a[data-aksi="lapor"]')
			.boundingBox();
		assert.ok(
			Math.abs(kotakEdit!.y - kotakLapor!.y) <= 1,
			`${label}: tombol lapor tidak sebaris dengan edit`,
		);
	}
	const kotakAtas = await page.locator('.aksi-halaman[data-posisi="atas"]').boundingBox();
	const kotakH1 = await page.locator('h1').first().boundingBox();
	const kotakKonten = await page.locator('.sl-markdown-content').first().boundingBox();
	assert.ok(
		kotakAtas!.y >= kotakH1!.y + kotakH1!.height,
		`${label}: baris aksi tidak di bawah h1`,
	);
	assert.ok(
		kotakAtas!.y - (kotakH1!.y + kotakH1!.height) < 120,
		`${label}: baris aksi terlalu jauh dari h1`,
	);
	assert.ok(
		kotakAtas!.y < kotakKonten!.y,
		`${label}: baris aksi tidak di atas konten`,
	);
}

async function periksaBukanKonten(page: Page, url: string) {
	await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle' });
	assert.equal(
		await page.locator('.aksi-halaman').count(),
		0,
		`${url}: ada .aksi-halaman`,
	);
	assert.equal(
		await page.locator(`a[href^="${REPO_URL}/edit/"]`).count(),
		0,
		`${url}: ada tautan edit`,
	);
}

const browser: Browser = await chromium.launch();
try {
	const konteks = await browser.newContext({ viewport: { width: 1280, height: 900 } });
	const pelanggaran = await pantauCsp(konteks);
	await konteks.addInitScript(`window.__muat = 0;
document.addEventListener('astro:page-load', () => {
	window.__muat = (window.__muat ?? 0) + 1;
});`);
	const page = await konteks.newPage();
	const galat: string[] = [];
	page.on('pageerror', (e) => galat.push(`pageerror: ${e.message}`));
	page.on('console', (m) => {
		if (m.type() === 'error') galat.push(`console.error: ${m.text()}`);
	});

	const respons = await page.goto(`${BASE_URL}${ARTIKEL}`, { waitUntil: 'networkidle' });
	assert.ok(respons?.ok(), `membuka ${ARTIKEL} gagal: ${respons?.status()}`);
	if (!process.env.E2E_BASE_URL) pastikanCspAktif(respons);

	assert.ok(sampel.length > 0, 'tidak ada sampel halaman');
	for (const s of sampel) {
		await page.goto(`${BASE_URL}${s.url}`, { waitUntil: 'networkidle' });
		await periksaHalaman(page, s);
	}
	console.log(`OK ${sampel.length} halaman sampel: tombol edit atas+bawah, href, label, ikon`);

	const peranPertama = muatKonfigurasi().peran[0].slug;
	for (const url of ['/', '/cari/', `/peran/${peranPertama}/`, '/404.html']) {
		await periksaBukanKonten(page, url);
	}
	console.log('OK /, /cari/, /peran/<slug>/, dan 404 tanpa tautan edit');

	for (const tema of ['light', 'dark'] as const) {
		const konteksTema = await browser.newContext({
			viewport: { width: 1280, height: 900 },
			colorScheme: tema,
		});
		await konteksTema.addInitScript(
			(t) => localStorage.setItem('starlight-theme', t),
			tema,
		);
		const pageTema = await konteksTema.newPage();
		for (const url of [ARTIKEL, MODUL]) {
			await pageTema.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle' });
			await pageTema.locator('.aksi-halaman a').first().waitFor({ state: 'visible' });
			assert.equal(
				await pageTema.evaluate(() => document.documentElement.dataset.theme),
				tema,
			);
			const kontras: number[] = await pageTema.evaluate(UKUR_KONTRAS);
			assert.ok(kontras.length > 0, `${tema} ${url}: tidak ada tautan aksi`);
			for (const k of kontras) {
				assert.ok(k >= 4.5, `${tema} ${url}: kontras ${k} < 4.5`);
			}
			console.log(`OK kontras ${tema} ${url}: ${kontras.join(', ')}`);
		}
		await konteksTema.close();
	}

	const konteksSeluler = await browser.newContext({
		viewport: { width: 360, height: 740 },
	});
	const pageSeluler = await konteksSeluler.newPage();
	for (const url of [ARTIKEL, MODUL]) {
		await pageSeluler.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle' });
		assert.ok(
			(await pageSeluler.evaluate(() => document.documentElement.scrollWidth)) <=
				(await pageSeluler.evaluate(() => document.documentElement.clientWidth)),
			`${url}: scroll horizontal di 360px`,
		);
		const kotak = await pageSeluler.locator('.aksi-halaman a').all();
		for (const a of kotak) {
			const b = await a.boundingBox();
			assert.ok(b!.x >= 0 && b!.x + b!.width <= 360, `${url}: tautan meluber`);
			assert.ok(b!.height >= 24, `${url}: tinggi tautan ${b!.height} < 24px`);
		}
	}
	console.log('OK tata letak 360px: tanpa scroll, tautan dalam viewport, tinggi >= 24px');
	await konteksSeluler.close();

	await page.goto(`${BASE_URL}${ARTIKEL}`, { waitUntil: 'networkidle' });
	await page.emulateMedia({ media: 'print' });
	assert.equal(
		await page.evaluate(
			() =>
				[...document.querySelectorAll('.aksi-halaman')].filter(
					(el) => el.getClientRects().length > 0,
				).length,
		),
		0,
		'aksi-halaman masih tampak saat cetak',
	);
	await page.emulateMedia({ media: 'screen' });
	console.log('OK aksi-halaman tersembunyi saat cetak');

	const muat0 = await page.evaluate(() => window.__muat ?? 0);
	const tujuan = await page.evaluate(() => {
		const a = [...document.querySelectorAll('#starlight__sidebar a[href^="/komitmen/"]')].find(
			(el) =>
				el.getAttribute('aria-current') !== 'page' &&
				(el.getAttribute('href') ?? '').split('/').filter(Boolean).length >= 4,
		);
		return a?.getAttribute('href') ?? null;
	});
	assert.ok(tujuan, 'tidak ada tautan artikel sidebar lain untuk diklik');
	await page.evaluate((h) => {
		const a = document.querySelector(`#starlight__sidebar a[href="${h}"]`);
		for (let d = a?.closest('details'); d; d = d.parentElement?.closest('details') ?? null)
			d.open = true;
	}, tujuan);
	const tautanLain = page.locator(`#starlight__sidebar a[href="${tujuan}"]`);
	await tautanLain.scrollIntoViewIfNeeded();
	await tautanLain.click();
	await page.waitForFunction((n) => (window.__muat ?? 0) > n, muat0);
	const ruteTujuan = tujuan.replace(/^\//, '').replace(/\/$/, '');
	const sumberTujuan = sumberHalaman(ruteTujuan);
	assert.equal(sumberTujuan.length, 1, `sumber tidak tunggal untuk ${ruteTujuan}`);
	const editAtas = page.locator('.aksi-halaman[data-posisi="atas"] a[data-aksi="edit"]');
	await editAtas.waitFor();
	assert.equal(
		await editAtas.getAttribute('href'),
		`${AWALAN_EDIT}${sumberTujuan[0]}`,
		'href tombol edit tidak mengikuti halaman baru',
	);
	console.log('OK tombol edit mengikuti navigasi tanpa muat ulang:', tujuan);

	assert.deepEqual(galat, [], `galat konsol/halaman: ${JSON.stringify(galat)}`);
	assert.deepEqual(pelanggaran, [], `pelanggaran CSP: ${JSON.stringify(pelanggaran)}`);
	console.log('e2e tombol-edit: semua pemeriksaan lolos');
} finally {
	await browser.close();
	server?.close();
}
