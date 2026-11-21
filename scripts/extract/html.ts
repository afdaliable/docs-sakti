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
	td.addRule('jangkar-kosong', {
		filter(node) {
			return (
				node.nodeName === 'A' &&
				(node as HTMLAnchorElement).getAttribute('href')?.startsWith('#') === true &&
				!(node.textContent ?? '').trim()
			);
		},
		replacement(isi) {
			return isi || '';
		},
	});
	return bersihkanMarkdown(td.turndown(html));
}

export function bersihkanMarkdown(md: string): string {
	let hasil = md;
	// Tautan jangkar dalam-halaman tanpa teks: [](#h.x) atau <#h.x>
	hasil = hasil.replace(/\[([^\]]*)\]\(#h\.[^)]*\)/g, '$1');
	hasil = hasil.replace(/<#h\.[^>]*>/g, '');
	// Pembungkus list anak-tunggal: "-   -   teks" -> "- teks"
	let sebelum: string;
	do {
		sebelum = hasil;
		hasil = hasil.replace(/^(\s*)-\s+-(\s+)/gm, '$1-$2');
	} while (hasil !== sebelum);
	hasil = hasil.replace(/^(\s*)-\s{2,}/gm, '$1- ');
	// Heading kosong
	hasil = hasil.replace(/^#{1,6}\s*$/gm, '');
	// Baris kosong beruntun
	hasil = hasil.replace(/\n{3,}/g, '\n\n');
	return hasil.trim();
}
