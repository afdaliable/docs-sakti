import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
	AKAR_KONTEN,
	kandidatSumber,
	periksaTombolEdit,
	ruteDariBerkas,
	ruteDariHtml,
	sumberHalaman,
} from '../scripts/tombol-edit.ts';
import { AWALAN_EDIT, LABEL_EDIT } from '../src/lib/situs.ts';
import { muatKonfigurasi } from '../src/lib/modul.ts';

test('ruteDariHtml memetakan path html ke rute', () => {
	assert.equal(ruteDariHtml('index.html'), '');
	assert.equal(ruteDariHtml('a/b/index.html'), 'a/b');
	assert.equal(ruteDariHtml('404.html'), '404');
	assert.equal(ruteDariHtml('a\\b\\index.html'), 'a/b');
});

test('ruteDariBerkas memetakan path sumber ke rute', () => {
	assert.equal(ruteDariBerkas('src/content/docs/a/index.mdx'), 'a');
	assert.equal(ruteDariBerkas('src/content/docs/a/b.mdx'), 'a/b');
	assert.equal(ruteDariBerkas('src/content/docs/index.mdx'), '');
});

test('kandidatSumber membentuk urutan kandidat berkas', () => {
	assert.deepEqual(kandidatSumber(''), [
		`${AKAR_KONTEN}/index.mdx`,
		`${AKAR_KONTEN}/index.md`,
	]);
	assert.deepEqual(kandidatSumber('a/b'), [
		`${AKAR_KONTEN}/a/b.mdx`,
		`${AKAR_KONTEN}/a/b.md`,
		`${AKAR_KONTEN}/a/b/index.mdx`,
		`${AKAR_KONTEN}/a/b/index.md`,
	]);
});

const tombolEdit = (href: string, label = LABEL_EDIT) =>
	`<a data-aksi="edit" href="${href}"><svg></svg>${label}</a>`;
const hrefUntuk = (sumber: string) => `${AWALAN_EDIT}${sumber}`;

test('periksaTombolEdit: halaman konten tanpa tombol gagal', () => {
	assert.ok(
		periksaTombolEdit({
			html: '<p>isi</p>',
			sumber: ['src/content/docs/a/b.mdx'],
			splash: false,
		}).length > 0,
	);
});

test('periksaTombolEdit: dua tombol benar lolos', () => {
	const html = `${tombolEdit(hrefUntuk('src/content/docs/a/b.mdx'))}<p>isi</p>${tombolEdit(
		hrefUntuk('src/content/docs/a/b.mdx'),
	)}`;
	assert.deepEqual(
		periksaTombolEdit({ html, sumber: ['src/content/docs/a/b.mdx'], splash: false }),
		[],
	);
});

test('periksaTombolEdit: href harus menunjuk berkas sumbernya', () => {
	const html = tombolEdit(hrefUntuk('src/content/docs/a/b/index.mdx'));
	assert.ok(
		periksaTombolEdit({
			html,
			sumber: ['src/content/docs/a/b.mdx'],
			splash: false,
		}).length > 0,
	);
});

test('periksaTombolEdit: tautan edit tanpa data-aksi gagal', () => {
	const html = `<a href="${hrefUntuk('src/content/docs/a/b.mdx')}">${LABEL_EDIT}</a>`;
	assert.ok(
		periksaTombolEdit({
			html,
			sumber: ['src/content/docs/a/b.mdx'],
			splash: false,
		}).length > 0,
	);
});

test('periksaTombolEdit: label lama gagal', () => {
	const html = tombolEdit(hrefUntuk('src/content/docs/a/b.mdx'), 'Edit halaman');
	assert.ok(
		periksaTombolEdit({
			html,
			sumber: ['src/content/docs/a/b.mdx'],
			splash: false,
		}).length > 0,
	);
});

test('periksaTombolEdit: halaman tanpa sumber dengan tautan edit gagal', () => {
	const html = tombolEdit(hrefUntuk('src/content/docs/a/b.mdx'));
	assert.ok(periksaTombolEdit({ html, sumber: [], splash: false }).length > 0);
});

test('periksaTombolEdit: halaman tanpa sumber tanpa tautan lolos', () => {
	assert.deepEqual(
		periksaTombolEdit({ html: '<p>isi</p>', sumber: [], splash: false }),
		[],
	);
});

test('periksaTombolEdit: halaman splash dengan tautan edit gagal', () => {
	const html = tombolEdit(hrefUntuk('src/content/docs/index.mdx'));
	assert.ok(
		periksaTombolEdit({
			html,
			sumber: ['src/content/docs/index.mdx'],
			splash: true,
		}).length > 0,
	);
});

test('periksaTombolEdit: sumber ganda gagal', () => {
	const sumber = ['src/content/docs/a.mdx', 'src/content/docs/a/index.mdx'];
	assert.ok(
		periksaTombolEdit({
			html: tombolEdit(hrefUntuk(sumber[0])),
			sumber,
			splash: false,
		}).length > 0,
	);
});

test('periksaTombolEdit: &amp; di atribut lain tidak mengacaukan', () => {
	const html = `<a data-x="a&amp;b" data-aksi="edit" href="${hrefUntuk(
		'src/content/docs/a/b.mdx',
	)}">${LABEL_EDIT}</a>`;
	assert.deepEqual(
		periksaTombolEdit({ html, sumber: ['src/content/docs/a/b.mdx'], splash: false }),
		[],
	);
});

function* semuaBerkas(dir: string): Generator<string> {
	for (const entri of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, entri.name);
		if (entri.isDirectory()) yield* semuaBerkas(p);
		else if (/\.(md|mdx)$/.test(entri.name)) yield p;
	}
}

test('setiap berkas konten termetakan balik ke dirinya sendiri', () => {
	for (const f of semuaBerkas(AKAR_KONTEN)) {
		assert.deepEqual(sumberHalaman(ruteDariBerkas(f)), [f], f);
	}
});

test('setiap folder modul dan lintas punya tepat satu berkas indeks', () => {
	const konfigurasi = muatKonfigurasi();
	for (const { slug } of [...konfigurasi.modul, ...konfigurasi.lintas]) {
		if (!fs.existsSync(path.join(AKAR_KONTEN, slug))) continue;
		assert.equal(sumberHalaman(slug).length, 1, slug);
	}
});

test('istilah "Edit halaman" tidak dipakai lagi', () => {
	const berkas: string[] = ['README.md', 'CONTRIBUTING.md'];
	for (const dir of ['templates', 'src/components', 'src/lib', AKAR_KONTEN]) {
		berkas.push(...semuaBerkas(dir));
	}
	for (const dir of ['templates', 'src/components', 'src/lib']) {
		for (const entri of fs.readdirSync(dir, { recursive: true }) as string[]) {
			const p = path.join(dir, entri);
			if (fs.statSync(p).isFile()) berkas.push(p);
		}
	}
	for (const f of new Set(berkas)) {
		assert.ok(
			!fs.readFileSync(f, 'utf8').includes('Edit halaman'),
			`istilah lama masih ada di ${f}`,
		);
	}
});

test('dokumen kontributor memakai label baru', () => {
	for (const f of [
		'README.md',
		'CONTRIBUTING.md',
		'src/content/docs/kontribusi/lewat-github.mdx',
	]) {
		assert.ok(
			fs.readFileSync(f, 'utf8').includes(`**${LABEL_EDIT}**`),
			`${f} tidak memuat **${LABEL_EDIT}**`,
		);
	}
});
