export function tersembunyiDiProduksi(data: { draft?: boolean; status?: string }): boolean {
	return data.draft === true || data.status === 'draft';
}
