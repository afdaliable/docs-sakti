import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buatPencariMirip } from '../src/lib/cari/mirip.ts';
import type { DokumenLite } from '../src/lib/cari/level1.ts';

function dok(over: Partial<DokumenLite>): DokumenLite {
	return {
		url: '/x/',
		judul: 'Dokumen',
		deskripsi: '',
		kata_kunci: [],
		heading: [],
		modul: '',
		peran: [],
		jenis: 'juknis',
		label_jenis: 'Juknis',
		breadcrumb: '',
		...over,
	};
}

test('menemukan dokumen walau salah ketik satu huruf', () => {
	const cari = buatPencariMirip([
		dok({ url: '/ubah-sandi/', judul: 'Ubah Kata Sandi', kata_kunci: ['lupa password'] }),
		dok({ url: '/lain/', judul: 'Kontrak Tahunan' }),
	]);
	const hasil = cari('pasword');
	assert.ok(hasil.some((d) => d.url === '/ubah-sandi/'));
});

test('kecocokan judul diurutkan di atas kecocokan heading', () => {
	const cari = buatPencariMirip([
		dok({ url: '/heading/', judul: 'Artikel Biasa', heading: ['Mencatat kontrak tahunan'] }),
		dok({ url: '/judul/', judul: 'Kontrak Tahunan' }),
	]);
	const hasil = cari('kontrak tahunan');
	assert.equal(hasil[0].url, '/judul/');
});
