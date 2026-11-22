import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tanggalArtikel } from '../src/lib/tanggal.ts';

test('filePath relatif root proyek mengembalikan tanggal commit', () => {
	const tanggal = tanggalArtikel({ filePath: 'src/content/docs/index.mdx' });
	assert.ok(tanggal instanceof Date);
});

test('tanpa filePath/id/frontmatter tanggal mengembalikan null', () => {
	assert.equal(tanggalArtikel({}), null);
});

test('lastUpdated menang atas terakhir_diverifikasi dan tanggal commit', () => {
	const tanggal = new Date('2026-01-15T00:00:00Z');
	const hasil = tanggalArtikel({
		lastUpdated: tanggal,
		terakhir_diverifikasi: new Date('2026-02-01T00:00:00Z'),
		filePath: 'src/content/docs/index.mdx',
	});
	assert.equal(hasil, tanggal);
});
