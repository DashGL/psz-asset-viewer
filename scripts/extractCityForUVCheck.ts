#!/usr/bin/env bun

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import zpr from '../ArchiveUnpacker/src/zpr';
import narc from '../ArchiveUnpacker/src/narc';

// Extract s00e_sa1 for UV investigation
const NARC_PATH = './raw/scene/00/e/s00e_sa1.narc';
const NSBTX_PATH = './raw/scene/00/e/s00e_sa1.nsbtx';
const OUTPUT_DIR = './uv-investigation';

console.log('🔍 Extracting s00e_sa1 for UV Investigation\n');

// Clean/create output directory
if (existsSync(OUTPUT_DIR)) {
  console.log('📁 Cleaning existing output directory...');
  execSync(`rm -rf ${OUTPUT_DIR}`);
}
mkdirSync(OUTPUT_DIR, { recursive: true });

try {
  // Step 1: Decompress and extract NARC
  console.log('📦 Step 1: Decompressing NARC...');
  const narcData = readFileSync(NARC_PATH);
  const decompressedNarc = zpr(narcData.buffer);
  const narcFiles = narc(decompressedNarc);
  console.log(`   Found ${narcFiles.length} files in NARC\n`);

  // Step 2: Decompress NSBTX
  console.log('📦 Step 2: Decompressing NSBTX...');
  const nsbtxData = readFileSync(NSBTX_PATH);
  const decompressedNsbtx = zpr(nsbtxData.buffer);
  console.log('   ✅ NSBTX decompressed\n');

  // Step 3: Save decompressed files for apicula viewer
  console.log('💾 Step 3: Saving decompressed files...');
  const rawDir = join(OUTPUT_DIR, 'raw-files');
  mkdirSync(rawDir, { recursive: true });

  // Save all NSBMD files
  narcFiles.forEach((file) => {
    const filePath = join(rawDir, file.name);
    writeFileSync(filePath, Buffer.from(file.data));
    console.log(`   💾 ${file.name}`);
  });

  // Save decompressed NSBTX
  const nsbtxPath = join(rawDir, 's00e_sa1.nsbtx');
  writeFileSync(nsbtxPath, Buffer.from(decompressedNsbtx));
  console.log(`   💾 s00e_sa1.nsbtx\n`);

  // Step 4: Convert to GLB with apicula
  console.log('🔄 Step 4: Converting to GLB with apicula...');
  const glbDir = join(OUTPUT_DIR, 'glb-models');
  mkdirSync(glbDir, { recursive: true });

  const nsbmdFiles = narcFiles.filter(f => f.name.endsWith('.nsbmd'));
  console.log(`   Found ${nsbmdFiles.length} NSBMD files to convert\n`);

  for (const nsbmdFile of nsbmdFiles) {
    const nsbmdPath = join(rawDir, nsbmdFile.name);
    const baseName = nsbmdFile.name.replace('.nsbmd', '');
    const outputPath = join(glbDir, baseName);

    try {
      execSync(
        `apicula convert "${nsbmdPath}" "${nsbtxPath}" -o "${outputPath}" -f glb --overwrite`,
        { stdio: 'inherit' }
      );
      console.log(`   ✅ ${baseName}.glb`);
    } catch (error) {
      console.error(`   ❌ Failed to convert ${nsbmdFile.name}`);
    }
  }

  // Step 5: Extract textures
  console.log('\n🖼️  Step 5: Extracting textures...');
  const textureDir = join(OUTPUT_DIR, 'textures');
  mkdirSync(textureDir, { recursive: true });

  try {
    execSync(
      `apicula convert "${nsbtxPath}" -o "${textureDir}" --overwrite`,
      { stdio: 'inherit' }
    );
    console.log('   ✅ Textures extracted\n');
  } catch (error) {
    console.log('   ⚠️  Texture extraction completed with warnings\n');
  }

  // Summary
  console.log('='.repeat(60));
  console.log('✨ Extraction Complete!');
  console.log('='.repeat(60));
  console.log('\n📁 Output structure:');
  console.log(`   ${OUTPUT_DIR}/`);
  console.log(`   ├── raw-files/        # Decompressed NSBMD + NSBTX for apicula viewer`);
  console.log(`   ├── glb-models/       # Converted GLB files`);
  console.log(`   └── textures/         # Extracted PNG textures`);
  console.log('\n🔍 To view in apicula:');
  console.log(`   apicula view ${join(rawDir, 'lndmd.nsbmd')} ${nsbtxPath}`);
  console.log('\n💡 Check the textures in textures/ folder to see atlas packing');

} catch (error) {
  console.error('\n❌ Error during extraction:');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
