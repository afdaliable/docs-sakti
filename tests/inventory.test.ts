import { test } from 'node:test';
import assert from 'node:assert/strict';
import { klasifikasiUrl } from '../scripts/inventory/resolver.ts';
import { petakanTarget } from '../scripts/inventory/pemetaan.ts';
import { parseLinktree } from '../scripts/inventory/linktree.ts';
import { parseEmbeddedFolderView } from '../scripts/inventory/gdrive.ts';
import { PemberiId, gabungItem } from '../scripts/inventory/manifest.ts';
import { itemBaru, type Manifest } from '../scripts/inventory/tipe.ts';

test('klasifikasiUrl slides', () => {
	for (const u of [
		'https://docs.google.com/presentation/d/1C9gJgpqXILQQKPmW1gnSfnaPErf-odt4b6buJams854/present',
		'https://docs.google.com/presentation/d/1C9gJgpqXILQQKPmW1gnSfnaPErf-odt4b6buJams854/edit?usp=sharing',
	]) {
		assert.deepEqual(klasifikasiUrl(u), { jenis: 'slides', id: '1C9gJgpqXILQQKPmW1gnSfnaPErf-odt4b6buJams854' });
	}
});

test('klasifikasiUrl drive file dan folder', () => {
	assert.deepEqual(
		klasifikasiUrl('https://drive.google.com/file/d/1Ic099BM72eYVbNTYoSGEiIJ-xkuvY6EQ/view?usp=sharing'),
		{ jenis: 'drive-file', id: '1Ic099BM72eYVbNTYoSGEiIJ-xkuvY6EQ' },
	);
	assert.deepEqual(klasifikasiUrl('https://drive.google.com/open?id=1lDSbhu_ey7W5JXNavMTdWneeWoMLd3CQreACcXGOfTA'), {
		jenis: 'drive-file',
		id: '1lDSbhu_ey7W5JXNavMTdWneeWoMLd3CQreACcXGOfTA',
	});
	assert.deepEqual(
		klasifikasiUrl('https://drive.google.com/drive/folders/1whfBfo_kT4hI69H6Jjnwy9DQPOqrLei3?usp=sharing'),
		{ jenis: 'drive-folder', id: '1whfBfo_kT4hI69H6Jjnwy9DQPOqrLei3' },
	);
});

test('klasifikasiUrl sheets dengan gid', () => {
	assert.deepEqual(
		klasifikasiUrl('https://docs.google.com/spreadsheets/d/1lDSbhu_ey7W5JXNavMTdWneeWoMLd3CQreACcXGOfTA/edit#gid=1571480993'),
		{ jenis: 'sheets', id: '1lDSbhu_ey7W5JXNavMTdWneeWoMLd3CQreACcXGOfTA', gid: '1571480993' },
	);
});

test('klasifikasiUrl google redirect, short link, video', () => {
	const u = klasifikasiUrl(
		'https://www.google.com/url?q=https%3A%2F%2Fsites.google.com%2Fview%2Fsaktiadm%2Fdownload%3Fauthuser%3D0&sa=D',
	);
	assert.equal(u.jenis, 'lainnya');
	assert.equal(klasifikasiUrl('http://bit.ly/rolesakti').jenis, 'short-link');
	assert.deepEqual(klasifikasiUrl('https://youtu.be/abc123XYZ_-'), { jenis: 'video', id: 'abc123XYZ_-' });
	assert.deepEqual(klasifikasiUrl('https://www.youtube.com/watch?v=abc123XYZ_-'), { jenis: 'video', id: 'abc123XYZ_-' });
});

