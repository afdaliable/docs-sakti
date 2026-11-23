import assert from 'node:assert/strict';
import type { BrowserContext, Response } from 'playwright';

export async function pantauCsp(konteks: BrowserContext): Promise<string[]> {
	const pelanggaran: string[] = [];
	await konteks.exposeBinding('laporCsp', (_sumber, pesan: string) => {
		pelanggaran.push(pesan);
	});
	await konteks.addInitScript(() => {
		document.addEventListener('securitypolicyviolation', (e) => {
			void (globalThis as { laporCsp?: (p: string) => void }).laporCsp?.(
				`${e.violatedDirective} | ${e.blockedURI} | ${e.documentURI} | ${e.sourceFile}:${e.lineNumber}`,
			);
		});
	});
	return pelanggaran;
}

export function pastikanCspAktif(respons: Response | null): void {
	assert.ok(respons, 'tidak ada respons untuk dokumen utama');
	const csp = respons.headers()['content-security-policy'] ?? '';
	assert.ok(csp.includes("'sha256-"), 'CSP tidak aktif: tanpa hash sha256');
	assert.ok(!csp.includes('{{'), 'CSP tidak aktif: penanda templat belum diisi');
}
