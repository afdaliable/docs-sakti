import { chromium, type Browser, type Page } from 'playwright';
import assert from 'node:assert/strict';
import type http from 'node:http';
import { buatServer } from './server.ts';
import { pantauCsp, pastikanCspAktif } from './csp.ts';

declare global {
	interface Window {
		__penanda?: number;
		__muat?: number;
		__temaSwap: string[];
		__animasiVt: number[];
	}
}

const KATA_BANYAK = 'kontrak';

let server: http.Server | undefined;
let BASE_URL = process.env.E2E_BASE_URL ?? '';
if (!BASE_URL) {
	({ server, url: BASE_URL } = await buatServer());
}

const galat: string[] = [];
const daftarPelanggaran: string[][] = [];
function catatGalat(page: Page) {
	page.on('pageerror', (e) => galat.push(`pageerror: ${e.message}`));
	page.on('console', (m) => {
		if (m.type() === 'error') galat.push(`console.error: ${m.text()}`);
	});
}

const SKRIP_AWAL = `
	window.__muat = 0;
	window.__temaSwap = [];
	window.__animasiVt = [];
	document.addEventListener('astro:page-load', () => {
		window.__muat = (window.__muat ?? 0) + 1;
	});
	document.addEventListener('astro:after-swap', () => {
		window.__temaSwap.push(document.documentElement.dataset.theme);
	});
	document.addEventListener('astro:before-swap', (e) => {
		e.viewTransition.ready.then(() => {
			window.__animasiVt.push(
				document.getAnimations().filter((a) =>
					String(a.effect && a.effect.pseudoElement).startsWith('::view-transition'),
				).length,
			);
		}).catch(() => {});
	});
`;

async function buatKonteks(
	browser: Browser,
	opsi: Parameters<Browser['newContext']>[0],
	ekstraInit = '',
) {
	const konteks = await browser.newContext(opsi);
	daftarPelanggaran.push(await pantauCsp(konteks));
	await konteks.addInitScript(SKRIP_AWAL + ekstraInit);
	return konteks;
}

async function pindah(page: Page, aksi: () => Promise<unknown>) {
	const sebelum = await page.evaluate(() => window.__muat ?? 0);
	await aksi();
	await page.waitForFunction(
		(n) => (window.__muat ?? 0) > n,
		sebelum,
		{ timeout: 15000 },
	);
}

