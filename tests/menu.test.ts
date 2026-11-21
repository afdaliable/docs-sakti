import { test } from 'node:test';
import assert from 'node:assert/strict';
import { muatKonfigurasi } from '../src/lib/modul.ts';
import { muatMenu, bersihLabel, cariJalurMenu, jalurMenuBaku } from '../src/lib/menu.ts';
import { bacaPetaKonten } from '../src/lib/peta.ts';

test('cariJalurMenu menemukan simpul dan form', () => {
	assert.deepEqual(cariJalurMenu('komitmen > ruh > kontrak'), ['Komitmen', 'RUH', 'Kontrak']);
	const piutang = cariJalurMenu(
		'Piutang > Pengelolaan Piutang > Pencatatan > Pencatatan Piutang / Tagihan',
	);
	assert.equal(piutang?.[piutang.length - 1], 'Pencatatan Piutang/Tagihan');
	assert.equal(cariJalurMenu('Modul > Tidak > Ada'), null);
});

test('modul ber-kode sama dengan simpul teratas menu.json', () => {
	const konfigurasi = muatKonfigurasi();
	const menu = muatMenu();
	const modulBerkode = konfigurasi.modul.filter((m) => m.kode !== undefined);
	assert.deepEqual(
		modulBerkode.map((m) => m.kode),
		menu.map((n) => n.kode),
	);
	for (const [i, modul] of modulBerkode.entries()) {
		assert.equal(modul.nama, bersihLabel(menu[i].label), modul.slug);
	}
});

test('sub ber-kode sama dengan children simpul menu.json', () => {
	const konfigurasi = muatKonfigurasi();
	const menu = muatMenu();
	for (const modul of konfigurasi.modul.filter((m) => m.kode !== undefined)) {
		const simpul = menu.find((n) => n.kode === modul.kode)!;
		const subBerkode = modul.sub.filter((s) => s.kode !== undefined);
		assert.deepEqual(
			subBerkode.map((s) => [s.kode, s.nama]),
			simpul.children.map((c) => [c.kode, bersihLabel(c.label)]),
			modul.slug,
		);
		const indeksTanpaKode = modul.sub.findIndex((s) => s.kode === undefined);
		if (indeksTanpaKode !== -1) {
			assert.ok(
				modul.sub.slice(0, indeksTanpaKode).every((s) => s.kode !== undefined),
				`${modul.slug}: sub tanpa kode harus setelah sub ber-kode`,
			);
		}
	}
});

test('menu_sakti di peta konten memakai jalur baku', () => {
	for (const baris of bacaPetaKonten()) {
		if (baris.menu_sakti.trim() === '') continue;
		assert.equal(
			jalurMenuBaku(baris.menu_sakti),
			baris.menu_sakti,
			`target_path ${baris.target_path || '(ditolak)'}: ${baris.menu_sakti}`,
		);
	}
});

test('target_path peta konten cocok dengan modul dan sub', () => {
	const konfigurasi = muatKonfigurasi();
	const slugModul = new Map(konfigurasi.modul.map((m) => [m.slug, m]));
	const slugLintas = new Set(konfigurasi.lintas.map((l) => l.slug));
	for (const baris of bacaPetaKonten()) {
		if (baris.jenis === 'ditolak' || baris.target_path === '') continue;
		const segmen = baris.target_path.split('/');
		const modul = slugModul.get(segmen[0]);
		assert.ok(
			modul !== undefined || slugLintas.has(segmen[0]),
			`segmen pertama "${segmen[0]}" bukan modul/lintas (${baris.target_path})`,
		);
		if (modul !== undefined && segmen.length >= 3) {
			assert.ok(
				modul.sub.some((s) => s.slug === segmen[1]),
				`segmen kedua "${segmen[1]}" bukan sub ${modul.slug} (${baris.target_path})`,
			);
		}
	}
});
