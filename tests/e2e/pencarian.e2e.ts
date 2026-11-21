import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const MIME: Record<string, string> = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.mjs': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.xml': 'application/xml; charset=utf-8',
	'.txt': 'text/plain; charset=utf-8',
	'.wasm': 'application/wasm',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.webp': 'image/webp',
	'.ico': 'image/x-icon',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
};

function buatServer(): Promise<{ server: http.Server; url: string }> {
	const root = path.resolve(process.cwd(), 'dist');
	if (!fs.existsSync(path.join(root, 'pagefind', 'pagefind.js'))) {
		console.error('Jalankan pnpm build dulu.');
		process.exit(1);
	}
	const server = http.createServer((req, res) => {
		const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
		let berkas = path.join(root, pathname);
		if (!berkas.startsWith(root + path.sep)) {
			res.writeHead(403).end();
			return;
		}
		if (fs.existsSync(berkas) && fs.statSync(berkas).isDirectory()) {
			berkas = path.join(berkas, 'index.html');
		}
		if (!fs.existsSync(berkas) || !fs.statSync(berkas).isFile()) {
			res.writeHead(404).end('404');
			return;
		}
		res.writeHead(200, {
			'content-type': MIME[path.extname(berkas)] ?? 'application/octet-stream',
		});
		fs.createReadStream(berkas).pipe(res);
	});
	return new Promise((resolve) => {
		server.listen(0, '127.0.0.1', () => {
			const { port } = server.address() as { port: number };
			resolve({ server, url: `http://127.0.0.1:${port}` });
		});
	});
}

let server: http.Server | undefined;
let BASE_URL = process.env.E2E_BASE_URL ?? '';
if (!BASE_URL) {
	({ server, url: BASE_URL } = await buatServer());
}

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
	server?.close();
}
