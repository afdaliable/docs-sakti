import { ambil } from './http.ts';
import { klasifikasiUrl, buangGoogleRedirect } from './resolver.ts';
import { daftarFolder, metaBerkas, jenisDari, type EntriDrive } from './gdrive.ts';
import { itemBaru, type ItemManifest, type JenisItem, type Sumber } from './tipe.ts';
import { DITOLAK } from './aturan.ts';
import type { PemberiId } from './manifest.ts';

const URL_EKSPOR: Record<string, (id: string, gid?: string | null) => string> = {
	slides: (id) => `https://docs.google.com/presentation/d/${id}/export/pdf`,
	docs: (id) => `https://docs.google.com/document/d/${id}/export?format=docx`,
	sheets: (id, gid) => `https://docs.google.com/spreadsheets/d/${id}/export?format=csv${gid ? `&gid=${gid}` : ''}`,
};

const URL_DOK: Record<string, (id: string) => string> = {
	slides: (id) => `https://docs.google.com/presentation/d/${id}/`,
	docs: (id) => `https://docs.google.com/document/d/${id}/`,
	sheets: (id) => `https://docs.google.com/spreadsheets/d/${id}/`,
};

const JUDUL_GENERIK = new Set([
	'download juknis video',
	'download juknis ppt',
	'download juknis',
	'unduh juknis',
	'unduh',
	'download',
	'di sini.',
	'di sini',
	'lihat di sini.',
	'lihat di sini',
	'klik di sini',
	'link',
]);

export function judulGenerik(teks: string): boolean {
	return JUDUL_GENERIK.has(teks.trim().toLowerCase().replace(/\s+/g, ' '));
}

function bersihkanAria(aria: string | null): string {
	if (!aria) return '';
	return aria
		.replace(/^(presentation|document|spreadsheet|file|video|image|folder|google (slides|docs|sheets|drive file)),\s*/i, '')
		.trim();
}

export function bersihkanJudulDok(judul: string): string {
	return judul
		.replace(/\s*[-–—]\s*(Google (Slides|Docs|Sheets|Drive))\s*$/i, '')
		.trim();
}

async function ambilJudulDok(jenis: 'slides' | 'docs' | 'sheets', id: string): Promise<string> {
	try {
		const res = await ambil(URL_DOK[jenis](id), { timeout: 20000 });
		const html = await res.text();
		const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
			?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
		if (og?.[1]) return bersihkanJudulDok(decodeHtmlEntities(og[1]));
		const t = html.match(/<title[^>]*>([^<]+)<\/title>/i);
		if (t?.[1]) return bersihkanJudulDok(decodeHtmlEntities(t[1]));
	} catch {}
	return '';
}

function decodeHtmlEntities(teks: string): string {
	return teks
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#x27;|&#39;/g, "'");
}

async function cekEkspor(url: string): Promise<{ ok: boolean; alasan: string }> {
	try {
		const res = await ambil(url, { timeout: 20000 });
		const final = res.url;
		res.body?.cancel().catch(() => {});
		if (final.includes('accounts.google.com')) return { ok: false, alasan: 'butuh login' };
		if (res.status === 401 || res.status === 403) return { ok: false, alasan: `HTTP ${res.status} (butuh izin)` };
		if (res.status === 404) return { ok: false, alasan: 'HTTP 404' };
		if (res.status >= 400) return { ok: false, alasan: `HTTP ${res.status}` };
		return { ok: true, alasan: '' };
	} catch (e) {
		return { ok: false, alasan: `jaringan: ${String(e).slice(0, 80)}` };
	}
}

async function resolusiShortLink(url: string): Promise<string | null> {
	try {
		const res = await ambil(url, { timeout: 20000 });
		res.body?.cancel().catch(() => {});
		return res.url;
	} catch {
		return null;
	}
}

export interface HasilResolusi {
	item: ItemManifest | null;
	linkRusak: { url: string; status: string } | null;
	subItems: ItemManifest[];
}

