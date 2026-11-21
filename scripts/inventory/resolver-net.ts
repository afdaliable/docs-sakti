import { ambil } from './http.ts';
import { klasifikasiUrl, buangGoogleRedirect, type Klasifikasi } from './resolver.ts';
import { daftarFolder, metaBerkas, jenisDari, type EntriDrive } from './gdrive.ts';
import { itemBaru, type ItemManifest, type JenisItem, type Sumber } from './tipe.ts';
import { DITOLAK } from './aturan.ts';
import type { PemberiId } from './manifest.ts';

const URL_EKSPOR: Record<string, (id: string, gid?: string | null) => string> = {
	slides: (id) => `https://docs.google.com/presentation/d/${id}/export/pdf`,
	docs: (id) => `https://docs.google.com/document/d/${id}/export?format=docx`,
	sheets: (id, gid) => `https://docs.google.com/spreadsheets/d/${id}/export?format=csv${gid ? `&gid=${gid}` : ''}`,
};

export interface HasilResolusi {
	item: ItemManifest | null;
	linkRusak: { url: string; status: string } | null;
	subItems: ItemManifest[];
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

export async function resolusiTautan({
	urlMentah,
	teks,
	dariId,
	sumber,
	dariTarget,
	pemberiId,
	kedalaman = 0,
}: {
	urlMentah: string;
	teks: string;
	dariId: string;
	sumber: Sumber;
	dariTarget: { target_modul: string | null; target_path: string | null; target_peran: string[] };
	pemberiId: PemberiId;
	kedalaman?: number;
}): Promise<HasilResolusi> {
	const url = buangGoogleRedirect(urlMentah);
	const k = klasifikasiUrl(url);

	if (k.jenis === 'short-link') {
		const final = await resolusiShortLink(url);
		if (!final) {
			return {
				item: null,
				linkRusak: { url, status: 'gagal di-resolve' },
				subItems: [],
			};
		}
		const hasil = await resolusiTautan({ urlMentah: final, teks, dariId, sumber, dariTarget, pemberiId, kedalaman });
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
			judul: teks || `Folder ${k.id}`,
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
						subItems.push(buatItemDriveFile(e, sumber, id, dariTarget, pemberiId));
					}
				}
			} catch (e) {
				induk.status = 'gagal';
				induk.catatan = `gagal daftar folder: ${String(e).slice(0, 80)}`;
			}
		}
		return { item: induk, linkRusak: null, subItems };
	}

	// Dokumen/file individual.
	let jenis: JenisItem = 'lainnya';
	let driveId: string | null = null;
	let urlKanon: string = url;
	let cek: { ok: boolean; alasan: string } = { ok: true, alasan: '' };
	let meta: Awaited<ReturnType<typeof metaBerkas>> | null = null;

	switch (k.jenis) {
		case 'slides':
			jenis = 'google-slides';
			urlKanon = `https://docs.google.com/presentation/d/${k.id}/`;
			cek = await cekEkspor(URL_EKSPOR.slides(k.id));
			break;
		case 'docs':
			jenis = 'google-docs';
			urlKanon = `https://docs.google.com/document/d/${k.id}/`;
			cek = await cekEkspor(URL_EKSPOR.docs(k.id));
			break;
		case 'sheets':
			jenis = 'sheets';
			urlKanon = `https://docs.google.com/spreadsheets/d/${k.id}/`;
			cek = await cekEkspor(URL_EKSPOR.sheets(k.id, k.gid));
			break;
		case 'drive-file':
			driveId = k.id;
			meta = await metaBerkas(k.id);
			jenis = meta?.nama ? jenisDari(meta.nama, '') : 'lainnya';
			urlKanon = `https://drive.google.com/file/d/${k.id}/view`;
			if (meta && !meta.ok) cek = { ok: false, alasan: 'file tidak bisa diakses' };
			break;
		case 'video':
			jenis = 'video';
			break;
		default:
			break;
	}
	if (k.jenis === 'slides' || k.jenis === 'docs' || k.jenis === 'sheets') driveId = (k as { id: string }).id;
	if (k.jenis === 'video') driveId = null;

	const idDok = pemberiId.idDokumen(sumber === 'B' ? 'A' : sumber, driveId, urlKanon);
	const ditolak = driveId ? DITOLAK[driveId] : undefined;
	const item = itemBaru({
		id: idDok,
		sumber,
		jenis,
		url: urlKanon,
		judul: teks || meta?.nama || '',
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

function buatItemDriveFile(
	e: EntriDrive,
	sumber: Sumber,
	dariId: string,
	dariTarget: { target_modul: string | null; target_path: string | null; target_peran: string[] },
	pemberiId: PemberiId,
): ItemManifest {
	const ditolak = DITOLAK[e.id];
	return itemBaru({
		id: pemberiId.idDokumen(sumber === 'B' ? 'A' : sumber, e.id, `https://drive.google.com/file/d/${e.id}/view`),
		sumber,
		jenis: jenisDari(e.nama, e.mime),
		url: `https://drive.google.com/file/d/${e.id}/view`,
		judul: e.nama,
		ditautkan_dari: [dariId],
		drive_id: e.id,
		modified: e.modified,
		target_modul: dariTarget.target_modul,
		target_path: dariTarget.target_path,
		target_peran: dariTarget.target_peran,
		status: ditolak ? 'ditolak' : 'terinventaris',
		catatan: ditolak ?? '',
	});
}
