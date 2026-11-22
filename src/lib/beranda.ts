import type { StarlightRouteData } from '@astrojs/starlight/route-data';

type EntriSidebar = StarlightRouteData['sidebar'][number];

export function bukaModulDiBeranda(sidebar: EntriSidebar[]): EntriSidebar[] {
	return sidebar.map((kelompok) =>
		kelompok.type !== 'group'
			? kelompok
			: {
					...kelompok,
					entries: kelompok.entries.map((modul) =>
						modul.type === 'group' ? { ...modul, collapsed: false } : modul,
					),
				},
	);
}
