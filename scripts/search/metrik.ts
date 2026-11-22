export interface KueriUji {
	q: string;
	harap: string[];
}

export interface BarisEval {
	q: string;
	harap: string[];
	dapat: string[];
	posisi: number | null;
	jumlah: number;
	jumlahPagefind: number;
}

export interface RingkasanEval {
	jumlahKueri: number;
	hit1: number;
	hit3: number;
	mrr: number;
	pakaiMirip: number;
	tanpaHasil: number;
	gagal: BarisEval[];
}

export function posisiHarapan(dapat: string[], harap: string[]): number | null {
	const indeks = dapat.findIndex((url) => harap.includes(url));
	return indeks === -1 ? null : indeks + 1;
}

export function ringkasEval(baris: BarisEval[]): RingkasanEval {
	const n = baris.length;
	const bagi = (x: number) => (n === 0 ? 0 : x / n);
	return {
		jumlahKueri: n,
		hit1: bagi(baris.filter((b) => b.posisi === 1).length),
		hit3: bagi(baris.filter((b) => b.posisi !== null && b.posisi <= 3).length),
		mrr: bagi(baris.reduce((jumlah, b) => jumlah + (b.posisi === null ? 0 : 1 / b.posisi), 0)),
		pakaiMirip: baris.filter((b) => b.jumlah > b.jumlahPagefind).length,
		tanpaHasil: baris.filter((b) => b.jumlah === 0).length,
		gagal: baris.filter((b) => b.posisi === null || b.posisi > 3),
	};
}

export function validasiKueri(mentah: unknown): KueriUji[] {
	if (!Array.isArray(mentah)) throw new Error('queries.yaml harus berupa daftar.');
	const terlihat = new Set<string>();
	return mentah.map((butir, i) => {
		const { q, harap } = (butir ?? {}) as Partial<KueriUji>;
		if (typeof q !== 'string' || q.trim() === '') throw new Error(`Kueri ke-${i + 1}: "q" kosong.`);
		if (!Array.isArray(harap) || harap.length === 0 || harap.some((u) => typeof u !== 'string')) {
			throw new Error(`Kueri "${q}": "harap" harus daftar URL yang tidak kosong.`);
		}
		for (const url of harap) {
			if (!/^\/(?:[a-z0-9-]+\/)*$/.test(url)) {
				throw new Error(`Kueri "${q}": URL harapan tidak baku (harus /jalur/ diakhiri garis miring): ${url}`);
			}
		}
		if (terlihat.has(q)) throw new Error(`Kueri ganda: "${q}".`);
		terlihat.add(q);
		return { q, harap };
	});
}
