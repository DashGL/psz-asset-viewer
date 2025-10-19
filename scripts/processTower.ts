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

const SCENE_DIR = './raw/scene/08';
const OUTPUT_DIR = './public';
const TEMP_DIR = './temp';

if (!existsSync(TEMP_DIR)) {
  mkdirSync(TEMP_DIR, { recursive: true });
}

async function processAsset(
  narcPath: string,
  nsbtxPath: string,
  outputDir: string,
  assetName: string
): Promise<ProcessResult> {
  try {
    console.log(`\n📦 Processing ${assetName}...`);

    console.log('  🔓 Decompressing NARC...');
    const narcData = readFileSync(narcPath);
    const decompressedNarc = zpr(narcData.buffer);
    const narcFiles = narc(decompressedNarc);

    console.log('  🔓 Decompressing NSBTX...');
    const nsbtxData = readFileSync(nsbtxPath);
    const decompressedNsbtx = zpr(nsbtxData.buffer);

    const tempAssetDir = join(TEMP_DIR, assetName);
    mkdirSync(tempAssetDir, { recursive: true });

    narcFiles.forEach((file) => {
      const tempPath = join(tempAssetDir, file.name);
      writeFileSync(tempPath, Buffer.from(file.data));
      console.log(`  💾 Saved ${file.name}`);
    });

    const nsbtxFileName = assetName + '.nsbtx';
    const nsbtxTempPath = join(tempAssetDir, nsbtxFileName);
    writeFileSync(nsbtxTempPath, Buffer.from(decompressedNsbtx));
    console.log(`  💾 Saved ${nsbtxFileName}`);

    console.log('  🔄 Converting to GLB with apicula...');
    const outputAssetDir = join(outputDir, assetName);
    mkdirSync(outputAssetDir, { recursive: true });

    const nsbmdFiles = narcFiles.filter(f => f.name.endsWith('.nsbmd'));

    for (const nsbmdFile of nsbmdFiles) {
      const nsbmdPath = join(tempAssetDir, nsbmdFile.name);
      const baseName = nsbmdFile.name.replace('.nsbmd', '');
      const outputPath = join(outputAssetDir, baseName);

      try {
        execSync(
          `apicula convert "${nsbmdPath}" "${nsbtxTempPath}" -o "${outputPath}" -f glb --overwrite`,
          { stdio: 'inherit' }
        );
        console.log(`  ✅ Converted ${baseName}.glb`);
      } catch (error) {
        console.error(`  ❌ Failed to convert ${nsbmdFile.name}`);
      }
    }

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

async function processArea(area: '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | 'e') {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🗼 Processing Eternal Tower - Area ${area.toUpperCase()}`);
  console.log('='.repeat(60));

  const areaPath = join(SCENE_DIR, area);

  if (!existsSync(areaPath)) {
    console.log(`⚠️  Path does not exist: ${areaPath}`);
    return { successful: 0, failed: 0 };
  }

  const outputDir = join(OUTPUT_DIR, `tower_${area}`);
  mkdirSync(outputDir, { recursive: true });

  const results: ProcessResult[] = [];
  const files = readdirSync(areaPath);

  const assetGroups = new Map<string, { narc?: string; nsbtx?: string }>();

  files.forEach(file => {
    const baseName = file.replace(/\.(narc|nsbtx)$/, '');
    if (!assetGroups.has(baseName)) {
      assetGroups.set(baseName, {});
    }

    const group = assetGroups.get(baseName)!;
    if (file.endsWith('.narc')) {
      group.narc = join(areaPath, file);
    } else if (file.endsWith('.nsbtx')) {
      group.nsbtx = join(areaPath, file);
    }
  });

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

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Summary for Eternal Tower ${area.toUpperCase()}`);
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

async function main() {
  console.log('🚀 PSZ Eternal Tower Processor (Scene 08)');
  console.log('Converting Eternal Tower NARC/NSBTX files to GLB format\n');

  await processArea('0');
  await processArea('1');
  await processArea('2');
  await processArea('3');
  await processArea('4');
  await processArea('5');
  await processArea('6');
  await processArea('7');
  await processArea('e');

  console.log('\n✨ Processing complete!');
  console.log(`📁 Output directories:`);
  console.log(`   - ${join(OUTPUT_DIR, 'tower_0')}`);
  console.log(`   - ${join(OUTPUT_DIR, 'tower_1')}`);
  console.log(`   - ${join(OUTPUT_DIR, 'tower_2')}`);
  console.log(`   - ${join(OUTPUT_DIR, 'tower_3')}`);
  console.log(`   - ${join(OUTPUT_DIR, 'tower_4')}`);
  console.log(`   - ${join(OUTPUT_DIR, 'tower_5')}`);
  console.log(`   - ${join(OUTPUT_DIR, 'tower_6')}`);
  console.log(`   - ${join(OUTPUT_DIR, 'tower_7')}`);
  console.log(`   - ${join(OUTPUT_DIR, 'tower_e')}`);
}

main().catch(console.error);
