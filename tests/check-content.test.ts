import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { periksaBerkas } from '../scripts/check-content.ts';
import { muatKonfigurasi } from '../src/lib/modul.ts';

const konfigurasi = muatKonfigurasi();
const kontak = { nomor_diizinkan: ['1500537'], email_diizinkan: ['hai.djpb@kemenkeu.go.id'] };

function periksa(rel: string, isi: string) {
	return periksaBerkas({
		jalur: path.resolve(process.cwd(), 'src/content/docs', rel),
		isi,
		konfigurasi,
		kontak,
	});
}

const kode = (t: { kode: string }[]) => t.map((x) => x.kode);

test('NIK 16 digit dan NIP 18 digit di badan', () => {
	const dasar = '---\ntitle: X\nmodul: komitmen\nsumber: [{judul: a, url: "https://a.b/c", jenis: lainnya, diambil: 2026-01-01}]\n---\n\n';
	assert.ok(kode(periksa('komitmen/x.md', dasar + 'NIK 1234567890123456 tercantum.')).includes('data-pribadi-nik'));
	const nip = kode(periksa('komitmen/x.md', dasar + 'NIP 123456789012345678 tercantum.'));
	assert.ok(nip.includes('data-pribadi-nip'));
	assert.ok(!nip.includes('data-pribadi-nik'));
	assert.ok(!kode(periksa('komitmen/x.md', dasar + 'Nomor 12345678901234567890 aman.')).includes('data-pribadi-nik'));
	assert.ok(!kode(periksa('komitmen/x.md', dasar + 'Nomor 12345678901234567890 aman.')).includes('data-pribadi-nip'));
});

test('nomor HP berbagai format terdeteksi', () => {
	const dasar = '---\ntitle: X\nmodul: komitmen\nsumber: [{judul: a, url: "https://a.b/c", jenis: lainnya, diambil: 2026-01-01}]\n---\n\n';
	for (const hp of ['081234567890', '+6281234567890', '0812-3456-7890', '0812 3456 7890']) {
		assert.ok(
			kode(periksa('komitmen/x.md', dasar + `Hubungi ${hp}.`)).includes('data-pribadi-hp'),
			hp,
		);
	}
});

test('angka panjang di URL sumber dan target tautan diabaikan', () => {
	const fm = '---\ntitle: X\nmodul: komitmen\nsumber: [{judul: a, url: "https://drive.google.com/d/1234567890123456", jenis: google-drive, diambil: 2026-01-01}]\n---\n\n[Lihat](https://example.com/1234567890123456)';
	assert.equal(kode(periksa('komitmen/x.md', fm)).filter((k) => k.startsWith('data-pribadi')).length, 0);
});

test('allowlist kontak dan email pribadi', () => {
	const dasar = '---\ntitle: X\nmodul: komitmen\nsumber: [{judul: a, url: "https://a.b/c", jenis: lainnya, diambil: 2026-01-01}]\n---\n\n';
	assert.equal(kode(periksa('komitmen/x.md', dasar + 'Hubungi 1500537.')).filter((k) => k.startsWith('data-pribadi')).length, 0);
	assert.ok(kode(periksa('komitmen/x.md', dasar + 'Email seseorang@gmail.com.')).includes('data-pribadi-email'));
	assert.equal(kode(periksa('komitmen/x.md', dasar + 'Email hai.djpb@kemenkeu.go.id.')).filter((k) => k === 'data-pribadi-email').length, 0);
});

test('kewajiban modul dan sumber', () => {
	assert.ok(kode(periksa('komitmen/x.md', '---\ntitle: X\nsumber: [{judul: a, url: "https://a.b/c", jenis: lainnya, diambil: 2026-01-01}]\n---\n')).includes('modul-kosong'));
	assert.ok(kode(periksa('komitmen/x.md', '---\ntitle: X\nmodul: komitmen\n---\n')).includes('sumber-kosong'));
	assert.ok(!kode(periksa('komitmen/index.mdx', '---\ntitle: X\nmodul: komitmen\n---\n')).includes('sumber-kosong'));
	assert.ok(kode(periksa('komitmen/x.md', '---\ntitle: X\nmodul: pembayaran\nsumber: [{judul: a, url: "https://a.b/c", jenis: lainnya, diambil: 2026-01-01}]\n---\n')).includes('modul-tidak-cocok'));
});

