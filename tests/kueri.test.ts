import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
	bentukVarian,
	tokenisasi,
	MAKS_VARIAN,
	type EntriSinonim,
	type KamusKueri,
} from '../src/lib/cari/kueri.ts';

const sinonim = JSON.parse(
	fs.readFileSync(path.resolve('src/data/sinonim.json'), 'utf8'),
) as EntriSinonim[];
const kamus = JSON.parse(
	fs.readFileSync(path.resolve('src/data/kata-kueri.json'), 'utf8'),
) as KamusKueri;

test('tokenisasi memecah spasi, tanda hubung, dan tanda tanya', () => {
	assert.deepEqual(tokenisasi('Cara  Batal-SPM?'), ['cara', 'batal', 'spm']);
});

test('bentukVarian menormalkan kata sehari-hari dan membuang kata umum', () => {
	const varian = bentukVarian('cara bikin kontrak tahunan sakti', sinonim, kamus);
	assert.deepEqual(varian.semua, [
		'cara bikin kontrak tahunan sakti',
		'cara buat kontrak tahunan sakti',
		'buat kontrak tahunan',
	]);
});

test('bentukVarian mengekspansi sinonim ke istilah', () => {
	const varian = bentukVarian('gak bisa login sakti', sinonim, kamus);
	assert.deepEqual(varian.semua, [
		'gak bisa login sakti',
		'tidak bisa login sakti',
		'tidak bisa login',
		'mfa',
	]);
	assert.ok(varian.istilah.includes('mfa'));
});

test('bentukVarian mengekspansi ejaan alternatif', () => {
	const varian = bentukVarian('adendum kontrak', sinonim, kamus);
	assert.deepEqual(varian.semua, ['adendum kontrak', 'addendum kontrak']);
});

test('bentukVarian tidak menghabiskan kueri yang hanya kata umum', () => {
	const varian = bentukVarian('cara', sinonim, kamus);
	assert.deepEqual(varian.inti, ['cara']);
});

test('bentukVarian aman terhadap properti bawaan Object', () => {
	const varian = bentukVarian('constructor toString', sinonim, kamus);
	assert.equal(varian.semua[0], 'constructor tostring');
});

test('jumlah varian tidak melebihi MAKS_VARIAN', () => {
	const varian = bentukVarian('gaji akun aset jurnal otp tte input pelaporan', sinonim, kamus);
	assert.ok(varian.semua.length <= MAKS_VARIAN);
});
