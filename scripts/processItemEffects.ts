#!/usr/bin/env bun

/**
 * Item / effect models -- the archives under raw/item.
 *
 * These are the only models in the game that do NOT live under raw/object or
 * raw/enemy, which is why nothing in the viewer reached them until now. Among
 * them are the four player-placed trap models (o0c_burst01..04) -- the small
 * balls a CAST drops, distinct from the environmental traps in the field
 * object archives.
 *
 * Structure differs from objects in one way that matters: each archive has a
 * SINGLE shared .nsbtx holding every texture, rather than one .nsbtx per
 * model. apicula resolves the right texture by name, so the whole archive is
 * passed to every convert.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import narc from '../ArchiveUnpacker/src/narc';
import zpr from '../ArchiveUnpacker/src/zpr';

interface ProcessResult {
  success: boolean;
  archive: string;
  modelCount?: number;
  error?: string;
}

const ITEM_DIR = './raw/item';
const OUTPUT_DIR = './public/effects';
const TEMP_DIR = './temp/effects';

// (id, model archive, texture archive)
const ARCHIVES: [string, string, string][] = [
  ['item_effects', 'effect_dat.narc', 'effect_tex.narc'],
  ['item_global', 'global_dat.narc', 'global_tex.narc'],
  ['item_middle', 'middle_dat.narc', 'middle_tex.narc'],
];

for (const dir of [TEMP_DIR, OUTPUT_DIR]) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

async function processArchive(
  id: string,
  modelArchive: string,
  textureArchive: string
): Promise<ProcessResult> {
  try {
    console.log(`\n📦 Processing ${id} (${modelArchive})...`);

    const tempDir = join(TEMP_DIR, id);
    mkdirSync(tempDir, { recursive: true });

    const modelFiles = narc(zpr(readFileSync(join(ITEM_DIR, modelArchive)).buffer));
    const textureFiles = narc(zpr(readFileSync(join(ITEM_DIR, textureArchive)).buffer));

    console.log(`  ${modelFiles.length} model files, ${textureFiles.length} texture files`);

    for (const f of [...modelFiles, ...textureFiles]) {
      writeFileSync(join(tempDir, f.name), Buffer.from(f.data));
    }

    // one shared texture archive for every model in this set
    const sharedTextures = textureFiles
      .filter(f => f.name.endsWith('.nsbtx'))
      .map(f => `"${join(tempDir, f.name)}"`)
      .join(' ');

    const outputDir = join(OUTPUT_DIR, id);
    mkdirSync(outputDir, { recursive: true });

    const nsbmd = modelFiles.filter(f => f.name.endsWith('.nsbmd'));
    const converted: string[] = [];

    for (const model of nsbmd) {
      const baseName = model.name.replace('.nsbmd', '');
      const cmd =
        `apicula convert "${join(tempDir, model.name)}" ${sharedTextures} ` +
        `-o "${join(outputDir, baseName)}" -f glb --overwrite`;
      try {
        execSync(cmd, { stdio: 'pipe' });
        converted.push(baseName);
      } catch {
        console.error(`  ⚠️  Failed to convert ${baseName}`);
      }
    }

    console.log(`  ✅ Converted ${converted.length}/${nsbmd.length}`);

    writeFileSync(
      join(outputDir, 'info.json'),
      JSON.stringify(
        {
          id,
          modelCount: converted.length,
          totalModels: nsbmd.length,
          textureCount: textureFiles.length,
          models: converted.map(m => `${m}.nsbmd`).sort(),
        },
        null,
        2
      )
    );

    return { success: true, archive: id, modelCount: converted.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`  ❌ Error:`, message);
    return { success: false, archive: id, error: message };
  }
}

async function main() {
  console.log('🚀 PSZ Item / Effect Model Processor');

  const results: ProcessResult[] = [];
  for (const [id, model, texture] of ARCHIVES) {
    if (!existsSync(join(ITEM_DIR, model))) {
      console.log(`⚠️  ${model} not found, skipping`);
      continue;
    }
    results.push(await processArchive(id, model, texture));
  }

  console.log(`\n${'='.repeat(60)}`);
  const ok = results.filter(r => r.success);
  console.log(`📊 ${ok.length}/${results.length} archives, ${ok.reduce((s, r) => s + (r.modelCount || 0), 0)} models`);
  for (const r of results) {
    console.log(`  ${r.success ? '✅' : '❌'} ${r.archive} ${r.success ? `(${r.modelCount})` : r.error}`);
  }
}

main();
