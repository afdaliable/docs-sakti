import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parse } from 'yaml';

const BERKAS = '.github/workflows/ci.yml';
const mentah = fs.readFileSync(BERKAS, 'utf8');
const wf = parse(mentah);

test('ci.yml: pemicu hanya pull_request dan push ke main; permissions read', () => {
	const on = wf.on ?? wf['true'] ?? wf.true;
	assert.ok(on, 'tidak ada pemicu `on`');
	assert.ok('pull_request' in on);
	assert.deepEqual(on.push, { branches: ['main'] });
	assert.deepEqual(Object.keys(on).sort(), ['pull_request', 'push']);
	assert.deepEqual(wf.permissions, { contents: 'read' });
	for (const [nama, job] of Object.entries(wf.jobs)) {
		assert.equal(job.permissions, undefined, `job ${nama} punya permissions sendiri`);
	}
});

test('ci.yml: tanpa secret, tanpa deploy', () => {
	assert.ok(!mentah.includes('secrets.'), 'workflow memakai secrets.');
	for (const kata of ['deploy', 'wrangler', 'cloudflare', 'pages']) {
		const re = new RegExp(`\\b${kata}\\b`, 'i');
		assert.ok(!re.test(mentah), `workflow memuat kata terlarang: ${kata}`);
	}
});

test('ci.yml: semua action dipin ke SHA 40 heksadesimal', () => {
	const daftarUses = [...mentah.matchAll(/uses:\s*(\S+)/g)].map((m) => m[1]);
	assert.ok(daftarUses.length >= 4, `hanya ${daftarUses.length} uses:`);
	for (const u of daftarUses) {
		assert.match(u, /^[\w./-]+@[0-9a-f]{40}$/, `uses tidak dipin SHA: ${u}`);
	}
});

test('ci.yml: langkah run berurutan dan Lighthouse continue-on-error', () => {
	const steps = wf.jobs.periksa.steps;
	const urutanRun = steps.filter((s) => s.run).map((s) => s.run.trim());
	const patokan = [
		'pnpm install --frozen-lockfile',
		'pnpm check:content',
		'pnpm test',
		'pnpm build',
		'pnpm check:links',
		'pnpm check:dist',
		'pnpm search:eval --level 1',
		'pnpm test:e2e',
	];
	let posisi = 0;
	for (const p of patokan) {
		const indeks = urutanRun.findIndex((r, i) => i >= posisi && r === p);
		assert.ok(indeks !== -1, `perintah tidak ada/tidak urut: ${p}`);
		posisi = indeks + 1;
	}
	const langkahLhci = steps.findIndex(
		(s) => typeof s.run === 'string' && s.run.includes('lhci'),
	);
	assert.ok(langkahLhci !== -1, 'tidak ada langkah Lighthouse');
	assert.ok(langkahLhci > posisi - 1, 'Lighthouse harus setelah tes e2e');
	assert.equal(steps[langkahLhci]['continue-on-error'], true);
});

test('ci.yml: setiap skrip `pnpm <nama>` ada di package.json', () => {
	const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
	const dipakai = new Set(
		[...mentah.matchAll(/\bpnpm (?!exec|dlx|install)([a-z0-9:_-]+)/gi)].map(
			(m) => m[1],
		),
	);
	for (const nama of dipakai) {
		assert.ok(pkg.scripts[nama], `skrip tidak ada di package.json: ${nama}`);
	}
});

test('lighthouserc.json: JSON sah, 3 URL, semua asersi warn', () => {
	const rc = JSON.parse(fs.readFileSync('lighthouserc.json', 'utf8'));
	const url = rc.ci.collect.url;
	assert.equal(url.length, 3);
	for (const u of url) assert.ok(typeof u === 'string' && u.length > 0);
	for (const [nama, a] of Object.entries(rc.ci.assert.assertions)) {
		assert.ok(Array.isArray(a), `asersi bukan array: ${nama}`);
		assert.equal(a[0], 'warn', `asersi bukan warn: ${nama}`);
	}
});
