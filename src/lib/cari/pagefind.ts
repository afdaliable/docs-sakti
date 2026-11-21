export interface DataPagefind {
	url: string;
	excerpt: string;
	meta: {
		title?: string;
		breadcrumb?: string;
		modul?: string;
		jenis?: string;
		[key: string]: unknown;
	};
	filters: Record<string, string[]>;
}

export interface HasilPagefind {
	results: { data(): Promise<DataPagefind> }[];
	unfilteredResultCount?: number;
}

export interface Pagefind {
	init(): Promise<void>;
	search(
		query: string,
		opsi?: { filters?: Record<string, unknown>; sort?: Record<string, string> },
	): Promise<HasilPagefind>;
	filters(): Promise<Record<string, Record<string, number>>>;
}

let cache: Promise<Pagefind> | undefined;

export function muatPagefind(): Promise<Pagefind> {
	if (!cache) {
		const base = import.meta.env.BASE_URL.replace(/\/$/, '');
		cache = (
			import(/* @vite-ignore */ `${base}/pagefind/pagefind.js`) as Promise<{
				default?: Pagefind;
			} & Partial<Pagefind>>
		).then(async (pf) => {
			const modul = (pf.default ?? pf) as Pagefind;
			await modul.init();
			return modul;
		});
	}
	return cache;
}
