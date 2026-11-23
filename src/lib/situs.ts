export const REPO_URL = 'https://github.com/afdaliable/docs-sakti';
export const SITUS_URL = 'https://docs.sakti.ai.id';

export function tautanKoreksi(judul: string, urlHalaman: string): string {
	const p = new URLSearchParams({
		template: 'koreksi-konten.yml',
		title: `[Koreksi] ${judul}`,
		url: urlHalaman,
	});
	return `${REPO_URL}/issues/new?${p}`;
}

export function tautanUsulan(kueri: string): string {
	const p = new URLSearchParams({
		template: 'usulan-artikel.yml',
		title: `[Usulan] ${kueri}`,
		kueri,
	});
	return `${REPO_URL}/issues/new?${p}`;
}
