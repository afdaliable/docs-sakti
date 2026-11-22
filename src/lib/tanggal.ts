import { execFileSync } from 'node:child_process';
import path from 'node:path';

function tanggalCommit(berkas: string): Date | null {
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
