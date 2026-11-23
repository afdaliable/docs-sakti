// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLinksValidator from 'starlight-links-validator';
import { bangunSidebar } from './scripts/build-sidebar.ts';
import { cspHeaders } from './scripts/csp-headers.ts';
import { REPO_URL, SITUS_URL } from './src/lib/situs.ts';

// https://astro.build/config
export default defineConfig({
	site: SITUS_URL,
	integrations: [
		starlight({
			title: 'SAKTI Knowledge Base',
			customCss: ['./src/styles/kustom.css'],
			components: {
				Footer: './src/components/overrides/Footer.astro',
				Head: './src/components/overrides/Head.astro',
				Hero: './src/components/overrides/Hero.astro',
				PageTitle: './src/components/overrides/PageTitle.astro',
				Search: './src/components/overrides/Search.astro',
				SocialIcons: './src/components/overrides/SocialIcons.astro',
			},
			routeMiddleware: './src/routeData.ts',
			defaultLocale: 'root',
			locales: {
				root: { label: 'Bahasa Indonesia', lang: 'id' },
			},
			lastUpdated: true,
			editLink: {
				baseUrl: `${REPO_URL}/edit/main/`,
			},
			plugins: [starlightLinksValidator({ exclude: ['/peran/**'] })],
			sidebar: bangunSidebar(),
		}),
		cspHeaders(),
	],
});
