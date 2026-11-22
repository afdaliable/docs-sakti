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

test('sub dengan sub-folder dibangun manual berurutan; draft dilewati di produksi', () => {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sidebar-'));
	const fm = (judul: string, extra = '') => `---\ntitle: ${judul}\nmodul: komitmen\nstatus: terbit${extra}\n---\n`;
	fs.mkdirSync(path.join(tmp, 'komitmen/ruh/kontrak'), { recursive: true });
	fs.mkdirSync(path.join(tmp, 'komitmen/ruh/supplier'), { recursive: true });
	fs.writeFileSync(path.join(tmp, 'komitmen/index.mdx'), fm('Komitmen'));
	fs.writeFileSync(path.join(tmp, 'komitmen/ruh/index.mdx'), fm('RUH'));
	fs.writeFileSync(path.join(tmp, 'komitmen/ruh/lepas.mdx'), fm('Lepas', '\nsidebar:\n  order: 5'));
	fs.writeFileSync(path.join(tmp, 'komitmen/ruh/kontrak/index.mdx'), fm('Kontrak', '\nsidebar:\n  order: 2'));
	fs.writeFileSync(path.join(tmp, 'komitmen/ruh/kontrak/a.mdx'), fm('A', '\nsidebar:\n  order: 2'));
	fs.writeFileSync(path.join(tmp, 'komitmen/ruh/kontrak/b.mdx'), fm('B', '\nsidebar:\n  order: 1'));
	fs.writeFileSync(
		path.join(tmp, 'komitmen/ruh/kontrak/draf.mdx'),
		`---\ntitle: Draf\nmodul: komitmen\nstatus: draft\n---\n`,
	);
	fs.writeFileSync(path.join(tmp, 'komitmen/ruh/supplier/index.mdx'), fm('Supplier', '\nsidebar:\n  order: 1'));
	fs.writeFileSync(path.join(tmp, 'komitmen/ruh/supplier/x.mdx'), fm('X'));

	const cariRuh = (sidebar: ReturnType<typeof bangunSidebar>) =>
		(sidebar
			.flatMap((g) => g.items as { label?: string; items?: unknown[] }[])
			.find((i) => i.label === 'Komitmen')!.items as { label?: string; items?: unknown[] }[])
			.find((i) => i.label === 'RUH')!;

	const dev = cariRuh(bangunSidebar({ docsDir: tmp, produksi: false }));
	const ringkas = (items: unknown[]): unknown[] =>
		(items as { slug?: string; label?: string; items?: unknown[] }[]).map((i) =>
			i.slug !== undefined ? i.slug : { label: i.label, items: ringkas(i.items ?? []) },
		);
	assert.deepEqual(ringkas(dev.items as unknown[]), [
		'komitmen/ruh',
		{ label: 'Supplier', items: ['komitmen/ruh/supplier', 'komitmen/ruh/supplier/x'] },
		{
			label: 'Kontrak',
			items: [
				'komitmen/ruh/kontrak',
				'komitmen/ruh/kontrak/b',
				'komitmen/ruh/kontrak/a',
				'komitmen/ruh/kontrak/draf',
			],
		},
		'komitmen/ruh/lepas',
	]);

	const prod = cariRuh(bangunSidebar({ docsDir: tmp, produksi: true }));
	assert.deepEqual(ringkas(prod.items as unknown[]), [
		'komitmen/ruh',
		{ label: 'Supplier', items: ['komitmen/ruh/supplier', 'komitmen/ruh/supplier/x'] },
		{
			label: 'Kontrak',
			items: ['komitmen/ruh/kontrak', 'komitmen/ruh/kontrak/b', 'komitmen/ruh/kontrak/a'],
		},
		'komitmen/ruh/lepas',
	]);
	fs.rmSync(tmp, { recursive: true, force: true });
});

test('sub tanpa sub-folder tetap memakai autogenerate', () => {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sidebar-'));
	const fm = (judul: string) => `---\ntitle: ${judul}\nmodul: komitmen\nstatus: terbit\n---\n`;
	fs.mkdirSync(path.join(tmp, 'komitmen/adk'), { recursive: true });
	fs.writeFileSync(path.join(tmp, 'komitmen/index.mdx'), fm('Komitmen'));
	fs.writeFileSync(path.join(tmp, 'komitmen/adk/index.mdx'), fm('ADK'));
	fs.writeFileSync(path.join(tmp, 'komitmen/adk/artikel.mdx'), fm('Artikel'));

	const komitmen = bangunSidebar({ docsDir: tmp, produksi: true })
		.flatMap((g) => g.items as { label?: string; items?: unknown[] }[])
		.find((i) => i.label === 'Komitmen')!;
	const adk = (komitmen.items as { label?: string }[]).find((i) => i.label === 'ADK')!;
	assert.deepEqual(adk, {
		label: 'ADK',
		collapsed: true,
		items: [{ autogenerate: { directory: 'komitmen/adk' } }],
	});
	fs.rmSync(tmp, { recursive: true, force: true });
});
