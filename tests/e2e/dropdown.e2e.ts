import { chromium, type Browser } from 'playwright';
import assert from 'node:assert/strict';
import type http from 'node:http';
import { buatServer } from './server.ts';
import { pantauCsp, pastikanCspAktif } from './csp.ts';

const KONTRAS_AA = 4.5;
const KUNING_BAWAAN = 'rgb(255, 255, 0)';
const KUERI_GAYA = 'kontrak';
const KUERI_KONTAK = ['jam layanan', 'jam kerja', 'hotline', 'kontak'];
const URL_KONTAK = '/bantuan/';

interface Kotak {
	atas: number;
	bawah: number;
	tinggi: number;
}

interface UkuranOpsi {
	id: string;
	href: string;
	aktif: boolean;
	ariaSelected: string | null;
	kotak: Kotak;
	a: { garis: string; latar: string; padding: number };
	judul: { display: string; tebal: number; kotak: Kotak; kontras: number };
	meta: { kotak: Kotak } | null;
	breadcrumb: { kontras: number } | null;
	jenis: { kontras: number } | null;
	cuplikan: { display: string; kotak: Kotak; tinggiBaris: number; kontras: number } | null;
	mark: { latar: string; kontras: number } | null;
}

interface Ukuran {
	tema: string;
	lebarDokumen: number;
	lebarJendela: number;
	tinggiJendela: number;
	panel: {
		kotak: Kotak;
		overflowY: string;
		scrollWidth: number;
		clientWidth: number;
	};
	opsi: UkuranOpsi[];
	semua: { garis: string; kontras: number; teks: string } | null;
	status: { kontras: number } | null;
	aktifDescendant: string | null;
}

// Dijalankan di halaman sebagai teks agar tidak bergantung pada helper hasil kompilasi tsx.
// Kontras dihitung menurut WCAG 2.x dari warna hasil komputasi; latar = leluhur terdekat
// yang latarnya tidak transparan. Warna semi-transparan dianggap galat, bukan ditebak.
const UKUR = String.raw`(() => {
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
			if (alfa < 1) throw new Error('latar semi-transparan pada <' + e.tagName + ' class="' + e.className + '">');
			return c;
		}
		throw new Error('latar tidak ditemukan');
	};
	const kontras = (el) => {
		const w = angka(getComputedStyle(el).color);
		if (w.length > 3 && w[3] < 1) throw new Error('warna teks semi-transparan pada .' + el.className);
		const t = lum(w);
		const b = lum(latar(el));
		return Math.round(((Math.max(t, b) + 0.05) / (Math.min(t, b) + 0.05)) * 100) / 100;
	};
	const kotak = (el) => {
		const r = el.getBoundingClientRect();
		return { atas: r.top, bawah: r.bottom, tinggi: r.height };
	};
	const gaya = (el, p) => getComputedStyle(el).getPropertyValue(p);
	const terlihat = (el) => !!el && el.getClientRects().length > 0 && el.textContent.trim() !== '';
	const akar = document.querySelector('sakti-cari');
	const panel = akar.querySelector('.panel-cari');
	const semua = akar.querySelector('.semua-hasil');
	const status = akar.querySelector('[data-status]');
	const opsi = [...akar.querySelectorAll('li[role="option"]')].map((li) => {
		const a = li.querySelector('a');
		const judul = li.querySelector('.judul-hasil');
		const meta = li.querySelector('.meta-hasil');
		const breadcrumb = li.querySelector('.breadcrumb-hasil');
		const jenis = li.querySelector('.jenis-hasil');
		const cuplikan = li.querySelector('.cuplikan-hasil');
		const mark = li.querySelector('mark');
		return {
			id: li.id,
			href: a.getAttribute('href'),
			aktif: li.hasAttribute('data-aktif'),
			ariaSelected: li.getAttribute('aria-selected'),
			kotak: kotak(li),
			a: {
				garis: gaya(a, 'text-decoration-line'),
				latar: gaya(a, 'background-color'),
				padding: parseFloat(gaya(a, 'padding-top')),
			},
			judul: {
				display: gaya(judul, 'display'),
				tebal: Number(gaya(judul, 'font-weight')),
				kotak: kotak(judul),
				kontras: kontras(judul),
			},
			meta: meta ? { kotak: kotak(meta) } : null,
			breadcrumb: breadcrumb ? { kontras: kontras(breadcrumb) } : null,
			jenis: jenis ? { kontras: kontras(jenis) } : null,
			cuplikan: cuplikan
				? {
						display: gaya(cuplikan, 'display'),
						kotak: kotak(cuplikan),
						tinggiBaris: parseFloat(gaya(cuplikan, 'line-height')),
						kontras: kontras(cuplikan),
					}
				: null,
			mark: mark ? { latar: gaya(mark, 'background-color'), kontras: kontras(mark) } : null,
		};
	});
	return {
		tema: document.documentElement.dataset.theme,
		lebarDokumen: document.documentElement.scrollWidth,
		lebarJendela: window.innerWidth,
		tinggiJendela: window.innerHeight,
		panel: {
			kotak: kotak(panel),
			overflowY: gaya(panel, 'overflow-y'),
			scrollWidth: panel.scrollWidth,
			clientWidth: panel.clientWidth,
		},
		opsi,
		semua: terlihat(semua)
			? { garis: gaya(semua, 'text-decoration-line'), kontras: kontras(semua), teks: semua.textContent.trim() }
			: null,
		status: terlihat(status) ? { kontras: kontras(status) } : null,
		aktifDescendant: akar.querySelector('input[type="search"]').getAttribute('aria-activedescendant'),
	};
})()`;

