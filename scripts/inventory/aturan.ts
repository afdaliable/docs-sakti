export const DITOLAK: Record<string, string> = {
	'1lDSbhu_ey7W5JXNavMTdWneeWoMLd3CQreACcXGOfTA':
		'K6 (default): data kelompok pengguna rollout tidak dipublikasikan, hanya ditautkan',
};

export function halamanRusak(judul: string, jumlahKata: number): { status: 'gagal'; catatan: string } | null {
	if (judul.trim() === '404' && jumlahKata < 30) {
		return { status: 'gagal', catatan: 'halaman 404 di sumber (tautan Unduh Form rusak)' };
	}
	return null;
}
