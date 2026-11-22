import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bukaModulDiBeranda } from '../src/lib/beranda.ts';

const link = (label: string) => ({ type: 'link' as const, label });
const grup = (label: string, collapsed: boolean, entries: unknown[]) => ({
	type: 'group' as const,
	label,
	collapsed,
	entries,
});

function fixture() {
	const S1 = grup('S1', true, [link('s1-link')]);
	const M1 = grup('M1', true, [link('m1-link'), S1]);
	const L1 = link('L1');
	const K1 = grup('K1', false, [M1, L1]);
	const L0 = link('L0');
	return { sidebar: [K1, L0], S1, M1, L1, K1, L0 };
}

test('grup modul (tingkat 2) dibuka, grup di bawahnya tetap terlipat', () => {
	const { sidebar } = fixture();
	const hasil = bukaModulDiBeranda(sidebar as never) as {
		type: string;
		entries: { type: string; collapsed?: boolean; entries?: { collapsed?: boolean }[] }[];
	}[];
	const M1 = hasil[0].entries[0];
	assert.equal(M1.collapsed, false);
	assert.equal(M1.entries?.[1].collapsed, true);
});

test('link tidak disentuh (referensi identik)', () => {
	const { sidebar, L0, L1 } = fixture();
	const hasil = bukaModulDiBeranda(sidebar as never) as typeof sidebar;
	assert.equal(hasil[1], L0);
	const K1 = hasil[0] as { entries: unknown[] };
	assert.equal(K1.entries[1], L1);
});

test('masukan tidak termutasi', () => {
	const { sidebar } = fixture();
	const salinan = structuredClone(sidebar);
	bukaModulDiBeranda(sidebar as never);
	assert.deepEqual(sidebar, salinan);
});
