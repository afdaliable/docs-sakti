import { test } from 'node:test';
import assert from 'node:assert/strict';
import { uraiHeaders, headerUntuk } from './e2e/headers.ts';

const CONTOH = `# komentar diabaikan
/*
  X-A: satu
  X-B: dua

/khusus/*
  ! X-A
  X-A: baru
  X-C: tiga

https://:project.example.dev/*
  X-D: empat

https://:version.:project.example.dev/*
  X-E: lima
`;

test('uraiHeaders: komentar, detach, dan urutan ops terurai', () => {
	const aturan = uraiHeaders(CONTOH);
	assert.equal(aturan.length, 4);
	assert.equal(aturan[0].pola, '/*');
	assert.deepEqual(aturan[1].ops[0], { tipe: 'detach', nama: 'x-a', nilai: '' });
	assert.equal(aturan[1].ops[1].tipe, 'set');
});

test('headerUntuk: nilai berulang digabung dengan ", "', () => {
	const teks = '/*\n  X-A: satu\n/x\n  X-A: dua\n';
	const h = headerUntuk(uraiHeaders(teks), 'h', '/x');
	assert.equal(h['x-a'], 'satu, dua');
});

test('headerUntuk: detach menghapus lalu nilai baru dipasang', () => {
	const h = headerUntuk(uraiHeaders(CONTOH), 'h', '/khusus/a');
	assert.equal(h['x-a'], 'baru');
	assert.equal(h['x-b'], 'dua');
	assert.equal(h['x-c'], 'tiga');
});

test('headerUntuk: splat cocok lintas segmen', () => {
	const h = headerUntuk(uraiHeaders('/a/*\n  X-Z: ya\n'), 'h', '/a/b/c/d');
	assert.equal(h['x-z'], 'ya');
});

test('headerUntuk: splat di dalam segmen dan placeholder jalur', () => {
	const aturan = uraiHeaders('/*.jpg\n  X-J: ya\n/film/:judul\n  X-F: ya\n');
	assert.equal(headerUntuk(aturan, 'h', '/a/b/foto.jpg')['x-j'], 'ya');
	assert.equal(headerUntuk(aturan, 'h', '/a/b/foto.png')['x-j'], undefined);
	assert.equal(headerUntuk(aturan, 'h', '/film/satu')['x-f'], 'ya');
	assert.equal(headerUntuk(aturan, 'h', '/film/satu/dua')['x-f'], undefined);
});

test('headerUntuk: placeholder host satu dan dua label', () => {
	const aturan = uraiHeaders(CONTOH);
	assert.equal(headerUntuk(aturan, 'proyek.example.dev', '/x')['x-d'], 'empat');
	assert.equal(headerUntuk(aturan, 'abc123.proyek.example.dev', '/x')['x-e'], 'lima');
	assert.equal(headerUntuk(aturan, 'abc123.proyek.example.dev', '/x')['x-d'], undefined);
	assert.equal(headerUntuk(aturan, 'a.b.proyek.example.dev', '/x')['x-e'], undefined);
	assert.equal(headerUntuk(aturan, 'example.dev', '/x')['x-d'], undefined);
});

test('headerUntuk: port pada host diabaikan', () => {
	const h = headerUntuk(uraiHeaders(CONTOH), 'proyek.example.dev:4321', '/x');
	assert.equal(h['x-d'], 'empat');
});

test('headerUntuk: host tidak cocok → aturan dilewati; pola path cocok di host mana pun', () => {
	const h = headerUntuk(uraiHeaders(CONTOH), 'lain.dev', '/x');
	assert.equal(h['x-d'], undefined);
	assert.equal(h['x-b'], 'dua');
});
