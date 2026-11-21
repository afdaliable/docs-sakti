import { test } from 'node:test';
import assert from 'node:assert/strict';
import { muatKonfigurasi, labelDariSlug } from '../src/lib/modul.ts';

test('19 modul dalam urutan YAML', () => {
	const konfigurasi = muatKonfigurasi();
	assert.deepEqual(
		konfigurasi.modul.map((m) => m.slug),
		[
			'mulai',
			'admin',
			'referensi',
			'sinkronisasi-renja-rka',
			'penganggaran',
			'komitmen',
			'bendahara-valas',
			'bendahara',
			'komitmen-valas',
			'pembayaran',
			'persediaan',
			'aset-tetap',
			'piutang',
			'akuntansi-pelaporan',
			'bendahara-umum-blu',
			'kpjm',
			'kppn-bun',
			'laporan',
			'transfer-ke-daerah',
		],
	);
});

test('hanya modul mulai yang tanpa kode', () => {
	const konfigurasi = muatKonfigurasi();
	const tanpaKode = konfigurasi.modul.filter((m) => m.kode === undefined).map((m) => m.slug);
	assert.deepEqual(tanpaKode, ['mulai']);
});

test('sub berupa objek mempertahankan nama', () => {
	const konfigurasi = muatKonfigurasi();
	const komitmen = konfigurasi.modul.find((m) => m.slug === 'komitmen')!;
	const upload = komitmen.sub.find((s) => s.slug === 'upload')!;
	assert.equal(upload.nama, 'Upload / Import');
	assert.equal(upload.kode, 'KOM_UPLOAD');
});

test('sub tanpa kode adalah sub khusus KB', () => {
	const konfigurasi = muatKonfigurasi();
	const admin = konfigurasi.modul.find((m) => m.slug === 'admin')!;
	const pkipa = admin.sub.find((s) => s.slug === 'pkipa')!;
	assert.equal(pkipa.kode, undefined);
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
