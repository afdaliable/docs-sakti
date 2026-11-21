import fs from 'node:fs';
import path from 'node:path';
import type { ItemManifest, LinkRusak, Manifest, Sumber } from './tipe.ts';
import { itemBaru } from './tipe.ts';

export const JALUR_MANIFEST = path.resolve(process.cwd(), 'sources/manifest.json');

export function bacaManifest(): Manifest {
	if (fs.existsSync(JALUR_MANIFEST)) {
		return JSON.parse(fs.readFileSync(JALUR_MANIFEST, 'utf8')) as Manifest;
	}
	return { dibuat: '', item: [], link_rusak: [] };
}

export function tulisManifest(manifest: Manifest) {
	manifest.item.sort((a, b) => (a.sumber + a.id).localeCompare(b.sumber + b.id));
	const json = JSON.stringify(manifest, null, 2) + '\n';
	// Lone surrogate (UTF-16 unpaired) tidak boleh lolos ke manifest.
	for (let i = 0; i < json.length; i++) {
		const c = json.charCodeAt(i);
		if (c >= 0xd800 && c <= 0xdbff) {
			const d = json.charCodeAt(i + 1);
			if (!(d >= 0xdc00 && d <= 0xdfff)) {
				throw new Error(`lone surrogate pada manifest (posisi ${i})`);
			}
			i++;
		} else if (c >= 0xdc00 && c <= 0xdfff) {
			throw new Error(`lone surrogate pada manifest (posisi ${i})`);
		}
	}
	fs.mkdirSync(path.dirname(JALUR_MANIFEST), { recursive: true });
	fs.writeFileSync(JALUR_MANIFEST, json);
}

const STATUS_FINAL = ['dimigrasi', 'didraft', 'diekstrak', 'diunduh', 'ditolak', 'gagal'];

export function gabungItem(manifest: Manifest, itemBaru_: ItemManifest): ItemManifest {
	const lama = manifest.item.find((i) => i.id === itemBaru_.id);
	if (!lama) {
		manifest.item.push(itemBaru_);
		return itemBaru_;
	}
	const catatanLama = lama.catatan;
	const targetLama = {
		target_modul: lama.target_modul,
		target_path: lama.target_path,
		target_peran: lama.target_peran,
	};
	const statusLama = lama.status;
	const ditautkanLama = lama.ditautkan_dari ?? [];
	const embedLama = lama.embed ?? [];
	Object.assign(lama, itemBaru_);
	lama.ditautkan_dari = [...new Set([...ditautkanLama, ...itemBaru_.ditautkan_dari])];
	lama.embed = [...new Set([...embedLama, ...itemBaru_.embed])];
	if (catatanLama) lama.catatan = catatanLama;
	if (targetLama.target_modul || targetLama.target_path || targetLama.target_peran?.length) {
		lama.target_modul = targetLama.target_modul;
		lama.target_path = targetLama.target_path;
		lama.target_peran = targetLama.target_peran;
	}
	if (STATUS_FINAL.includes(statusLama) && statusLama !== 'terinventaris') {
		lama.status = statusLama;
	}
	return lama;
}

export function tandaiHilang(manifest: Manifest, idTerlihat: Set<string>, tanggal: string) {
	for (const item of manifest.item) {
		if (!idTerlihat.has(item.id)) {
			const pesan = `tidak ditemukan pada crawl ${tanggal}`;
			if (!item.catatan.includes('tidak ditemukan pada crawl')) {
				item.catatan = item.catatan ? `${item.catatan}; ${pesan}` : pesan;
			}
		}
	}
}

export function tambahLinkRusak(manifest: Manifest, link: LinkRusak) {
	const lama = manifest.link_rusak.find((l) => l.url === link.url && l.status === link.status);
	if (lama) {
		lama.dari = [...new Set([...lama.dari, ...link.dari])];
	} else {
		manifest.link_rusak.push(link);
	}
}

export class PemberiId {
	private bebasDok: Record<string, number>;
	private bebasBerkas: Record<string, number>;
	private byDriveId = new Map<string, string>();
	private byUrl = new Map<string, string>();

	constructor(manifest: Manifest) {
		this.bebasDok = { A: 1, C: 1 };
		this.bebasBerkas = { ben: 1, kom: 1, pem: 1, bun: 1 };
		for (const item of manifest.item) {
			if (item.drive_id) this.byDriveId.set(item.drive_id, item.id);
			this.byUrl.set(item.url, item.id);
			let m = item.id.match(/^([AC])-dok-(\d+)$/);
			if (m) {
				this.bebasDok[m[1]] = Math.max(this.bebasDok[m[1]], parseInt(m[2]) + 1);
			}
			m = item.id.match(/^B-(ben|kom|pem|bun)-(\d+)$/);
			if (m) {
				this.bebasBerkas[m[1]] = Math.max(this.bebasBerkas[m[1]], parseInt(m[2]) + 1);
			}
		}
	}

	idDokumen(sumber: 'A' | 'C', driveId: string | null, url: string): string {
		if (driveId && this.byDriveId.has(driveId)) return this.byDriveId.get(driveId)!;
		if (!driveId && this.byUrl.has(url)) return this.byUrl.get(url)!;
		const id = `${sumber}-dok-${String(this.bebasDok[sumber]++).padStart(3, '0')}`;
		if (driveId) this.byDriveId.set(driveId, id);
		this.byUrl.set(url, id);
		return id;
	}

	idBerkasB(kode: string, driveId: string): string {
		if (this.byDriveId.has(driveId)) return this.byDriveId.get(driveId)!;
		const id = `B-${kode}-${String(this.bebasBerkas[kode]++).padStart(3, '0')}`;
		this.byDriveId.set(driveId, id);
		return id;
	}

	cariByDriveId(driveId: string): string | undefined {
		return this.byDriveId.get(driveId);
	}
}

export { itemBaru };
