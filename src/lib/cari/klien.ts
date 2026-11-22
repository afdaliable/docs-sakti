import { muatPagefind } from './pagefind.ts';
import type { DokumenLite, Ketergantungan } from './level1.ts';
import type { EntriSinonim, KamusKueri } from './kueri.ts';

let janjiDep: Promise<Ketergantungan> | undefined;
let janjiSinonim: Promise<EntriSinonim[]> | undefined;
let janjiKamus: Promise<KamusKueri> | undefined;
let janjiPencariMirip: Promise<(kata: string) => DokumenLite[]> | undefined;

export function muatSinonim(): Promise<EntriSinonim[]> {
	if (!janjiSinonim) {
		janjiSinonim = import('../../data/sinonim.json').then(
			(m) => m.default as EntriSinonim[],
		);
		janjiSinonim.catch(() => {
			janjiSinonim = undefined;
		});
	}
	return janjiSinonim;
}

function muatKamus(): Promise<KamusKueri> {
	if (!janjiKamus) {
		janjiKamus = import('../../data/kata-kueri.json').then(
			(m) => m.default as KamusKueri,
		);
		janjiKamus.catch(() => {
			janjiKamus = undefined;
		});
	}
	return janjiKamus;
}

function pencariMirip(): Promise<(kata: string) => DokumenLite[]> {
	if (!janjiPencariMirip) {
		const base = import.meta.env.BASE_URL;
		janjiPencariMirip = Promise.all([
			fetch(`${base}search-lite.json`).then((r) => {
				if (!r.ok) throw new Error(`search-lite.json: ${r.status}`);
				return r.json() as Promise<DokumenLite[]>;
			}),
			import('./mirip.ts'),
		]).then(([dokumen, m]) => m.buatPencariMirip(dokumen));
		janjiPencariMirip.catch(() => {
			janjiPencariMirip = undefined;
		});
	}
	return janjiPencariMirip;
}

async function cariMirip(kata: string): Promise<DokumenLite[]> {
	return (await pencariMirip())(kata);
}

export function siapkanLevel1(): Promise<Ketergantungan> {
	if (!janjiDep) {
		janjiDep = Promise.all([muatPagefind(), muatSinonim(), muatKamus()]).then(
			([pagefind, sinonim, kamus]) => ({ pagefind, sinonim, kamus, cariMirip }),
		);
		janjiDep.catch(() => {
			janjiDep = undefined;
		});
	}
	return janjiDep;
}