const UKUR_CARI = String.raw`(() => {
	const gaya = (el, p) => getComputedStyle(el).getPropertyValue(p);
	const li = document.querySelector('#daftar-hasil li');
	return {
		garisAtas: gaya(li, 'border-top-width'),
		paddingAtas: parseFloat(gaya(li, 'padding-top')),
		tebalJudul: Number(gaya(li.querySelector('a.judul'), 'font-weight')),
		displayMeta: gaya(li.querySelector('.meta-hasil'), 'display'),
	};
})()`;

function periksaGaya(u: Ukuran, label: string) {
	assert.ok(u.opsi.length >= 2, `${label}: minimal 2 opsi, dapat ${u.opsi.length}`);
	for (const [i, o] of u.opsi.entries()) {
		const di = `${label} opsi ${i} (${o.href})`;
		assert.equal(o.a.garis, 'none', `${di}: tautan tidak boleh bergaris bawah`);
		assert.ok(o.a.padding >= 8, `${di}: padding baris ${o.a.padding}px < 8px`);
		assert.notEqual(o.judul.display, 'inline', `${di}: judul harus blok`);
		assert.ok(o.judul.tebal >= 600, `${di}: judul harus tebal, dapat ${o.judul.tebal}`);
		assert.ok(o.judul.kontras >= KONTRAS_AA, `${di}: kontras judul ${o.judul.kontras}`);
		let atas = o.judul.kotak;
		if (o.meta) {
			assert.ok(o.meta.kotak.atas >= atas.bawah - 0.5, `${di}: baris meta harus di bawah judul`);
			atas = o.meta.kotak;
		}
		if (o.breadcrumb)
			assert.ok(o.breadcrumb.kontras >= KONTRAS_AA, `${di}: kontras breadcrumb ${o.breadcrumb.kontras}`);
		if (o.jenis) assert.ok(o.jenis.kontras >= KONTRAS_AA, `${di}: kontras jenis ${o.jenis.kontras}`);
		if (o.cuplikan) {
			assert.notEqual(o.cuplikan.display, 'inline', `${di}: ringkasan harus blok`);
			assert.ok(o.cuplikan.kotak.atas >= atas.bawah - 0.5, `${di}: ringkasan harus di bawah judul/meta`);
			assert.ok(
				o.cuplikan.kotak.tinggi <= 2 * o.cuplikan.tinggiBaris + 1,
				`${di}: ringkasan ${o.cuplikan.kotak.tinggi}px melebihi 2 baris (${o.cuplikan.tinggiBaris}px/baris)`,
			);
			assert.ok(o.cuplikan.kontras >= KONTRAS_AA, `${di}: kontras ringkasan ${o.cuplikan.kontras}`);
		}
		if (o.mark) {
			assert.notEqual(o.mark.latar, KUNING_BAWAAN, `${di}: mark masih kuning bawaan browser`);
			assert.ok(o.mark.kontras >= KONTRAS_AA, `${di}: kontras mark ${o.mark.kontras}`);
		}
		const berikut = u.opsi[i + 1];
		if (berikut)
			assert.ok(berikut.kotak.atas - o.kotak.bawah >= 1, `${di}: tidak ada jarak ke opsi berikutnya`);
	}
	assert.equal(u.panel.overflowY, 'auto', `${label}: panel harus bisa di-scroll`);
	assert.ok(
		u.panel.kotak.tinggi <= 0.6 * u.tinggiJendela + 2,
		`${label}: tinggi panel ${u.panel.kotak.tinggi}px > 60% jendela`,
	);
	assert.ok(u.panel.scrollWidth <= u.panel.clientWidth, `${label}: panel scroll horizontal`);
	assert.ok(u.lebarDokumen <= u.lebarJendela, `${label}: halaman scroll horizontal (${u.lebarDokumen}px)`);
	if (u.semua) {
		assert.equal(u.semua.garis, 'none', `${label}: "Lihat semua hasil" tidak boleh bergaris bawah`);
		assert.ok(u.semua.kontras >= KONTRAS_AA, `${label}: kontras "Lihat semua hasil" ${u.semua.kontras}`);
	}
	if (u.status) assert.ok(u.status.kontras >= KONTRAS_AA, `${label}: kontras status ${u.status.kontras}`);
}

