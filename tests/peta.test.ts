import { test } from 'node:test';
import assert from 'node:assert/strict';
import { uraiCsv, bacaPetaKonten } from '../src/lib/peta.ts';

test('uraiCsv menangani kutipan, koma, dan CRLF', () => {
	const tabel = uraiCsv('a,b,c\r\n1,"dua, koma","tiga ""kutip"""\r\n4,5,6\r\n');
	assert.deepEqual(tabel, [
		['a', 'b', 'c'],
		['1', 'dua, koma', 'tiga "kutip"'],
		['4', '5', '6'],
	]);
});

test('uraiCsv menangani baris kosong terakhir dan kolom kosong', () => {
	assert.deepEqual(uraiCsv('a,b\n1,\n'), [['a', 'b'], ['1', '']]);
	assert.deepEqual(uraiCsv(',ditolak,"catatan ""x""'), [['', 'ditolak', 'catatan "x"']]);
});

test('bacaPetaKonten memetakan kolom dengan benar', () => {
	const peta = bacaPetaKonten();
	assert.ok(peta.length > 0);
	for (const baris of peta) {
		assert.ok(typeof baris.target_path === 'string');
		assert.ok(typeof baris.jenis === 'string');
		assert.ok(!baris.target_path.includes('"'), baris.target_path);
	}
	const indeksMulai = peta.find((b) => b.target_path === 'mulai')!;
	assert.equal(indeksMulai.jenis, 'indeks');
	assert.equal(indeksMulai.modul, 'mulai');
	const ditolak = peta.filter((b) => b.jenis === 'ditolak');
	assert.ok(ditolak.length > 0);
	assert.ok(ditolak.every((b) => b.target_path === ''));
});
