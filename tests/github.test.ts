import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parse } from 'yaml';
import {
	bentukCodeowners,
	bentukLabel,
	bentukPerintahLabel,
	bentukYamlLabel,
} from '../scripts/build-github.ts';
import { muatKonfigurasi, SKEMA_PEMILIK, type KonfigurasiModul } from '../src/lib/modul.ts';
import { tautanKoreksi, tautanUsulan, REPO_URL } from '../src/lib/situs.ts';

const konfigurasi = muatKonfigurasi();

function konfigurasiBuatan(over: Partial<KonfigurasiModul> = {}): KonfigurasiModul {
	const bagian = { slug: '', nama: 'X', pemilik: [] };
	return {
		admin: [],
		kelompok: [{ id: 'g', nama: 'G' }],
		modul: [],
		lintas: [],
		peran: [],
		...over,
		modul: (over.modul ?? []).map((m) => ({ ...bagian, kelompok: 'g', ikon: '', ringkasan: '', sumber: [], sub: [], ...m })),
		lintas: (over.lintas ?? []).map((l) => ({ ...bagian, ...l })),
	} as KonfigurasiModul;
}

test('CODEOWNERS dan labels.yml di disk sinkron dengan generator', () => {
	assert.equal(
		fs.readFileSync('.github/CODEOWNERS', 'utf8'),
		bentukCodeowners(konfigurasi),
		'CODEOWNERS tidak sinkron; jalankan pnpm build:github',
	);
	const labelYaml = fs.readFileSync('.github/labels.yml', 'utf8');
	for (const label of bentukLabel(konfigurasi)) {
		assert.ok(labelYaml.includes(bentukYamlLabel(label)), `label hilang: ${label.name}`);
	}
});

test('bentukCodeowners: modul ber-pemilik → dua baris aktif, tanpa pemilik → komentar', () => {
	const co = bentukCodeowners(
		konfigurasiBuatan({
			admin: ['@admin-satu'],
			modul: [
				{ slug: 'alpha', nama: 'Alpha', pemilik: ['@pemilik-alpha', '@tim/beta'] },
				{ slug: 'beta', nama: 'Beta', pemilik: [] },
			] as KonfigurasiModul['modul'],
			lintas: [{ slug: 'bantuan', nama: 'Bantuan', pemilik: [] }],
		}),
	);
	const aktif = co.split('\n').filter((l) => l !== '' && !l.startsWith('#'));
	assert.ok(aktif.includes('/src/content/docs/alpha/  @pemilik-alpha @tim/beta'));
	assert.ok(aktif.includes('/src/assets/alpha/  @pemilik-alpha @tim/beta'));
	assert.ok(co.includes('# /src/content/docs/beta/  PEMILIK-BELUM-DITETAPKAN'));
	for (const baris of aktif) {
		assert.ok(!baris.includes('PEMILIK-BELUM-DITETAPKAN'), `placeholder aktif: ${baris}`);
		assert.match(
			baris,
			/^\S+\s+(?:@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\/[A-Za-z0-9._-]+)?(?:\s+|$))+$/,
			`baris aktif tidak baku: ${baris}`,
		);
	}
});

test('bentukCodeowners: admin kosong → tidak ada baris * aktif', () => {
	const co = bentukCodeowners(
		konfigurasiBuatan({ modul: [{ slug: 'a', nama: 'A', pemilik: [] }] as KonfigurasiModul['modul'] }),
	);
	const aktif = co.split('\n').filter((l) => l !== '' && !l.startsWith('#'));
	assert.equal(
		aktif.filter((l) => l.startsWith('*')).length,
		0,
		'masih ada baris * aktif',
	);
	assert.ok(co.includes('# *  ADMIN-BELUM-DITETAPKAN'));
});

test('CODEOWNERS nyata: satu-satunya handle di baris aktif adalah @afdaliable', () => {
	const co = fs.readFileSync('.github/CODEOWNERS', 'utf8');
	const handle = new Set(
		co
			.split('\n')
			.filter((l) => l !== '' && !l.startsWith('#'))
			.flatMap((l) => l.split(/\s+/).filter((t) => t.startsWith('@'))),
	);
	assert.deepEqual([...handle], ['@afdaliable']);
});

