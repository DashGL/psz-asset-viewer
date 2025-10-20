#!/usr/bin/env bun

import { readFileSync } from 'fs';
import { join } from 'path';
import zpr from '../ArchiveUnpacker/src/zpr';
import narc from '../ArchiveUnpacker/src/narc';

const ENEMY_DIR = './raw/enemy';

const failedEnemies = [
  'boss_octopus',
  'boss_robot',
  'boss_robot_cmb',
  'swordman',
  'swordman_b',
  'swordman_rare',
  'swordman_rare_b'
];

function exploreEnemy(name: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📦 ${name}`);
  console.log('='.repeat(60));

  try {
    const narcPath = join(ENEMY_DIR, `${name}.narc`);
    const narcData = readFileSync(narcPath);
    const decompressedNarc = zpr(narcData.buffer);
    const narcFiles = narc(decompressedNarc);

    console.log(`\nTotal files: ${narcFiles.length}`);

    // Group files by type
    const nsbmdFiles = narcFiles.filter(f => f.name.endsWith('.nsbmd'));
    const nsbcaFiles = narcFiles.filter(f => f.name.endsWith('.nsbca'));
    const nsbtxFiles = narcFiles.filter(f => f.name.endsWith('.nsbtx'));
    const nsbmaFiles = narcFiles.filter(f => f.name.endsWith('.nsbma'));
    const nsbtaFiles = narcFiles.filter(f => f.name.endsWith('.nsbta'));
    const otherFiles = narcFiles.filter(f =>
      !f.name.endsWith('.nsbmd') &&
      !f.name.endsWith('.nsbca') &&
      !f.name.endsWith('.nsbtx') &&
      !f.name.endsWith('.nsbma') &&
      !f.name.endsWith('.nsbta')
    );

    console.log('\n📐 Models (.nsbmd):');
    nsbmdFiles.forEach(f => {
      const isEffect = f.name.startsWith('ef_') || f.name.startsWith('ff_');
      const prefix = isEffect ? '  [EFFECT]' : '  [MODEL] ';
      console.log(`${prefix} ${f.name} (${f.data.byteLength} bytes)`);
    });

    console.log('\n🎬 Animations (.nsbca):');
    const effectAnims = nsbcaFiles.filter(f => f.name.startsWith('ef_') || f.name.startsWith('ff_'));
    const mainAnims = nsbcaFiles.filter(f => !f.name.startsWith('ef_') && !f.name.startsWith('ff_'));
    console.log(`  Main animations: ${mainAnims.length}`);
    console.log(`  Effect animations: ${effectAnims.length}`);
    if (mainAnims.length <= 10) {
      mainAnims.forEach(f => console.log(`    - ${f.name}`));
    }

    console.log('\n🖼️  Textures (.nsbtx):');
    nsbtxFiles.forEach(f => console.log(`  - ${f.name} (${f.data.byteLength} bytes)`));

    if (nsbmaFiles.length > 0) {
      console.log('\n💫 Material animations (.nsbma):');
      console.log(`  Count: ${nsbmaFiles.length}`);
    }

    if (nsbtaFiles.length > 0) {
      console.log('\n🎨 Texture animations (.nsbta):');
      console.log(`  Count: ${nsbtaFiles.length}`);
    }

    if (otherFiles.length > 0) {
      console.log('\n📄 Other files:');
      otherFiles.forEach(f => console.log(`  - ${f.name}`));
    }

    // Analysis
    console.log('\n🔍 Analysis:');
    const mainModels = nsbmdFiles.filter(f => !f.name.startsWith('ef_') && !f.name.startsWith('ff_'));
    console.log(`  Main model files: ${mainModels.length}`);

    if (mainModels.length > 1) {
      console.log(`  ⚠️  MULTI-PART MODEL DETECTED`);
      console.log(`  Parts:`);
      mainModels.forEach(f => {
        const size = (f.data.byteLength / 1024).toFixed(1);
        console.log(`    - ${f.name} (${size} KB)`);
      });
    }

    if (nsbtxFiles.length > 0) {
      console.log(`  ℹ️  Has separate texture files (.nsbtx)`);
    }

  } catch (error) {
    console.error(`  ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log('🔍 PSZ Failed Enemy Explorer\n');
console.log('Analyzing the 7 enemies that failed to process...\n');

for (const enemy of failedEnemies) {
  exploreEnemy(enemy);
}

console.log(`\n${'='.repeat(60)}`);
console.log('✓ Analysis complete');
console.log('='.repeat(60));
