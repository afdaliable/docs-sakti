import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { hashSkripInline } from './csp-headers.ts';
import { tersembunyiDiProduksi } from '../src/lib/status.ts';
import { SITUS_URL } from '../src/lib/situs.ts';

const ROOT = path.resolve(process.env.E2E_DIST ?? 'dist');
const BATAS_BARIS = 2000;
const MAKS_CONTOH = 10;

const gagal = new Map<string, string[]>();
let ringkasan: [string, string][] = [];

function lapor(nama: string, pesan: string) {
	const daftar = gagal.get(nama) ?? [];
	daftar.push(pesan);
	gagal.set(nama, daftar);
}

function ok(nama: string, info = '') {
	ringkasan.push([nama, `OK ${info}`.trimEnd()]);
}

function selesai(nama: string, info = '') {
	if (gagal.has(nama)) ringkasan.push([nama, 'GAGAL']);
	else ok(nama, info);
}

function* berkas(dir: string, ekstensi: RegExp): Generator<string> {
	if (!fs.existsSync(dir)) return;
	for (const entri of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, entri.name);
		if (entri.isDirectory()) yield* berkas(p, ekstensi);
		else if (ekstensi.test(entri.name)) yield p;
	}
}

function frontmatter(isi: string): Record<string, unknown> {
	const cocok = isi.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	return cocok ? (parse(cocok[1]) ?? {}) : {};
}

if (!fs.existsSync(ROOT)) {
	console.error(`Direktori build tidak ada: ${ROOT}`);
	process.exit(1);
}

