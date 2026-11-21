import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:4321';

const browser = await chromium.launch();
try {
	const page = await browser.newPage();
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

	console.log('e2e pencarian: semua pemeriksaan lolos');
} finally {
	await browser.close();
}
