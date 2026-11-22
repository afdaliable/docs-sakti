import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import type http from 'node:http';
import { parse } from 'yaml';
import { chromium, type Browser } from 'playwright';
import { buatServer } from '../../tests/e2e/server.ts';
import { posisiHarapan, ringkasEval, validasiKueri, type BarisEval, type KueriUji } from './metrik.ts';

const BERKAS_KUERI = 'tests/search/queries.yaml';
const PARALEL = 4;
const BATAS_MS = 30_000;

const { values: opsi } = parseArgs({
	options: {
		level: { type: 'string', default: 'semua' },
		ambang: { type: 'string', default: '0.80' },
		json: { type: 'string' },
	},
});

if (!['1', 'hybrid', 'semua'].includes(opsi.level)) {
	console.error(`--level tidak dikenal: ${opsi.level} (pilihan: 1, hybrid, semua)`);
	process.exit(2);
}
const ambang = Number(opsi.ambang);
if (!Number.isFinite(ambang) || ambang < 0 || ambang > 1) {
	console.error(`--ambang harus angka 0–1, dapat: ${opsi.ambang}`);
	process.exit(2);
}
if (opsi.level === 'hybrid') {
	console.error('Level hybrid belum tersedia: /api/search dikerjakan di tugas 5.2 (docs/08-rencana-kerja.md).');
	process.exit(2);
}

const angka = (x: number) => x.toFixed(3).replace('.', ',');
const dist = path.resolve(process.cwd(), process.env.E2E_DIST ?? 'dist');
const kueri = validasiKueri(parse(fs.readFileSync(BERKAS_KUERI, 'utf8')));

let server: http.Server | undefined;
let BASE_URL = process.env.E2E_BASE_URL ?? '';
if (!BASE_URL) {
	({ server, url: BASE_URL } = await buatServer());
	const hilang = [...new Set(kueri.flatMap((k) => k.harap))].filter(
		(url) => !fs.existsSync(path.join(dist, url, 'index.html')),
	);
	if (hilang.length > 0) {
		console.error(`URL harapan di ${BERKAS_KUERI} tidak ada di build:\n${hilang.map((u) => `  ${u}`).join('\n')}`);
		server.close();
		process.exit(2);
	}
}

// Satu muat halaman penuh per kueri: hasil Pagefind bergantung pada chunk indeks yang sudah dimuat,
// jadi setiap kueri diukur dari keadaan segar seperti pencarian pertama pengguna.
async function jalankan(browser: Browser, k: KueriUji): Promise<BarisEval> {
	const page = await browser.newPage();
	try {
		await page.goto(`${BASE_URL}/cari/?q=${encodeURIComponent(k.q)}`);
		const akar = page.locator('.halaman-cari:is([data-keadaan="selesai"], [data-keadaan="galat"])');
		await akar.waitFor({ timeout: BATAS_MS });
		const data = await akar.evaluate((el) => {
			const d = (el as HTMLElement).dataset;
			return {
				keadaan: d.keadaan,
				jumlah: Number(d.jumlah),
				jumlahPagefind: Number(d.jumlahPagefind),
				dapat: [...document.querySelectorAll<HTMLAnchorElement>('#daftar-hasil a.judul')].map(
					(a) => new URL(a.href).pathname,
				),
			};
		});
		if (data.keadaan !== 'selesai') throw new Error(`pencarian gagal dijalankan untuk "${k.q}"`);
		if (!Number.isInteger(data.jumlah) || !Number.isInteger(data.jumlahPagefind)) {
			throw new Error(`/cari/ tidak melaporkan data-jumlah/data-jumlah-pagefind untuk "${k.q}"`);
		}
		return {
			q: k.q,
			harap: k.harap,
			dapat: data.dapat,
			posisi: posisiHarapan(data.dapat, k.harap),
			jumlah: data.jumlah,
			jumlahPagefind: data.jumlahPagefind,
		};
	} finally {
		await page.close();
	}
}

const browser = await chromium.launch();
let baris: BarisEval[];
try {
	baris = new Array<BarisEval>(kueri.length);
	let berikut = 0;
	await Promise.all(
		Array.from({ length: PARALEL }, async () => {
			while (berikut < kueri.length) {
				const i = berikut++;
				baris[i] = await jalankan(browser, kueri[i]);
			}
		}),
	);
} finally {
	await browser.close();
	server?.close();
}

const r = ringkasEval(baris);
console.log(`search:eval Level 1 — ${r.jumlahKueri} kueri (${BERKAS_KUERI}), satu muat halaman per kueri`);
console.log(`hit@1 ${angka(r.hit1)}   hit@3 ${angka(r.hit3)}   MRR ${angka(r.mrr)}`);
console.log(`memakai hasil mirip: ${r.pakaiMirip} kueri   tanpa hasil: ${r.tanpaHasil} kueri`);
if (r.gagal.length > 0) {
	console.log(`\nGagal hit@3 (${r.gagal.length}):`);
	for (const g of r.gagal) {
		console.log(`- "${g.q}" — harapan ${g.posisi === null ? 'tidak ada di 20 teratas' : `di posisi ${g.posisi}`}`);
		console.log(`    harap: ${g.harap.join('  ')}`);
		console.log(`    dapat: ${g.dapat.slice(0, 3).join('  ') || '(tanpa hasil)'}`);
	}
}
if (opsi.level === 'semua') {
	console.log('\nLevel hybrid dilewati: /api/search belum tersedia (tugas 5.2).');
}
if (opsi.json) {
	fs.writeFileSync(opsi.json, JSON.stringify({ level: 1, ambang, ...r, baris }, null, '\t'));
}
const lolos = r.hit3 >= ambang;
console.log(`\nAmbang hit@3 ≥ ${angka(ambang)}: ${lolos ? 'LOLOS' : 'TIDAK LOLOS'}`);
process.exit(lolos ? 0 : 1);
