export type Klasifikasi =
	| { jenis: 'slides'; id: string }
	| { jenis: 'docs'; id: string }
	| { jenis: 'sheets'; id: string; gid: string | null }
	| { jenis: 'drive-file'; id: string }
	| { jenis: 'drive-folder'; id: string }
	| { jenis: 'video'; id: string }
	| { jenis: 'short-link' }
	| { jenis: 'google-redirect'; url: string }
	| { jenis: 'lainnya' };

const HOST_SHORT = new Set(['bit.ly', 's.id', 'tinyurl.com', 'goo.gl', 'www.bit.ly']);

export function buangGoogleRedirect(url: string): string {
	try {
		const u = new URL(url);
		if ((u.hostname === 'www.google.com' || u.hostname === 'google.com') && u.pathname === '/url') {
			const q = u.searchParams.get('q');
			if (q) return q;
		}
	} catch {}
	return url;
}

export function klasifikasiUrl(urlMentah: string): Klasifikasi {
	const url = buangGoogleRedirect(urlMentah);
	let u: URL;
	try {
		u = new URL(url);
	} catch {
		return { jenis: 'lainnya' };
	}
	const host = u.hostname.replace(/^www\./, '');

	if (host === 'docs.google.com') {
		let m = u.pathname.match(/^\/presentation\/d\/([a-zA-Z0-9_-]+)/);
		if (m) return { jenis: 'slides', id: m[1] };
		m = u.pathname.match(/^\/document\/d\/([a-zA-Z0-9_-]+)/);
		if (m) return { jenis: 'docs', id: m[1] };
		m = u.pathname.match(/^\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
		if (m) {
			const gid = u.hash.match(/gid=(\d+)/)?.[1] ?? u.searchParams.get('gid');
			return { jenis: 'sheets', id: m[1], gid };
		}
	}
	if (host === 'drive.google.com' || host === 'drive.usercontent.google.com') {
		let m = u.pathname.match(/^\/file\/d\/([a-zA-Z0-9_-]+)/);
		if (m) return { jenis: 'drive-file', id: m[1] };
		m = u.pathname.match(/^\/drive\/folders\/([a-zA-Z0-9_-]+)/) ?? u.pathname.match(/^\/drive\/u\/\d+\/folders\/([a-zA-Z0-9_-]+)/);
		if (m) return { jenis: 'drive-folder', id: m[1] };
		const id = u.searchParams.get('id');
		if (id) return { jenis: 'drive-file', id };
	}
	if (host === 'youtu.be') {
		const m = u.pathname.match(/^\/([a-zA-Z0-9_-]{6,})/);
		if (m) return { jenis: 'video', id: m[1] };
	}
	if (host === 'youtube.com' || host === 'm.youtube.com') {
		const v = u.searchParams.get('v');
		if (v) return { jenis: 'video', id: v };
		const m = u.pathname.match(/^\/(?:embed|shorts)\/([a-zA-Z0-9_-]+)/);
		if (m) return { jenis: 'video', id: m[1] };
	}
	if (HOST_SHORT.has(u.hostname)) return { jenis: 'short-link' };
	return { jenis: 'lainnya' };
}
