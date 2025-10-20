#!/usr/bin/env bun

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import zarc from '../ArchiveUnpacker/src/zarc';

const PLAYER_DIR = './raw/player';
const OUTPUT_DIR = './public/player';
const TEMP_DIR = './temp/player';

// Test with just pc_000
const modelZarcPath = join(PLAYER_DIR, 'player_model.zarc');
const modelZarcData = readFileSync(modelZarcPath);
const modelFiles = zarc(modelZarcData.buffer);

const testModel = modelFiles.find(f => f.name === 'pc_000_000.nsbmd');
if (!testModel) {
  console.log('Model not found');
  process.exit(1);
}

const modelPrefix = 'pc_000';
const modelNumber = '000';

console.log(`Testing texture conversion for ${modelPrefix}...`);

// Find texture ZARC
const textureZarcPath = join(PLAYER_DIR, `player_${modelNumber}_tex.zarc`);
const textureZarcData = readFileSync(textureZarcPath);
const textureFiles = zarc(textureZarcData.buffer);

console.log(`Found ${textureFiles.length} textures`);

// Save textures to temp
const tempModelDir = join(TEMP_DIR, modelPrefix);
const texturesDir = join(tempModelDir, 'textures');
mkdirSync(texturesDir, { recursive: true });

textureFiles.forEach(texture => {
  const texturePath = join(texturesDir, texture.name);
  writeFileSync(texturePath, Buffer.from(texture.data));
});

// Convert first 3 textures to test
const outputModelDir = join(OUTPUT_DIR, modelPrefix);
const texturesOutputDir = join(outputModelDir, 'textures');
mkdirSync(texturesOutputDir, { recursive: true });

for (let i = 0; i < Math.min(3, textureFiles.length); i++) {
  const texture = textureFiles[i];
  const texturePath = join(texturesDir, texture.name);
  console.log(`Converting ${texture.name}...`);
  
  try {
    execSync(
      `apicula convert "${texturePath}" -o "${texturesOutputDir}" --overwrite`,
      { stdio: 'inherit' }
    );
    console.log(`  ✅ Converted ${texture.name}`);
  } catch (error) {
    console.log(`  ❌ Failed`);
  }
}

console.log('\nChecking output:');
execSync(`ls -lh "${texturesOutputDir}"`, { stdio: 'inherit' });
