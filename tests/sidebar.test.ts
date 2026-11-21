import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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
