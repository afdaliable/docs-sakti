import type { KonfigurasiModul } from './modul.ts';

export interface SegmenJalur {
	label: string;
	href?: string;
}

export function jalurHalaman({
	menuSakti,
	modulSlug,
	entryId,
	konfigurasi,
	base = '/',
}: {
	menuSakti?: string;
	modulSlug?: string;
	entryId: string;
	konfigurasi: KonfigurasiModul;
	base?: string;
}): SegmenJalur[] {
	if (typeof menuSakti === 'string' && menuSakti.trim() !== '') {
		const segmen = menuSakti.split(' > ').filter((s) => s.trim() !== '');
		return segmen.map((label, i) => ({
			label,
			href: i === 0 && modulSlug ? `${base}${modulSlug}/` : undefined,
		}));
	}
	const segmen = entryId.split('/');
	const modul = konfigurasi.modul.find((m) => m.slug === (modulSlug ?? segmen[0]));
	if (!modul) return [];
	const jalur: SegmenJalur[] = [{ label: modul.nama, href: `${base}${modul.slug}/` }];
	if (segmen.length >= 2) {
		const sub = modul.sub.find((s) => s.slug === segmen[1]);
		if (sub) jalur.push({ label: sub.nama, href: `${base}${modul.slug}/${sub.slug}/` });
	}
	return jalur;
}
