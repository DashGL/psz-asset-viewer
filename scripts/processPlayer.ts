#!/usr/bin/env bun

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import zpr from '../ArchiveUnpacker/src/zpr';
import narc from '../ArchiveUnpacker/src/narc';
import zarc from '../ArchiveUnpacker/src/zarc';

interface ProcessResult {
  success: boolean;
  model: string;
  textureCount?: number;
  error?: string;
}

const PLAYER_DIR = './raw/player';
const OUTPUT_DIR = './public/player';
const TEMP_DIR = './temp/player';

if (!existsSync(TEMP_DIR)) {
  mkdirSync(TEMP_DIR, { recursive: true });
}

if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function processPlayerModel(modelName: string, modelData: ArrayBuffer): Promise<ProcessResult> {
  try {
    console.log(`\n📦 Processing ${modelName}...`);

    // Extract model prefix (e.g., "pc_000_000" -> "pc_000")
    const modelPrefix = modelName.replace('.nsbmd', '').replace(/_000$/, '');
    const modelBaseName = modelName.replace('.nsbmd', ''); // e.g., "pc_000_000"
    const modelNumber = modelPrefix.replace('pc_', '');

    // Save model to temp
    const tempModelDir = join(TEMP_DIR, modelPrefix);
    mkdirSync(tempModelDir, { recursive: true });

    const modelPath = join(tempModelDir, modelName);
    writeFileSync(modelPath, Buffer.from(modelData));
    console.log(`  💾 Saved model file`);

    // Find corresponding texture ZARC
    const textureZarcPath = join(PLAYER_DIR, `player_${modelNumber}_tex.zarc`);

    if (!existsSync(textureZarcPath)) {
      console.log(`  ⚠️  No texture file found for ${modelPrefix}`);
      return {
        success: false,
        model: modelPrefix,
        error: 'No texture file found'
      };
    }

    // Extract textures
    console.log('  🖼️  Extracting textures...');
    const textureZarcData = readFileSync(textureZarcPath);
    const textureFiles = zarc(textureZarcData.buffer);

    console.log(`  ✨ Found ${textureFiles.length} texture variants`);

    const texturesDir = join(tempModelDir, 'textures');
    mkdirSync(texturesDir, { recursive: true });

    // Save all texture files
    textureFiles.forEach(texture => {
      const texturePath = join(texturesDir, texture.name);
      writeFileSync(texturePath, Buffer.from(texture.data));
    });

    // Convert model to GLB
    console.log('  🔄 Converting model to GLB...');
    const outputModelDir = join(OUTPUT_DIR, modelPrefix);
    mkdirSync(outputModelDir, { recursive: true });

    const outputPath = join(outputModelDir, modelPrefix);

    try {
      execSync(
        `apicula convert "${modelPath}" -o "${outputPath}" -f glb --overwrite`,
        { stdio: 'inherit' }
      );
      console.log(`  ✅ Converted ${modelPrefix}.glb`);
    } catch (error) {
      console.error(`  ❌ Failed to convert model`);
      return {
        success: false,
        model: modelPrefix,
        error: 'Failed to convert model'
      };
    }

    // Save texture info
    const textureInfo = textureFiles.map(f => ({
      name: f.name.replace('.nsbtx', ''),
      file: f.name
    }));

    writeFileSync(
      join(outputModelDir, 'textures.json'),
      JSON.stringify(textureInfo, null, 2)
    );
    console.log(`  📝 Saved texture info`);

    // Extract textures to PNG (need to combine model + texture for apicula)
    console.log('  🎨 Converting textures to PNG...');
    const texturesOutputDir = join(outputModelDir, 'textures');
    mkdirSync(texturesOutputDir, { recursive: true });

    // Convert all textures to PNG by combining model + each texture
    let textureConvertCount = 0;
    for (const texture of textureFiles) {
      const texturePath = join(texturesDir, texture.name);
      const textureName = texture.name.replace('.nsbtx', '');
      const tempOutputDir = join(tempModelDir, `tex_${textureName}`);
      mkdirSync(tempOutputDir, { recursive: true });

      try {
        // apicula needs both model and texture file to export PNG
        execSync(
          `apicula convert "${modelPath}" "${texturePath}" -o "${tempOutputDir}" --overwrite`,
          { stdio: 'pipe' }
        );

        // Rename the output PNG to match the texture name
        const generatedPng = join(tempOutputDir, `${modelBaseName}.png`);
        const targetPng = join(texturesOutputDir, `${textureName}.png`);

        if (existsSync(generatedPng)) {
          execSync(`mv "${generatedPng}" "${targetPng}"`);
          textureConvertCount++;
        }
      } catch (error) {
        // Some textures might fail, that's okay
      }
    }
    console.log(`  ✅ Converted ${textureConvertCount}/${textureFiles.length} textures to PNG`);

    // Save model metadata
    const modelInfo = {
      name: modelPrefix,
      modelFile: modelName,
      textureCount: textureFiles.length,
      textures: textureInfo
    };

    writeFileSync(
      join(outputModelDir, 'info.json'),
      JSON.stringify(modelInfo, null, 2)
    );

    return {
      success: true,
      model: modelPrefix,
      textureCount: textureFiles.length
    };
  } catch (error) {
    return {
      success: false,
      model: modelName,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function processAnimations() {
  console.log('\n🎬 Processing shared animations...');

  // Process a sample animation NARC
  const sampleAnimNarc = join(PLAYER_DIR, '00_common_m_pa00.narc');

  if (!existsSync(sampleAnimNarc)) {
    console.log('  ⚠️  Sample animation NARC not found');
    return;
  }

  const narcData = readFileSync(sampleAnimNarc);
  const decompressedNarc = zpr(narcData.buffer);
  const narcFiles = narc(decompressedNarc);

  const animFiles = narcFiles.filter(f => f.name.endsWith('.nsbca'));
  console.log(`  ✨ Found ${animFiles.length} shared animations`);

  const animationsDir = join(OUTPUT_DIR, 'animations');
  mkdirSync(animationsDir, { recursive: true });

  // Save animation info
  const animationInfo = animFiles.map(f => ({
    name: f.name.replace('.nsbca', '').replace(/^bin/, ''),
    file: f.name
  }));

  writeFileSync(
    join(animationsDir, 'animations.json'),
    JSON.stringify(animationInfo, null, 2)
  );
  console.log(`  📝 Saved animation info`);
}

async function main() {
  console.log('🚀 PSZ Player Model Processor');
  console.log('Converting Player models to GLB format\n');

  // Load player models from ZARC
  const modelZarcPath = join(PLAYER_DIR, 'player_model.zarc');

  if (!existsSync(modelZarcPath)) {
    console.error(`❌ player_model.zarc not found at ${modelZarcPath}`);
    process.exit(1);
  }

  console.log('📂 Loading player models...');
  const modelZarcData = readFileSync(modelZarcPath);
  const modelFiles = zarc(modelZarcData.buffer);

  console.log(`Found ${modelFiles.length} player models\n`);

  const results: ProcessResult[] = [];

  // Process each model
  for (const modelFile of modelFiles) {
    const result = await processPlayerModel(modelFile.name, modelFile.data);
    results.push(result);
  }

  // Process shared animations
  await processAnimations();

  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Summary');
  console.log('='.repeat(60));
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed models:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.model}: ${r.error}`);
    });
  }

  console.log(`\n✨ Processing complete!`);
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
}

main().catch(console.error);
