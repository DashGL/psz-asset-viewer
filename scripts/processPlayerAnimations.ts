#!/usr/bin/env bun

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import zpr from '../ArchiveUnpacker/src/zpr';
import narc from '../ArchiveUnpacker/src/narc';

interface AnimationInfo {
  name: string;
  file: string;
  source: string;
  category: string;
  weaponType: string;
}

const PLAYER_DIR = './raw/player';
const OUTPUT_DIR = './public/player/animations';
const TEMP_DIR = './temp/player_animations';

if (!existsSync(TEMP_DIR)) {
  mkdirSync(TEMP_DIR, { recursive: true });
}

if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

interface AnimationSet {
  id: string;
  category: string;
  weaponType: string;
  classPrefix: string;
  glbFile: string;
  animationCount: number;
  animations: string[];
}

async function main() {
  console.log('🚀 PSZ Player Animation Processor');
  console.log('Converting player animations to GLB format...\n');

  // Use a reference model for animation conversion
  const referenceModel = './temp/player/pc_000/pc_000_000.nsbmd';

  if (!existsSync(referenceModel)) {
    console.error(`❌ Reference model not found: ${referenceModel}`);
    console.error('Please run "npm run processPlayer" first to extract player models.');
    process.exit(1);
  }

  // Find all animation NARC files
  const animNarcFiles = readdirSync(PLAYER_DIR)
    .filter(f => f.match(/_pa\d+\.narc$/))
    .sort();

  console.log(`📂 Found ${animNarcFiles.length} animation NARC files\n`);

  const animationSets: AnimationSet[] = [];
  let totalAnimCount = 0;
  let successCount = 0;
  let failCount = 0;

  for (const narcFile of animNarcFiles) {
    try {
      console.log(`📦 Processing ${narcFile}...`);

      // Parse filename to get metadata
      // Format: ##_category_weapontype_pa##.narc
      const match = narcFile.match(/^(\d+)_([^_]+)_([^_]+)_pa\d+\.narc$/);
      if (!match) {
        console.log(`  ⚠️  Couldn't parse filename, skipping`);
        failCount++;
        continue;
      }

      const [, classPrefix, category, weaponType] = match;
      const setId = `${classPrefix}_${category}_${weaponType}`;

      // Read and decompress NARC
      const narcPath = join(PLAYER_DIR, narcFile);
      const narcData = readFileSync(narcPath);
      const decompressed = zpr(narcData.buffer);
      const narcFiles = narc(decompressed);

      // Filter for .nsbca animation files
      const animFiles = narcFiles.filter(f => f.name.endsWith('.nsbca'));

      if (animFiles.length === 0) {
        console.log(`  ⚠️  No animations found`);
        failCount++;
        continue;
      }

      console.log(`  ✨ Found ${animFiles.length} animations`);
      totalAnimCount += animFiles.length;

      // Save animation files to temp
      const tempNarcDir = join(TEMP_DIR, narcFile.replace('.narc', ''));
      mkdirSync(tempNarcDir, { recursive: true });

      for (const animFile of animFiles) {
        const animPath = join(tempNarcDir, animFile.name);
        writeFileSync(animPath, Buffer.from(animFile.data));
      }

      // Convert to GLB with all animations
      console.log(`  🔄 Converting to GLB...`);
      const outputSetDir = join(OUTPUT_DIR, category, weaponType);
      mkdirSync(outputSetDir, { recursive: true });

      const glbOutputPath = join(outputSetDir, setId);

      try {
        execSync(
          `apicula convert "${referenceModel}" "${tempNarcDir}"/*.nsbca -o "${glbOutputPath}" -f glb --overwrite --all-animations`,
          { stdio: 'pipe' }
        );

        const animationNames = animFiles.map(f => f.name.replace('.nsbca', ''));

        animationSets.push({
          id: setId,
          category: category,
          weaponType: weaponType,
          classPrefix: classPrefix,
          glbFile: `${category}/${weaponType}/${setId}/pc_000_000.glb`,
          animationCount: animFiles.length,
          animations: animationNames
        });

        console.log(`  ✅ Converted to ${setId}.glb`);
        successCount++;
      } catch (error) {
        console.error(`  ❌ Failed to convert to GLB`);
        failCount++;
      }

    } catch (error) {
      console.error(`  ❌ Error processing ${narcFile}:`, error instanceof Error ? error.message : String(error));
      failCount++;
    }
  }

  // Save animation sets metadata
  const metadataPath = join(OUTPUT_DIR, 'animation_sets.json');
  writeFileSync(metadataPath, JSON.stringify(animationSets, null, 2));

  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Summary');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${successCount} animation sets`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📦 Total animations: ${totalAnimCount}`);
  console.log(`📁 Metadata saved to: ${metadataPath}`);
  console.log(`\n✨ Processing complete!`);
}

main().catch(console.error);
