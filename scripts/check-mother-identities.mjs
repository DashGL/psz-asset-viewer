import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MOTHER_IDENTITIES, enemyDisplayName } from '../src/utils/enemyIdentity.ts';

const expected = {
  boss_mother: 'z_004', boss_mother_piece: 'z_004_koma_a', mother: 'b_072',
  mother_sword: 'b_172', mother_gun: 'b_272', mother_tech: 'b_372',
};
assert.equal(new Set(Object.values(MOTHER_IDENTITIES)).size, 6);
for (const [id, model] of Object.entries(expected)) {
  const metadata = JSON.parse(readFileSync(new URL(`../src/content/enemies/${id}/index.json`, import.meta.url)));
  assert.equal(metadata.name, id);
  assert.equal(metadata.modelBaseName, model);
  const html = readFileSync(new URL(`../dist/enemies/${id}/index.html`, import.meta.url), 'utf8');
  assert.ok(html.includes(enemyDisplayName(id)), `${id} display name missing`);
  assert.ok(html.includes(model), `${id} source model missing`);
  assert.ok(html.includes('/psz-asset-viewer/enemies/boss_mother_piece/'), `${id} piece link missing`);
}
console.log('Six distinct Mother identities, source models and related navigation passed.');