async function ujiTampilan(
	browser: Browser,
	baseUrl: string,
	tema: 'dark' | 'light',
	nama: string,
	viewport: { width: number; height: number },
) {
	const label = `${tema} ${nama}`;
	const konteks = await browser.newContext({ viewport, colorScheme: tema });
	const pelanggaran = await pantauCsp(konteks);
	await konteks.addInitScript((t) => localStorage.setItem('starlight-theme', t), tema);
	const page = await konteks.newPage();
	const galat: string[] = [];
	page.on('pageerror', (e) => galat.push(`pageerror: ${e.message}`));
	page.on('console', (m) => {
		if (m.type() === 'error') galat.push(`console.error: ${m.text()}`);
	});
	const ukur = () => page.evaluate(UKUR) as Promise<Ukuran>;

	const respons = await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
	assert.ok(respons?.ok(), `membuka / gagal: ${respons?.status()}`);
	if (!process.env.E2E_BASE_URL) pastikanCspAktif(respons);
	const input = page.locator('sakti-cari input[type="search"]');
	const panel = page.locator('sakti-cari .panel-cari');
	const opsi = page.locator('sakti-cari li[role="option"]');
	await input.fill(KUERI_GAYA);
	await opsi.first().waitFor();

	const awal = await ukur();
	assert.equal(awal.tema, tema, `${label}: tema halaman`);
	periksaGaya(awal, `${label} awal`);
	assert.ok(
		awal.opsi.some((o) => o.mark),
		`${label}: "${KUERI_GAYA}" harus memberi minimal satu sorotan mark`,
	);
	assert.ok(awal.semua, `${label}: "Lihat semua hasil" harus tampil untuk "${KUERI_GAYA}"`);
	assert.match(awal.semua.teks, /^Lihat semua hasil \(\d+\)$/, `${label}: teks "Lihat semua hasil"`);
	assert.ok(
		awal.opsi.every((o) => !o.aktif && o.ariaSelected === 'false'),
		`${label}: belum ada opsi aktif sebelum tombol panah ditekan`,
	);
	console.log(`OK ${label}: ${awal.opsi.length} opsi bergaya, ringkasan ≤ 2 baris, kontras ≥ ${KONTRAS_AA}`);

	await input.press('ArrowDown');
	await input.press('ArrowDown');
	const turun = await ukur();
	periksaGaya(turun, `${label} panah bawah`);
	assert.deepEqual(
		turun.opsi.map((o, i) => (o.aktif ? i : -1)).filter((i) => i >= 0),
		[1],
		`${label}: tepat opsi kedua yang aktif setelah 2× panah bawah`,
	);
	assert.deepEqual(
		turun.opsi.map((o) => o.ariaSelected),
		turun.opsi.map((_, i) => String(i === 1)),
		`${label}: aria-selected hanya pada opsi aktif`,
	);
	assert.equal(turun.aktifDescendant, turun.opsi[1].id, `${label}: aria-activedescendant`);
	assert.notEqual(turun.opsi[1].a.latar, turun.opsi[0].a.latar, `${label}: opsi aktif harus berlatar beda`);

	await input.press('ArrowUp');
	await input.press('ArrowUp');
	const naik = await ukur();
	const akhir = naik.opsi.length - 1;
	assert.ok(naik.opsi[akhir].aktif, `${label}: panah atas dari opsi pertama berpindah ke opsi terakhir`);
	assert.ok(
		naik.opsi[akhir].kotak.atas >= naik.panel.kotak.atas - 1 &&
			naik.opsi[akhir].kotak.bawah <= naik.panel.kotak.bawah + 1,
		`${label}: opsi aktif harus tergulir ke dalam panel`,
	);
	console.log(`OK ${label}: panah atas/bawah menandai satu opsi dan menggulirnya ke dalam panel`);

	if (nama === 'desktop') {
		await opsi.nth(2).locator('a').hover();
		const hover = await ukur();
		assert.notEqual(hover.opsi[2].a.latar, hover.opsi[3].a.latar, `${label}: hover harus mengubah latar`);
		periksaGaya(hover, `${label} hover`);
		await page.mouse.move(0, 0);
		console.log(`OK ${label}: hover mengubah latar dan kontras tetap ≥ ${KONTRAS_AA}`);
	}

	await input.press('Escape');
	await panel.waitFor({ state: 'hidden' });
	await input.fill(KUERI_GAYA);
	await opsi.first().waitFor();
	await input.press('ArrowDown');
	const tujuan = await opsi.first().locator('a').getAttribute('href');
	await input.press('Enter');
	await page.waitForURL(`${baseUrl}${tujuan}`);
	console.log(`OK ${label}: Esc menutup panel, Enter membuka ${tujuan}`);

	return { konteks, page, galat, pelanggaran };
}

