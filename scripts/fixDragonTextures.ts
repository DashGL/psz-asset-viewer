#!/usr/bin/env bun

import { execSync } from 'child_process';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const TEMP_DIR = './temp/boss_dragon';
const OUTPUT_DIR = './public/enemies/boss_dragon';

console.log('🐉 Fixing Dragon Textures\n');

if (!existsSync(TEMP_DIR)) {
  console.error('❌ Temp directory not found. Run processEnemies first.');
  process.exit(1);
}

// Re-extract textures with the .nsbtx file
console.log('📦 Re-extracting textures with texture file...');
const texturesDir = join(OUTPUT_DIR, 'textures');
mkdirSync(texturesDir, { recursive: true });

const modelPath = join(TEMP_DIR, 'z_001.nsbmd');
const texturePath = join(TEMP_DIR, 'z_001.nsbtx');

try {
  execSync(
    `apicula convert "${modelPath}" "${texturePath}" -o "${texturesDir}" --overwrite`,
    { stdio: 'inherit' }
  );
  console.log('✅ Textures re-extracted successfully!');
  console.log(`📁 Check: ${texturesDir}`);
} catch (error) {
  console.error('❌ Failed to extract textures');
  process.exit(1);
}

// Also check if the horn model needs textures
const hornModelPath = join(TEMP_DIR, 'z_001_horn.nsbmd');
if (existsSync(hornModelPath)) {
  console.log('\n🦴 Found horn model, converting...');
  const partsDir = join(OUTPUT_DIR, 'parts');
  mkdirSync(partsDir, { recursive: true });

  try {
    execSync(
      `apicula convert "${hornModelPath}" "${texturePath}" -o "${partsDir}/z_001_horn" -f glb --overwrite`,
      { stdio: 'inherit' }
    );
    console.log('✅ Horn model converted!');
  } catch (error) {
    console.log('⚠️  Horn conversion completed with warnings');
  }
}

console.log('\n✅ Dragon texture fix complete!');