test('label: nama unik, ≤ 50, deskripsi ≤ 100, warna heksadesimal, satu per modul', () => {
	const label = bentukLabel(konfigurasi);
	const nama = label.map((l) => l.name);
	assert.equal(new Set(nama).size, nama.length, 'nama label ganda');
	for (const l of label) {
		assert.ok(l.name.length <= 50, `nama > 50: ${l.name}`);
		assert.ok(l.description.length <= 100, `deskripsi > 100: ${l.name}`);
		assert.match(l.color, /^[0-9a-fA-F]{6}$/, `warna: ${l.name}`);
	}
	for (const m of konfigurasi.modul) {
		assert.ok(nama.includes(`modul:${m.slug}`), `label modul hilang: ${m.slug}`);
	}
});

test('bentukYamlLabel dan bentukPerintahLabel aman terhadap kutip dan variabel shell', () => {
	const label = {
		name: `modul:Uji "kutip" $HOME 'x'`,
		color: '1d76db',
		description: `Modul Uji "kutip" $HOME 'x'`,
	};
	const yaml = parse(bentukYamlLabel(label)) as { name: string; color: string; description: string }[];
	assert.equal(yaml[0].name, label.name);
	assert.equal(yaml[0].description, label.description);
	const perintah = bentukPerintahLabel(label);
	assert.ok(perintah.includes(`'\\''`), `tanpa escape kutip tunggal: ${perintah}`);
	assert.ok(!perintah.includes('"Uji'), `argumen tidak terkutip tunggal: ${perintah}`);
});

test('usulan-artikel.yml: opsi modul dan peran sesuai YAML urutan', () => {
	const form = parse(fs.readFileSync('.github/ISSUE_TEMPLATE/usulan-artikel.yml', 'utf8'));
	const cari = (id: string) =>
		form.body.find((b: { id?: string }) => b.id === id).attributes.options;
	assert.deepEqual(cari('modul'), ['Belum tahu', ...konfigurasi.modul.map((m) => m.nama)]);
	assert.deepEqual(cari('peran'), ['Belum tahu', ...konfigurasi.peran.map((p) => p.nama)]);
});

test('kedua formulir issue: YAML sah, field wajib ada, id unik, label dikenal', () => {
	const labelDikenal = new Set(bentukLabel(konfigurasi).map((l) => l.name));
	for (const [berkas, idWajib] of [
		['koreksi-konten.yml', 'url'],
		['usulan-artikel.yml', 'kueri'],
	] as const) {
		const form = parse(fs.readFileSync(`.github/ISSUE_TEMPLATE/${berkas}`, 'utf8'));
		assert.ok(form.name && form.description && Array.isArray(form.body), berkas);
		const ids = form.body.filter((b: { id?: string }) => b.id).map((b: { id?: string }) => b.id);
		assert.equal(new Set(ids).size, ids.length, `id ganda di ${berkas}`);
		assert.ok(ids.includes(idWajib), `${berkas} tanpa id ${idWajib}`);
		for (const l of form.labels ?? []) {
			assert.ok(labelDikenal.has(l), `label tidak dikenal di ${berkas}: ${l}`);
		}
	}
});

test('tautanKoreksi dan tautanUsulan pulihkan parameter persis', () => {
	const u = new URL(tautanKoreksi('Mencatat Kontrak & BAST', 'https://x.test/a b/'));
	assert.ok(u.href.startsWith(`${REPO_URL}/issues/new?`));
	assert.equal(u.searchParams.get('template'), 'koreksi-konten.yml');
	assert.equal(u.searchParams.get('title'), '[Koreksi] Mencatat Kontrak & BAST');
	assert.equal(u.searchParams.get('url'), 'https://x.test/a b/');
	const v = new URL(tautanUsulan('cara batal spm?'));
	assert.equal(v.searchParams.get('template'), 'usulan-artikel.yml');
	assert.equal(v.searchParams.get('title'), '[Usulan] cara batal spm?');
	assert.equal(v.searchParams.get('kueri'), 'cara batal spm?');
});

test('skema menolak pemilik tanpa "@"', () => {
	assert.equal(SKEMA_PEMILIK.safeParse(['tanpa-at']).success, false);
	assert.equal(SKEMA_PEMILIK.safeParse(['@afdaliable', '@org/tim-1']).success, true);
});
