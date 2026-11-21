import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { bangunSidebar } from '../scripts/build-sidebar.ts';
import { muatKonfigurasi } from '../src/lib/modul.ts';

const DOCS = path.resolve(process.cwd(), 'src/content/docs');

test('label grup sesuai kelompok YAML + Lainnya, berurutan', () => {
	const konfigurasi = muatKonfigurasi();
	const label = bangunSidebar().map((grup) => grup.label);
	assert.deepEqual(label, [...konfigurasi.kelompok.map((k) => k.nama), 'Lainnya']);
});

test('label modul dalam grup mengikuti urutan YAML', () => {
	const konfigurasi = muatKonfigurasi();
	const sidebar = bangunSidebar();
	for (const [i, kelompok] of konfigurasi.kelompok.entries()) {
		const labelModul = konfigurasi.modul
			.filter((m) => m.kelompok === kelompok.id)
			.filter((m) => fs.existsSync(path.join(DOCS, m.slug)))
			.map((m) => m.nama);
		assert.deepEqual(
			(sidebar[i].items as { label: string }[]).map((item) => item.label),
			labelModul,
		);
	}
});

test('artikel akar modul ditambahkan setelah sub; draft dilewati di produksi', () => {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sidebar-'));
	const fm = (status?: string) =>
		`---\ntitle: X\nmodul: komitmen${status ? `\nstatus: ${status}` : ''}\n---\n`;
	fs.mkdirSync(path.join(tmp, 'komitmen/ruh'), { recursive: true });
	fs.writeFileSync(path.join(tmp, 'komitmen/index.mdx'), fm('terbit'));
	fs.writeFileSync(path.join(tmp, 'komitmen/ruh/index.mdx'), fm('terbit'));
	fs.writeFileSync(path.join(tmp, 'komitmen/artikel-b.mdx'), fm('terbit'));
	fs.writeFileSync(path.join(tmp, 'komitmen/artikel-a.mdx'), fm('terbit'));
	fs.writeFileSync(path.join(tmp, 'komitmen/draf-status.mdx'), fm('draft'));
	fs.writeFileSync(path.join(tmp, 'komitmen/draf-bendera.mdx'), fm('terbit').replace('status: terbit', 'status: terbit\ndraft: true'));
	fs.writeFileSync(path.join(tmp, 'komitmen/draf-tanpa-status.mdx'), fm());

	const cari = (sidebar: ReturnType<typeof bangunSidebar>) =>
		sidebar
			.flatMap((g) => g.items as { label?: string }[])
			.find((i) => i.label === 'Komitmen')!;

	const dev = cari(bangunSidebar({ docsDir: tmp, produksi: false }));
	const slugsDev = (dev as { items: { slug?: string }[] }).items
		.map((i) => i.slug)
		.filter((s): s is string => s !== undefined);
	assert.deepEqual(slugsDev, [
		'komitmen',
		'komitmen/ruh',
		'komitmen/artikel-a',
		'komitmen/artikel-b',
		'komitmen/draf-bendera',
		'komitmen/draf-status',
		'komitmen/draf-tanpa-status',
	]);

	const prod = cari(bangunSidebar({ docsDir: tmp, produksi: true }));
	const slugs = (prod as { items: { slug?: string }[] }).items.map((i) => i.slug);
	assert.deepEqual(slugs, ['komitmen', 'komitmen/ruh', 'komitmen/artikel-a', 'komitmen/artikel-b']);
	fs.rmSync(tmp, { recursive: true, force: true });
});
