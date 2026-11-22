import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
	amankanHtml,
	cariLevel1,
	keFilterPagefind,
	lolosFilter,
	type DokumenLite,
	type HasilMesin,
	type Ketergantungan,
	type MesinPagefind,
} from '../src/lib/cari/level1.ts';
import type { EntriSinonim, KamusKueri } from '../src/lib/cari/kueri.ts';

const sinonim = JSON.parse(
	fs.readFileSync(path.resolve('src/data/sinonim.json'), 'utf8'),
) as EntriSinonim[];
const kamus = JSON.parse(
	fs.readFileSync(path.resolve('src/data/kata-kueri.json'), 'utf8'),
) as KamusKueri;

function dokLite(over: Partial<DokumenLite> = {}): DokumenLite {
	return {
		url: '/x/',
		judul: 'Dokumen X',
		deskripsi: 'Deskripsi <b>tebal</b>',
		kata_kunci: [],
		heading: [],
		modul: 'komitmen',
		peran: ['admin'],
		jenis: 'juknis',
		label_jenis: 'Juknis',
		breadcrumb: 'Komitmen',
		...over,
	};
}

function buatDep(peta: Record<string, { id: string; score: number }[]>, mirip?: {
	dok?: DokumenLite[];
	lempar?: boolean;
}) {
	const panggilan: { q: string; filters?: Record<string, unknown> }[] = [];
	const pagefind: MesinPagefind = {
		async search(q, opsi) {
			panggilan.push({ q, filters: opsi?.filters });
			const results: HasilMesin[] = (peta[q] ?? []).map((r) => ({
				id: r.id,
				score: r.score,
				data: async () => ({
					url: `/${r.id}/`,
					excerpt: `<mark>${r.id}</mark>`,
					meta: { title: `Judul ${r.id}` },
				}),
			}));
			return { results };
		},
	};
	let panggilanMirip = 0;
	const dep: Ketergantungan = {
		pagefind,
		sinonim: [],
		kamus: { sehari: {}, umum: [] },
		cariMirip: async () => {
			panggilanMirip++;
			if (mirip?.lempar) throw new Error('indeks gagal');
			return mirip?.dok ?? [];
		},
	};
	return { dep, panggilan, hitungMirip: () => panggilanMirip };
}

test('dedup id dan urutan skor menurun', async () => {
	const { dep, panggilan } = buatDep({
		'foo': [{ id: 'x', score: 1 }],
		'bar': [
			{ id: 'x', score: 9 },
			{ id: 'y', score: 5 },
		],
	});
	const sinonimKhusus: EntriSinonim[] = [
		{ istilah: 'bar', panjang: '', sinonim: ['foo'] },
	];
	dep.sinonim = sinonimKhusus;
	const hasil = await cariLevel1('foo', {}, dep);
	assert.equal(hasil.butir.length, 2);
	assert.deepEqual(
		hasil.butir.map((b) => b.skor),
		[9, 5],
	);
	const data = await Promise.all(hasil.butir.map((b) => b.data()));
	assert.deepEqual(
		data.map((d) => d.url),
		['/x/', '/y/'],
	);
	assert.deepEqual(panggilan.map((p) => p.q), ['foo', 'bar']);
});

test('cariMirip tidak dipanggil bila hasil Pagefind >= 3', async () => {
	const { dep, hitungMirip } = buatDep(
		{ uji: [
			{ id: 'a', score: 3 },
			{ id: 'b', score: 2 },
			{ id: 'c', score: 1 },
		] },
		{ dok: [dokLite()] },
	);
	const hasil = await cariLevel1('uji', {}, dep);
	assert.equal(hasil.jumlahPagefind, 3);
	assert.equal(hitungMirip(), 0);
});

test('hasil mirip ditambahkan di belakang tanpa duplikat url dan mematuhi filter', async () => {
	const { dep } = buatDep(
		{ uji: [{ id: 'sama', score: 1 }] },
		{
			dok: [
				dokLite({ url: '/sama/' }),
				dokLite({ url: '/baru/', modul: 'komitmen', peran: ['admin'], jenis: 'faq' }),
				dokLite({ url: '/modul-lain/', modul: 'persediaan' }),
				dokLite({ url: '/peran-lain/', peran: ['pimpinan'] }),
				dokLite({ url: '/jenis-lain/', jenis: 'video' }),
			],
		},
	);
	const hasil = await cariLevel1('uji', { modul: ['komitmen'], peran: 'admin', jenis: 'faq' }, dep);
	assert.equal(hasil.jumlahPagefind, 1);
	assert.equal(hasil.butir.length, 2);
	assert.equal(hasil.butir[1].asal, 'mirip');
	const dataMirip = await hasil.butir[1].data();
	assert.equal(dataMirip.url, '/baru/');
	assert.equal(dataMirip.jenis, 'Juknis');
	assert.equal(dataMirip.cuplikan, 'Deskripsi &lt;b&gt;tebal&lt;/b&gt;');
});

test('cariMirip melempar tetap mengembalikan hasil Pagefind', async () => {
	const { dep } = buatDep({ uji: [{ id: 'x', score: 1 }] }, { lempar: true });
	const hasil = await cariLevel1('uji', {}, dep);
	assert.equal(hasil.butir.length, 1);
	assert.equal(hasil.jumlahPagefind, 1);
});

test('filter modul diteruskan ke Pagefind sebagai { any: [...] }', async () => {
	const { dep, panggilan } = buatDep({ uji: [] });
	await cariLevel1('uji', { modul: ['komitmen', 'persediaan'], peran: 'admin', jenis: 'faq' }, dep);
	assert.deepEqual(panggilan[0].filters, {
		modul: { any: ['komitmen', 'persediaan'] },
		peran: 'admin',
		jenis: 'faq',
	});
	assert.deepEqual(keFilterPagefind({}), {});
});

test('lolosFilter memeriksa modul, peran, dan jenis', () => {
	const dok = dokLite({ modul: 'komitmen', peran: ['admin', 'operator'], jenis: 'faq' });
	assert.equal(lolosFilter(dok, {}), true);
	assert.equal(lolosFilter(dok, { modul: ['komitmen'] }), true);
	assert.equal(lolosFilter(dok, { modul: ['persediaan'] }), false);
	assert.equal(lolosFilter(dok, { peran: 'operator' }), true);
	assert.equal(lolosFilter(dok, { peran: 'pimpinan' }), false);
	assert.equal(lolosFilter(dok, { jenis: 'faq' }), true);
	assert.equal(lolosFilter(dok, { jenis: 'juknis' }), false);
});

test('amankanHtml meng-escape karakter berbahaya', () => {
	assert.equal(amankanHtml('<b>&"\''), '&lt;b&gt;&amp;&quot;&#39;');
});
