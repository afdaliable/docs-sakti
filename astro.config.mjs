// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLinksValidator from 'starlight-links-validator';
import { bangunSidebar } from './scripts/build-sidebar.ts';

// https://astro.build/config
export default defineConfig({
	site: 'https://docs-sakti.pages.dev',
	integrations: [
		starlight({
			title: 'SAKTI Knowledge Base',
			defaultLocale: 'root',
			locales: {
				root: { label: 'Bahasa Indonesia', lang: 'id' },
			},
			lastUpdated: true,
			editLink: {
				baseUrl: 'https://github.com/afdaliable/docs-sakti/edit/main/',
			},
			plugins: [starlightLinksValidator({ exclude: ['/peran/**'] })],
			sidebar: bangunSidebar(),
		}),
	],
});