let server: http.Server | undefined;
let BASE_URL = process.env.E2E_BASE_URL ?? '';
if (!BASE_URL) {
	({ server, url: BASE_URL } = await buatServer());
}

const browser = await chromium.launch();
try {
	const masalah: string[] = [];
	for (const tema of ['dark', 'light'] as const) {
		for (const [nama, viewport] of [
			['desktop', { width: 1280, height: 900 }],
			['360px', { width: 360, height: 800 }],
		] as const) {
			const { konteks, page, galat, pelanggaran } = await ujiTampilan(browser, BASE_URL, tema, nama, viewport);

			if (tema === 'dark' && nama === 'desktop') {
				const input = page.locator('sakti-cari input[type="search"]');
				for (const q of KUERI_KONTAK) {
					await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
					await input.fill(q);
					const pertama = page.locator('sakti-cari li[role="option"] a').first();
					await pertama.waitFor();
					assert.equal(
						await pertama.getAttribute('href'),
						URL_KONTAK,
						`"${q}": hasil teratas harus ${URL_KONTAK}`,
					);
					console.log(`OK relevansi: "${q}" → ${URL_KONTAK} di posisi teratas`);
				}

				await page.goto(`${BASE_URL}/cari/?q=${encodeURIComponent(KUERI_GAYA)}`, {
					waitUntil: 'networkidle',
				});
				await page.locator('.halaman-cari[data-keadaan="selesai"]').waitFor();
				const cari = (await page.evaluate(UKUR_CARI)) as {
					garisAtas: string;
					paddingAtas: number;
					tebalJudul: number;
					displayMeta: string;
				};
				assert.equal(cari.garisAtas, '1px', '/cari/: butir hasil harus bergaris pemisah');
				assert.ok(cari.paddingAtas > 0, '/cari/: butir hasil harus berjarak');
				assert.ok(cari.tebalJudul >= 600, `/cari/: judul hasil harus tebal, dapat ${cari.tebalJudul}`);
				assert.equal(cari.displayMeta, 'block', '/cari/: baris meta harus blok');
				console.log('OK /cari/: butir hasil yang dibuat skrip mendapat gayanya');
			}

			masalah.push(...galat, ...pelanggaran.map((p) => `CSP: ${p}`));
			await konteks.close();
		}
	}
	assert.deepEqual(masalah, [], `galat konsol/halaman atau pelanggaran CSP: ${JSON.stringify(masalah)}`);
	console.log('e2e dropdown: semua pemeriksaan lolos');
} finally {
	await browser.close();
	server?.close();
}
