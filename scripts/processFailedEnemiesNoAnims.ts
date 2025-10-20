#!/usr/bin/env bun

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { execSync } from 'child_process';
import zpr from '../ArchiveUnpacker/src/zpr';
import narc from '../ArchiveUnpacker/src/narc';

const ENEMY_DIR = './raw/enemy';
const OUTPUT_DIR = './public/enemies';
const TEMP_DIR = './temp';

const FAILED_ENEMIES = ['swordman']; // Start with just one

if (!existsSync(TEMP_DIR)) {
  mkdirSync(TEMP_DIR, { recursive: true });
}

async function processEnemy(narcPath: string) {
  const enemyName = basename(narcPath, '.narc');

  console.log(`\n📦 Processing ${enemyName}...`);

  const narcData = readFileSync(narcPath);
  const decompressedNarc = zpr(narcData.buffer);
  const narcFiles = narc(decompressedNarc);

  const tempEnemyDir = join(TEMP_DIR, enemyName);
  mkdirSync(tempEnemyDir, { recursive: true });

  narcFiles.forEach((file) => {
    const tempPath = join(tempEnemyDir, file.name);
    writeFileSync(tempPath, Buffer.from(file.data));
  });

  console.log(`  💾 Extracted ${narcFiles.length} files`);

  const modelFiles = narcFiles.filter(f =>
    f.name.endsWith('.nsbmd') &&
    !f.name.startsWith('ef_') &&
    !f.name.startsWith('ff_')
  );

  console.log(`  📐 Found ${modelFiles.length} model files:`);
  modelFiles.forEach(f => console.log(`    - ${f.name}`));

  // Find animation files
  const animFiles = narcFiles.filter(f => f.name.endsWith('.nsbca') && !f.name.startsWith('ef_'));
  console.log(`  🎬 Found ${animFiles.length} animation files`);
  if (animFiles.length > 0 && animFiles.length <= 5) {
    animFiles.forEach(f => console.log(`    - ${f.name}`));
  }

  // Test 1: Convert main model WITHOUT animations
  const mainModel = modelFiles.find(f => f.name === 'b_062.nsbmd');
  const mainTexture = narcFiles.find(f => f.name === 'b_062.nsbtx');

  if (mainModel) {
    console.log('\n  Test 1: Main model without animations');
    const mainPath = join(tempEnemyDir, mainModel.name);
    const texturePath = mainTexture ? join(tempEnemyDir, mainTexture.name) : '';
    const files = texturePath ? `"${mainPath}" "${texturePath}"` : `"${mainPath}"`;

    try {
      execSync(
        `apicula convert ${files} -o test_main_no_anim -f glb --overwrite`,
        { stdio: 'inherit' }
      );
      console.log('    ✅ Success!');
    } catch (error) {
      console.log('    ❌ Failed');
    }
  }

  // Test 2: Convert sword WITHOUT animations
  const swordModel = modelFiles.find(f => f.name === 'b_062_sw.nsbmd');

  if (swordModel) {
    console.log('\n  Test 2: Sword model without animations');
    const swordPath = join(tempEnemyDir, swordModel.name);

    try {
      execSync(
        `apicula convert "${swordPath}" -o test_sword_no_anim -f glb --overwrite`,
        { stdio: 'inherit' }
      );
      console.log('    ✅ Success!');
    } catch (error) {
      console.log('    ❌ Failed');
    }
  }

  // Test 3: Try with just ONE animation
  if (animFiles.length > 0) {
    console.log('\n  Test 3: Main model with ONE animation');
    const mainPath = join(tempEnemyDir, mainModel!.name);
    const texturePath = mainTexture ? join(tempEnemyDir, mainTexture.name) : '';
    const oneAnimPath = join(tempEnemyDir, animFiles[0].name);
    const files = texturePath
      ? `"${mainPath}" "${texturePath}" "${oneAnimPath}"`
      : `"${mainPath}" "${oneAnimPath}"`;

    try {
      execSync(
        `apicula convert ${files} -o test_one_anim -f glb --overwrite --all-animations`,
        { stdio: 'inherit' }
      );
      console.log('    ✅ Success!');
    } catch (error) {
      console.log('    ❌ Failed');
    }
  }
}

async function main() {
  console.log('🔬 PSZ Enemy Debug Script\n');

  for (const enemyName of FAILED_ENEMIES) {
    const narcPath = join(ENEMY_DIR, `${enemyName}.narc`);
    await processEnemy(narcPath);
  }
}

main().catch(console.error);
