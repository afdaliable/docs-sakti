import { ambil } from './http.ts';

export interface LinkLinktree {
	title: string;
	url: string;
}

export function parseLinktree(html: string): LinkLinktree[] {
	const m = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
	if (!m) return [];
	const data = JSON.parse(m[1]);
	const links = data?.props?.pageProps?.links;
	if (!Array.isArray(links)) return [];
	return links
		.filter((l) => l && typeof l.url === 'string' && typeof l.title === 'string')
		.map((l) => ({ title: l.title as string, url: l.url as string }));
}

export async function ambilLinktree(url = 'https://linktr.ee/juknissaktipelaksanaan'): Promise<LinkLinktree[]> {
	const res = await ambil(url);
	const html = await res.text();
	return parseLinktree(html);
}
