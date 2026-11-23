import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
	const isi = `User-agent: *
Allow: /

Sitemap: ${new URL('sitemap-index.xml', site).href}
`;
	return new Response(isi, {
		headers: { 'content-type': 'text/plain; charset=utf-8' },
	});
};
