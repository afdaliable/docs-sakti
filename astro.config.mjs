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
			customCss: ['./src/styles/kustom.css'],
			components: {
				PageTitle: './src/components/overrides/PageTitle.astro',
				Search: './src/components/overrides/Search.astro',
			},
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