test('gambar tanpa alt', () => {
	const dasar = '---\ntitle: X\nmodul: komitmen\nsumber: [{judul: a, url: "https://a.b/c", jenis: lainnya, diambil: 2026-01-01}]\n---\n\n';
	assert.ok(kode(periksa('komitmen/x.md', dasar + '![](x.webp)')).includes('gambar-tanpa-alt'));
	assert.ok(kode(periksa('komitmen/x.md', dasar + '<img src="x.webp">')).includes('gambar-tanpa-alt'));
	assert.ok(!kode(periksa('komitmen/x.md', dasar + '![Form kontrak](x.webp)')).includes('gambar-tanpa-alt'));
});

test('tautan situs lama', () => {
	const dasar = '---\ntitle: X\nmodul: komitmen\nsumber: [{judul: a, url: "https://a.b/c", jenis: lainnya, diambil: 2026-01-01}]\n---\n\n';
	assert.ok(kode(periksa('komitmen/x.md', dasar + '[x](https://sites.google.com/view/saktipelaporan/faq)')).includes('tautan-situs-lama'));
	const fm = '---\ntitle: X\nmodul: komitmen\nsumber: [{judul: a, url: "https://sites.google.com/view/saktipelaporan/faq", jenis: google-sites, diambil: 2026-01-01}]\n---\n';
	assert.ok(!kode(periksa('komitmen/x.md', fm)).includes('tautan-situs-lama'));
	assert.ok(!kode(periksa('komitmen/x.md', dasar + '## Unduh juknis asli\n\n[x](https://sites.google.com/view/saktipelaporan/faq)')).includes('tautan-situs-lama'));
});

test('perlu_review hanya peringatan', () => {
	const t = periksa('komitmen/x.md', '---\ntitle: X\nmodul: komitmen\nperlu_review: true\nsumber: [{judul: a, url: "https://a.b/c", jenis: lainnya, diambil: 2026-01-01}]\n---\n');
	assert.ok(kode(t).includes('perlu-review'));
	assert.equal(t.filter((x) => x.tingkat === 'galat').length, 0);
});

test('daftar nomor akun tidak dianggap NIK/NIP', () => {
	const dasar = '---\ntitle: X\nmodul: komitmen\nsumber: [{judul: a, url: "https://a.b/c", jenis: lainnya, diambil: 2026-01-01}]\n---\n\n';
	const pii = (t: { kode: string }[]) => t.filter((x) => x.kode.startsWith('data-pribadi'));
	assert.equal(pii(periksa('komitmen/x.md', dasar + 'Akun 117911 117912 117913')).length, 0);
	assert.equal(pii(periksa('komitmen/x.md', dasar + 'Nilai 100 200 300 400 500 600')).length, 0);
	assert.equal(pii(periksa('komitmen/x.md', dasar + 'tahun 2008 1234 5678')).filter((x) => x.kode === 'data-pribadi-hp').length, 0);
});

test('indeks sub-menu dengan modul salah', () => {
	const t = periksa('komitmen/ruh/index.mdx', '---\ntitle: X\nmodul: pembayaran\n---\n');
	assert.ok(kode(t).includes('modul-tidak-cocok'));
});

test('email domain co.id terdeteksi', () => {
	const dasar = '---\ntitle: X\nmodul: komitmen\nsumber: [{judul: a, url: "https://a.b/c", jenis: lainnya, diambil: 2026-01-01}]\n---\n\n';
	assert.ok(kode(periksa('komitmen/x.md', dasar + 'Email seseorang@yahoo.co.id.')).includes('data-pribadi-email'));
});

test('tautan peran tidak dikenal', () => {
	const dasar = '---\ntitle: X\nmodul: komitmen\nsumber: [{judul: a, url: "https://a.b/c", jenis: lainnya, diambil: 2026-01-01}]\n---\n\n';
	assert.ok(kode(periksa('komitmen/x.md', dasar + '[lihat](/peran/tidak-ada/)')).includes('peran-tidak-dikenal'));
	assert.ok(!kode(periksa('komitmen/x.md', dasar + '[lihat](/peran/satker/)')).includes('peran-tidak-dikenal'));
});