// ---------- 1. Sitemap ----------
{
	const nama = 'sitemap';
	const indeks = path.join(ROOT, 'sitemap-index.xml');
	if (!fs.existsSync(indeks)) {
		lapor(nama, 'sitemap-index.xml tidak ada');
	} else {
		const berkasSitemap = [...berkas(ROOT, /^sitemap-.*\.xml$/)];
		let jumlah = 0;
		for (const b of berkasSitemap) {
			for (const m of fs.readFileSync(b, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) {
				jumlah++;
				if (!m[1].startsWith(`${SITUS_URL}/`)) {
					lapor(nama, `${path.basename(b)}: ${m[1]}`);
				}
			}
		}
		selesai(nama, `${jumlah} URL, semua di bawah ${SITUS_URL}`);
	}
}

// ---------- 2. robots.txt ----------
{
	const nama = 'robots';
	const b = path.join(ROOT, 'robots.txt');
	if (!fs.existsSync(b)) {
		lapor(nama, 'robots.txt tidak ada');
	} else {
		const isi = fs.readFileSync(b, 'utf8');
		if (!/^User-agent: \*$/m.test(isi)) lapor(nama, 'tanpa baris "User-agent: *"');
		if (!isi.includes(`Sitemap: ${SITUS_URL}/sitemap-index.xml`)) {
			lapor(nama, `tanpa baris "Sitemap: ${SITUS_URL}/sitemap-index.xml"`);
		}
	}
	selesai(nama);
}

// ---------- 3. _headers + CSP ----------
{
	const nama = 'headers';
	const b = path.join(ROOT, '_headers');
	if (!fs.existsSync(b)) {
		lapor(nama, '_headers tidak ada');
	} else {
		const isi = fs.readFileSync(b, 'utf8');
		if (isi.includes('{{')) lapor(nama, 'masih memuat penanda templat {{');
		for (const [i, baris] of isi.split('\n').entries()) {
			if (baris.length > BATAS_BARIS) lapor(nama, `baris ${i + 1} > ${BATAS_BARIS} karakter`);
		}
		const csp = isi.match(/^ {2}Content-Security-Policy: (.+)$/m)?.[1] ?? '';
		const diHeaders = new Set(csp.match(/'sha256-[^']+'/g) ?? []);
		const diHtml = new Set<string>();
		for (const f of berkas(ROOT, /\.html$/)) {
			for (const t of hashSkripInline(fs.readFileSync(f, 'utf8'))) diHtml.add(t);
		}
		for (const t of diHtml) if (!diHeaders.has(t)) lapor(nama, `hash hilang di _headers: ${t}`);
		for (const t of diHeaders) if (!diHtml.has(t)) lapor(nama, `hash berlebih di _headers: ${t}`);
		selesai(nama, `${diHtml.size} hash skrip inline cocok`);
	}
}

// ---------- 4. 404 ----------
{
	const nama = '404';
	if (!fs.existsSync(path.join(ROOT, '404.html'))) lapor(nama, '404.html tidak ada');
	selesai(nama);
}

// ---------- 5. Host dev/staging ----------
{
	const nama = 'host-asing';
	const pola: [RegExp, string][] = [
		[/localhost/i, 'localhost'],
		[/127\.0\.0\.1/, '127.0.0.1'],
		[/0\.0\.0\.0/, '0.0.0.0'],
		[/(^|[^:a-z0-9-])([a-z0-9-]+\.pages\.dev)/i, 'pages.dev'],
	];
	for (const f of [
		...berkas(ROOT, /\.(html|xml|txt|json)$/),
		...(fs.existsSync(path.join(ROOT, '_headers')) ? [path.join(ROOT, '_headers')] : []),
	]) {
		const isi = fs.readFileSync(f, 'utf8');
		for (const [re] of pola) {
			const semua = [...isi.matchAll(new RegExp(re.source, 'gi'))];
			for (const s of semua.slice(0, MAKS_CONTOH)) {
				lapor(nama, `${path.relative(ROOT, f)}: "${s[0]}"`);
			}
		}
	}
	selesai(nama);
}

// ---------- 6. Canonical ----------
{
	const nama = 'canonical';
	for (const f of berkas(ROOT, /\.html$/)) {
		const isi = fs.readFileSync(f, 'utf8');
		const href = isi.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
		if (!href || !href.startsWith(`${SITUS_URL}/`)) {
			lapor(nama, `${path.relative(ROOT, f)}: ${href ?? 'canonical tidak ada'}`);
		}
	}
	selesai(nama);
}

// ---------- 7. perlu_review tampil; draft tersembunyi ----------
{
	const nama = 'perlu-review';
	const setSitemap = new Set<string>();
	for (const b of berkas(ROOT, /^sitemap-.*\.xml$/)) {
		for (const m of fs.readFileSync(b, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) setSitemap.add(m[1]);
	}
	const lite = new Set<string>(
		(fs.existsSync(path.join(ROOT, 'search-lite.json'))
			? (JSON.parse(fs.readFileSync(path.join(ROOT, 'search-lite.json'), 'utf8')) as {
					url: string;
				}[])
			: []
		).map((d) => d.url),
	);
	let nPerlu = 0;
	let nDraft = 0;
	for (const f of berkas('src/content/docs', /\.(md|mdx)$/)) {
		const isi = fs.readFileSync(f, 'utf8');
		const fm = frontmatter(isi);
		const rel = path
			.relative('src/content/docs', f)
			.replace(/\.(md|mdx)$/, '')
			.replace(/\/index$/, '');
		const url = `/${rel}/`;
		const berkasHtml = path.join(ROOT, rel, 'index.html');
		if (tersembunyiDiProduksi({ draft: fm.draft === true, status: String(fm.status ?? 'draft') })) {
			nDraft++;
			if (fs.existsSync(berkasHtml)) lapor(nama, `draft tetapi ada di build: ${url}`);
			continue;
		}
		if (fm.perlu_review !== true) continue;
		nPerlu++;
		if (!fs.existsSync(berkasHtml)) {
			lapor(nama, `halaman tidak ada: ${url}`);
			continue;
		}
		const html = fs.readFileSync(berkasHtml, 'utf8');
		const posBody = html.indexOf('data-pagefind-body');
		const posVerif = html.indexOf('Perlu verifikasi');
		if (posBody === -1) {
			lapor(nama, `${url}: tanpa data-pagefind-body`);
		} else if (posVerif === -1) {
			lapor(nama, `${url}: tanpa kotak Perlu verifikasi`);
		} else {
			const tagBody = html.slice(html.lastIndexOf('<', posBody), html.indexOf('>', posBody));
			if (tagBody.includes('data-pagefind-ignore')) {
				lapor(nama, `${url}: data-pagefind-body juga bertanda ignore`);
			}
			if (posVerif < posBody || posVerif > html.indexOf('</main>', posBody)) {
				lapor(nama, `${url}: kotak verifikasi di luar elemen data-pagefind-body`);
			}
		}
		if (!setSitemap.has(`${SITUS_URL}${url}`)) lapor(nama, `${url}: tidak ada di sitemap`);
		if ((fm as { pagefind?: boolean }).pagefind !== false && !lite.has(url)) {
			lapor(nama, `${url}: tidak ada di search-lite.json`);
		}
	}
	selesai(nama, `${nPerlu} artikel perlu_review tampil, ${nDraft} draft tersembunyi`);
}

// ---------- 8. Pagefind ----------
{
	const nama = 'pagefind';
	const entry = path.join(ROOT, 'pagefind', 'pagefind-entry.json');
	if (!fs.existsSync(entry)) {
		lapor(nama, 'pagefind-entry.json tidak ada');
	} else {
		const jumlah = Object.values(
			(JSON.parse(fs.readFileSync(entry, 'utf8')) as {
				languages: Record<string, { page_count: number }>;
			}).languages,
		).reduce((a, l) => a + l.page_count, 0);
		let diHtml = 0;
		for (const f of berkas(ROOT, /\.html$/)) {
			if (fs.readFileSync(f, 'utf8').includes('data-pagefind-body')) diHtml++;
		}
		if (jumlah !== diHtml) {
			lapor(nama, `pagefind mengindeks ${jumlah} halaman, ${diHtml} HTML ber-pagefind-body`);
		}
		selesai(nama, `${jumlah} halaman terindeks`);
	}
}

for (const [nama, daftar] of gagal) {
	console.log(`GAGAL ${nama}:`);
	for (const p of daftar.slice(0, MAKS_CONTOH)) console.log(`  - ${p}`);
	if (daftar.length > MAKS_CONTOH) console.log(`  … ${daftar.length - MAKS_CONTOH} lainnya`);
}
console.log('');
for (const [nama, hasil] of ringkasan) console.log(`${hasil.padEnd(6)} ${nama}`);
process.exit(gagal.size > 0 ? 1 : 0);
