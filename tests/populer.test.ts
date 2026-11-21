import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import populer from '../src/data/populer.json' with { type: 'json' };

const DOCS = path.resolve(process.cwd(), 'src/content/docs');

test('setiap tautan populer menunjuk berkas konten yang ada', () => {
	assert.ok(populer.length > 0);
	for (const { href } of populer) {
		const segmen = href.replace(/^\/+|\/+$/g, '');
		const ada =
			fs.existsSync(path.join(DOCS, segmen, 'index.mdx')) ||
			fs.existsSync(path.join(DOCS, segmen, 'index.md')) ||
			fs.existsSync(path.join(DOCS, `${segmen}.mdx`)) ||
			fs.existsSync(path.join(DOCS, `${segmen}.md`));
		assert.ok(ada, `tidak ada konten untuk ${href}`);
	}
});
