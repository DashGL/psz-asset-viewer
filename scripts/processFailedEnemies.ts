#!/usr/bin/env bun

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { execSync } from 'child_process';
import zpr from '../ArchiveUnpacker/src/zpr';
import narc from '../ArchiveUnpacker/src/narc';

interface ProcessResult {
  success: boolean;
  enemy: string;
  error?: string;
}

const ENEMY_DIR = './raw/enemy';
const OUTPUT_DIR = './public/enemies';
const TEMP_DIR = './temp';

const FAILED_ENEMIES = [
  'boss_octopus',
  'boss_robot',
  'boss_robot_cmb',
  'swordman',
  'swordman_b',
  'swordman_rare',
  'swordman_rare_b'
];

if (!existsSync(TEMP_DIR)) {
  mkdirSync(TEMP_DIR, { recursive: true });
}

if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function processEnemy(narcPath: string): Promise<ProcessResult> {
  const enemyName = basename(narcPath, '.narc');

  try {
    console.log(`\n📦 Processing ${enemyName}...`);

    console.log('  🔓 Decompressing NARC...');
    const narcData = readFileSync(narcPath);
    const decompressedNarc = zpr(narcData.buffer);
    const narcFiles = narc(decompressedNarc);

    const tempEnemyDir = join(TEMP_DIR, enemyName);
    mkdirSync(tempEnemyDir, { recursive: true });

    // Save all files to temp
    narcFiles.forEach((file) => {
      const tempPath = join(tempEnemyDir, file.name);
      writeFileSync(tempPath, Buffer.from(file.data));
    });

    console.log(`  💾 Extracted ${narcFiles.length} files`);

    // Find the main model file
    const modelFiles = narcFiles.filter(f =>
      f.name.endsWith('.nsbmd') &&
      !f.name.startsWith('ef_') &&
      !f.name.startsWith('ff_') &&
      !f.name.includes('_obj') &&
      !f.name.includes('lndmd') &&
      !f.name.includes('floor')
    );

    // Prefer models matching standard patterns
    let mainModelFile = modelFiles.find(f =>
      f.name.match(/^[sbmz]_?\d+\.nsbmd$/i)
    );

    if (!mainModelFile && modelFiles.length > 0) {
      const sortedByLength = [...modelFiles].sort((a, b) => a.name.length - b.name.length);
      mainModelFile = sortedByLength.find(f => f.name.match(/^[sbmzo]\d*[a-z]*_\d+\.nsbmd$/i));
    }

    if (!mainModelFile && modelFiles.length > 0) {
      mainModelFile = modelFiles[0];
    }

    if (!mainModelFile) {
      console.log('  ⚠️  No main model file found');
      return {
        success: false,
        enemy: enemyName,
        error: 'No main model file found'
      };
    }

    console.log(`  🎯 Main model: ${mainModelFile.name}`);

    // Find matching texture file
    const modelBaseName = mainModelFile.name.replace('.nsbmd', '');
    const textureFile = narcFiles.find(f => f.name === `${modelBaseName}.nsbtx`);

    // Extract prefix and number
    const prefixMatch = modelBaseName.match(/^([a-z]+)_?(\d+)/i);
    const modelPrefix = prefixMatch ? prefixMatch[1] : '';
    const modelNumber = prefixMatch ? prefixMatch[2] : modelBaseName.replace(/^[a-z]+_?/i, '');
    const numberAsInt = parseInt(modelNumber, 10);
    const mod100 = String(numberAsInt % 100).padStart(3, '0');

    const animationFiles = narcFiles.filter(f => {
      if (!f.name.endsWith('.nsbca')) return false;
      if (f.name.startsWith('ef_')) return false;

      return f.name.startsWith(`${modelBaseName}_`) ||
             f.name.startsWith(`${modelPrefix}${modelNumber}_`) ||
             f.name.startsWith(`${modelPrefix}_${modelNumber}_`) ||
             f.name.startsWith(`${modelPrefix}${mod100}_`);
    });

    console.log(`  🎬 Found ${animationFiles.length} animations`);

    // Find additional model parts
    const additionalParts = modelFiles.filter(f => f.name !== mainModelFile.name);

    if (additionalParts.length > 0) {
      console.log(`  🔧 Found ${additionalParts.length} additional model parts`);
      additionalParts.forEach(part => {
        console.log(`    - ${part.name}`);
      });
    }

    // Find effect files
    const effectModels = narcFiles.filter(f =>
      f.name.startsWith('ef_') && f.name.endsWith('.nsbmd')
    );

    console.log(`  ✨ Found ${effectModels.length} effect models`);

    const outputEnemyDir = join(OUTPUT_DIR, enemyName);
    mkdirSync(outputEnemyDir, { recursive: true });

    // Convert main model to GLB with animations
    console.log('  🔄 Converting main model to GLB...');
    const mainModelPath = join(tempEnemyDir, mainModelFile.name);
    const outputPath = join(outputEnemyDir, modelBaseName);

    // Build list of files to include
    const filesToConvert = [mainModelPath];
    if (textureFile) {
      const texturePath = join(tempEnemyDir, textureFile.name);
      filesToConvert.push(texturePath);
      console.log(`  🖼️  Including texture file: ${textureFile.name}`);
    }

    // NOTE: These enemies have animations that reference materials/bones from multiple parts
    // Converting without animations for now - animations can be added later
    console.log(`  ⚠️  Skipping animations due to multi-part model complexity`);
    const allFiles = filesToConvert.map(p => `"${p}"`).join(' ');

    try {
      execSync(
        `apicula convert ${allFiles} -o "${outputPath}" -f glb --overwrite`,
        { stdio: 'inherit' }
      );
      console.log(`  ✅ Converted ${modelBaseName}.glb (without animations)`);
    } catch (error) {
      console.error(`  ❌ Failed to convert main model`);
      return {
        success: false,
        enemy: enemyName,
        error: 'Failed to convert main model'
      };
    }

    // Extract textures
    console.log('  🖼️  Extracting textures...');
    const texturesDir = join(outputEnemyDir, 'textures');
    mkdirSync(texturesDir, { recursive: true });

    try {
      const textureExtractFiles = textureFile
        ? `"${mainModelPath}" "${join(tempEnemyDir, textureFile.name)}"`
        : `"${mainModelPath}"`;

      execSync(
        `apicula convert ${textureExtractFiles} -o "${texturesDir}" --overwrite`,
        { stdio: 'inherit' }
      );
      console.log(`  ✅ Extracted textures`);

      // Copy textures to the model directory for GLB references
      const modelDir = join(outputEnemyDir, modelBaseName);
      try {
        execSync(
          `cp "${texturesDir}"/${modelBaseName}*.png "${modelDir}/" 2>/dev/null || true`,
          { stdio: 'pipe' }
        );
      } catch (error) {
        // Silently ignore if no PNGs to copy
      }
    } catch (error) {
      console.log(`  ⚠️  Texture extraction completed with warnings`);
    }

    // Convert additional model parts
    if (additionalParts.length > 0) {
      console.log('  🔄 Converting additional model parts...');
      const partsDir = join(outputEnemyDir, 'parts');
      mkdirSync(partsDir, { recursive: true });

      for (const part of additionalParts) {
        const partPath = join(tempEnemyDir, part.name);
        const partBaseName = part.name.replace('.nsbmd', '');
        const partOutputPath = join(partsDir, partBaseName);

        const partTextureFile = narcFiles.find(f => f.name === `${partBaseName}.nsbtx`);
        const partFiles = partTextureFile
          ? `"${partPath}" "${join(tempEnemyDir, partTextureFile.name)}"`
          : `"${partPath}"`;

        try {
          execSync(
            `apicula convert ${partFiles} -o "${partOutputPath}" -f glb --overwrite`,
            { stdio: 'pipe' }
          );
          console.log(`    ✅ Converted ${partBaseName}.glb`);
        } catch (error) {
          console.log(`    ⚠️  Failed to convert ${partBaseName}`);
        }
      }
    }

    // Convert effect models
    if (effectModels.length > 0) {
      console.log('  🔄 Converting effect models...');
      const effectsDir = join(outputEnemyDir, 'effects');
      mkdirSync(effectsDir, { recursive: true });

      for (const effectModel of effectModels) {
        const effectPath = join(tempEnemyDir, effectModel.name);
        const effectBaseName = effectModel.name.replace('.nsbmd', '');
        const effectOutputPath = join(effectsDir, effectBaseName);

        try {
          execSync(
            `apicula convert "${effectPath}" -o "${effectOutputPath}" -f glb --overwrite`,
            { stdio: 'pipe' }
          );
          console.log(`    ✅ Converted ${effectBaseName}.glb`);
        } catch (error) {
          console.log(`    ⚠️  Failed to convert ${effectBaseName}`);
        }
      }
    }

    // Save animation info
    if (animationFiles.length > 0) {
      const animationInfo = animationFiles.map(f => {
        let name = f.name.replace('.nsbca', '');
        name = name.replace(new RegExp(`^${modelPrefix}_?${modelNumber}_`), '');
        name = name.replace(new RegExp(`^${modelPrefix}${mod100}_`), '');
        return {
          name,
          file: f.name
        };
      });

      writeFileSync(
        join(outputEnemyDir, 'animations.json'),
        JSON.stringify(animationInfo, null, 2)
      );
      console.log(`  📝 Saved animation info`);
    }

    // Save parts info
    if (additionalParts.length > 0) {
      const partsInfo = additionalParts.map(f => ({
        name: f.name.replace('.nsbmd', ''),
        file: f.name
      }));

      writeFileSync(
        join(outputEnemyDir, 'parts.json'),
        JSON.stringify(partsInfo, null, 2)
      );
      console.log(`  📝 Saved parts info`);
    }

    // Save effect info
    if (effectModels.length > 0) {
      const effectInfo = effectModels.map(f => ({
        name: f.name.replace('.nsbmd', ''),
        file: f.name
      }));

      writeFileSync(
        join(outputEnemyDir, 'effects.json'),
        JSON.stringify(effectInfo, null, 2)
      );
      console.log(`  📝 Saved effect info`);
    }

    // Save enemy metadata
    const enemyInfo = {
      name: enemyName,
      modelBaseName: modelBaseName,
      animationCount: animationFiles.length,
      effectCount: effectModels.length,
      partsCount: additionalParts.length
    };
    writeFileSync(
      join(outputEnemyDir, 'info.json'),
      JSON.stringify(enemyInfo, null, 2)
    );

    return {
      success: true,
      enemy: enemyName
    };
  } catch (error) {
    return {
      success: false,
      enemy: enemyName,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function main() {
  console.log('🚀 PSZ Failed Enemy Processor');
  console.log('Processing the 7 enemies that previously failed\n');

  const results: ProcessResult[] = [];

  for (const enemyName of FAILED_ENEMIES) {
    const narcPath = join(ENEMY_DIR, `${enemyName}.narc`);
    const result = await processEnemy(narcPath);
    results.push(result);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Summary');
  console.log('='.repeat(60));
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed enemies:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.enemy}: ${r.error}`);
    });
  }

  console.log(`\n✨ Processing complete!`);
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
}

main().catch(console.error);
