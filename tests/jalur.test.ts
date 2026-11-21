import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jalurHalaman } from '../src/lib/jalur.ts';
import { muatKonfigurasi } from '../src/lib/modul.ts';

const konfigurasi = muatKonfigurasi();

test('menu_sakti membentuk segmen; segmen pertama menaut ke modul', () => {
	const jalur = jalurHalaman({
		menuSakti: 'Komitmen > RUH > Kontrak',
		modulSlug: 'komitmen',
		entryId: 'komitmen/ruh/pencatatan-kontrak',
		konfigurasi,
	});
	assert.deepEqual(jalur, [
		{ label: 'Komitmen', href: '/komitmen/' },
		{ label: 'RUH', href: undefined },
		{ label: 'Kontrak', href: undefined },
	]);
});

test('tanpa menu_sakti memakai nama modul dan sub dari id entri', () => {
	const jalur = jalurHalaman({
		modulSlug: 'komitmen',
		entryId: 'komitmen/ruh/pencatatan-kontrak',
		konfigurasi,
	});
	assert.deepEqual(jalur, [
		{ label: 'Komitmen', href: '/komitmen/' },
		{ label: 'RUH', href: '/komitmen/ruh/' },
	]);
});

test('entri tingkat modul hanya segmen modul; entri non-modul kosong', () => {
	assert.deepEqual(
		jalurHalaman({ entryId: 'komitmen', konfigurasi }),
		[{ label: 'Komitmen', href: '/komitmen/' }],
	);
	assert.deepEqual(jalurHalaman({ entryId: 'faq', konfigurasi }), []);
});

test('menu_sakti kosong jatuh ke jalur id', () => {
	const jalur = jalurHalaman({
		menuSakti: '  ',
		entryId: 'persediaan/tutup-buku/x',
		konfigurasi,
	});
	assert.equal(jalur[0].label, 'Persediaan');
	assert.equal(jalur[1].label, 'Tutup Buku');
});
