export type Sumber = 'A' | 'B' | 'C';
export type JenisItem =
	| 'google-sites'
	| 'google-slides'
	| 'google-docs'
	| 'sheets'
	| 'google-drive'
	| 'pdf'
	| 'pptx'
	| 'docx'
	| 'xlsx'
	| 'video'
	| 'lainnya';
export type StatusItem = 'terinventaris' | 'ditolak' | 'gagal' | string;

export interface ItemManifest {
	id: string;
	sumber: Sumber;
	jenis: JenisItem;
	url: string;
	judul: string;
	teks_tautan: string | null;
	jalur_menu: string[];
	penanda_sumber: '✅' | '🟡' | null;
	modified: string | null;
	file_lokal: string | null;
	embed: string[];
	ditautkan_dari: string[];
	drive_id: string | null;
	ukuran: number | null;
	jumlah_kata: number | null;
	jumlah_gambar: number | null;
	jumlah_halaman: number | null;
	target_modul: string | null;
	target_path: string | null;
	target_peran: string[];
	status: StatusItem;
	catatan: string;
}

export interface LinkRusak {
	url: string;
	dari: string[];
	status: string;
}

export interface Manifest {
	dibuat: string;
	item: ItemManifest[];
	link_rusak: LinkRusak[];
}

export function itemBaru(parsial: Partial<ItemManifest> & Pick<ItemManifest, 'id' | 'sumber' | 'jenis' | 'url'>): ItemManifest {
	return {
		judul: '',
		teks_tautan: null,
		jalur_menu: [],
		penanda_sumber: null,
		modified: null,
		file_lokal: null,
		embed: [],
		ditautkan_dari: [],
		drive_id: null,
		ukuran: null,
		jumlah_kata: null,
		jumlah_gambar: null,
		jumlah_halaman: null,
		target_modul: null,
		target_path: null,
		target_peran: [],
		status: 'terinventaris',
		catatan: '',
		...parsial,
	};
}
