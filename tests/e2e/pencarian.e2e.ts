import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import type http from 'node:http';
import { buatServer } from './server.ts';

let server: http.Server | undefined;
let BASE_URL = process.env.E2E_BASE_URL ?? '';
if (!BASE_URL) {
	({ server, url: BASE_URL } = await buatServer());
}

const galat: string[] = [];

const browser = await chromium.launch();
try {
	const page = await browser.newPage();
	page.on('pageerror', (e) => galat.push(`pageerror: ${e.message}`));
	page.on('console', (m) => {
		if (m.type() === 'error') galat.push(`console.error: ${m.text()}`);
	});
	const respons = await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
	assert.ok(respons?.ok(), `membuka / gagal: ${respons?.status()}`);

	const input = page.locator('sakti-cari input[type="search"]');
	await input.waitFor();
	await input.fill('kontrak');
	const panel = page.locator('sakti-cari .panel-cari');
	await panel.waitFor({ state: 'visible' });
	const opsi = panel.locator('li[role="option"]');
	await opsi.first().waitFor();
	assert.ok((await opsi.count()) >= 1, 'listbox harus berisi minimal 1 opsi');
	console.log('OK listbox muncul dengan', await opsi.count(), 'opsi');

	await input.press('ArrowDown');
	const aktif = await input.getAttribute('aria-activedescendant');
	assert.ok(aktif && aktif.length > 0, 'aria-activedescendant harus terisi');
	console.log('OK aria-activedescendant:', aktif);

	await input.press('Escape');
	await panel.waitFor({ state: 'hidden' });
	console.log('OK Escape menutup panel');

	await page.locator('body').click();
	await page.keyboard.press('/');
	await page.waitForTimeout(100);
	assert.equal(
		await page.evaluate(() => document.activeElement === document.querySelector('sakti-cari input')),
		true,
		'pintasan / harus memfokus input',
	);
	console.log('OK pintasan / memfokus input');

	await input.fill('kontrak');
	await opsi.first().waitFor();
	await input.press('ArrowDown');
	const urlTujuan = await opsi.first().locator('a').getAttribute('href');
	await input.press('Enter');
	await page.waitForURL(`${BASE_URL}${urlTujuan}`);
	console.log('OK Enter pada opsi aktif berpindah ke', urlTujuan);

	await page.goto(`${BASE_URL}/`);
	await input.fill('kontrak');
	await opsi.first().waitFor();
	await input.press('Enter');
	await page.waitForURL(/\/cari\/\?q=kontrak/);
	console.log('OK Enter tanpa opsi aktif menuju /cari/?q=kontrak');

	await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
	await input.fill('cara bikin kontrak tahunan sakti');
	await panel
		.locator('a[href="/komitmen/ruh/pencatatan-kontrak/kontrak-tahunan/"]')
		.first()
		.waitFor();
	console.log('OK Level 1: "cara bikin kontrak tahunan sakti" → kontrak-tahunan');

	await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
	await input.fill('adendum kontrak multi year gimana');
	await panel
		.locator('a[href="/komitmen/ruh/pencatatan-kontrak/addendum-kontrak-multi-year/"]')
		.first()
		.waitFor();
	console.log('OK Level 1: "adendum kontrak multi year gimana" → addendum-kontrak-multi-year');

	await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
	await input.fill('pasword');
	await panel
		.locator('a[href="/mulai/akses-aplikasi/ubah-kata-sandi/"]')
		.first()
		.waitFor();
	await page.waitForFunction(
		() =>
			(document.querySelector('sakti-cari [data-status]')?.textContent ?? '').includes(
				'Tidak ada hasil persis',
			),
	);
	console.log('OK Level 1: "pasword" → ubah-kata-sandi (hasil mirip)');

	await page.goto(`${BASE_URL}/cari/?q=pasword`, { waitUntil: 'networkidle' });
	const halamanCari = page.locator('.halaman-cari');
	await halamanCari.waitFor({ state: 'attached' });
	await page.locator('.halaman-cari[data-keadaan="selesai"]').waitFor();
	assert.equal(
		await halamanCari.getAttribute('data-jumlah-pagefind'),
		'0',
		'/cari/: data-jumlah-pagefind harus 0',
	);
	assert.ok(
		parseInt((await halamanCari.getAttribute('data-jumlah')) ?? '0', 10) > 0,
		'/cari/: data-jumlah harus > 0',
	);
	const hrefTiga = await page
		.locator('#daftar-hasil a.judul')
		.evaluateAll((els) => els.slice(0, 3).map((e) => e.getAttribute('href')));
	assert.ok(
		hrefTiga.includes('/mulai/akses-aplikasi/ubah-kata-sandi/'),
		`/cari/: ubah-kata-sandi harus di 3 hasil pertama: ${JSON.stringify(hrefTiga)}`,
	);
	assert.match(
		(await page.locator('#jumlah-hasil').textContent()) ?? '',
		/mirip/,
		'/cari/: #jumlah-hasil harus memuat "mirip"',
	);
	console.log('OK Level 1: /cari/?q=pasword menampilkan hasil mirip');

	await page.goto(`${BASE_URL}/cari/?q=pasword&modul=persediaan`, {
		waitUntil: 'networkidle',
	});
	await page.locator('.halaman-cari[data-keadaan="selesai"]').waitFor();
	const hrefLuar = await page
		.locator('#daftar-hasil a.judul')
		.evaluateAll((els) =>
			els
				.map((e) => e.getAttribute('href') ?? '')
				.filter((h) => h !== '' && !h.startsWith('/persediaan/')),
		);
	assert.deepEqual(hrefLuar, [], '/cari/: hasil di luar modul persediaan');
	console.log('OK Level 1: filter modul=persediaan tidak membocorkan modul lain');

	await page.goto(`${BASE_URL}/cari/?q=zzqqxx`, { waitUntil: 'networkidle' });
	await page.locator('.halaman-cari[data-keadaan="selesai"]').waitFor();
	await page.locator('#tanpa-hasil').waitFor({ state: 'visible' });
	console.log('OK Level 1: /cari/?q=zzqqxx menampilkan tanpa-hasil');

	assert.deepEqual(galat, [], `galat konsol/halaman: ${JSON.stringify(galat)}`);
	console.log('e2e pencarian: semua pemeriksaan lolos');
} finally {
	await browser.close();
	server?.close();
}
