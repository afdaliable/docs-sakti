import type { Sumber } from './tipe.ts';

export interface Target {
	target_modul: string | null;
	target_path: string | null;
	target_peran: string[];
	catatan?: string;
}

const PETA_SEGMEN_C: Record<string, string> = {
	'proses-escrow': 'escrow',
	'upload-rekam': 'upload',
	'ruh-pembayaran': 'ruh',
	'catatupload': 'catat-upload',
};

function petakanSegmen(segmen: string[]): string[] {
	return segmen.map((s) => PETA_SEGMEN_C[s] ?? s);
}

function hasil(path: string | null, peran: string[] = [], catatan?: string, modul?: string | null): Target {
	return {
		target_modul: modul !== undefined ? modul : path ? path.split('/')[0] : null,
		target_path: path,
		target_peran: peran,
		catatan,
	};
}

export function petakanTarget(sumber: Sumber, pathSetelahBase: string): Target {
	const seg = pathSetelahBase.split('/').filter(Boolean);
	if (seg.length === 0) return hasil(null, [], 'belum dipetakan');

	if (sumber === 'C') {
		const [pertama, ...rest] = seg;
		switch (pertama) {
			case 'persediaan':
				return hasil(seg.join('/'));
			case 'aset-tetap': {
				if (rest[0] === 'usul-hapus-penghapusan-masal') {
					return hasil(['aset-tetap', 'penghapusan-masal', ...rest.slice(1)].join('/'));
				}
				return hasil(seg.join('/'));
			}
			case 'piutang': {
				if (rest[0] === 'pengelolaan-piutang') {
					return hasil(['piutang', ...rest.slice(1)].join('/'));
				}
				return hasil(seg.join('/'));
			}
			case 'akuntansi-dan-pelaporan': {
				if (rest[0] === 'juknis-mphl-bjs-sakti') {
					return hasil(['akuntansi-pelaporan', 'mphl-bjs', ...rest.slice(1)].join('/'));
				}
				return hasil(['akuntansi-pelaporan', ...rest].join('/'));
			}
			case 'koreksi': {
				return hasil('akuntansi-pelaporan/koreksi-spm-jurnal-manual');
			}
			case 'daftar-akun-untuk-perolehan-dan-pengembangan-bmn-akun-vs-kode-barang':
				return hasil('aset-tetap/referensi/akun-vs-kode-barang');
			case 'sakti-pelaksanaan': {
				if (rest.length === 0) return hasil(null, [], 'belum dipetakan');
				const sub = rest[0];
				if (['komitmen', 'pembayaran', 'bendahara'].includes(sub)) {
					return hasil([sub, ...petakanSegmen(rest.slice(1))].join('/'));
				}
				return hasil(null, [], 'belum dipetakan');
			}
			case 'faq':
				return hasil('faq');
			case 'home':
				return hasil(null, [], 'belum dipetakan');
			default:
				return hasil(null, [], 'belum dipetakan');
		}
	}

	if (sumber === 'A') {
		switch (seg[0]) {
			case 'beranda':
				return hasil('mulai');
			case 'satker-kl':
				return hasil(null, ['satker'], undefined, 'admin');
			case 'kppn-bun-dan-kanwil-djpb':
				return hasil(null, ['kppn-kanwil'], undefined, 'kppn-bun');
			case 'djpb-kantor-pusat':
				return hasil(null, ['djpb-pusat'], undefined, 'admin');
			case 'dja-penelaah':
				return hasil(null, ['dja'], undefined, 'admin');
			case 'djkn-pembina':
				return hasil(null, ['djkn'], undefined, 'admin');
			case 'bappenas-penelaah':
				return hasil(null, ['bappenas'], undefined, 'admin');
			case 'bpk-auditor':
				return hasil(null, ['bpk'], undefined, 'admin');
			case 'apip':
				return hasil(null, ['apip'], undefined, 'admin');
			case 'widyaiswara-kemenkeu':
				return hasil(null, ['widyaiswara'], undefined, 'admin');
			case 'peraturan':
				return hasil('peraturan');
			case 'hubungi-kami':
			case 'layanan':
				return hasil('bantuan');
			case 'download':
				return hasil('admin/formulir');
			default:
				return hasil(null, [], 'belum dipetakan');
		}
	}

	return hasil(null, [], 'belum dipetakan');
}
