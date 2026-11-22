import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import type http from 'node:http';
import { buatServer } from './server.ts';

let server: http.Server | undefined;
let BASE_URL = process.env.E2E_BASE_URL ?? '';
if (!BASE_URL) {
	({ server, url: BASE_URL } = await buatServer());
}

const browser = await chromium.launch();
try {
	const konteks = await browser.newContext({ viewport: { width: 1280, height: 900 } });
	const page = await konteks.newPage();
	const respons = await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
	assert.ok(respons?.ok(), `membuka / gagal: ${respons?.status()}`);

	const sidebar = page.locator('#starlight__sidebar');
	await sidebar.waitFor({ state: 'visible' });
	console.log('OK sidebar terlihat di beranda');

	const grupModul = page.locator('ul.top-level > li > details > ul > li > details');
	const jumlahModul = await grupModul.count();
	assert.ok(jumlahModul >= 5, `grup modul harus ≥ 5, dapat ${jumlahModul}`);
	for (let i = 0; i < jumlahModul; i++) {
		assert.ok(await grupModul.nth(i).evaluate((el) => el.open), `grup modul ${i} harus open`);
	}
	console.log('OK', jumlahModul, 'grup modul terbuka');

	const dalam = page.locator('ul.top-level > li > details > ul > li > details details');
	const jumlahDalam = await dalam.count();
	for (let i = 0; i < jumlahDalam; i++) {
		assert.equal(await dalam.nth(i).evaluate((el) => el.open), false, `details dalam ${i} tidak boleh open`);
	}
	console.log('OK', jumlahDalam, 'grup di bawah modul tetap terlipat');

	await page.locator('sakti-cari input[type="search"]').waitFor({ state: 'visible' });
	await page.locator('h1').waitFor({ state: 'visible' });
	assert.equal(await page.locator('starlight-toc, .right-sidebar').count(), 0, 'tidak boleh ada TOC kanan');
	console.log('OK BigSearch + h1 terlihat, tidak ada TOC kanan');

	// Halaman artikel: sidebar kembali ke perilaku biasa.
	const daftarHref = await page
		.locator('#starlight__sidebar a[href^="/komitmen/ruh/"]')
		.evaluateAll((els) => els.map((el) => el.getAttribute('href')));
	const href = daftarHref.find((h) => h && h !== '/komitmen/ruh/');
	assert.ok(href, 'harus ada tautan artikel di komitmen/ruh');
	await page.goto(`${BASE_URL}${href}`, { waitUntil: 'networkidle' });
	const modulOpen = page.locator('ul.top-level > li > details > ul > li > details[open]');
	assert.equal(await modulOpen.count(), 1, 'tepat 1 grup modul terbuka di artikel');
	assert.ok(
		(await modulOpen.locator('a[aria-current="page"]').count()) === 1,
		'grup terbuka harus memuat halaman aktif',
	);
	console.log('OK artikel', href, ': hanya modul aktif yang terbuka');
	await konteks.close();

	// Viewport HP.
	const hp = await browser.newContext({ viewport: { width: 360, height: 800 } });
	const pageHp = await hp.newPage();
	await pageHp.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
	const lebar = () => pageHp.evaluate(() => document.documentElement.scrollWidth);
	assert.ok((await lebar()) <= 360, `scrollWidth ${await lebar()} > 360`);
	const tombolMenu = pageHp.locator('button.sl-menu-button');
	await tombolMenu.waitFor({ state: 'visible' });
	await tombolMenu.click();
	await pageHp.locator('#starlight__sidebar').waitFor({ state: 'visible' });
	assert.ok((await lebar()) <= 360, `scrollWidth setelah menu ${await lebar()} > 360`);
	console.log('OK menu HP terbuka tanpa scroll horizontal');
	await pageHp.locator('button.sl-menu-button').click();
	const inputHp = pageHp.locator('sakti-cari input[type="search"]');
	await inputHp.waitFor({ state: 'visible' });
	await inputHp.fill('kontrak');
	await pageHp.locator('sakti-cari .panel-cari').waitFor({ state: 'visible' });
	assert.ok((await lebar()) <= 360, `scrollWidth setelah cari ${await lebar()} > 360`);
	console.log('OK BigSearch HP terbuka tanpa scroll horizontal');
	await hp.close();

	console.log('e2e beranda: semua pemeriksaan lolos');
} finally {
	await browser.close();
	server?.close();
}
