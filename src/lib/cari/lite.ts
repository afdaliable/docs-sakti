import { labelJenis } from '../istilah.ts';
import type { KonfigurasiModul, Modul } from '../modul.ts';
import type { DokumenLite } from './level1.ts';

export interface DataEntri {
	title?: string;
	description?: string;
	modul?: string;
	peran?: string[];
	jenis?: string;
	kata_kunci?: string[];
}

export interface EntriDocs {
	id: string;
	body?: string;
	data: DataEntri;
}

export function ambilHeading(body: string): string[] {
	const tanpaKode = body.replace(/```[\s\S]*?(```|$)/g, '');
	const heading: string[] = [];
	for (const baris of tanpaKode.split('\n')) {
		const cocok = /^#{2,3}\s+(.+)$/.exec(baris);
		if (!cocok) continue;
		const teks = cocok[1].replace(/[*_`]/g, '').replace(/\s*\{#[^}]+\}\s*$/, '').trim();
		if (teks) heading.push(teks);
	}
	return heading;
}

export function modulDanBreadcrumb(
	id: string,
	data: { modul?: string },
	konfigurasi: KonfigurasiModul,
): { modul: Modul | undefined; breadcrumb: string } {
	const segmen = String(id ?? '').split('/');
	const modul = konfigurasi.modul.find((m) => m.slug === data.modul || m.slug === segmen[0]);
	const sub = segmen.length >= 2 ? modul?.sub.find((s) => s.slug === segmen[1]) : undefined;
	const breadcrumb = [modul?.nama, sub?.nama].filter(Boolean).join(' › ');
	return { modul, breadcrumb };
}

export function bentukDokumenLite(
	entri: EntriDocs,
	konfigurasi: KonfigurasiModul,
	base: string,
): DokumenLite {
	const { modul, breadcrumb } = modulDanBreadcrumb(entri.id, entri.data, konfigurasi);
	const jenis = typeof entri.data.jenis === 'string' ? entri.data.jenis : 'juknis';
	return {
		url: entri.id === 'index' ? base : `${base}${entri.id}/`,
		judul: String(entri.data.title ?? ''),
		deskripsi: String(entri.data.description ?? ''),
		kata_kunci: Array.isArray(entri.data.kata_kunci) ? entri.data.kata_kunci : [],
		heading: ambilHeading(entri.body ?? ''),
		modul: modul?.slug ?? '',
		peran: Array.isArray(entri.data.peran) ? entri.data.peran : [],
		jenis,
		label_jenis: labelJenis(jenis),
		breadcrumb,
	};
}
