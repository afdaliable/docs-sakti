export const JENIS_LABEL: Record<string, string> = {
	juknis: 'Juknis',
	faq: 'FAQ',
	troubleshooting: 'Pemecahan masalah',
	referensi: 'Referensi',
	konsep: 'Konsep',
	peraturan: 'Peraturan',
	video: 'Video',
	indeks: 'Indeks',
};

export function labelJenis(jenis: string | undefined): string {
	return (jenis !== undefined && JENIS_LABEL[jenis]) || 'Juknis';
}