test('pemetaan sumber C', () => {
	assert.equal(petakanTarget('C', 'persediaan/transaksi-masuk/pembelian').target_path, 'persediaan/transaksi-masuk/pembelian');
	assert.equal(petakanTarget('C', 'aset-tetap/usul-hapus-penghapusan-masal').target_path, 'aset-tetap/penghapusan-masal');
	assert.equal(petakanTarget('C', 'piutang/pengelolaan-piutang').target_path, 'piutang');
	assert.equal(petakanTarget('C', 'piutang/pengelolaan-piutang/transaksi/settlement').target_path, 'piutang/transaksi/settlement');
	assert.equal(petakanTarget('C', 'piutang/likuidasi').target_path, 'piutang/likuidasi');
	assert.equal(petakanTarget('C', 'akuntansi-dan-pelaporan/proses/jurnal-manual').target_path, 'akuntansi-pelaporan/proses/jurnal-manual');
	assert.equal(petakanTarget('C', 'akuntansi-dan-pelaporan/juknis-mphl-bjs-sakti').target_path, 'akuntansi-pelaporan/mphl-bjs');
	assert.equal(petakanTarget('C', 'koreksi').target_path, 'akuntansi-pelaporan/koreksi-spm-jurnal-manual');
	assert.equal(petakanTarget('C', 'koreksi/juknis-koreksi-spm-yang-memerlukan-jurnal-manual').target_path, 'akuntansi-pelaporan/koreksi-spm-jurnal-manual');
	assert.equal(
		petakanTarget('C', 'daftar-akun-untuk-perolehan-dan-pengembangan-bmn-akun-vs-kode-barang').target_path,
		'aset-tetap/referensi/akun-vs-kode-barang',
	);
	assert.equal(petakanTarget('C', 'sakti-pelaksanaan/komitmen/proses-escrow/registrasi-escrow').target_path, 'komitmen/escrow/registrasi-escrow');
	assert.equal(petakanTarget('C', 'sakti-pelaksanaan/komitmen/upload-rekam/adk-nrs').target_path, 'komitmen/upload/adk-nrs');
	assert.equal(petakanTarget('C', 'sakti-pelaksanaan/pembayaran/ruh-pembayaran/spp').target_path, 'pembayaran/ruh/spp');
	assert.equal(petakanTarget('C', 'sakti-pelaksanaan/pembayaran/catatupload/mencatat-sp3-lc').target_path, 'pembayaran/catat-upload/mencatat-sp3-lc');
	assert.equal(petakanTarget('C', 'sakti-pelaksanaan/bendahara/bku').target_path, 'bendahara/bku');
	assert.equal(petakanTarget('C', 'faq').target_path, 'faq');
	assert.equal(petakanTarget('C', 'faq').target_modul, 'faq');
	assert.equal(petakanTarget('C', 'home').target_path, null);
	assert.equal(petakanTarget('C', 'sakti-pelaksanaan').target_path, null);
});

test('pemetaan sumber A', () => {
	assert.equal(petakanTarget('A', 'beranda').target_path, 'mulai');
	const satker = petakanTarget('A', 'satker-kl');
	assert.equal(satker.target_modul, 'admin');
	assert.equal(satker.target_path, null);
	assert.deepEqual(satker.target_peran, ['satker']);
	assert.deepEqual(petakanTarget('A', 'kppn-bun-dan-kanwil-djpb').target_peran, ['kppn-kanwil']);
	assert.equal(petakanTarget('A', 'djpb-kantor-pusat').target_modul, 'admin');
	assert.deepEqual(petakanTarget('A', 'dja-penelaah').target_peran, ['dja']);
	assert.deepEqual(petakanTarget('A', 'djkn-pembina').target_peran, ['djkn']);
	assert.deepEqual(petakanTarget('A', 'bappenas-penelaah').target_peran, ['bappenas']);
	assert.deepEqual(petakanTarget('A', 'bpk-auditor').target_peran, ['bpk']);
	assert.deepEqual(petakanTarget('A', 'apip').target_peran, ['apip']);
	assert.deepEqual(petakanTarget('A', 'widyaiswara-kemenkeu').target_peran, ['widyaiswara']);
	assert.equal(petakanTarget('A', 'peraturan').target_path, 'peraturan');
	assert.equal(petakanTarget('A', 'hubungi-kami').target_path, 'bantuan');
	assert.equal(petakanTarget('A', 'layanan').target_path, 'bantuan');
	assert.equal(petakanTarget('A', 'download').target_path, 'admin/formulir');
	assert.equal(petakanTarget('A', 'halaman-asing').target_path, null);
});

test('parseLinktree dari fixture __NEXT_DATA__', () => {
	const html = `<html><script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"links":[{"title":"Modul Bendahara","url":"https://drive.google.com/drive/folders/1whfBfo_kT4hI69H6Jjnwy9DQPOqrLei3"},{"title":"Modul Komitmen","url":"https://drive.google.com/drive/folders/1lg7qCe3dif4bbgG7CMg8w3GapRPXtsqE"}]}}}</script></html>`;
	const links = parseLinktree(html);
	assert.equal(links.length, 2);
	assert.equal(links[0].title, 'Modul Bendahara');
});

