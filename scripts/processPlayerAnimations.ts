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

async function processWeaponAnimations(
  referenceModel: string,
  animationSets: AnimationSet[],
  stats: { totalAnimCount: number; successCount: number; failCount: number }
) {
  // Find all weapon animation NARC files
  const animNarcFiles = readdirSync(PLAYER_DIR)
    .filter(f => f.match(/_pa\d+\.narc$/))
    .sort();

  // Group packs by animation set (class + category + weapon variant). Each set
  // ships as several pa## NARCs (pa00/pa01/pa02...) that are identical except
  // for one unique Photon Art animation apiece (binpmXX_pa1 / pa2 / pa3). They
  // MUST be merged into a single GLB: emitting one GLB per pack to the same
  // `setId` path with --overwrite would keep only the last pack, silently
  // dropping pa1/pa2 and leaving just pa3 in the shipped output.
  //
  // Filename format: ##_category_variant_pa##.narc where variant is m|sm|w|sw.
  // category may itself contain an underscore (e.g. a_rifle, d_saver, l_cannon),
  // so anchor on the known variant suffix rather than counting underscores.
  interface PackGroup {
    classPrefix: string;
    category: string;
    weaponType: string;
    narcs: string[];
  }
  const groups = new Map<string, PackGroup>();

  for (const narcFile of animNarcFiles) {
    const match = narcFile.match(/^(\d+)_(.+)_(sw|sm|w|m)_pa\d+\.narc$/);
    if (!match) {
      console.log(`⚠️  Couldn't parse ${narcFile}, skipping`);
      stats.failCount++;
      continue;
    }

    const [, classPrefix, category, weaponType] = match;
    const setId = `${classPrefix}_${category}_${weaponType}`;

    if (!groups.has(setId)) {
      groups.set(setId, { classPrefix, category, weaponType, narcs: [] });
    }
    groups.get(setId)!.narcs.push(narcFile);
  }

  console.log(`📂 Found ${animNarcFiles.length} weapon animation NARC files in ${groups.size} sets\n`);

  for (const [setId, group] of groups) {
    try {
      const { classPrefix, category, weaponType } = group;
      console.log(`📦 Processing ${setId} (${group.narcs.length} packs)...`);

      // Merge .nsbca animations across every pack in the set, deduping by name.
      // Common anims (wait/run/atk...) are identical between packs so first-wins
      // is fine; the per-pack Photon Arts (pa1/pa2/pa3) have distinct names and
      // are therefore all preserved.
      const seen = new Set<string>();
      const mergedAnims: { name: string; data: ArrayBuffer }[] = [];

      for (const narcFile of group.narcs) {
        const narcData = readFileSync(join(PLAYER_DIR, narcFile));
        const decompressed = zpr(narcData.buffer);
        const narcFiles = narc(decompressed);

        for (const f of narcFiles) {
          if (!f.name.endsWith('.nsbca') || seen.has(f.name)) continue;
          seen.add(f.name);
          mergedAnims.push(f);
        }
      }

      if (mergedAnims.length === 0) {
        console.log(`  ⚠️  No animations found`);
        stats.failCount++;
        continue;
      }

      console.log(`  ✨ Merged ${mergedAnims.length} unique animations across ${group.narcs.length} packs`);
      stats.totalAnimCount += mergedAnims.length;

      // Save merged animation files to temp
      const tempNarcDir = join(TEMP_DIR, setId);
      mkdirSync(tempNarcDir, { recursive: true });

      for (const animFile of mergedAnims) {
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

        const animationNames = mergedAnims.map(f => f.name.replace('.nsbca', ''));

        animationSets.push({
          id: setId,
          category: category,
          weaponType: weaponType,
          classPrefix: classPrefix,
          glbFile: `${category}/${weaponType}/${setId}/pc_000_000.glb`,
          animationCount: mergedAnims.length,
          animations: animationNames
        });

        console.log(`  ✅ Converted to ${setId}.glb`);
        stats.successCount++;
      } catch (error) {
        console.error(`  ❌ Failed to convert to GLB`);
        stats.failCount++;
      }

    } catch (error) {
      console.error(`  ❌ Error processing ${setId}:`, error instanceof Error ? error.message : String(error));
      stats.failCount++;
    }
  }
}