const browser = await chromium.launch();
try {
	// ---------- A. Desktop ----------
	const temaInit = `localStorage.setItem('starlight-theme', 'light');`;
	let konteks = await buatKonteks(browser, { viewport: { width: 1280, height: 900 } }, temaInit);
	const page = await konteks.newPage();
	catatGalat(page);

	const respons = await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
	assert.ok(respons?.ok(), `membuka / gagal: ${respons?.status()}`);
	if (!process.env.E2E_BASE_URL) pastikanCspAktif(respons);
	assert.equal(
		await page.evaluate(() => document.documentElement.dataset.theme),
		'light',
		'tema harus light dari localStorage',
	);
	await page.evaluate(() => (window.__penanda = 1));
	const sidebar = await page.locator('#starlight__sidebar').elementHandle();
	assert.ok(sidebar, 'panel sidebar harus ada');
	const h1Beranda = await page.locator('h1').first().textContent();
	const judulBeranda = await page.title();
	console.log('OK A.1 beranda dimuat, tema light');

	const utuh = async () => {
		const penanda = await page.evaluate(
			() => window.__penanda === 1,
		);
		const sama = await sidebar!.evaluate(
			(el) => el === document.querySelector('#starlight__sidebar') && el.isConnected,
		);
		return penanda && sama;
	};
	const scrollPanel = () =>
		page.evaluate(() => document.querySelector('#starlight__sidebar')?.scrollTop ?? -1);

	// A.2 klik tautan terakhir yang terlihat di sidebar
	const tautanSidebar = page.locator(
		'#starlight__sidebar sl-sidebar-state-persist a[href]:not([aria-current="page"])',
	);
	const href2 = await tautanSidebar.last().getAttribute('href');
	assert.ok(href2, 'harus ada tautan sidebar selain halaman aktif');
	await tautanSidebar.last().scrollIntoViewIfNeeded();
	await page.waitForTimeout(150);
	let scroll0 = await scrollPanel();
	if (scroll0 <= 0) {
		await page.setViewportSize({ width: 1280, height: 600 });
		await tautanSidebar.last().scrollIntoViewIfNeeded();
		await page.waitForTimeout(150);
		scroll0 = await scrollPanel();
		console.log('INFO viewport dipendekkan ke 1280x600 agar sidebar bisa digulir');
	}
	assert.ok(scroll0 > 0, `sidebar tidak bisa digulir (scrollTop=${scroll0})`);
	await pindah(page, () => tautanSidebar.last().click());
	assert.ok(await utuh(), 'A.2: dokumen/sidebar harus tetap (utuh)');
	assert.equal(new URL(page.url()).pathname, href2);
	assert.ok(Math.abs((await scrollPanel()) - scroll0) <= 1, 'A.2: posisi gulir sidebar berubah');
	const aktif2 = await page
		.locator('#starlight__sidebar a[aria-current="page"]')
		.evaluateAll((els) => els.map((e) => e.getAttribute('href')));
	assert.deepEqual(aktif2, [href2], 'A.2: tepat satu aria-current = href2');
	const h1Langkah2 = await page.locator('h1#_top').textContent();
	assert.notEqual(h1Langkah2, h1Beranda);
	const judul2 = await page.title();
	assert.notEqual(judul2, judulBeranda);
	assert.ok(judul2.includes((h1Langkah2 ?? '').trim()), 'A.2: title harus memuat teks h1');
	assert.equal(
		await page.evaluate(() => document.documentElement.dataset.theme),
		'light',
		'A.2: tema tetap light',
	);
	const tombolCari = page.locator('header site-search button[data-open-modal]');
	await tombolCari.waitFor({ state: 'visible' });
	assert.equal(await tombolCari.isEnabled(), true);
	assert.ok(
		(await page.locator('.astro-route-announcer').count()) <= 1,
		'A.2: route announcer lebih dari satu',
	);
	console.log('OK A.2 klik sidebar pertama →', href2);

	// A.3 klik artikel komitmen/ruh pertama
	const href1 = await page.evaluate(async () => {
		const daftar = [...document.querySelectorAll('#starlight__sidebar a[href^="/komitmen/ruh/"]')]
			.map((el) => el.getAttribute('href'))
			.filter((h): h is string => Boolean(h) && h !== '/komitmen/ruh/');
		for (const h of daftar) {
			const doc = new DOMParser().parseFromString(
				await fetch(h).then((r) => r.text()),
				'text/html',
			);
			const toc = [...doc.querySelectorAll('starlight-toc a[href^="#"]')].filter(
				(a) => a.getAttribute('href') !== '#_top',
			);
			if (toc.length >= 1) return h;
		}
		return null;
	});
	assert.ok(href1, 'harus ada artikel /komitmen/ruh/ dengan TOC di sidebar');
	await page.evaluate((h) => {
		const a = document.querySelector(`#starlight__sidebar a[href="${h}"]`);
		for (let d = a?.closest('details'); d; d = d.parentElement?.closest('details') ?? null)
			d.open = true;
	}, href1);
	const tautan1 = page.locator(`#starlight__sidebar a[href="${href1}"]`);
	await tautan1.scrollIntoViewIfNeeded();
	await pindah(page, () => tautan1.click());
	assert.ok(await utuh(), 'A.3: dokumen/sidebar harus tetap');
	assert.equal(new URL(page.url()).pathname, href1);
	const aktif3 = await page
		.locator('#starlight__sidebar a[aria-current="page"]')
		.evaluateAll((els) => els.map((e) => e.getAttribute('href')));
	assert.deepEqual(aktif3, [href1], 'A.3: tepat satu aria-current = href1');
	const h1Langkah3 = await page.locator('h1#_top').textContent();
	assert.notEqual(h1Langkah3, h1Langkah2);
	assert.notEqual(await page.title(), judul2);
	const jangkarToc = await page
		.locator('starlight-toc a[href^="#"]')
		.evaluateAll((els) => els.map((e) => e.getAttribute('href')).filter((h) => h !== '#_top'));
	assert.ok(jangkarToc.length >= 1, 'A.3: TOC harus punya minimal satu jangkar');
	for (const h of jangkarToc) {
		const ada = await page.evaluate(
			(id) => document.getElementById(decodeURIComponent(id)) !== null,
			h!.slice(1),
		);
		assert.ok(ada, `A.3: target jangkar ${h} tidak ada di dokumen`);
	}
	await page.locator('nav.jalur-sakti').waitFor();
	console.log('OK A.3 klik artikel →', href1);

	// A.4 back/forward
	await pindah(page, () => page.goBack());
	assert.equal(new URL(page.url()).pathname, href2);
	assert.equal(await page.locator('h1#_top').textContent(), h1Langkah2);
	assert.deepEqual(
		await page
			.locator('#starlight__sidebar a[aria-current="page"]')
			.evaluateAll((els) => els.map((e) => e.getAttribute('href'))),
		[href2],
	);
	assert.ok(await utuh(), 'A.4 back: tidak utuh');
	await pindah(page, () => page.goForward());
	assert.equal(new URL(page.url()).pathname, href1);
	assert.ok(await utuh(), 'A.4 forward: tidak utuh');
	console.log('OK A.4 back/forward riwayat');

	// A.5 jangkar dalam halaman
	const bingkai = await page.locator('.main-frame').elementHandle();
	const hrefJangkar = jangkarToc[0]!;
	const muatSebelum = await page.evaluate(
		() => window.__muat ?? 0,
	);
	await page.locator(`starlight-toc a[href="${hrefJangkar}"]`).first().click();
	await page.waitForFunction((h) => location.hash === h, hrefJangkar);
	assert.ok(
		await bingkai!.evaluate((el) => el === document.querySelector('.main-frame')),
		'A.5: .main-frame harus node yang sama',
	);
	assert.ok(await utuh(), 'A.5: tidak utuh');
	assert.equal(
		await page.evaluate(() => window.__muat ?? 0),
		muatSebelum,
		'A.5: __muat tidak boleh bertambah untuk jangkar',
	);
	const posisiJudul = await page.evaluate((h) => {
		const el = document.getElementById(decodeURIComponent(h.slice(1)));
		const atas = el ? el.getBoundingClientRect().top : -1;
		return { atas, diViewport: atas >= 0 && atas < innerHeight };
	}, hrefJangkar);
	assert.ok(
		posisiJudul.diViewport,
		`A.5: heading target tidak di viewport (${posisiJudul.atas})`,
	);
	await page.goBack();
	await page.waitForFunction(() => location.hash === '');
	assert.ok(
		await bingkai!.evaluate((el) => el === document.querySelector('.main-frame')),
		'A.5 back: .main-frame harus node yang sama',
	);
	console.log('OK A.5 jangkar dalam halaman');

	// A.6 tautan eksternal tidak dicegat
	const hasilEksternal = await page.evaluate(() => {
		const a = [...document.querySelectorAll('a[href]')].find(
			(el) => (el as HTMLAnchorElement).origin !== location.origin,
		) as HTMLAnchorElement | undefined;
		if (!a) return { ada: false, defaultPrevented: null as boolean | null };
		let tercatat: boolean | null = null;
		window.addEventListener(
			'click',
			(ev) => {
				tercatat = ev.defaultPrevented;
				ev.preventDefault();
			},
			{ once: true },
		);
		a.click();
		return { ada: true, defaultPrevented: tercatat };
	});
	assert.ok(hasilEksternal.ada, 'A.6: tidak ada tautan eksternal di halaman');
	assert.equal(hasilEksternal.defaultPrevented, false, 'A.6: router tidak boleh mencegat tautan eksternal');
	assert.equal(new URL(page.url()).pathname, href1, 'A.6: URL tidak boleh berubah');
	console.log('OK A.6 tautan eksternal tidak dicegat');

	// A.7 pencarian header
	await page.keyboard.press('Control+k');
	await page.waitForFunction(() => {
		const d = document.querySelector('site-search dialog');
		return d instanceof HTMLDialogElement && d.open === true;
	});
	await page.locator('input.pagefind-ui__search-input').fill('kontrak');
	const hasilPertama = page.locator('.pagefind-ui__result-link').first();
	await hasilPertama.waitFor();
	const hrefHasil = new URL((await hasilPertama.getAttribute('href'))!, BASE_URL).pathname;
	await pindah(page, () => hasilPertama.click());
	assert.equal(new URL(page.url()).pathname, hrefHasil);
	assert.ok(await utuh(), 'A.7: tidak utuh setelah hasil pencarian');
	assert.notEqual(
		await page.evaluate(() => {
			const d = document.querySelector('site-search dialog');
			return d instanceof HTMLDialogElement && d.open;
		}),
		true,
		'A.7: dialog pencarian harus tertutup',
	);
	console.log('OK A.7 pencarian header →', hrefHasil);

	// A.8 kembali ke beranda
	await pindah(page, () => page.locator('a.site-title').click());
	assert.equal(new URL(page.url()).pathname, '/');
	assert.ok(await utuh(), 'A.8: tidak utuh di beranda');
	assert.equal(await page.locator('header site-search').count(), 0, 'A.8: header tanpa site-search');
	const inputBig = page.locator('sakti-cari input[type="search"]');
	await inputBig.waitFor({ state: 'visible' });
	await inputBig.fill('kontrak');
	const opsiBig = page.locator('sakti-cari li[role="option"]');
	await opsiBig.first().waitFor();
	assert.ok((await opsiBig.count()) >= 1);
	await page.keyboard.press('Escape');
	await page.locator('sakti-cari .panel-cari').waitFor({ state: 'hidden' });
	console.log('OK A.8 beranda: tanpa site-search, BigSearch jalan');

	// A.9 pintasan / pada instance BigSearch kedua
	await pindah(page, () => page.goBack());
	await pindah(page, () => page.goForward());
	assert.equal(new URL(page.url()).pathname, '/');
	await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
	await page.keyboard.press('/');
	await page.waitForTimeout(100);
	assert.equal(
		await page.evaluate(
			() => document.activeElement === document.querySelector('sakti-cari input'),
		),
		true,
		'A.9: pintasan / harus memfokus input BigSearch baru',
	);
	console.log('OK A.9 pintasan / di instance kedua');

	// A.10 /cari/ lewat router
	const scrollCari = await scrollPanel();
	await inputBig.fill(KATA_BANYAK);
	await opsiBig.first().waitFor();
	await pindah(page, () => inputBig.press('Enter'));
	assert.match(page.url(), /\/cari\/\?q=/);
	assert.equal(
		await page.evaluate(() => window.__penanda),
		1,
		'A.10: __penanda harus bertahan ke /cari/',
	);
	assert.equal(await page.locator('#starlight__sidebar').count(), 0, 'A.10: tanpa sidebar');
	assert.equal(await page.locator('#input-q').inputValue(), KATA_BANYAK);
	await page.waitForFunction(() => document.querySelectorAll('#daftar-hasil li').length === 20);
	assert.equal(await page.locator('#daftar-hasil li').count(), 20);
	await page.locator('#nav-halaman').waitFor({ state: 'visible' });
	assert.ok(
		((await page.locator('#info-halaman').textContent()) ?? '').startsWith('Halaman 1'),
		'A.10: info halaman harus "Halaman 1 …"',
	);
	await pindah(page, () => page.locator('[data-hal="berikutnya"]').click());
	assert.ok(page.url().includes('hal=2'), 'A.10: URL harus memuat hal=2');
	await page.waitForFunction(
		() => (document.querySelector('#info-halaman')?.textContent ?? '').startsWith('Halaman 2'),
	);
	await page.waitForFunction(() => document.querySelectorAll('#daftar-hasil li').length >= 1);
	assert.equal(
		await page.evaluate(() => window.__penanda),
		1,
	);
	await pindah(page, () => page.goBack());
	assert.ok(!page.url().includes('hal=2'), 'A.10 back: hal=2 harus hilang');
	await page.waitForFunction(
		() => (document.querySelector('#info-halaman')?.textContent ?? '').startsWith('Halaman 1'),
	);
	await page.waitForFunction(() => document.querySelectorAll('#daftar-hasil li').length === 20);
	await page.selectOption('select[name="jenis"]', { index: 1 });
	await page.waitForFunction(() => location.search.includes('jenis='));
	assert.notEqual(await page.evaluate(() => history.state), null, 'A.10: history.state router hilang');
	await page.selectOption('select[name="jenis"]', { index: 0 });
	await page.waitForFunction(() => !location.search.includes('jenis='));
	await page.waitForFunction(
		() =>
			document.querySelectorAll('#daftar-hasil li').length >= 1 &&
			!(document.querySelector('#jumlah-hasil')?.textContent ?? '').startsWith('Mencari'),
	);
	console.log('OK A.10 /cari/ lewat router + paginasi + filter');

	// A.11 kembali ke artikel dari /cari/
	await pindah(page, () => page.locator('#daftar-hasil li a.judul').first().click());
	assert.ok(await utuh(), 'A.11: sidebar simpanan harus dipakai lagi (node sama)');
	assert.ok(
		Math.abs((await scrollPanel()) - scrollCari) <= 1,
		'A.11: posisi gulir sidebar tidak pulih',
	);
	const pathA11 = new URL(page.url()).pathname;
	assert.deepEqual(
		await page
			.locator('#starlight__sidebar a[aria-current="page"]')
			.evaluateAll((els) => els.map((e) => e.getAttribute('href'))),
		[pathA11],
	);
	assert.equal(await page.locator('header site-search').count(), 1, 'A.11: site-search harus ada');
	await page.keyboard.press('Control+k');
	await page.waitForFunction(() => {
		const d = document.querySelector('site-search dialog');
		return d instanceof HTMLDialogElement && d.open === true;
	});
	await page.keyboard.press('Escape');
	await page.waitForFunction(() => {
		const d = document.querySelector('site-search dialog');
		return !d || (d instanceof HTMLDialogElement && d.open === false);
	});
	await pindah(page, () => page.goBack());
	assert.ok(page.url().includes('/cari/'), 'A.11 back: harus kembali ke /cari/');
	await page.waitForFunction(() => document.querySelectorAll('#daftar-hasil li').length >= 1);
	console.log('OK A.11 kembali ke artikel dari /cari/');

	// A.12 tema konsisten + animasi VT
	const temaSwap: string[] = await page.evaluate(
		() => window.__temaSwap,
	);
	assert.ok(temaSwap.length >= 8, `A.12: __temaSwap ${temaSwap.length} < 8`);
	assert.ok(
		temaSwap.every((t) => t === 'light'),
		`A.12: tema swap bukan light: ${JSON.stringify(temaSwap)}`,
	);
	const animasi: number[] = await page.evaluate(
		() => window.__animasiVt,
	);
	assert.ok(
		animasi.some((n) => n > 0),
		`A.12: view transition tidak beranimasi: ${JSON.stringify(animasi)}`,
	);
	console.log('OK A.12 tema terjaga, view transition asli berjalan');
	await konteks.close();

	// ---------- B. HP ----------
	konteks = await buatKonteks(browser, { viewport: { width: 360, height: 800 } });
	const pageHp = await konteks.newPage();
	catatGalat(pageHp);
	await pageHp.goto(`${BASE_URL}${href1}`, { waitUntil: 'networkidle' });
	await pageHp.evaluate(() => (window.__penanda = 1));
	await pageHp.locator('button.sl-menu-button').click();
	await pageHp.locator('#starlight__sidebar').waitFor({ state: 'visible' });
	const tautanHp = pageHp.locator(
		'#starlight__sidebar a[href]:not([aria-current]):visible',
	);
	assert.ok((await tautanHp.count()) >= 1, 'B: tidak ada tautan sidebar terlihat');
	const hrefHp = await tautanHp.first().getAttribute('href');
	assert.ok(hrefHp, 'B: tautan sidebar tanpa href');
	await pindah(pageHp, () => tautanHp.first().click());
	assert.equal(
		await pageHp.evaluate(() => window.__penanda),
		1,
		'B: __penanda hilang',
	);
	assert.equal(new URL(pageHp.url()).pathname, hrefHp);
	assert.equal(
		await pageHp.evaluate(
			() => document.querySelector('#starlight__sidebar')?.matches(':popover-open') ?? false,
		),
		false,
		'B: sidebar harus tertutup setelah pindah',
	);
	await pageHp.locator('h1#_top').waitFor({ state: 'visible' });
	assert.ok(
		(await pageHp.evaluate(() => document.documentElement.scrollWidth)) <= 360,
		'B: scroll horizontal',
	);
	await pageHp.waitForFunction(
		() =>
			!document.querySelector('.main-frame')?.hasAttribute('inert') &&
			!document.querySelector('.sl-skip-link')?.hasAttribute('inert'),
		undefined,
		{ timeout: 2000 },
	);
	assert.notEqual(
		await pageHp.evaluate(() => getComputedStyle(document.body).overflowY),
		'hidden',
		'B: body masih terkunci',
	);
	await pageHp.locator('button.sl-menu-button').click();
	await pageHp.locator('#starlight__sidebar').waitFor({ state: 'visible' });
	assert.ok((await pageHp.evaluate(() => document.documentElement.scrollWidth)) <= 360);
	console.log('OK B navigasi HP + popover tertutup');
	await konteks.close();

	// ---------- C. reduced motion ----------
	konteks = await buatKonteks(browser, {
		viewport: { width: 1280, height: 900 },
		reducedMotion: 'reduce',
	});
	const pageRm = await konteks.newPage();
	catatGalat(pageRm);
	await pageRm.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
	await pageRm.evaluate(() => (window.__penanda = 1));
	const tautanRm = pageRm.locator(
		'#starlight__sidebar a[href]:not([aria-current="page"]):visible',
	);
	await pindah(pageRm, () => tautanRm.first().click());
	assert.equal(
		await pageRm.evaluate(() => window.__penanda),
		1,
		'C: __penanda hilang',
	);
	const animasiRm: number[] = await pageRm.evaluate(
		() => window.__animasiVt,
	);
	assert.ok(animasiRm.length >= 1, 'C: tidak ada animasi tercatat');
	assert.ok(animasiRm.every((n) => n === 0), `C: animasi VT harus 0 semua: ${animasiRm}`);
	console.log('OK C prefers-reduced-motion');
	await konteks.close();

	assert.deepEqual(galat, [], `galat konsol/halaman: ${JSON.stringify(galat)}`);
	assert.deepEqual(
		daftarPelanggaran.flat(),
		[],
		`pelanggaran CSP: ${JSON.stringify(daftarPelanggaran.flat())}`,
	);
	console.log('e2e navigasi: semua pemeriksaan lolos');
} finally {
	await browser.close();
	server?.close();
}
