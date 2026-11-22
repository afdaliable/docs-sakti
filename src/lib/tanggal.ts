import { execFileSync } from 'node:child_process';
import path from 'node:path';

const DIR_DOCS = 'src/content/docs';
const MASA_CACHE_MS = 5_000;
let cache: { dibuat: number; tanggal: Map<string, Date> } | undefined;

export function uraiLogGit(keluaran: string, akar: string): Map<string, Date> {
	const hasil = new Map<string, Date>();
	let tanggal: Date | null = null;
	for (const baris of keluaran.split('\n')) {
		if (baris.startsWith('\0')) {
			const t = new Date(baris.slice(1));
			tanggal = Number.isNaN(t.getTime()) ? null : t;
		} else if (baris && tanggal) {
			const berkas = path.resolve(akar, baris);
			if (!hasil.has(berkas)) hasil.set(berkas, tanggal);
		}
	}
	return hasil;
}

function tanggalDocs(): Map<string, Date> {
	if (cache && Date.now() - cache.dibuat < MASA_CACHE_MS) return cache.tanggal;
	let tanggal = new Map<string, Date>();
	try {
		tanggal = uraiLogGit(
			execFileSync(
				'git',
				[
					'-c',
					'core.quotePath=false',
					'log',
					'--relative',
					'--no-renames',
					'-c',
					'--name-only',
					'--format=%x00%cI',
					'--',
					DIR_DOCS,
				],
				{ encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 },
			),
			process.cwd(),
		);
	} catch {}
	cache = { dibuat: Date.now(), tanggal };
	return tanggal;
}

function tanggalCommitTunggal(berkas: string): Date | null {
	try {
		const keluaran = execFileSync('git', ['log', '-1', '--format=%cI', '--', berkas], {
			encoding: 'utf8',
		}).trim();
		if (!keluaran) return null;
		const tanggal = new Date(keluaran);
		return Number.isNaN(tanggal.getTime()) ? null : tanggal;
	} catch {
		return null;
	}
}

function tanggalCommit(berkas: string): Date | null {
	if (berkas.startsWith(path.resolve(DIR_DOCS) + path.sep)) return tanggalDocs().get(berkas) ?? null;
	return tanggalCommitTunggal(berkas);
}

export function tanggalArtikel(data: {
	lastUpdated?: Date | boolean | undefined;
	terakhir_diverifikasi?: Date | undefined;
	id?: string;
	filePath?: string;
}): Date | null {
	if (data.lastUpdated instanceof Date) return data.lastUpdated;
	if (data.terakhir_diverifikasi instanceof Date) return data.terakhir_diverifikasi;
	if (data.filePath) return tanggalCommit(path.resolve(data.filePath));
	if (data.id) return tanggalCommit(path.resolve('src/content/docs', `${data.id}.mdx`));
	return null;
}

export function formatTanggal(tanggal: Date): string {
	return tanggal.toLocaleDateString('id-ID', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	});
}
