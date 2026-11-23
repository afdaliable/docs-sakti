import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { uraiHeaders, headerUntuk, type AturanHeader } from './headers.ts';

const MIME: Record<string, string> = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.mjs': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.xml': 'application/xml; charset=utf-8',
	'.txt': 'text/plain; charset=utf-8',
	'.wasm': 'application/wasm',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.webp': 'image/webp',
	'.ico': 'image/x-icon',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
};

export function buatServer(): Promise<{ server: http.Server; url: string }> {
	const root = path.resolve(process.cwd(), process.env.E2E_DIST ?? 'dist');
	if (!fs.existsSync(path.join(root, 'pagefind', 'pagefind.js'))) {
		console.error('Jalankan pnpm build dulu.');
		process.exit(1);
	}
	const berkasHeaders = path.join(root, '_headers');
	const aturan: AturanHeader[] = fs.existsSync(berkasHeaders)
		? uraiHeaders(fs.readFileSync(berkasHeaders, 'utf8'))
		: [];
	const server = http.createServer((req, res) => {
		const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
		const tambahan =
			aturan.length > 0 ? headerUntuk(aturan, req.headers.host ?? '', pathname) : {};
		let berkas = path.join(root, pathname);
		if (!berkas.startsWith(root + path.sep)) {
			res.writeHead(403, tambahan).end();
			return;
		}
		if (fs.existsSync(berkas) && fs.statSync(berkas).isDirectory()) {
			berkas = path.join(berkas, 'index.html');
		}
		if (!fs.existsSync(berkas) || !fs.statSync(berkas).isFile()) {
			const b404 = path.join(root, '404.html');
			if (fs.existsSync(b404)) {
				res.writeHead(404, { 'content-type': 'text/html; charset=utf-8', ...tambahan });
				fs.createReadStream(b404).pipe(res);
			} else {
				res.writeHead(404, tambahan).end('404');
			}
			return;
		}
		res.writeHead(200, {
			'content-type': MIME[path.extname(berkas)] ?? 'application/octet-stream',
			...tambahan,
		});
		fs.createReadStream(berkas).pipe(res);
	});
	return new Promise((resolve) => {
		server.listen(0, '127.0.0.1', () => {
			const { port } = server.address() as { port: number };
			resolve({ server, url: `http://127.0.0.1:${port}` });
		});
	});
}
