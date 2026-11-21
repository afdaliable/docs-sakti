import fs from 'node:fs';
import path from 'node:path';
import { muatKonfigurasi } from '../src/lib/modul.ts';

const DOCS = path.resolve(process.cwd(), 'src/content/docs');

function tulisJikaBelumAda(jalur: string, isi: string): boolean {
	if (fs.existsSync(jalur)) return false;
	fs.mkdirSync(path.dirname(jalur), { recursive: true });
	fs.writeFileSync(jalur, isi);
	return true;
}

const konfigurasi = muatKonfigurasi();
const dibuat: string[] = [];

for (const modul of konfigurasi.modul) {
	const barisSub =
		modul.sub.length > 0
			? `\n## Sub-menu\n\n${modul.sub.map((s) => `- [${s.nama}](/${modul.slug}/${s.slug}/)`).join('\n')}\n`
			: '';
	const status =
		modul.sumber.length === 0
			? `:::note[Segera hadir]\nPanduan untuk modul ini belum tersedia.\n:::`
			: 'Panduan modul ini sedang dimigrasikan dari sumber aslinya.';
	const isi = `---
title: ${modul.nama}
description: ${modul.ringkasan}
modul: ${modul.slug}
jenis: indeks
status: terbit
sidebar:
  label: Ringkasan
  order: 0
---

${modul.ringkasan}

${status}
${barisSub}`;
	const jalur = path.join(DOCS, modul.slug, 'index.mdx');
	if (tulisJikaBelumAda(jalur, isi)) dibuat.push(jalur);

	for (const sub of modul.sub) {
		const isiSub = `---
title: ${sub.nama}
description: Panduan menu ${sub.nama} pada modul ${modul.nama} SAKTI.
modul: ${modul.slug}
jenis: indeks
status: terbit
sidebar:
  label: Ringkasan
  order: 0
---

Panduan untuk menu **${sub.nama}** sedang disiapkan.
`;
		const jalurSub = path.join(DOCS, modul.slug, sub.slug, 'index.mdx');
		if (tulisJikaBelumAda(jalurSub, isiSub)) dibuat.push(jalurSub);
	}
}

console.log(`${dibuat.length} berkas dibuat.`);
