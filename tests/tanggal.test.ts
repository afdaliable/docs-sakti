import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { tanggalArtikel, uraiLogGit } from '../src/lib/tanggal.ts';

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

test('uraiLogGit memetakan berkas ke tanggal commit terbaru', () => {
	const keluaran =
		'\x002026-03-02T10:00:00+07:00\n\nsrc/content/docs/a.mdx\nsrc/content/docs/b.mdx\n' +
		'\x002026-01-01T10:00:00+07:00\n\nsrc/content/docs/a.mdx\nsrc/content/docs/c.mdx\n' +
		'\x00bukan-tanggal\n\nsrc/content/docs/d.mdx\n';
	const hasil = uraiLogGit(keluaran, '/akar');
	assert.equal(hasil.size, 3);
	assert.equal(
		hasil.get(path.resolve('/akar', 'src/content/docs/a.mdx'))?.toISOString(),
		'2026-03-02T03:00:00.000Z',
	);
	assert.equal(
		hasil.get(path.resolve('/akar', 'src/content/docs/b.mdx'))?.toISOString(),
		'2026-03-02T03:00:00.000Z',
	);
	assert.equal(
		hasil.get(path.resolve('/akar', 'src/content/docs/c.mdx'))?.toISOString(),
		'2026-01-01T03:00:00.000Z',
	);
	assert.equal(hasil.has(path.resolve('/akar', 'src/content/docs/d.mdx')), false);
});

test('tanggal commit artikel di docs sama dengan git log per berkas', () => {
	const filePath = 'src/content/docs/index.mdx';
	const tanggal = tanggalArtikel({ filePath });
	const dariGit = new Date(
		execFileSync('git', ['log', '-1', '--format=%cI', '--', filePath], { encoding: 'utf8' }).trim(),
	).toISOString();
	assert.equal(tanggal?.toISOString(), dariGit);
});

test('tanggal commit berkas di luar docs sama dengan git log per berkas', () => {
	const filePath = 'package.json';
	const tanggal = tanggalArtikel({ filePath });
	const dariGit = new Date(
		execFileSync('git', ['log', '-1', '--format=%cI', '--', filePath], { encoding: 'utf8' }).trim(),
	).toISOString();
	assert.equal(tanggal?.toISOString(), dariGit);
});

test('id artikel menghasilkan tanggal yang sama dengan filePath', () => {
	const dariId = tanggalArtikel({ id: 'index' });
	const dariFilePath = tanggalArtikel({ filePath: 'src/content/docs/index.mdx' });
	assert.ok(dariId instanceof Date);
	assert.equal(dariId.getTime(), dariFilePath?.getTime());
});

test('filePath yang tidak ada di git mengembalikan null', () => {
	assert.equal(tanggalArtikel({ filePath: 'src/content/docs/__tidak-ada__.mdx' }), null);
});
