export interface OperasiHeader {
	tipe: 'set' | 'detach';
	nama: string;
	nilai: string;
}

export interface AturanHeader {
	pola: string;
	ops: OperasiHeader[];
}

export function uraiHeaders(teks: string): AturanHeader[] {
	const aturan: AturanHeader[] = [];
	let aktif: AturanHeader | undefined;
	for (const baris of teks.split('\n')) {
		if (baris.trim() === '' || baris.trimStart().startsWith('#')) continue;
		if (/^\s/.test(baris)) {
			if (!aktif) continue;
			const isi = baris.trim();
			if (isi.startsWith('!')) {
				aktif.ops.push({ tipe: 'detach', nama: isi.slice(1).trim().toLowerCase(), nilai: '' });
				continue;
			}
			const pisah = isi.indexOf(':');
			if (pisah === -1) continue;
			aktif.ops.push({
				tipe: 'set',
				nama: isi.slice(0, pisah).trim().toLowerCase(),
				nilai: isi.slice(pisah + 1).trim(),
			});
		} else {
			aktif = { pola: baris.trim(), ops: [] };
			aturan.push(aktif);
		}
	}
	return aturan;
}

function polaKeRegex(pola: string): { host?: RegExp; jalur: RegExp } {
	let bagianHost: string | undefined;
	let bagianJalur = pola;
	const m = pola.match(/^[a-z]+:\/\/([^/]+)(\/.*)?$/i);
	if (m) {
		bagianHost = m[1];
		bagianJalur = m[2] ?? '/';
	}
	return {
		host: bagianHost && new RegExp(`^${hostKeRegex(bagianHost)}$`, 'i'),
		jalur: new RegExp(`^${jalurKeRegex(bagianJalur)}$`),
	};
}

function hostKeRegex(host: string): string {
	return host
		.split('.')
		.map((label) =>
			label === '*'
				? '.*'
				: label.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/:[a-z]\w*/gi, '[^.]+'),
		)
		.join('\\.');
}

function jalurKeRegex(jalur: string): string {
	return jalur
		.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
		.replace(/\*/g, '.*')
		.replace(/:[a-z]\w*/gi, '[^/]+');
}

export function headerUntuk(
	daftarAturan: AturanHeader[],
	host: string,
	pathname: string,
): Record<string, string> {
	host = host.replace(/:\d+$/, '');
	const hasil: Record<string, string> = {};
	for (const aturan of daftarAturan) {
		const { host: reHost, jalur } = polaKeRegex(aturan.pola);
		if (reHost && !reHost.test(host)) continue;
		if (!jalur.test(pathname)) continue;
		for (const op of aturan.ops) {
			if (op.tipe === 'detach') {
				delete hasil[op.nama];
			} else {
				hasil[op.nama] = hasil[op.nama] ? `${hasil[op.nama]}, ${op.nilai}` : op.nilai;
			}
		}
	}
	return hasil;
}
