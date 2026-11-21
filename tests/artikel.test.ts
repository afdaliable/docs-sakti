import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { adalahEntriKonten } from '../src/lib/artikel.ts';

test('adalahEntriKonten membedakan berkas nyata dan sintetis', () => {
	assert.equal(
		adalahEntriKonten({ filePath: 'src/content/docs/faq/index.mdx' }),
		true,
	);
	assert.equal(
		adalahEntriKonten({ filePath: 'src/content/docs/cari.md' }),
		false,
		'jalur sintetis StarlightPage tidak ada di disk',
	);
	assert.equal(
		adalahEntriKonten({ filePath: 'src/content/docs/peran/satker.md' }),
		false,
	);
	assert.equal(adalahEntriKonten({}), false);
	assert.equal(
		adalahEntriKonten({
			filePath: path.resolve(process.cwd(), 'src/content/docs/index.mdx'),
		}),
		true,
	);
});

