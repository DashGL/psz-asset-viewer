#!/usr/bin/env bun

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import zpr from '../ArchiveUnpacker/src/zpr';
import narc from '../ArchiveUnpacker/src/narc';

interface ProcessResult {
  success: boolean;
  asset: string;
  error?: string;
}

const SCENE_DIR = './raw/scene';
const OUTPUT_DIR = './public';
const TEMP_DIR = './temp';

// Create temp directory
if (!existsSync(TEMP_DIR)) {
  mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Process a single NARC/NSBTX pair
 */
async function processAsset(
  narcPath: string,
  nsbtxPath: string,
  outputDir: string,
  assetName: string
): Promise<ProcessResult> {
  try {
    console.log(`\n📦 Processing ${assetName}...`);

    // Step 1: Decompress NARC file
    console.log('  🔓 Decompressing NARC...');
    const narcData = readFileSync(narcPath);
    const decompressedNarc = zpr(narcData.buffer);
    const narcFiles = narc(decompressedNarc);

    // Step 2: Decompress NSBTX file
    console.log('  🔓 Decompressing NSBTX...');
    const nsbtxData = readFileSync(nsbtxPath);
    const decompressedNsbtx = zpr(nsbtxData.buffer);

    // Step 3: Save decompressed files to temp directory
    const tempAssetDir = join(TEMP_DIR, assetName);
    mkdirSync(tempAssetDir, { recursive: true });

    // Save NSBMD files (3D models)
    narcFiles.forEach((file, index) => {
      const tempPath = join(tempAssetDir, file.name);
      writeFileSync(tempPath, Buffer.from(file.data));
      console.log(`  💾 Saved ${file.name}`);
    });

    // Save NSBTX file
    const nsbtxFileName = assetName + '.nsbtx';
    const nsbtxTempPath = join(tempAssetDir, nsbtxFileName);
    writeFileSync(nsbtxTempPath, Buffer.from(decompressedNsbtx));
    console.log(`  💾 Saved ${nsbtxFileName}`);

    // Step 4: Convert using apicula
    console.log('  🔄 Converting to GLB with apicula...');
    const outputAssetDir = join(outputDir, assetName);
    mkdirSync(outputAssetDir, { recursive: true });

    // Find NSBMD files to convert
    const nsbmdFiles = narcFiles.filter(f => f.name.endsWith('.nsbmd'));

    for (const nsbmdFile of nsbmdFiles) {
      const nsbmdPath = join(tempAssetDir, nsbmdFile.name);
      const baseName = nsbmdFile.name.replace('.nsbmd', '');
      const outputPath = join(outputAssetDir, baseName);

      try {
        // Run apicula with both model and texture files
        execSync(
          `apicula convert "${nsbmdPath}" "${nsbtxTempPath}" -o "${outputPath}" -f glb --overwrite`,
          { stdio: 'inherit' }
        );
        console.log(`  ✅ Converted ${baseName}.glb`);
      } catch (error) {
        console.error(`  ❌ Failed to convert ${nsbmdFile.name}`);
      }
    }

    // Step 5: Extract textures as PNG using apicula
    console.log('  🖼️  Extracting textures...');
    const pngOutputDir = join(outputAssetDir, 'textures');
    mkdirSync(pngOutputDir, { recursive: true });

    try {
      execSync(
        `apicula convert "${nsbtxTempPath}" -o "${pngOutputDir}" --overwrite`,
        { stdio: 'inherit' }
      );
      console.log(`  ✅ Extracted textures`);
    } catch (error) {
      console.log(`  ⚠️  Texture extraction completed with warnings`);
    }

    return {
      success: true,
      asset: assetName
    };
  } catch (error) {
    return {
      success: false,
      asset: assetName,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Process all assets in a scene folder (a or e)
 */
async function processSceneFolder(sceneType: 'a' | 'e', sceneFilter?: string[]) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🏙️  Processing city_${sceneType.toUpperCase()}`);
  console.log('='.repeat(60));

  const outputDir = join(OUTPUT_DIR, `city_${sceneType}`);
  mkdirSync(outputDir, { recursive: true });

  const results: ProcessResult[] = [];

  // Find all scene folders containing 'a' or 'e' subdirectories
  let sceneFolders = readdirSync(SCENE_DIR)
    .filter(f => {
      const fullPath = join(SCENE_DIR, f);
      const subPath = join(fullPath, sceneType);
      return existsSync(subPath);
    });

  // Filter by specific scenes if provided
  if (sceneFilter && sceneFilter.length > 0) {
    sceneFolders = sceneFolders.filter(f => sceneFilter.includes(f));
    console.log(`Filtering to scenes: ${sceneFilter.join(', ')}`);
  }

  for (const sceneFolder of sceneFolders) {
    const scenePath = join(SCENE_DIR, sceneFolder, sceneType);
    const files = readdirSync(scenePath);

    // Group files by base name (e.g., s00a_nr1)
    const assetGroups = new Map<string, { narc?: string; nsbtx?: string }>();

    files.forEach(file => {
      const baseName = file.replace(/\.(narc|nsbtx)$/, '');
      if (!assetGroups.has(baseName)) {
        assetGroups.set(baseName, {});
      }

      const group = assetGroups.get(baseName)!;
      if (file.endsWith('.narc')) {
        group.narc = join(scenePath, file);
      } else if (file.endsWith('.nsbtx')) {
        group.nsbtx = join(scenePath, file);
      }
    });

    // Process each asset group
    for (const [baseName, paths] of assetGroups) {
      if (paths.narc && paths.nsbtx) {
        const result = await processAsset(
          paths.narc,
          paths.nsbtx,
          outputDir,
          baseName
        );
        results.push(result);
      } else {
        console.log(`⚠️  Skipping ${baseName} - missing pair`);
      }
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Summary for city_${sceneType.toUpperCase()}`);
  console.log('='.repeat(60));
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed assets:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.asset}: ${r.error}`);
    });
  }
}

// Main execution
async function main() {
  console.log('🚀 PSZ Scene Asset Processor');
  console.log('Converting NARC/NSBTX files to GLB format\n');

  // Get command line arguments (skip first 2: bun and script path)
  const args = process.argv.slice(2);
  const sceneFilter = args.length > 0 ? args : undefined;

  if (sceneFilter) {
    console.log(`📌 Processing specific scenes: ${sceneFilter.join(', ')}\n`);
  } else {
    console.log('📌 Processing all scenes\n');
  }

  // Process both city types
  await processSceneFolder('a', sceneFilter);
  await processSceneFolder('e', sceneFilter);

  console.log('\n✨ All processing complete!');
  console.log(`📁 Output directories:`);
  console.log(`   - ${join(OUTPUT_DIR, 'city_a')}`);
  console.log(`   - ${join(OUTPUT_DIR, 'city_e')}`);
}

main().catch(console.error);