export async function resolusiTautan({
	urlMentah,
	teks,
	aria,
	dariId,
	sumber,
	dariTarget,
	pemberiId,
	kedalaman = 0,
}: {
	urlMentah: string;
	teks: string;
	aria?: string | null;
	dariId: string;
	sumber: Sumber;
	dariTarget: { target_modul: string | null; target_path: string | null; target_peran: string[] };
	pemberiId: PemberiId;
	kedalaman?: number;
}): Promise<HasilResolusi> {
	const url = buangGoogleRedirect(urlMentah);
	const k = klasifikasiUrl(url);
	const teksTautan = teks.trim() || null;

	if (k.jenis === 'short-link') {
		const final = await resolusiShortLink(url);
		if (!final) {
			return { item: null, linkRusak: { url, status: 'gagal di-resolve' }, subItems: [] };
		}
		const hasil = await resolusiTautan({ urlMentah: final, teks, aria, dariId, sumber, dariTarget, pemberiId, kedalaman });
		for (const it of [hasil.item, ...hasil.subItems]) {
			if (it) {
				it.catatan = it.catatan
					? `${it.catatan}; short link ${url} -> ${final}`
					: `short link ${url} -> ${final}`;
			}
		}
		return hasil;
	}

	if (k.jenis === 'lainnya') {
		try {
			let res = await ambil(url, { method: 'HEAD', timeout: 15000 });
			if (res.status === 405 || res.status === 403 || res.status === 501) {
				res = await ambil(url, { timeout: 15000 });
				res.body?.cancel().catch(() => {});
			}
			if (res.status >= 400) {
				return { item: null, linkRusak: { url, status: `HTTP ${res.status}` }, subItems: [] };
			}
		} catch (e) {
			return { item: null, linkRusak: { url, status: `jaringan: ${String(e).slice(0, 60)}` }, subItems: [] };
		}
		return { item: null, linkRusak: null, subItems: [] };
	}

	if (k.jenis === 'drive-folder') {
		const id = pemberiId.idDokumen(sumber === 'B' ? 'A' : sumber, k.id, url);
		const induk = itemBaru({
			id,
			sumber,
			jenis: 'google-drive',
			url: `https://drive.google.com/drive/folders/${k.id}`,
			judul: judulGenerik(teks) ? '' : teks || `Folder ${k.id}`,
			teks_tautan: teksTautan,
			ditautkan_dari: [dariId],
			drive_id: k.id,
			target_modul: dariTarget.target_modul,
			target_path: dariTarget.target_path,
			target_peran: dariTarget.target_peran,
		});
		const subItems: ItemManifest[] = [];
		if (kedalaman < 5) {
			try {
				const entri = await daftarFolder(k.id);
				for (const e of entri) {
					if (e.adalahFolder) {
						const sub = await resolusiTautan({
							urlMentah: `https://drive.google.com/drive/folders/${e.id}`,
							teks: e.nama,
							dariId: id,
							sumber,
							dariTarget,
							pemberiId,
							kedalaman: kedalaman + 1,
						});
						if (sub.item) subItems.push(sub.item, ...sub.subItems);
					} else {
						subItems.push(await buatItemDriveFile(e, sumber, id, dariTarget, pemberiId));
					}
				}
			} catch (e) {
				induk.status = 'gagal';
				induk.catatan = `gagal daftar folder: ${String(e).slice(0, 80)}`;
			}
		}
		return { item: induk, linkRusak: null, subItems };
	}

	let jenis: JenisItem = 'lainnya';
	let driveId: string | null = null;
	let urlKanon: string = url;
	let cek: { ok: boolean; alasan: string } = { ok: true, alasan: '' };
	let meta: Awaited<ReturnType<typeof metaBerkas>> | null = null;
	let judul = judulGenerik(teks) ? '' : teks.trim();
	const ariaJudul = bersihkanAria(aria ?? null);

	switch (k.jenis) {
		case 'slides':
		case 'docs':
		case 'sheets': {
			jenis = k.jenis === 'slides' ? 'google-slides' : k.jenis === 'docs' ? 'google-docs' : 'sheets';
			driveId = k.id;
			urlKanon = URL_DOK[k.jenis](k.id);
			if (!judul) {
				judul = ariaJudul || (await ambilJudulDok(k.jenis, k.id));
			}
			cek = await cekEkspor(URL_EKSPOR[k.jenis](k.id, k.jenis === 'sheets' ? k.gid : undefined));
			break;
		}
		case 'drive-file': {
			driveId = k.id;
			urlKanon = `https://drive.google.com/file/d/${k.id}/view`;
			meta = await metaBerkas(k.id);
			if (meta.status === 404) {
				cek = { ok: false, alasan: 'HTTP 404' };
			} else if (!meta.ok) {
				cek = { ok: false, alasan: 'file tidak bisa diakses' };
			}
			jenis = jenisDari(meta.nama ?? '', meta.tipe ?? '');
			if (!judul) {
				judul = (meta.nama ?? '').replace(/\.[a-z0-9]{1,5}$/i, '') || ariaJudul;
			}
			break;
		}
		case 'video': {
			jenis = 'video';
			if (!judul) judul = ariaJudul || `YouTube ${k.id}`;
			break;
		}
		default:
			break;
	}
	if (!judul) judul = ariaJudul;

	const idDok = pemberiId.idDokumen(sumber === 'B' ? 'A' : sumber, driveId, urlKanon);
	const ditolak = driveId ? DITOLAK[driveId] : undefined;
	const item = itemBaru({
		id: idDok,
		sumber,
		jenis,
		url: urlKanon,
		judul,
		teks_tautan: teksTautan,
		ditautkan_dari: [dariId],
		drive_id: driveId,
		ukuran: meta?.ukuran ?? null,
		modified: meta?.modified ?? null,
		target_modul: dariTarget.target_modul,
		target_path: dariTarget.target_path,
		target_peran: dariTarget.target_peran,
		status: ditolak ? 'ditolak' : cek.ok ? 'terinventaris' : 'gagal',
		catatan: ditolak ?? (cek.ok ? '' : cek.alasan),
	});
	return { item, linkRusak: null, subItems: [] };
}

async function buatItemDriveFile(
	e: EntriDrive,
	sumber: Sumber,
	dariId: string,
	dariTarget: { target_modul: string | null; target_path: string | null; target_peran: string[] },
	pemberiId: PemberiId,
): Promise<ItemManifest> {
	const meta = await metaBerkas(e.id);
	const nama = meta.nama ?? e.nama;
	const ditolak = DITOLAK[e.id];
	const ok = meta.ok;
	return itemBaru({
		id: pemberiId.idDokumen(sumber === 'B' ? 'A' : sumber, e.id, `https://drive.google.com/file/d/${e.id}/view`),
		sumber,
		jenis: jenisDari(nama, meta.tipe ?? e.mime),
		url: `https://drive.google.com/file/d/${e.id}/view`,
		judul: nama.replace(/\.[a-z0-9]{1,5}$/i, ''),
		ditautkan_dari: [dariId],
		drive_id: e.id,
		ukuran: meta.ukuran,
		modified: meta.modified ?? e.modified,
		target_modul: dariTarget.target_modul,
		target_path: dariTarget.target_path,
		target_peran: dariTarget.target_peran,
		status: ditolak ? 'ditolak' : ok ? 'terinventaris' : 'gagal',
		catatan: ditolak ?? (ok ? '' : meta.status === 404 ? 'HTTP 404' : 'file tidak bisa diakses'),
	});
}
