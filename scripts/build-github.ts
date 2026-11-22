import fs from 'node:fs';
import path from 'node:path';
import { muatKonfigurasi, type KonfigurasiModul } from '../src/lib/modul.ts';

const BERKAS_CODEOWNERS = '.github/CODEOWNERS';
const BERKAS_LABEL = '.github/labels.yml';

interface Label {
	name: string;
	color: string;
	description: string;
}

function barisPemilik(slug: string, pemilik: string[]): string[] {
	if (pemilik.length === 0) {
		return [`# /src/content/docs/${slug}/  PEMILIK-BELUM-DITETAPKAN`];
	}
	const handle = pemilik.join(' ');
	return [`/src/content/docs/${slug}/  ${handle}`, `/src/assets/${slug}/  ${handle}`];
}

export function bentukCodeowners(konfigurasi: KonfigurasiModul): string {
	const adaTanpaPemilik =
		konfigurasi.modul.some((m) => m.pemilik.length === 0) ||
		konfigurasi.lintas.some((l) => l.pemilik.length === 0);
	const baris: string[] = [
		'# Dibangkitkan oleh `pnpm build:github` dari config/modul.yaml. Jangan disunting langsung.',
		'# Aturan terakhir yang cocok yang berlaku.',
	];
	if (adaTanpaPemilik) {
		baris.push(
			'# Pemilik modul belum ditetapkan (K5 di docs/09-keputusan-terbuka.md). Baris modul di bawah',
			'# masih berupa komentar; sampai `pemilik` diisi, semua berkas ditinjau admin.',
		);
	}
	baris.push('');
	if (konfigurasi.admin.length > 0) {
		baris.push(`*  ${konfigurasi.admin.join(' ')}`);
	} else {
		baris.push('# *  ADMIN-BELUM-DITETAPKAN');
	}
	baris.push('', '# Modul SAKTI');
	for (const m of konfigurasi.modul) {
		baris.push(...barisPemilik(m.slug, m.pemilik));
	}
	baris.push('', '# Bagian lintas');
	for (const l of konfigurasi.lintas) {
		baris.push(...barisPemilik(l.slug, l.pemilik));
	}
	return `${baris.join('\n')}\n`;
}

export function bentukLabel(konfigurasi: KonfigurasiModul): Label[] {
	const label: Label[] = konfigurasi.modul.map((m) => ({
		name: `modul:${m.slug}`,
		color: '1d76db',
		description: `Modul ${m.nama}`,
	}));
	label.push(
		{
			name: 'jenis:koreksi',
			color: 'd73a4a',
			description: 'Koreksi isi artikel yang sudah ada',
		},
		{
			name: 'jenis:baru',
			color: '0e8a16',
			description: 'Usulan atau penulisan artikel baru',
		},
		{
			name: 'jenis:migrasi',
			color: '5319e7',
			description: 'Migrasi konten dari sumber lama',
		},
		{
			name: 'perlu-review',
			color: 'fbca04',
			description: 'Menunggu review pemilik modul',
		},
	);
	return label;
}

export function bentukYamlLabel(label: Label): string {
	return `- name: ${JSON.stringify(label.name)}\n  color: ${JSON.stringify(label.color)}\n  description: ${JSON.stringify(label.description)}`;
}

function kutipShell(teks: string): string {
	return `'${teks.replace(/'/g, `'\\''`)}'`;
}

export function bentukPerintahLabel(label: Label): string {
	return `gh label create ${kutipShell(label.name)} --color ${label.color} --description ${kutipShell(label.description)} --force`;
}

function bentukLabelsYml(konfigurasi: KonfigurasiModul): string {
	const kepala = [
		'# Dibangkitkan oleh `pnpm build:github` dari config/modul.yaml. Jangan disunting langsung.',
		'# Label dibuat manual oleh pemilik repo, lihat docs/setup-github.md.',
	];
	return `${[...kepala, ...bentukLabel(konfigurasi).map(bentukYamlLabel)].join('\n')}\n`;
}

if (process.argv[1] && path.resolve(process.argv[1]).endsWith('build-github.ts')) {
	const konfigurasi = muatKonfigurasi();
	const argumen = process.argv.slice(2);
	if (argumen.includes('--perintah-label')) {
		for (const label of bentukLabel(konfigurasi)) {
			console.log(bentukPerintahLabel(label));
		}
	} else {
		const keluaran = new Map([
			[BERKAS_CODEOWNERS, bentukCodeowners(konfigurasi)],
			[BERKAS_LABEL, bentukLabelsYml(konfigurasi)],
		]);
		if (argumen.includes('--check')) {
			let beda = false;
			for (const [berkas, isi] of keluaran) {
				const jalur = path.resolve(process.cwd(), berkas);
				if (!fs.existsSync(jalur) || fs.readFileSync(jalur, 'utf8') !== isi) {
					console.error(`${berkas} tidak sinkron dengan config/modul.yaml. Jalankan pnpm build:github.`);
					beda = true;
				}
			}
			if (beda) process.exit(1);
			console.log('CODEOWNERS dan labels.yml sinkron.');
		} else {
			for (const [berkas, isi] of keluaran) {
				const jalur = path.resolve(process.cwd(), berkas);
				fs.mkdirSync(path.dirname(jalur), { recursive: true });
				fs.writeFileSync(jalur, isi);
				console.log(`Ditulis: ${berkas}`);
			}
		}
	}
}
