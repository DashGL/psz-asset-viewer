#!/usr/bin/env bun

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import zpr from '../ArchiveUnpacker/src/zpr';
import narc from '../ArchiveUnpacker/src/narc';
import zarc from '../ArchiveUnpacker/src/zarc';

const PLAYER_DIR = './raw/player';
const OUTPUT_DIR = './public/player';
const TEMP_DIR = './temp/player_test';

// Only process pc_000
const modelZarcPath = join(PLAYER_DIR, 'player_model.zarc');
const modelZarcData = readFileSync(modelZarcPath);
const allModels = zarc(modelZarcData.buffer);

const testModelFile = allModels.find(f => f.name === 'pc_000_000.nsbmd');
if (!testModelFile) {
  console.log('Model not found');
  process.exit(1);
}

console.log('Processing pc_000 with all textures...\n');

const modelPrefix = 'pc_000';
const modelNumber = '000';
const modelBaseName = testModelFile.name.replace('.nsbmd', '');

// Save model to temp
const tempModelDir = join(TEMP_DIR, modelPrefix);
mkdirSync(tempModelDir, { recursive: true });

const modelPath = join(tempModelDir, testModelFile.name);
writeFileSync(modelPath, Buffer.from(testModelFile.data));

// Load textures
const textureZarcPath = join(PLAYER_DIR, `player_${modelNumber}_tex.zarc`);
const textureZarcData = readFileSync(textureZarcPath);
const textureFiles = zarc(textureZarcData.buffer);

console.log(`Found ${textureFiles.length} texture variants`);

// Save textures to temp
const texturesDir = join(tempModelDir, 'textures');
mkdirSync(texturesDir, { recursive: true });

textureFiles.forEach(texture => {
  const texturePath = join(texturesDir, texture.name);
  writeFileSync(texturePath, Buffer.from(texture.data));
});

// Convert textures to PNG
const outputModelDir = join(OUTPUT_DIR, modelPrefix);
const texturesOutputDir = join(outputModelDir, 'textures');
mkdirSync(texturesOutputDir, { recursive: true });

let textureConvertCount = 0;
const startTime = Date.now();

for (const texture of textureFiles) {
  const texturePath = join(texturesDir, texture.name);
  const textureName = texture.name.replace('.nsbtx', '');
  const tempOutputDir = join(tempModelDir, `tex_${textureName}`);
  mkdirSync(tempOutputDir, { recursive: true });

  try {
    execSync(
      `apicula convert "${modelPath}" "${texturePath}" -o "${tempOutputDir}" --overwrite`,
      { stdio: 'pipe' }
    );

    const generatedPng = join(tempOutputDir, `${modelBaseName}.png`);
    const targetPng = join(texturesOutputDir, `${textureName}.png`);

    if (existsSync(generatedPng)) {
      execSync(`mv "${generatedPng}" "${targetPng}"`);
      textureConvertCount++;
      process.stdout.write(`\r  ${textureConvertCount}/${textureFiles.length} textures converted`);
    }
  } catch (error) {
    // Skip failed textures
  }
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\n\n✅ Converted ${textureConvertCount}/${textureFiles.length} textures in ${elapsed}s`);
console.log(`📁 Output: ${texturesOutputDir}`);
