import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SITUS_URL } from '../src/lib/situs.ts';
import { hashSkripInline, isiHeaders, PENANDA_HASH } from '../scripts/csp-headers.ts';
import { uraiHeaders, headerUntuk } from './e2e/headers.ts';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

test('site: SITUS_URL produksi, tanpa pages.dev', () => {
	assert.equal(SITUS_URL, 'https://docs.sakti.ai.id');
	const konfig = fs.readFileSync('astro.config.mjs', 'utf8');
	assert.ok(konfig.includes('site: SITUS_URL'));
	assert.ok(!konfig.includes('pages.dev'));
});

test('_headers: aturan /* memuat CSP ketat dan header keamanan', () => {
	const teks = fs.readFileSync('public/_headers', 'utf8');
	const aturan = uraiHeaders(teks);
	const h = headerUntuk(aturan, 'docs.sakti.ai.id', '/');
	assert.ok(h['content-security-policy'], 'CSP tidak terpasang untuk /');
	assert.equal(teks.split(PENANDA_HASH).length - 1, 1, 'penanda hash harus tepat 1x');
	const csp = h['content-security-policy'];
	const skripSrc = csp.match(/script-src ([^;]+)/)?.[1] ?? '';
	assert.ok(skripSrc.includes("'wasm-unsafe-eval'"));
	for (const terlarang of ["'unsafe-inline'", "'unsafe-eval'", 'http:', 'https:']) {
		assert.ok(!skripSrc.includes(terlarang), `script-src memuat ${terlarang}`);
	}
	assert.ok(!/(^|\s)\*(\s|$)/.test(skripSrc), 'script-src memuat wildcard *');
	for (const direktif of [
		"frame-ancestors 'none'",
		"object-src 'none'",
		"base-uri 'self'",
	]) {
		assert.ok(csp.includes(direktif), `CSP tanpa ${direktif}`);
	}
	assert.equal(h['x-content-type-options'], 'nosniff');
	assert.equal(h['referrer-policy'], 'strict-origin-when-cross-origin');
	assert.ok(h['permissions-policy'], 'Permissions-Policy tidak ada');
	assert.equal(h['cache-control'], 'public, max-age=0, must-revalidate');
	assert.equal(h['x-robots-tag'], undefined);
});

test('_headers: /_astro/* immutable dan CSP tetap ada', () => {
	const aturan = uraiHeaders(fs.readFileSync('public/_headers', 'utf8'));
	const h = headerUntuk(aturan, 'docs.sakti.ai.id', '/_astro/x.abc123.js');
	assert.equal(h['cache-control'], 'public, max-age=31536000, immutable');
	assert.ok(h['content-security-policy']);
});

test('_headers: pages.dev di-noindex', () => {
	const aturan = uraiHeaders(fs.readFileSync('public/_headers', 'utf8'));
	for (const host of ['apa-saja.pages.dev', 'abc123.apa-saja.pages.dev']) {
		assert.equal(
			headerUntuk(aturan, host, '/apa/pun')['x-robots-tag'],
			'noindex',
			`${host} harus noindex`,
		);
	}
});

test('_headers: batas baris dan jumlah aturan', () => {
	const teks = fs.readFileSync('public/_headers', 'utf8');
	for (const [i, baris] of teks.split('\n').entries()) {
		assert.ok(baris.length <= 2000, `baris ${i + 1} > 2000 karakter`);
	}
	assert.ok(uraiHeaders(teks).length <= 100, 'lebih dari 100 aturan');
});

test('hashSkripInline: vektor, src, json, module', () => {
	assert.deepEqual(hashSkripInline('<script>alert(1)</script>'), [
		"'sha256-bhHHL3z2vDgxUt0W3dWQOrprscmda2Y5pLsLg4GF+pI='",
	]);
	assert.deepEqual(hashSkripInline('<script src="/a.js"></script>'), []);
	assert.deepEqual(hashSkripInline('<script type="application/ld+json">{}</script>'), []);
	assert.equal(hashSkripInline('<script type="module">x</script>').length, 1);
	assert.equal(hashSkripInline('<script></script>').length, 0);
	const utf8 = hashSkripInline('<script>teks = "péněženka"</script>');
	assert.match(utf8[0], /^'sha256-[A-Za-z0-9+/=]+'$/);
});

test('isiHeaders: isi penanda, dedupe+sort, validasi galat', () => {
	const templat = `/*\n  CSP: ${PENANDA_HASH}\n`;
	const isi = isiHeaders(templat, ["'sha256-bbb'", "'sha256-aaa'", "'sha256-bbb'"]);
	assert.ok(isi.includes("'sha256-aaa' 'sha256-bbb'"));
	assert.ok(!isi.includes('{{'));
	assert.throws(() => isiHeaders('/*\n  X: y\n', ["'sha256-a'"]), /penanda/);
	assert.throws(() => isiHeaders(templat, []), /skrip inline/);
	const panjang = `'sha256-${'x'.repeat(3000)}'`;
	assert.throws(() => isiHeaders(templat, [panjang]), /2000|karakter/);
});

test('versi: .nvmrc >= engines.node, packageManager pnpm', () => {
	const nvmrc = fs.readFileSync('.nvmrc', 'utf8').trim();
	const min = pkg.engines.node.match(/(\d+)/)[1];
	assert.ok(Number(nvmrc.split('.')[0]) >= Number(min), `${nvmrc} < ${pkg.engines.node}`);
	assert.match(pkg.packageManager, /^pnpm@\d+\.\d+\.\d+$/);
	assert.ok(pkg.scripts['build:pages'].includes('--unshallow'));
	assert.ok(pkg.scripts['build:pages'].includes('pnpm build'));
});

test('dokumen deploy menyebut versi dan perintah yang sama', () => {
	const doc = fs.readFileSync('docs/deploy-cloudflare.md', 'utf8');
	const nvmrc = fs.readFileSync('.nvmrc', 'utf8').trim();
	const pnpm = pkg.packageManager.replace('pnpm@', '');
	assert.match(
		doc,
		new RegExp(`\`NODE_VERSION\`\\s*\\|\\s*\`${nvmrc.replace(/\./g, '\\.')}\``),
		'dok tanpa `NODE_VERSION` | `<.nvmrc>`',
	);
	assert.match(
		doc,
		new RegExp(`\`PNPM_VERSION\`\\s*\\|\\s*\`${pnpm.replace(/\./g, '\\.')}\``),
		'dok tanpa `PNPM_VERSION` | `<packageManager>`',
	);
	assert.ok(doc.includes('pnpm build:pages'));
	assert.match(doc, /Build output directory\s*\|\s*`dist`/);
});

test('tidak ada dependensi wrangler', () => {
	const semua = [
		...Object.keys(pkg.dependencies ?? {}),
		...Object.keys(pkg.devDependencies ?? {}),
	];
	assert.ok(!semua.includes('wrangler'), 'wrangler tidak boleh jadi dependensi');
});
