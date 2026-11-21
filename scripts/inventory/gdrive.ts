import { ambil } from './http.ts';
import { klasifikasiUrl } from './resolver.ts';

export interface EntriDrive {
	id: string;
	nama: string;
	mime: string;
	adalahFolder: boolean;
	modified: string | null;
}

export function parseEmbeddedFolderView(html: string): EntriDrive[] {
	const entri: EntriDrive[] = [];
	const re = /<div class="flip-entry" id="entry-([a-zA-Z0-9_-]+)"[\s\S]*?<\/a>/g;
	let m;
	while ((m = re.exec(html))) {
		const blok = m[0];
		const href = blok.match(/<a href="([^"]+)"/)?.[1] ?? '';
		const mime = blok.match(/\/type\/([^\"'\s?]+)/)?.[1] ?? '';
		const nama = decodeEntities(blok.match(/flip-entry-title">([\s\S]*?)<\/div>/)?.[1]?.trim() ?? '');
		const modified = blok.match(/flip-entry-last-modified">\s*(?:<div>)?([\s\S]*?)<\/div>/)?.[1]?.trim() ?? null;
		const adalahFolder = href.includes('/drive/folders/');
		entri.push({ id: m[1], nama, mime, adalahFolder, modified });
	}
	return entri;
}

function decodeEntities(teks: string): string {
	return teks
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");
}

export async function daftarFolder(folderId: string): Promise<EntriDrive[]> {
	const apiKey = process.env.GOOGLE_API_KEY;
	if (apiKey) {
		const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'%20in%20parents&fields=files(id,name,mimeType,modifiedTime,size)&pageSize=1000&key=${apiKey}`;
		const res = await ambil(url);
		const json = (await res.json()) as { files?: { id: string; name: string; mimeType: string; modifiedTime?: string }[] };
		return (json.files ?? []).map((f) => ({
			id: f.id,
			nama: f.name,
			mime: f.mimeType,
			adalahFolder: f.mimeType === 'application/vnd.google-apps.folder',
			modified: f.modifiedTime ?? null,
		}));
	}
	const res = await ambil(`https://drive.google.com/embeddedfolderview?id=${folderId}#list`);
	return parseEmbeddedFolderView(await res.text());
}

export interface MetaBerkas {
	nama: string | null;
	ukuran: number | null;
	modified: string | null;
	tipe: string | null;
	status: number | null;
	login: boolean;
	ok: boolean;
}

export async function metaBerkas(fileId: string): Promise<MetaBerkas> {
	try {
		const res = await ambil(
			`https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`,
			{ method: 'HEAD' },
		);
		if (res.url.includes('accounts.google.com')) {
			res.body?.cancel().catch(() => {});
			return { nama: null, ukuran: null, modified: null, tipe: null, status: res.status, login: true, ok: false };
		}
		const cd = res.headers.get('content-disposition') ?? '';
		const nama = decodeURIComponent(cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)/)?.[1] ?? '') || null;
		const ukuran = Number(res.headers.get('content-length')) || null;
		const modified = res.headers.get('last-modified');
		const tipe = res.headers.get('content-type');
		return {
			nama,
			ukuran,
			modified: modified ? new Date(modified).toISOString() : null,
			tipe,
			status: res.status,
			login: false,
			ok: res.status < 400,
		};
	} catch {
		return { nama: null, ukuran: null, modified: null, tipe: null, status: null, login: false, ok: false };
	}
}

export async function ambilJudulDriveFile(fileId: string): Promise<{ judul: string; login: boolean; hilang: boolean }> {
	try {
		const res = await ambil(`https://drive.google.com/file/d/${fileId}/view`, { timeout: 20000 });
		if (res.url.includes('accounts.google.com')) {
			res.body?.cancel().catch(() => {});
			return { judul: '', login: true, hilang: false };
		}
		const html = await res.text();
		const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
			?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
		let judul = og?.[1] ?? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? '';
		judul = decodeEntities(judul).replace(/\s*-\s*Google Drive\s*$/i, '').trim();
		const hilang = res.status === 404 || /Error 404/.test(judul);
		return { judul: hilang ? '' : judul, login: false, hilang };
	} catch {
		return { judul: '', login: false, hilang: false };
	}
}

export interface InfoFolder {
	judul: string;
	entri: EntriDrive[];
	login: boolean;
	hilang: boolean;
}

export async function infoFolder(folderId: string): Promise<InfoFolder> {
	try {
		const res = await ambil(`https://drive.google.com/embeddedfolderview?id=${folderId}#list`);
		if (res.url.includes('accounts.google.com')) {
			res.body?.cancel().catch(() => {});
			return { judul: '', entri: [], login: true, hilang: false };
		}
		const html = await res.text();
		const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? '';
		const hilang = res.status === 404 || /Error 404/.test(title);
		return {
			judul: hilang ? '' : decodeEntities(title).trim(),
			entri: hilang ? [] : parseEmbeddedFolderView(html),
			login: false,
			hilang,
		};
	} catch {
		return { judul: '', entri: [], login: false, hilang: false };
	}
}

export function jenisDari(nama: string, mime: string): 'pdf' | 'pptx' | 'docx' | 'xlsx' | 'video' | 'google-slides' | 'google-docs' | 'sheets' | 'lainnya' {
	const n = nama.toLowerCase();
	if (mime.startsWith('video/')) return 'video';
	if (mime === 'application/pdf' || n.endsWith('.pdf')) return 'pdf';
	if (mime.includes('presentationml') || n.endsWith('.pptx')) return 'pptx';
	if (mime.includes('wordprocessingml') || n.endsWith('.docx')) return 'docx';
	if (mime.includes('spreadsheetml') || n.endsWith('.xlsx')) return 'xlsx';
	if (mime === 'application/vnd.google-apps.presentation') return 'google-slides';
	if (mime === 'application/vnd.google-apps.document') return 'google-docs';
	if (mime === 'application/vnd.google-apps.spreadsheet') return 'sheets';
	if (/\.(mp4|mkv|mov|webm|avi|m4v|wmv|ts)$/.test(n)) return 'video';
	return 'lainnya';
}

export { klasifikasiUrl };
