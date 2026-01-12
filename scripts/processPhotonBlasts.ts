#!/usr/bin/env bun

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import zpr from '../ArchiveUnpacker/src/zpr';
import narc from '../ArchiveUnpacker/src/narc';

interface PhotonBlastInfo {
  id: string;
  name: string;
  displayName: string;
  modelFile: string;
  animations: string[];
}

const PLAYER_DIR = './raw/player';
const OUTPUT_DIR = './public/photon-blasts';
const TEMP_DIR = './temp/photon_blasts';
const CONTENT_DIR = './src/content/photon-blasts';

// Photon blast metadata
const PB_METADATA: { [key: string]: { name: string; displayName: string } } = {
  'pb_bird': { name: 'mylla_youlla', displayName: 'Mylla & Youlla' },
  'pb_centaur': { name: 'konda_konda', displayName: 'Konda Konda' },
  'pb_dragon': { name: 'leogini', displayName: 'Leogini' },
  'pb_rabbit': { name: 'bunny', displayName: 'Bunny' },
};

if (!existsSync(TEMP_DIR)) {
  mkdirSync(TEMP_DIR, { recursive: true });
}

if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

if (!existsSync(CONTENT_DIR)) {
  mkdirSync(CONTENT_DIR, { recursive: true });
}

async function main() {
  console.log('🚀 PSZ Photon Blast Processor');
  console.log('Converting photon blast models to GLB format...\n');

  // Find all photon blast NARC files
  const pbNarcFiles = readdirSync(PLAYER_DIR)
    .filter(f => f.match(/^pb_\w+\.narc$/))
    .sort();

  console.log(`📂 Found ${pbNarcFiles.length} photon blast NARC files\n`);

  const photonBlasts: PhotonBlastInfo[] = [];
  let successCount = 0;
  let failCount = 0;

  for (const narcFile of pbNarcFiles) {
    try {
      console.log(`📦 Processing ${narcFile}...`);

      const narcId = narcFile.replace('.narc', '');
      const metadata = PB_METADATA[narcId];

      if (!metadata) {
        console.log(`  ⚠️  Unknown photon blast: ${narcId}, skipping`);
        failCount++;
        continue;
      }

      // Read and decompress NARC
      const narcPath = join(PLAYER_DIR, narcFile);
      const narcData = readFileSync(narcPath);
      const decompressed = zpr(narcData.buffer);
      const narcFiles = narc(decompressed);

      // Find model and animation files
      const modelFile = narcFiles.find(f => f.name.endsWith('.nsbmd'));
      const animFiles = narcFiles.filter(f => f.name.endsWith('.nsbca'));

      if (!modelFile) {
        console.log(`  ⚠️  No model found`);
        failCount++;
        continue;
      }

      console.log(`  ✨ Found model: ${modelFile.name}`);
      console.log(`  ✨ Found ${animFiles.length} animations`);

      // Save files to temp
      const tempNarcDir = join(TEMP_DIR, narcId);
      mkdirSync(tempNarcDir, { recursive: true });

      const modelPath = join(tempNarcDir, modelFile.name);
      writeFileSync(modelPath, Buffer.from(modelFile.data));

      for (const animFile of animFiles) {
        const animPath = join(tempNarcDir, animFile.name);
        writeFileSync(animPath, Buffer.from(animFile.data));
      }

      // Convert to GLB
      console.log(`  🔄 Converting to GLB...`);
      const outputPbDir = join(OUTPUT_DIR, metadata.name);
      mkdirSync(outputPbDir, { recursive: true });

      try {
        if (animFiles.length > 0) {
          execSync(
            `apicula convert "${modelPath}" "${tempNarcDir}"/*.nsbca -o "${outputPbDir}" -f glb --overwrite --all-animations`,
            { stdio: 'pipe' }
          );
        } else {
          execSync(
            `apicula convert "${modelPath}" -o "${outputPbDir}" -f glb --overwrite`,
            { stdio: 'pipe' }
          );
        }

        const animationNames = animFiles.map(f => f.name.replace('.nsbca', ''));

        // Find the actual GLB file created by apicula (it may have a different name)
        const outputFiles = readdirSync(outputPbDir).filter(f => f.endsWith('.glb'));
        const glbName = outputFiles[0] || modelFile.name.replace('.nsbmd', '.glb');

        const pbInfo: PhotonBlastInfo = {
          id: narcId,
          name: metadata.name,
          displayName: metadata.displayName,
          modelFile: glbName,
          animations: animationNames
        };

        photonBlasts.push(pbInfo);

        // Save info.json for this photon blast
        const infoPath = join(outputPbDir, 'info.json');
        writeFileSync(infoPath, JSON.stringify(pbInfo, null, 2));

        // Create content entry for Astro
        const contentDir = join(CONTENT_DIR, metadata.name);
        mkdirSync(contentDir, { recursive: true });
        writeFileSync(
          join(contentDir, 'index.json'),
          JSON.stringify({
            name: metadata.name,
            displayName: metadata.displayName,
            animationCount: animFiles.length
          }, null, 2)
        );

        console.log(`  ✅ Converted ${metadata.displayName}`);
        successCount++;
      } catch (error) {
        console.error(`  ❌ Failed to convert to GLB`);
        if (error instanceof Error) {
          console.error(`     ${error.message}`);
        }
        failCount++;
      }

    } catch (error) {
      console.error(`  ❌ Error processing ${narcFile}:`, error instanceof Error ? error.message : String(error));
      failCount++;
    }
  }

  // Save photon blasts metadata
  const metadataPath = join(OUTPUT_DIR, 'photon_blasts.json');
  writeFileSync(metadataPath, JSON.stringify(photonBlasts, null, 2));

  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Summary');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${successCount} photon blasts`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📁 Metadata saved to: ${metadataPath}`);
  console.log(`\n✨ Processing complete!`);
}

main().catch(console.error);
