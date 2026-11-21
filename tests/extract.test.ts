import { test } from 'node:test';
import assert from 'node:assert/strict';
import { htmlKeMarkdown } from '../scripts/extract/html.ts';
import { csvKeMarkdown, jumlahKata, perluOcr } from '../scripts/extract/util.ts';
import { keputusan } from '../scripts/extract/util.ts';
import { itemBaru } from '../scripts/inventory/tipe.ts';

const HTML_SITUS = `
<section>
	<h2>Langkah Pembelian</h2>
	<ol>
		<li>Buka menu <strong>Persediaan</strong>.</li>
		<li>Klik <strong>Simpan</strong>.</li>
	</ol>
	<table>
		<tr><th>Kolom</th><th>Isi</th></tr>
		<tr><td>SPM</td><td>421</td></tr>
	</table>
	<p><img src="https://lh3.googleusercontent.com/contoh/1" alt="Formulir pembelian"></p>
	<p><a href="https://www.google.com/url?q=https%3A%2F%2Fexample.com%2Fjuknis%3Fauthuser%3D0&sa=D">Lihat juknis</a></p>
</section>
`;

test('html situs -> markdown menjaga heading, list, tabel, gambar dan membuka google redirect', () => {
	const md = htmlKeMarkdown(HTML_SITUS);
	assert.match(md, /## Langkah Pembelian/);
	assert.match(md, /1\.\s+Buka menu \*\*Persediaan\*\*/);
	assert.match(md, /\|\s*Kolom\s*\|\s*Isi\s*\|/);
	assert.match(md, /\|\s*SPM\s*\|\s*421\s*\|/);
	assert.match(md, /!\[Formulir pembelian\]\(https:\/\/lh3\.googleusercontent\.com\/contoh\/1\)/);
	assert.match(md, /\[Lihat juknis\]\(https:\/\/example\.com\/juknis\?authuser=0\)/);
	assert.doesNotMatch(md, /google\.com\/url\?q=/);
});

test('csv <= 50 baris menjadi tabel markdown', () => {
	const csv = 'Nama,Nilai\nAlpha,10\nBeta,20';
	const { markdown, jumlahBaris, ringkas } = csvKeMarkdown(csv);
	assert.equal(ringkas, false);
	assert.equal(jumlahBaris, 2);
	assert.match(markdown, /\| Nama \| Nilai \|/);
	assert.match(markdown, /\| Beta \| 20 \|/);
});

test('csv > 50 baris menghasilkan ringkasan (bukan tabel)', () => {
	const csv = 'A,B\n' + Array.from({ length: 60 }, (_, i) => `x${i},${i}`).join('\n');
	const { markdown, jumlahBaris, ringkas } = csvKeMarkdown(csv);
	assert.equal(ringkas, true);
	assert.equal(jumlahBaris, 60);
	assert.equal(markdown, '');
});

test('halaman dengan < 20 karakter non-spasi memerlukan OCR', () => {
	assert.equal(perluOcr('   \n   '), true);
	assert.equal(perluOcr('Hanya sembilan kata'), true);
	assert.equal(perluOcr('Ini adalah kalimat yang cukup panjang untuk tidak di-OCR'), false);
});

function buatItem(status: string, catatan = ''): ReturnType<typeof itemBaru> {
	return itemBaru({ id: 'X-1', sumber: 'A', jenis: 'pdf', url: 'https://x', status, catatan });
}

test('transisi status ekstraksi', () => {
	assert.equal(keputusan(buatItem('terinventaris')), 'ekstrak');
	assert.equal(keputusan(buatItem('diunduh')), 'ekstrak');
	assert.equal(keputusan(buatItem('ditolak')), 'lewati');
	assert.equal(keputusan(buatItem('diekstrak')), 'lewati');
	assert.equal(keputusan(buatItem('gagal', 'jaringan: TimeoutError')), 'ekstrak');
	assert.equal(keputusan(buatItem('gagal', 'butuh login')), 'lewati');
	assert.equal(keputusan(buatItem('gagal', 'HTTP 404')), 'lewati');
});

test('item gagal dengan berkas manual dibangkitkan', async () => {
	const fs = await import('node:fs');
	const path = await import('node:path');
	const dir = path.resolve(process.cwd(), 'sources/raw/manual');
	fs.mkdirSync(dir, { recursive: true });
	const manual = path.join(dir, 'X-1.pdf');
	fs.writeFileSync(manual, 'dummy');
	try {
		assert.equal(keputusan(buatItem('gagal', 'butuh login')), 'manual-saja');
	} finally {
		fs.unlinkSync(manual);
	}
});

test('jumlahKata menghitung kata', () => {
	assert.equal(jumlahKata('satu dua   tiga\nempat'), 4);
	assert.equal(jumlahKata(''), 0);
});

test('bersihkanMarkdown menghapus heading kosong, jangkar tanpa teks, dan pembungkus list', async () => {
	const { bersihkanMarkdown } = await import('../scripts/extract/html.ts');
	const masukan = '## \n\n<#h.p_jkSCubOHvgDk>\n\n[](#h.x)\n\n-   -   -   Langkah satu\n-   -   Langkah dua';
	const hasil = bersihkanMarkdown(masukan);
	assert.doesNotMatch(hasil, /##\s*$/m);
	assert.doesNotMatch(hasil, /#h\./);
	assert.match(hasil, /- Langkah satu/);
	assert.match(hasil, /- Langkah dua/);
	assert.doesNotMatch(hasil, /-\s+-/);
});

test('html situs membersihkan artefak jangkar google sites', () => {
	const md = htmlKeMarkdown('<section><h2><a href="#h.p_abc"></a></h2><ul><li><ul><li>isi</li></ul></li></ul></section>');
	assert.doesNotMatch(md, /#h\./);
	assert.match(md, /- isi/);
	assert.doesNotMatch(md, /-\s+-/);
});
