import { swapFunctions } from 'astro:transitions/client';

const KERANGKA = '.sl-skip-link, .page';
const HEADER = '.page > header.header';
const SIDEBAR = '.page > nav.sidebar';
const PANEL = '#starlight__sidebar';
const BINGKAI = '.page > .main-frame';
const CARI = 'site-search';
const LESTARI = 'data-astro-transition-persist';

let sidebarSimpanan: { nav: HTMLElement; scroll: number } | undefined;
let cariTunggal: HTMLElement | null = null;

function tandaiAktif(nav: Element, acuan: Element) {
	const aktif = new Set(
		[...acuan.querySelectorAll('a[aria-current="page"]')].map((a) => a.getAttribute('href')),
	);
	for (const a of nav.querySelectorAll('a[href]')) {
		if (!aktif.has(a.getAttribute('href'))) {
			a.removeAttribute('aria-current');
			continue;
		}
		a.setAttribute('aria-current', 'page');
		for (let d = a.closest('details'); d; d = d.parentElement?.closest('details') ?? null) {
			d.open = true;
		}
	}
}

function tutupMenuHp(nav: Element) {
	try {
		const panel = nav.querySelector<HTMLElement>(PANEL);
		if (panel?.matches(':popover-open')) panel.hidePopover();
	} catch {
		/* popover tidak didukung */
	}
}

function tukarHeader(doc: Document) {
	const lama = document.querySelector(HEADER);
	const baru = doc.querySelector(HEADER);
	if (!lama || !baru) return;
	const cariLama = lama.querySelector<HTMLElement>(CARI);
	const cariBaru = baru.querySelector<HTMLElement>(CARI);
	cariTunggal ??= cariLama;
	cariTunggal?.querySelector('dialog')?.close();
	if (Boolean(cariLama) === Boolean(cariBaru)) return;
	// <site-search> memasang listener window di constructor: pakai satu instance seumur dokumen.
	if (cariBaru && cariTunggal) cariBaru.replaceWith(cariTunggal);
	lama.replaceWith(baru);
}

function tukarSidebar(doc: Document, bingkai: Element) {
	const lama = document.querySelector<HTMLElement>(SIDEBAR);
	const baru = doc.querySelector<HTMLElement>(SIDEBAR);
	if (lama && baru) {
		tutupMenuHp(lama);
		tandaiAktif(lama, baru);
	} else if (lama) {
		sidebarSimpanan = { nav: lama, scroll: lama.querySelector(PANEL)?.scrollTop ?? 0 };
		lama.remove();
	} else if (baru && sidebarSimpanan) {
		const { nav, scroll } = sidebarSimpanan;
		sidebarSimpanan = undefined;
		const lipatan = [...nav.querySelectorAll('details')].map((d) => [d, d.open] as const);
		bingkai.before(nav);
		// <sl-sidebar-restore> berjalan lagi saat disisipkan dan menimpa `open` dengan state sesi yang usang.
		for (const [d, terbuka] of lipatan) d.open = terbuka;
		tandaiAktif(nav, baru);
		const panel = nav.querySelector(PANEL);
		if (panel) panel.scrollTop = scroll;
	} else if (baru) {
		bingkai.before(baru);
	}
}

function tukarLuarKerangka(doc: Document) {
	const sudahAda = (el: Element) => {
		const id = el.getAttribute(LESTARI);
		return (
			id !== null &&
			document.body.querySelector(`:scope > [${LESTARI}="${CSS.escape(id)}"]`) !== null
		);
	};
	for (const el of [...document.body.children]) {
		if (!el.matches(KERANGKA) && !el.hasAttribute(LESTARI)) el.remove();
	}
	document.body.append(
		...[...doc.body.children].filter((el) => !el.matches(KERANGKA) && !sudahAda(el)),
	);
}

document.addEventListener('astro:before-swap', (e) => {
	const doc = e.newDocument;
	// HTML hasil build selalu `data-theme="dark"`; tema pilihan pengguna hanya ada di dokumen yang sedang tampil.
	const tema = document.documentElement.dataset.theme;
	if (tema) doc.documentElement.dataset.theme = tema;

	const bingkaiLama = document.querySelector(BINGKAI);
	const bingkaiBaru = doc.querySelector(BINGKAI);
	if (!bingkaiLama || !bingkaiBaru) return;

	e.swap = () => {
		swapFunctions.deselectScripts(doc);
		swapFunctions.swapRootAttributes(doc);
		swapFunctions.swapHeadElements(doc);
		const pulihkanFokus = swapFunctions.saveFocus();
		tukarHeader(doc);
		tukarSidebar(doc, bingkaiLama);
		swapFunctions.swapBodyElement(bingkaiBaru, bingkaiLama);
		tukarLuarKerangka(doc);
		pulihkanFokus();
	};
});
