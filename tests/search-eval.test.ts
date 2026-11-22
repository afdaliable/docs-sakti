import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parse } from 'yaml';
import {
	posisiHarapan,
	ringkasEval,
	validasiKueri,
	type BarisEval,
} from '../scripts/search/metrik.ts';

test('posisiHarapan menemukan posisi 1-based URL harapan', () => {
	assert.equal(posisiHarapan(['/a/', '/b/', '/c/'], ['/c/', '/x/']), 3);
	assert.equal(posisiHarapan(['/a/', '/b/', '/c/'], ['/z/']), null);
	assert.equal(posisiHarapan([], ['/a/']), null);
	assert.equal(posisiHarapan(['/a/', '/b/'], ['/c/', '/a/']), 1);
});

function baris(posisi: number | null, jumlah = 1, jumlahPagefind = 1): BarisEval {
	return {
		q: 'uji',
		harap: ['/x/'],
		dapat: [],
		posisi,
		jumlah,
		jumlahPagefind,
	};
}

test('ringkasEval menghitung hit@1, hit@3, mrr, pakaiMirip, tanpaHasil, dan gagal', () => {
	const b1 = baris(1, 10, 10);
	const b2 = baris(3, 5, 2);
	const b3 = baris(5, 8, 8);
	const b4 = baris(null, 0, 0);
	const r = ringkasEval([b1, b2, b3, b4]);
	assert.equal(r.jumlahKueri, 4);
	assert.equal(r.hit1, 0.25);
	assert.equal(r.hit3, 0.5);
	assert.ok(Math.abs(r.mrr - (1 + 1 / 3 + 1 / 5) / 4) < 1e-9, `mrr=${r.mrr}`);
	assert.equal(r.pakaiMirip, 1);
	assert.equal(r.tanpaHasil, 1);
	assert.deepEqual(r.gagal, [b3, b4]);
});

test('ringkasEval pada daftar kosong menghasilkan nol tanpa NaN', () => {
	const r = ringkasEval([]);
	assert.equal(r.jumlahKueri, 0);
	for (const kunci of ['hit1', 'hit3', 'mrr', 'pakaiMirip', 'tanpaHasil'] as const) {
		assert.equal(r[kunci], 0, kunci);
		assert.ok(!Number.isNaN(r[kunci]), kunci);
	}
	assert.deepEqual(r.gagal, []);
});

test('validasiKueri menerima daftar yang sah', () => {
	const hasil = validasiKueri([
		{ q: 'cara batal spm', harap: ['/pembayaran/spm/'] },
		{ q: 'lain', harap: ['/a/', '/b/c/'] },
	]);
	assert.equal(hasil.length, 2);
	assert.deepEqual(hasil[0], { q: 'cara batal spm', harap: ['/pembayaran/spm/'] });
});

test('validasiKueri melempar untuk masukan tidak sah', () => {
	assert.throws(() => validasiKueri('bukan array'), /daftar/);
	assert.throws(() => validasiKueri([{ q: ' ', harap: ['/a/'] }]), /"q" kosong/);
	assert.throws(() => validasiKueri([{ q: 'x', harap: [] }]), /"harap"/);
	assert.throws(() => validasiKueri([{ q: 'x', harap: ['/a/b'] }]), /tidak baku/);
	assert.throws(() => validasiKueri([{ q: 'x', harap: ['/A/'] }]), /tidak baku/);
	assert.throws(
		() => validasiKueri([{ q: 'sama', harap: ['/a/'] }, { q: 'sama', harap: ['/b/'] }]),
		/ganda/,
	);
});

test('queries.yaml asli lolos validasi dan cukup panjang', () => {
	const kueri = validasiKueri(parse(fs.readFileSync('tests/search/queries.yaml', 'utf8')));
	assert.ok(kueri.length >= 40, `hanya ${kueri.length} kueri`);
});