test('parseEmbeddedFolderView dari fixture', () => {
	const html = `<div class="flip-entry" id="entry-abc123"><a href="https://drive.google.com/file/d/abc123/view?usp=drive_link" target="_blank"><div class="flip-entry-thumb"><img src="https://drive-thirdparty.googleusercontent.com/16/type/application/pdf"></div><div class="flip-entry-title">Juknis BKU.pdf</div><div class="flip-entry-last-modified"><div>10 Jan 2025</div></div></a></div><div class="flip-entry" id="entry-def456"><a href="https://drive.google.com/drive/folders/def456" target="_blank"><div class="flip-entry-title">Subfolder</div></a></div>`;
	const entri = parseEmbeddedFolderView(html);
	assert.equal(entri.length, 2);
	assert.equal(entri[0].id, 'abc123');
	assert.equal(entri[0].nama, 'Juknis BKU.pdf');
	assert.equal(entri[0].mime, 'application/pdf');
	assert.equal(entri[0].adalahFolder, false);
	assert.equal(entri[1].adalahFolder, true);
});

test('penomoran id stabil saat merge', () => {
	const manifest: Manifest = { dibuat: '', item: [], link_rusak: [] };
	const p = new PemberiId(manifest);
	const id1 = p.idBerkasB('kom', 'driveid1');
	const id2 = p.idBerkasB('kom', 'driveid2');
	assert.equal(id1, 'B-kom-001');
	assert.equal(id2, 'B-kom-002');
	manifest.item.push(
		itemBaru({ id: id1, sumber: 'B', jenis: 'pdf', url: 'u1', drive_id: 'driveid1', status: 'diekstrak', catatan: 'sudah' }),
		itemBaru({ id: id2, sumber: 'B', jenis: 'pdf', url: 'u2', drive_id: 'driveid2' }),
	);
	// run kedua: drive_id lama mempertahankan id; file baru mendapat nomor berikutnya
	const p2 = new PemberiId(manifest);
	assert.equal(p2.idBerkasB('kom', 'driveid1'), 'B-kom-001');
	assert.equal(p2.idBerkasB('kom', 'driveid3'), 'B-kom-003');
	// status tidak diturunkan
	const gabungan = gabungItem(
		manifest,
		itemBaru({ id: 'B-kom-001', sumber: 'B', jenis: 'pdf', url: 'u1', drive_id: 'driveid1', status: 'terinventaris', catatan: '' }),
	);
	assert.equal(gabungan.status, 'diekstrak');
	assert.equal(gabungan.catatan, 'sudah');
});

test('merge: target halaman penaut pertama menang, ditautkan_dari terakumulasi', () => {
	const manifest: Manifest = { dibuat: '', item: [], link_rusak: [] };
	gabungItem(
		manifest,
		itemBaru({
			id: 'A-dok-001',
			sumber: 'A',
			jenis: 'sheets',
			url: 'u',
			ditautkan_dari: ['A-peraturan'],
			target_modul: 'peraturan',
			target_path: 'peraturan',
		}),
	);
	const gabungan = gabungItem(
		manifest,
		itemBaru({
			id: 'A-dok-001',
			sumber: 'A',
			jenis: 'sheets',
			url: 'u',
			ditautkan_dari: ['A-apip'],
			target_modul: 'admin',
		}),
	);
	assert.equal(gabungan.target_modul, 'peraturan');
	assert.deepEqual(gabungan.ditautkan_dari, ['A-peraturan', 'A-apip']);
});

test('stripPenanda menghapus semua penanda beruntun dan memakai penanda terakhir', async () => {
	const { stripPenanda, bersihkanMarker } = await import('../scripts/inventory/gsites.ts');
	assert.deepEqual(stripPenanda('✅🟡 RUH'), { label: 'RUH', penanda: '🟡' });
	assert.deepEqual(stripPenanda('🟡 RUH'), { label: 'RUH', penanda: '🟡' });
	assert.deepEqual(stripPenanda('✅ Persediaan'), { label: 'Persediaan', penanda: '✅' });
	assert.deepEqual(stripPenanda('RUH'), { label: 'RUH', penanda: null });
	assert.equal(bersihkanMarker('Aset ✅ Tetap 🟡 RUH'), 'Aset Tetap RUH');
});
