import TurndownService from 'turndown';
// @ts-ignore - tidak ada deklarasi tipe
import { gfm } from 'turndown-plugin-gfm';
import { buangGoogleRedirect } from '../inventory/resolver.ts';

export function htmlKeMarkdown(html: string): string {
	const td = new TurndownService({
		headingStyle: 'atx',
		bulletListMarker: '-',
		codeBlockStyle: 'fenced',
	});
	td.use(gfm);
	td.addRule('unescape-gdrive', {
		filter: 'a',
		replacement(isi, node) {
			const el = node as HTMLAnchorElement;
			const href = el.getAttribute('href') ?? '';
			const teks = (isi || '').trim();
			if (!href) return teks;
			const url = buangGoogleRedirect(href);
			return teks ? `[${teks}](${url})` : `<${url}>`;
		},
	});
	td.addRule('iframe', {
		filter: 'iframe',
		replacement(_isi, node) {
			const el = node as HTMLIFrameElement;
			const src = el.getAttribute('data-src') ?? el.getAttribute('src') ?? '';
			return src ? `[Sematan](${src})` : '';
		},
	});
	return td.turndown(html).trim();
}
