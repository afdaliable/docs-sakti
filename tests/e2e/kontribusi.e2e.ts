import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import type http from 'node:http';
import { buatServer } from './server.ts';
import { pantauCsp, pastikanCspAktif } from './csp.ts';
import { REPO_URL } from '../../src/lib/situs.ts';

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

const browser = await chromium.launch();
try {
	const konteks = await browser.newContext();
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
	if (!process.env.E2E_BASE_URL) pastikanCspAktif(respons);
	const lapor = page.locator('.aksi-halaman[data-posisi="bawah"] a.lapor-kesalahan');
	await lapor.waitFor({ state: 'visible' });
	const href = new URL((await lapor.getAttribute('href'))!);
	assert.ok(href.href.startsWith(`${REPO_URL}/issues/new?`), 'href lapor-kesalahan');
	assert.equal(href.searchParams.get('template'), 'koreksi-konten.yml');
	const h1 = (await page.locator('h1').first().textContent())!.trim();
	assert.equal(href.searchParams.get('title'), `[Koreksi] ${h1}`);
	assert.ok(
		(href.searchParams.get('url') ?? '').endsWith(ARTIKEL),
		`param url tidak berakhiran ${ARTIKEL}`,
	);
	console.log('OK lapor-kesalahan mengarah ke formulir koreksi dengan judul + URL artikel');

	await page.goto(`${BASE_URL}/komitmen/`, { waitUntil: 'networkidle' });
	assert.equal(await page.locator('a.lapor-kesalahan').count(), 0, 'indeks modul tanpa tautan lapor');
	console.log('OK halaman indeks tidak menampilkan lapor-kesalahan');

	await page.setViewportSize({ width: 360, height: 740 });
	await page.goto(`${BASE_URL}${ARTIKEL}`, { waitUntil: 'networkidle' });
	assert.ok(
		(await page.evaluate(() => document.documentElement.scrollWidth)) <=
			(await page.evaluate(() => document.documentElement.clientWidth)),
		'tautan lapor-kesalahan meluber di 360px',
	);
	console.log('OK tidak ada scroll horizontal di 360px');

	await page.setViewportSize({ width: 1280, height: 900 });
	await page.goto(`${BASE_URL}/cari/?q=zzqqxx`, { waitUntil: 'networkidle' });
	await page.locator('.halaman-cari[data-keadaan="selesai"]').waitFor();
	const usulan = new URL((await page.locator('#usulkan-artikel').getAttribute('href'))!);
	assert.equal(usulan.searchParams.get('template'), 'usulan-artikel.yml');
	assert.equal(usulan.searchParams.get('kueri'), 'zzqqxx');
	console.log('OK usulkan-artikel mengarah ke formulir usulan dengan kueri');

	await page.goto(`${BASE_URL}${ARTIKEL}`, { waitUntil: 'networkidle' });
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
	const lapor2 = page.locator('.aksi-halaman[data-posisi="bawah"] a.lapor-kesalahan');
	await lapor2.waitFor();
	const href2 = new URL((await lapor2.getAttribute('href'))!);
	assert.ok(
		(href2.searchParams.get('url') ?? '').endsWith(tujuan),
		`param url tidak mengikuti halaman baru: ${href2.searchParams.get('url')} vs ${tujuan}`,
	);
	console.log('OK lapor-kesalahan mengikuti navigasi tanpa muat ulang:', tujuan);

	assert.deepEqual(galat, [], `galat konsol/halaman: ${JSON.stringify(galat)}`);
	assert.deepEqual(pelanggaran, [], `pelanggaran CSP: ${JSON.stringify(pelanggaran)}`);
	console.log('e2e kontribusi: semua pemeriksaan lolos');
} finally {
	await browser.close();
	server?.close();
}
