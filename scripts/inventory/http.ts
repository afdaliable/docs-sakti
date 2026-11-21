export const USER_AGENT =
	'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const jedaTerakhir = new Map<string, number>();

export function acakJeda(): Promise<void> {
	return new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000));
}

export async function jedaHost(url: string): Promise<void> {
	const host = new URL(url).host;
	const terakhir = jedaTerakhir.get(host) ?? 0;
	const tunggu = 1000 + Math.random() * 1000 - (Date.now() - terakhir);
	if (tunggu > 0) await new Promise((r) => setTimeout(r, tunggu));
	jedaTerakhir.set(host, Date.now());
}

export async function ambil(
	url: string,
	{ method = 'GET', timeout = 15000, maksCoba = 3 }: { method?: 'GET' | 'HEAD'; timeout?: number; maksCoba?: number } = {},
): Promise<Response> {
	let errorTerakhir: unknown;
	for (let coba = 1; coba <= maksCoba; coba++) {
		await jedaHost(url);
		try {
			const res = await fetch(url, {
				method,
				headers: { 'user-agent': USER_AGENT },
				redirect: 'follow',
				signal: AbortSignal.timeout(timeout),
			});
			if (res.status === 429 || res.status >= 500) {
				if (coba < maksCoba) {
					await new Promise((r) => setTimeout(r, coba * 3000));
					continue;
				}
			}
			return res;
		} catch (e) {
			errorTerakhir = e;
			if (coba < maksCoba) await new Promise((r) => setTimeout(r, coba * 3000));
		}
	}
	throw errorTerakhir;
}
