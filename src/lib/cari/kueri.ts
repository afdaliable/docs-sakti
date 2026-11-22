export interface EntriSinonim {
	istilah: string;
	panjang: string;
	sinonim: string[];
}

export interface KamusKueri {
	sehari: Record<string, string>;
	umum: string[];
}

export interface VarianKueri {
	semua: string[];
	inti: string[];
	istilah: string[];
}

export const MAKS_VARIAN = 6;

export function tokenisasi(teks: string): string[] {
	return teks
		.toLowerCase()
		.normalize('NFKD')
		.replace(/\p{M}/gu, '')
		.split(/[^\p{L}\p{N}]+/u)
		.filter(Boolean);
}

interface BentukSinonim {
	istilah: string;
	lain: string[];
}

const cacheBentuk = new WeakMap<EntriSinonim[], BentukSinonim[]>();

function bentukSinonim(sinonim: EntriSinonim[]): BentukSinonim[] {
	let bentuk = cacheBentuk.get(sinonim);
	if (!bentuk) {
		bentuk = sinonim
			.map((e) => {
				const istilah = tokenisasi(e.istilah).join(' ');
				const lain = [...new Set([...e.sinonim, e.panjang].map((s) => tokenisasi(s).join(' ')))]
					.filter((s) => s !== '' && s !== istilah)
					.sort((a, b) => b.length - a.length);
				return { istilah, lain };
			})
			.filter((e) => e.istilah !== '');
		cacheBentuk.set(sinonim, bentuk);
	}
	return bentuk;
}

export function bentukVarian(q: string, sinonim: EntriSinonim[], kamus: KamusKueri): VarianKueri {
	const umum = new Set(kamus.umum);
	const buangUmum = (token: string[]) => {
		const sisa = token.filter((t) => !umum.has(t));
		return sisa.length > 0 ? sisa : token;
	};
	const dasar = tokenisasi(q);
	const baku = dasar.map((t) => (Object.hasOwn(kamus.sehari, t) ? kamus.sehari[t] : t));
	const inti = buangUmum(baku);
	const teks = ` ${baku.join(' ')} `;
	const ekspansi: string[] = [];
	const istilah: string[] = [];
	for (const e of bentukSinonim(sinonim)) {
		const cocok = e.lain.find((l) => teks.includes(` ${l} `));
		if (cocok === undefined) continue;
		const ganti = tokenisasi(teks.replace(` ${cocok} `, ` ${e.istilah} `));
		ekspansi.push([...new Set(buangUmum(ganti))].join(' '));
		istilah.push(e.istilah);
	}
	const semua = [...new Set([dasar.join(' '), baku.join(' '), inti.join(' '), ...ekspansi])]
		.filter(Boolean)
		.slice(0, MAKS_VARIAN);
	return { semua, inti, istilah };
}