async function processLobbyAnimations(
  referenceModel: string,
  animationSets: AnimationSet[],
  stats: { totalAnimCount: number; successCount: number; failCount: number }
) {
  // Find lobby/city animation NARC files
  const lobbyNarcFiles = readdirSync(PLAYER_DIR)
    .filter(f => f.match(/^99_city_\w+\.narc$/))
    .sort();

  console.log(`\n📂 Found ${lobbyNarcFiles.length} lobby animation NARC files\n`);

  for (const narcFile of lobbyNarcFiles) {
    try {
      console.log(`📦 Processing ${narcFile}...`);

      // Parse filename: 99_city_m.narc, 99_city_w.narc, etc.
      const match = narcFile.match(/^99_city_(\w+)\.narc$/);
      if (!match) {
        console.log(`  ⚠️  Couldn't parse filename, skipping`);
        stats.failCount++;
        continue;
      }

      const [, bodyType] = match;
      const setId = `99_lobby_${bodyType}`;

      // Read and decompress NARC
      const narcPath = join(PLAYER_DIR, narcFile);
      const narcData = readFileSync(narcPath);
      const decompressed = zpr(narcData.buffer);
      const narcFiles = narc(decompressed);

      // Filter for .nsbca animation files
      const animFiles = narcFiles.filter(f => f.name.endsWith('.nsbca'));

      if (animFiles.length === 0) {
        console.log(`  ⚠️  No animations found`);
        stats.failCount++;
        continue;
      }

      console.log(`  ✨ Found ${animFiles.length} animations`);
      stats.totalAnimCount += animFiles.length;

      // Save animation files to temp
      const tempNarcDir = join(TEMP_DIR, narcFile.replace('.narc', ''));
      mkdirSync(tempNarcDir, { recursive: true });

      for (const animFile of animFiles) {
        const animPath = join(tempNarcDir, animFile.name);
        writeFileSync(animPath, Buffer.from(animFile.data));
      }

      // Convert to GLB with all animations
      console.log(`  🔄 Converting to GLB...`);
      const outputSetDir = join(OUTPUT_DIR, 'lobby', bodyType);
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
          category: 'lobby',
          weaponType: bodyType,
          classPrefix: '99',
          glbFile: `lobby/${bodyType}/${setId}/pc_000_000.glb`,
          animationCount: animFiles.length,
          animations: animationNames
        });

        console.log(`  ✅ Converted to ${setId}.glb`);
        stats.successCount++;
      } catch (error) {
        console.error(`  ❌ Failed to convert to GLB`);
        stats.failCount++;
      }

    } catch (error) {
      console.error(`  ❌ Error processing ${narcFile}:`, error instanceof Error ? error.message : String(error));
      stats.failCount++;
    }
  }
}

async function processAlwaysAnimations(
  referenceModel: string,
  animationSets: AnimationSet[],
  stats: { totalAnimCount: number; successCount: number; failCount: number }
) {
  const narcFile = '99_always.narc';
  const narcPath = join(PLAYER_DIR, narcFile);

  if (!existsSync(narcPath)) {
    console.log(`\n⚠️  ${narcFile} not found, skipping always animations`);
    return;
  }

  console.log(`\n📦 Processing ${narcFile} (weapon change animations)...`);

  try {
    // Read and decompress NARC
    const narcData = readFileSync(narcPath);
    const decompressed = zpr(narcData.buffer);
    const narcFiles = narc(decompressed);

    // Filter for .nsbca animation files
    const animFiles = narcFiles.filter(f => f.name.endsWith('.nsbca'));

    if (animFiles.length === 0) {
      console.log(`  ⚠️  No animations found`);
      stats.failCount++;
      return;
    }

    console.log(`  ✨ Found ${animFiles.length} animations`);
    stats.totalAnimCount += animFiles.length;

    // Save animation files to temp
    const tempNarcDir = join(TEMP_DIR, '99_always');
    mkdirSync(tempNarcDir, { recursive: true });

    for (const animFile of animFiles) {
      const animPath = join(tempNarcDir, animFile.name);
      writeFileSync(animPath, Buffer.from(animFile.data));
    }

    // Convert to GLB with all animations
    console.log(`  🔄 Converting to GLB...`);
    const outputSetDir = join(OUTPUT_DIR, 'always');
    mkdirSync(outputSetDir, { recursive: true });

    const glbOutputPath = join(outputSetDir, '99_always');

    try {
      execSync(
        `apicula convert "${referenceModel}" "${tempNarcDir}"/*.nsbca -o "${glbOutputPath}" -f glb --overwrite --all-animations`,
        { stdio: 'pipe' }
      );

      const animationNames = animFiles.map(f => f.name.replace('.nsbca', ''));

      animationSets.push({
        id: '99_always',
        category: 'always',
        weaponType: 'all',
        classPrefix: '99',
        glbFile: `always/99_always/pc_000_000.glb`,
        animationCount: animFiles.length,
        animations: animationNames
      });

      console.log(`  ✅ Converted to 99_always.glb`);
      stats.successCount++;
    } catch (error) {
      console.error(`  ❌ Failed to convert to GLB`);
      stats.failCount++;
    }

  } catch (error) {
    console.error(`  ❌ Error processing ${narcFile}:`, error instanceof Error ? error.message : String(error));
    stats.failCount++;
  }
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

  const animationSets: AnimationSet[] = [];
  const stats = { totalAnimCount: 0, successCount: 0, failCount: 0 };

  // Process weapon animations
  console.log('='.repeat(60));
  console.log('Processing Weapon Animations');
  console.log('='.repeat(60));
  await processWeaponAnimations(referenceModel, animationSets, stats);

  // Process lobby animations
  console.log('\n' + '='.repeat(60));
  console.log('Processing Lobby Animations');
  console.log('='.repeat(60));
  await processLobbyAnimations(referenceModel, animationSets, stats);

  // Process always animations (weapon change)
  console.log('\n' + '='.repeat(60));
  console.log('Processing Always Animations');
  console.log('='.repeat(60));
  await processAlwaysAnimations(referenceModel, animationSets, stats);

  // Save animation sets metadata
  const metadataPath = join(OUTPUT_DIR, 'animation_sets.json');
  writeFileSync(metadataPath, JSON.stringify(animationSets, null, 2));

  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Summary');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${stats.successCount} animation sets`);
  console.log(`❌ Failed: ${stats.failCount}`);
  console.log(`📦 Total animations: ${stats.totalAnimCount}`);
  console.log(`📁 Metadata saved to: ${metadataPath}`);
  console.log(`\n✨ Processing complete!`);
}

main().catch(console.error);
