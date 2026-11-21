import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { ItemManifest } from '../inventory/tipe.ts';

export const DIR_RAW_DOK = path.resolve(process.cwd(), 'sources/raw/dok');
export const DIR_RAW_MANUAL = path.resolve(process.cwd(), 'sources/raw/manual');
export const DIR_EKSTRAK = path.resolve(process.cwd(), 'sources/extracted');
export const PROFIL_LO = `file://${path.resolve(process.cwd(), '.tools/lo-profile')}`;
export const PYTHON = process.env.PYTHON_EKSTRAK || 'python3';

export interface MetaEkstrak {
	id: string;
	jenis: string;
	judul: string;
	url: string;
	diekstrak: string;
	jumlah_halaman: number | null;
	jumlah_kata: number;
	jumlah_gambar: number;
	halaman_ocr: number[];
	peringatan: string[];
}

export function dirEkstrak(id: string): string {
	return path.join(DIR_EKSTRAK, id);
}

export function jumlahKata(teks: string): number {
	return teks.split(/\s+/).filter(Boolean).length;
}

export function perluOcr(teks: string): boolean {
	return teks.replace(/\s+/g, '').length < 20;
}

export function cariManual(id: string): string | null {
	if (!fs.existsSync(DIR_RAW_MANUAL)) return null;
	for (const f of fs.readdirSync(DIR_RAW_MANUAL)) {
		if (f.startsWith(`${id}.`)) return path.join(DIR_RAW_MANUAL, f);
	}
	return null;
}

export function keputusan(item: ItemManifest): 'ekstrak' | 'lewati' | 'manual-saja' {
	const manual = cariManual(item.id);
	if (item.status === 'terinventaris' || item.status === 'diunduh') return 'ekstrak';
	if (item.status === 'ditolak') return 'lewati';
	if (item.status === 'gagal') {
		if (manual) return 'manual-saja';
		if (item.catatan.startsWith('jaringan:')) return 'ekstrak';
		return 'lewati';
	}
	return 'lewati';
}

export function jalankan(cmd: string, args: string[], timeout = 120000): Promise<{ stdout: string; stderr: string }> {
	return new Promise((resolve, reject) => {
		execFile(cmd, args, { timeout, maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) => {
			if (err) reject(new Error(`${cmd} gagal: ${stderr?.slice(0, 200) || err.message}`));
			else resolve({ stdout: stdout.toString(), stderr: stderr.toString() });
		});
	});
}

export function csvKeMarkdown(csv: string, maksBaris = 50): { markdown: string; jumlahBaris: number; ringkas: boolean } {
	const baris = csv.split(/\r?\n/).filter((b) => b.trim() !== '');
	if (baris.length <= maksBaris) {
		const sel = baris.map((b) => `| ${b.split(',').map((c) => c.replace(/^\s*"|"\s*$/g, '').replace(/\|/g, '\\|').trim()).join(' | ')} |`);
		sel.splice(1, 0, `| ${baris[0].split(',').map(() => '---').join(' | ')} |`);
		return { markdown: sel.join('\n'), jumlahBaris: baris.length - 1, ringkas: false };
	}
	return { markdown: '', jumlahBaris: baris.length - 1, ringkas: true };
}

export function tulisMeta(dir: string, meta: MetaEkstrak) {
	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
}

export function tulisKonten(dir: string, teks: string) {
	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(path.join(dir, 'content.md'), teks);
}
