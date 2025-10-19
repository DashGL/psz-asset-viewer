#!/usr/bin/env bun

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, statSync } from 'fs';
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
 * Process assets in a specific scene/subfolder combination
 */
async function processSceneSubfolder(scene: string, subfolder: string, outputName: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🏙️  Processing ${scene}/${subfolder} → ${outputName}`);
  console.log('='.repeat(60));

  const scenePath = join(SCENE_DIR, scene, subfolder);

  if (!existsSync(scenePath)) {
    console.log(`⚠️  Path does not exist: ${scenePath}`);
    return { successful: 0, failed: 0 };
  }

  const outputDir = join(OUTPUT_DIR, outputName);
  mkdirSync(outputDir, { recursive: true });

  const results: ProcessResult[] = [];
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

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Summary for ${scene}/${subfolder}`);
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

  return { successful, failed };
}

/**
 * List all available scene/subfolder combinations
 */
function listAvailableScenes() {
  console.log('📂 Available scenes:\n');

  const scenes = readdirSync(SCENE_DIR)
    .filter(f => {
      const fullPath = join(SCENE_DIR, f);
      return statSync(fullPath).isDirectory();
    })
    .sort();

  for (const scene of scenes) {
    const scenePath = join(SCENE_DIR, scene);
    const subfolders = readdirSync(scenePath)
      .filter(f => {
        const fullPath = join(scenePath, f);
        return statSync(fullPath).isDirectory();
      })
      .sort();

    if (subfolders.length > 0) {
      console.log(`  ${scene}/`);
      subfolders.forEach(sub => {
        const files = readdirSync(join(scenePath, sub));
        const narcCount = files.filter(f => f.endsWith('.narc')).length;
        console.log(`    ${sub}/ (${narcCount} assets)`);
      });
    }
  }

  console.log('\nUsage:');
  console.log('  bun run scripts/process-scenes.ts 00/a         # Process scene 00, subfolder a');
  console.log('  bun run scripts/process-scenes.ts 01/b 01/e   # Process multiple subfolders');
  console.log('  bun run scripts/process-scenes.ts --all       # Process everything');
}

// Main execution
async function main() {
  console.log('🚀 PSZ Scene Asset Processor');
  console.log('Converting NARC/NSBTX files to GLB format\n');

  // Get command line arguments (skip first 2: bun and script path)
  const args = process.argv.slice(2);

  // If no args, list available scenes
  if (args.length === 0) {
    listAvailableScenes();
    return;
  }

  // Check for --all flag
  if (args.includes('--all')) {
    console.log('📌 Processing ALL scenes\n');

    // Get all scene/subfolder combinations
    const scenes = readdirSync(SCENE_DIR)
      .filter(f => statSync(join(SCENE_DIR, f)).isDirectory())
      .sort();

    for (const scene of scenes) {
      const scenePath = join(SCENE_DIR, scene);
      const subfolders = readdirSync(scenePath)
        .filter(f => statSync(join(scenePath, f)).isDirectory())
        .sort();

      for (const subfolder of subfolders) {
        const outputName = `scene_${scene}_${subfolder}`;
        await processSceneSubfolder(scene, subfolder, outputName);
      }
    }
  } else {
    // Process specific scene/subfolder combinations
    console.log(`📌 Processing: ${args.join(', ')}\n`);

    for (const arg of args) {
      const parts = arg.split('/');
      if (parts.length !== 2) {
        console.log(`⚠️  Invalid format: ${arg} (expected format: scene/subfolder, e.g., 00/a)`);
        continue;
      }

      const [scene, subfolder] = parts;
      const outputName = `scene_${scene}_${subfolder}`;
      await processSceneSubfolder(scene, subfolder, outputName);
    }
  }

  console.log('\n✨ All processing complete!');
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
}

main().catch(console.error);
