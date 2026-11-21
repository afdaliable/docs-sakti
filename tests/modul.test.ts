import { test } from 'node:test';
import assert from 'node:assert/strict';
import { muatKonfigurasi, labelDariSlug } from '../src/lib/modul.ts';

test('12 modul dalam urutan YAML', () => {
	const konfigurasi = muatKonfigurasi();
	assert.deepEqual(
		konfigurasi.modul.map((m) => m.slug),
		[
			'mulai',
			'admin',
			'referensi',
			'penganggaran',
			'komitmen',
			'pembayaran',
			'bendahara',
			'persediaan',
			'aset-tetap',
			'piutang',
			'akuntansi-pelaporan',
			'kppn-bun',
		],
	);
});

test('sub berupa string mendapat nama bawaan dari slug', () => {
	const konfigurasi = muatKonfigurasi();
	const persediaan = konfigurasi.modul.find((m) => m.slug === 'persediaan')!;
	const transaksiMasuk = persediaan.sub.find((s) => s.slug === 'transaksi-masuk')!;
	assert.equal(transaksiMasuk.nama, 'Transaksi Masuk');
});

test('sub berupa objek mempertahankan nama', () => {
	const konfigurasi = muatKonfigurasi();
	const komitmen = konfigurasi.modul.find((m) => m.slug === 'komitmen')!;
	const escrow = komitmen.sub.find((s) => s.slug === 'escrow')!;
	assert.equal(escrow.nama, 'Proses Escrow');
});

test('9 peran', () => {
	assert.equal(muatKonfigurasi().peran.length, 9);
});

test('6 lintas', () => {
	assert.equal(muatKonfigurasi().lintas.length, 6);
});

test('labelDariSlug membentuk Title Case', () => {
	assert.equal(labelDariSlug('aset-tetap'), 'Aset Tetap');
});
