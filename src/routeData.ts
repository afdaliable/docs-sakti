import { defineRouteMiddleware } from '@astrojs/starlight/route-data';
import { bukaModulDiBeranda } from './lib/beranda.ts';

export const onRequest = defineRouteMiddleware((context) => {
	const route = context.locals.starlightRoute;
	if (route.id === '') route.sidebar = bukaModulDiBeranda(route.sidebar);
});
