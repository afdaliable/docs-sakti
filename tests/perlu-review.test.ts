import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { tersembunyiDiProduksi } from '../src/lib/status.ts';

function daftarKonten(dir: string): string[] {
	const hasil: string[] = [];
	for (const entri of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, entri.name);
		if (entri.isDirectory()) hasil.push(...daftarKonten(p));
		else if (/\.(md|mdx)$/.test(entri.name)) hasil.push(p);
	}
	return hasil;
}

function frontmatter(isi: string): Record<string, unknown> {
	const cocok = isi.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	return cocok ? (parse(cocok[1]) ?? {}) : {};
}

test('tersembunyiDiProduksi: hanya draft yang disembunyikan', () => {
	type Data = { draft?: boolean; status?: string; perlu_review?: boolean };
	assert.equal(
		tersembunyiDiProduksi({ status: 'review', perlu_review: true } as Data),
		false,
	);
	assert.equal(
		tersembunyiDiProduksi({ status: 'terbit', perlu_review: true } as Data),
		false,
	);
	assert.equal(
		tersembunyiDiProduksi({ status: 'draft', perlu_review: true } as Data),
		true,
	);
	assert.equal(tersembunyiDiProduksi({ status: 'draft' }), true);
	assert.equal(
		tersembunyiDiProduksi({ draft: true, status: 'review' }),
		true,
	);
	assert.equal(tersembunyiDiProduksi({ status: 'review' }), false);
});

test('artikel perlu_review punya kotak "Perlu verifikasi"', () => {
	const berkas = daftarKonten('src/content/docs');
	const perluReview: string[] = [];
	const bermasalah: string[] = [];
	for (const p of berkas) {
		const isi = fs.readFileSync(p, 'utf8');
		const fm = frontmatter(isi);
		if (fm.perlu_review !== true) continue;
		perluReview.push(p);
		const tubuh = isi.replace(/^---\r?\n[\s\S]*?\r?\n---/, '');
		if (!/title="Perlu verifikasi"|:::caution\[Perlu verifikasi\]/.test(tubuh)) {
			bermasalah.push(p);
		}
	}
	assert.ok(
		perluReview.length >= 100,
		`hanya ${perluReview.length} artikel perlu_review (minimal 100)`,
	);
	assert.equal(
		bermasalah.length,
		0,
		`artikel perlu_review tanpa kotak "Perlu verifikasi":\n${bermasalah.join('\n')}`,
	);
});

test('filter keterlihatan tidak melihat perlu_review', () => {
	const pesan = 'artikel perlu_review harus tetap tampil di produksi dan pencarian (K70)';
	const bersih = [
		'src/lib/status.ts',
		'src/lib/artikel.ts',
		'src/pages/search-lite.json.ts',
		'src/pages/peran/[slug].astro',
		'scripts/build-sidebar.ts',
	];
	for (const p of bersih) {
		const isi = fs.readFileSync(p, 'utf8');
		assert.ok(!isi.includes('perlu_review'), `${p}: ${pesan}`);
	}
	const konfig = fs.readFileSync('src/content.config.ts', 'utf8');
	const jumlah = konfig.split('perlu_review').length - 1;
	assert.equal(jumlah, 1, `src/content.config.ts: ${pesan}`);
});
