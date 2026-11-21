import fs from 'node:fs';
import path from 'node:path';
import { crawlSitus, SITUS, jalurMenuDariPath } from './gsites.ts';
import { ambilLinktree } from './linktree.ts';
import { daftarFolder, metaBerkas, jenisDari } from './gdrive.ts';
import { resolusiTautan } from './resolver-net.ts';
import { klasifikasiUrl } from './resolver.ts';
import {
	bacaManifest,
	tulisManifest,
	gabungItem,
	tandaiHilang,
	tambahLinkRusak,
	PemberiId,
} from './manifest.ts';
import { buatLaporan } from './laporan.ts';
import { DITOLAK } from './aturan.ts';
import { itemBaru, type ItemManifest, type Sumber } from './tipe.ts';

const KODE_FOLDER: Record<string, { modul: string; kode: string }> = {
	bendahara: { modul: 'bendahara', kode: 'ben' },
	komitmen: { modul: 'komitmen', kode: 'kom' },
	pembayaran: { modul: 'pembayaran', kode: 'pem' },
	'kppn bun': { modul: 'kppn-bun', kode: 'bun' },
	'kppn-bun': { modul: 'kppn-bun', kode: 'bun' },
};

function argumen() {
	const args = process.argv.slice(2);
	const sumber = new Set<Sumber>();
	let batas: number | undefined;
	let tanpaScreenshot = false;
	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--sumber') {
			for (const s of args[++i].split(',')) sumber.add(s.trim() as Sumber);
		} else if (args[i] === '--batas') {
			batas = parseInt(args[++i]);
		} else if (args[i] === '--tanpa-screenshot') {
			tanpaScreenshot = true;
		}
	}
	return { sumber: sumber.size ? sumber : new Set<Sumber>(['A', 'B', 'C']), batas, tanpaScreenshot };
}

function tanggalWIB(): string {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, '0');
	const wib = new Date(d.getTime() + (7 * 60 + d.getTimezoneOffset()) * 60000);
	return `${wib.getFullYear()}-${pad(wib.getMonth() + 1)}-${pad(wib.getDate())}T${pad(wib.getHours())}:${pad(wib.getMinutes())}:${pad(wib.getSeconds())}+07:00`;
}

