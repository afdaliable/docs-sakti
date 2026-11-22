import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

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
	const root = path.resolve(process.cwd(), 'dist');
	if (!fs.existsSync(path.join(root, 'pagefind', 'pagefind.js'))) {
		console.error('Jalankan pnpm build dulu.');
		process.exit(1);
	}
	const server = http.createServer((req, res) => {
		const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
		let berkas = path.join(root, pathname);
		if (!berkas.startsWith(root + path.sep)) {
			res.writeHead(403).end();
			return;
		}
		if (fs.existsSync(berkas) && fs.statSync(berkas).isDirectory()) {
			berkas = path.join(berkas, 'index.html');
		}
		if (!fs.existsSync(berkas) || !fs.statSync(berkas).isFile()) {
			res.writeHead(404).end('404');
			return;
		}
		res.writeHead(200, {
			'content-type': MIME[path.extname(berkas)] ?? 'application/octet-stream',
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
