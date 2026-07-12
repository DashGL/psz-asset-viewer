#!/usr/bin/env bun
/**
 * Process boss_robot + boss_robot_cmb WITH animations.
 *
 * These two were in the processFailedEnemies.ts set ("multi-part model
 * complexity", animations skipped). The actual blockers, solved here:
 *
 * 1. apicula only attaches an animation when its object count EQUALS the
 *    model's — but every PSZ boss-robot rig carries one extra unanimated
 *    root object (named after the model, last in the object list) that the
 *    clips don't cover: z_003 = 21 objects / kit clips = 20; z_003n = 14 /
 *    `_n` clips = 13; z_003u & z_103u = 9 / `_u` clips = 8. Requires the
 *    patched apicula (~/Projects/apicula: connection.rs allows anim objects
 *    == model objects - 1; gltf writer skips channel-less trailing objects).
 *
 * 2. The clips are per-rig families in one narc: suffix-less clips animate
 *    the combined z_003 rig; `*_n` clips animate the n robot; `*_u` clips
 *    the u robot ("Chaos & Mobius" are two robots — `ve_*` are their
 *    separated forms, `ch_in/ch_out` the combine/split transitions).
 *
 * Output layout matches processFailedEnemies.ts (main model dir + parts/ +
 * textures/ + animations.json/parts.json/info.json updates).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import zpr from '../ArchiveUnpacker/src/zpr';
import narc from '../ArchiveUnpacker/src/narc';

const ENEMY_DIR = './raw/enemy';
const OUTPUT_DIR = './public/enemies';
const TEMP_DIR = './temp';

interface Job {
  enemy: string;
  /** main model -> its clip filter; parts -> theirs */
  main: { model: string; anims: (f: string) => boolean };
  parts: Array<{ model: string; anims: (f: string) => boolean }>;
  /** extra loose models to convert as parts (arena props riding the narc) */
  extraParts?: string[];
}

const isCa = (f: string) => f.endsWith('.nsbca') && !f.startsWith('ef_') && !f.includes('dummy') && !f.startsWith('floor');
const nOnly = (f: string) => isCa(f) && /_n\.nsbca$/.test(f);
const uOnly = (f: string) => isCa(f) && /_u\.nsbca$/.test(f);
const combined = (f: string) => isCa(f) && !/_[nu]\.nsbca$/.test(f);

const JOBS: Job[] = [
  {
    enemy: 'boss_robot',
    main: { model: 'z_003.nsbmd', anims: combined }, // only atk_dl_lp lives here
    parts: [
      { model: 'z_003n.nsbmd', anims: nOnly },
      { model: 'z_003u.nsbmd', anims: uOnly },
    ],
    extraParts: ['o0c_bsef01.nsbmd'],
  },
  {
    enemy: 'boss_robot_cmb',
    main: { model: 'z_003.nsbmd', anims: combined }, // the full 26-clip fight kit
    parts: [
      { model: 'z_003n.nsbmd', anims: nOnly },
      { model: 'z_103u.nsbmd', anims: uOnly },
    ],
    extraParts: ['floor_lazer.nsbmd', 'floor_blue.nsbmd', 'floor_orange.nsbmd', 'floor_red.nsbmd', 'floor_yellow.nsbmd'],
  },
];

function convert(files: string[], outDir: string) {
  execSync(`apicula convert ${files.map((f) => `"${f}"`).join(' ')} -o "${outDir}" -f glb --overwrite`, { stdio: 'pipe' });
}

for (const job of JOBS) {
  console.log(`\n📦 ${job.enemy}`);
  const tempDir = join(TEMP_DIR, job.enemy);
  mkdirSync(tempDir, { recursive: true });
  const files = narc(zpr(readFileSync(join(ENEMY_DIR, `${job.enemy}.narc`)).buffer));
  for (const f of files) writeFileSync(join(tempDir, f.name), Buffer.from(f.data));
  const names = files.map((f) => f.name);
  const at = (n: string) => join(tempDir, n);
  const textures = names.filter((n) => n.endsWith('.nsbtx') && !n.startsWith('ef_')).map(at);

  const outDir = join(OUTPUT_DIR, job.enemy);
  const mainBase = job.main.model.replace('.nsbmd', '');

  // Main model + its clip family
  const mainAnims = names.filter(job.main.anims).map(at);
  convert([at(job.main.model), ...textures, ...mainAnims], join(outDir, mainBase));
  console.log(`  ✅ ${mainBase}.glb + ${mainAnims.length} clips`);

  // Parts, each with its own family
  const partsDir = join(outDir, 'parts');
  const partsInfo: Array<{ name: string; file: string }> = [];
  for (const part of job.parts) {
    const base = part.model.replace('.nsbmd', '');
    const anims = names.filter(part.anims).map(at);
    convert([at(part.model), ...textures, ...anims], join(partsDir, base));
    partsInfo.push({ name: base, file: part.model });
    console.log(`  ✅ parts/${base}.glb + ${anims.length} clips`);
  }
  for (const extra of job.extraParts ?? []) {
    if (!names.includes(extra)) continue;
    const base = extra.replace('.nsbmd', '');
    // floor_lazer has its own matching 1-object clip
    const anims = names.filter((n) => n === `${base}.nsbca`).map(at);
    convert([at(extra), ...textures, ...anims], join(partsDir, base));
    partsInfo.push({ name: base, file: extra });
    console.log(`  ✅ parts/${base}.glb (prop)`);
  }
  writeFileSync(join(outDir, 'parts.json'), JSON.stringify(partsInfo, null, 2));

  // animations.json: every non-effect clip in the narc, tokenized like the
  // other enemies (strip the z003_ model prefix).
  const animInfo = names.filter(isCa).map((f) => ({
    name: f.replace('.nsbca', '').replace(/^z_?003_/, ''),
    file: f,
  }));
  writeFileSync(join(outDir, 'animations.json'), JSON.stringify(animInfo, null, 2));

  // info.json refresh
  const infoPath = join(outDir, 'info.json');
  const info = existsSync(infoPath) ? JSON.parse(readFileSync(infoPath, 'utf-8')) : { name: job.enemy };
  info.modelBaseName = mainBase;
  info.animationCount = animInfo.length;
  info.partsCount = partsInfo.length;
  writeFileSync(infoPath, JSON.stringify(info, null, 2));
  console.log(`  📝 ${animInfo.length} animations, ${partsInfo.length} parts`);
}

console.log('\n✨ done');
