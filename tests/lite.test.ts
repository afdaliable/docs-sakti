import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ambilHeading, bentukDokumenLite } from '../src/lib/cari/lite.ts';
import { muatKonfigurasi } from '../src/lib/modul.ts';

const konfigurasi = muatKonfigurasi();

test('ambilHeading mengambil h2/h3, mengabaikan blok kode, h4, dan format tebal', () => {
	const body = [
		'# Judul',
		'',
		'## Langkah **Pertama** {#langkah-pertama}',
		'',
		'```',
		'## bukan heading',
		'```',
		'',
		'### Sub `rincian`',
		'#### Terlalu dalam',
		'',
		'##   ',
	].join('\n');
	assert.deepEqual(ambilHeading(body), ['Langkah Pertama', 'Sub rincian']);
});

test('bentukDokumenLite membentuk breadcrumb Modul › Sub dan url artikel', () => {
	const dok = bentukDokumenLite(
		{
			id: 'komitmen/ruh/pencatatan-kontrak/kontrak-tahunan',
			body: '## Prasyarat',
			data: {
				title: 'Kontrak Tahunan',
				description: 'Cara mencatat kontrak tahunan.',
				modul: 'komitmen',
				peran: ['admin'],
				jenis: 'juknis',
				kata_kunci: ['kontrak tahunan'],
			},
		},
		konfigurasi,
		'/',
	);
	assert.equal(dok.url, '/komitmen/ruh/pencatatan-kontrak/kontrak-tahunan/');
	assert.equal(dok.modul, 'komitmen');
	assert.equal(dok.breadcrumb, 'Komitmen › RUH');
	assert.equal(dok.label_jenis, 'Juknis');
	assert.deepEqual(dok.heading, ['Prasyarat']);
});

test('bentukDokumenLite untuk entri akar memakai base', () => {
	const dok = bentukDokumenLite(
		{ id: 'index', data: { title: 'Beranda', jenis: 'indeks' } },
		konfigurasi,
		'/',
	);
	assert.equal(dok.url, '/');
	assert.equal(dok.modul, '');
	assert.equal(dok.breadcrumb, '');
});