async function main() {
	const { sumber, batas, tanpaScreenshot } = argumen();
	const manifest = bacaManifest();
	const pemberiId = new PemberiId(manifest);
	const idTerlihat = new Set<string>();
	const tanggal = tanggalWIB();
	manifest.dibuat = tanggal;
	const sumberDicrawl = new Set<Sumber>();

	async function resolusiDanGabung(
		daftarTautan: { url: string; teks: string; aria?: string | null }[],
		dariItem: ItemManifest,
		target: { target_modul: string | null; target_path: string | null; target_peran: string[] },
	) {
		for (const t of daftarTautan) {
			if (!t.url.startsWith('http')) continue;
			const hasil = await resolusiTautan({
				urlMentah: t.url,
				teks: t.teks,
				aria: t.aria,
				dariId: dariItem.id,
				sumber: dariItem.sumber,
				dariTarget: target,
				pemberiId,
			});
			for (const sub of [hasil.item, ...hasil.subItems]) {
				if (!sub) continue;
				const lama = gabungItem(manifest, sub);
				idTerlihat.add(lama.id);
				if (!dariItem.embed.includes(lama.id)) dariItem.embed.push(lama.id);
				if (!lama.ditautkan_dari.includes(dariItem.id)) lama.ditautkan_dari.push(dariItem.id);
			}
			if (hasil.linkRusak) {
				tambahLinkRusak(manifest, { ...hasil.linkRusak, dari: [dariItem.id] });
			}
		}
	}

	for (const situs of SITUS) {
		if (!sumber.has(situs.sumber)) continue;
		sumberDicrawl.add(situs.sumber);
		console.log(`[${new Date().toISOString()}] crawl situs ${situs.sumber} (${situs.base})`);
		const hasilCrawl = await crawlSitus(situs, { batas, tanpaScreenshot }, async (item, hasil) => {
			const digabung = gabungItem(manifest, item);
			idTerlihat.add(digabung.id);
			if (!hasil.url) return;
			const target = {
				target_modul: digabung.target_modul,
				target_path: digabung.target_path,
				target_peran: digabung.target_peran,
			};
			const tautanEmbed = hasil.embed
				.map((e) => {
					if (e.openUrl) return { url: e.openUrl, teks: '', aria: e.aria };
					if (e.url) return { url: e.url, teks: '', aria: e.aria };
					if (e.docId) return { url: `https://drive.google.com/file/d/${e.docId}/view`, teks: '', aria: e.aria };
					return null;
				})
				.filter((x): x is { url: string; teks: string; aria: string | null } => x !== null);
			await resolusiDanGabung(tautanEmbed, digabung, target);
			await resolusiDanGabung(hasil.tautanKeluar, digabung, target);
			console.log(`  ${digabung.id} — ${digabung.judul}`);
		});

		// Hapus halaman duplikat (base URL yang merender konten halaman bernama).
		for (const id of hasilCrawl.idDihapus) {
			const idx = manifest.item.findIndex((i) => i.id === id);
			if (idx >= 0) {
				manifest.item.splice(idx, 1);
				console.log(`  duplikat dihapus: ${id}`);
			}
		}
		// Perbaiki jalur_menu dan penanda dengan navMap lengkap.
		for (const item of manifest.item) {
			if (item.sumber !== situs.sumber || item.jenis !== 'google-sites') continue;
			const pathSetelahBase = item.url.slice(situs.base.length).replace(/^\//, '');
			const { jalur, penanda } = jalurMenuDariPath(situs, pathSetelahBase, hasilCrawl.navMap);
			item.jalur_menu = jalur;
			if (penanda) item.penanda_sumber = penanda;
		}
	}

	if (sumber.has('B')) {
		sumberDicrawl.add('B');
		console.log(`[${new Date().toISOString()}] crawl linktree (sumber B)`);
		try {
			const links = await ambilLinktree();
			for (const link of links) {
				const k = klasifikasiUrl(link.url);
				if (k.jenis !== 'drive-folder') continue;
				const namaFolder = link.title.toLowerCase().replace('modul', '').trim();
				const kode = KODE_FOLDER[namaFolder] ?? { modul: null, kode: namaFolder.slice(0, 3) };
				const idFolder = `B-folder-${kode.kode}`;
				const folder = gabungItem(
					manifest,
					itemBaru({
						id: idFolder,
						sumber: 'B',
						jenis: 'google-drive',
						url: link.url,
						judul: link.title,
						jalur_menu: [link.title],
						drive_id: k.id,
						target_modul: kode.modul,
					}),
				);
				idTerlihat.add(folder.id);
				await daftarBerkasFolder(k.id, folder, [link.title], manifest, pemberiId, idTerlihat, kode.kode, kode.modul);
			}
		} catch (e) {
			console.log(`  gagal linktree: ${String(e).slice(0, 100)}`);
		}
	}

	tandaiHilangTerbatas(manifest, idTerlihat, sumberDicrawl, tanggal);
	tulisManifest(manifest);
	const laporan = buatLaporan(manifest, tanggal);
	fs.writeFileSync(path.resolve(process.cwd(), 'sources/laporan-inventaris.md'), laporan);
	console.log(`selesai: ${manifest.item.length} item, ${manifest.link_rusak.length} link rusak`);
}

async function daftarBerkasFolder(
	folderId: string,
	itemFolder: ItemManifest,
	jalur: string[],
	manifest: ReturnType<typeof bacaManifest>,
	pemberiId: PemberiId,
	idTerlihat: Set<string>,
	kode: string,
	modul: string | null,
	kedalaman = 0,
) {
	const entri = (await daftarFolder(folderId)).sort((a, b) => a.nama.localeCompare(b.nama));
	for (const e of entri) {
		if (e.adalahFolder) {
			if (kedalaman >= 5) continue;
			const subFolder = gabungItem(
				manifest,
				itemBaru({
					id: pemberiId.idDokumen('C', e.id, `https://drive.google.com/drive/folders/${e.id}`),
					sumber: 'B',
					jenis: 'google-drive',
					url: `https://drive.google.com/drive/folders/${e.id}`,
					judul: e.nama,
					jalur_menu: [...jalur, e.nama],
					drive_id: e.id,
					target_modul: modul,
				}),
			);
			subFolder.sumber = 'B';
			idTerlihat.add(subFolder.id);
			await daftarBerkasFolder(e.id, subFolder, [...jalur, e.nama], manifest, pemberiId, idTerlihat, kode, modul, kedalaman + 1);
			continue;
		}
		const meta = await metaBerkas(e.id);
		const nama = meta.nama ?? e.nama;
		const ditolak = DITOLAK[e.id];
		const berkas = gabungItem(
			manifest,
			itemBaru({
				id: pemberiId.idBerkasB(kode, e.id),
				sumber: 'B',
				jenis: jenisDari(nama, meta.tipe ?? e.mime),
				url: `https://drive.google.com/file/d/${e.id}/view`,
				judul: nama.replace(/\.[a-z0-9]{1,5}$/i, ''),
				jalur_menu: [...jalur, nama],
				drive_id: e.id,
				ukuran: meta.ukuran,
				modified: meta.modified ?? e.modified,
				target_modul: modul,
				status: ditolak ? 'ditolak' : meta.ok ? 'terinventaris' : 'gagal',
				catatan: ditolak ?? (meta.ok ? '' : meta.status === 404 ? 'HTTP 404' : 'metadata file tidak bisa diambil'),
			}),
		);
		berkas.sumber = 'B';
		idTerlihat.add(berkas.id);
		if (!itemFolder.embed.includes(berkas.id)) itemFolder.embed.push(berkas.id);
		console.log(`  ${berkas.id} — ${nama}`);
	}
}

function tandaiHilangTerbatas(
	manifest: ReturnType<typeof bacaManifest>,
	idTerlihat: Set<string>,
	sumberDicrawl: Set<Sumber>,
	tanggal: string,
) {
	const sub = {
		item: manifest.item.filter((i) => sumberDicrawl.has(i.sumber)),
	} as Parameters<typeof tandaiHilang>[0];
	tandaiHilang(sub, idTerlihat, tanggal);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
