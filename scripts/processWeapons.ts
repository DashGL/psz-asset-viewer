#!/usr/bin/env bun

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import zarc from '../ArchiveUnpacker/src/zarc';

interface ProcessResult {
  success: boolean;
  weapon: string;
  hasAnimation?: boolean;
  textureVariants?: number;
  error?: string;
}

const ITEM_DIR = './raw/item';
const OUTPUT_DIR = './public/weapons';
const TEMP_DIR = './temp/weapons';

if (!existsSync(TEMP_DIR)) {
  mkdirSync(TEMP_DIR, { recursive: true });
}

if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function main() {
  console.log('🚀 PSZ Weapon Model Processor');
  console.log('Converting weapon models to GLB format\n');

  // Load weapons from weapon.zarc
  const weaponZarcPath = join(ITEM_DIR, 'weapon.zarc');

  if (!existsSync(weaponZarcPath)) {
    console.error(`❌ weapon.zarc not found at ${weaponZarcPath}`);
    process.exit(1);
  }

  console.log('📂 Loading weapon models...');
  const weaponZarcData = readFileSync(weaponZarcPath);
  const weaponFiles = zarc(weaponZarcData.buffer);

  console.log(`Found ${weaponFiles.length} weapon files\n`);

  // Group files by weapon base name
  const weaponGroups = new Map<string, { model?: ArrayBuffer, textures: Map<string, ArrayBuffer>, animations: Map<string, ArrayBuffer> }>();

  weaponFiles.forEach(file => {
    const ext = file.name.split('.').pop();
    const baseName = file.name.replace(/\.(nsbmd|nsbtx|nsbca)$/, '');

    if (!weaponGroups.has(baseName)) {
      weaponGroups.set(baseName, { textures: new Map(), animations: new Map() });
    }

    const group = weaponGroups.get(baseName)!;

    if (ext === 'nsbmd') {
      // Extract weapon ID from filename (e.g., wbac01_1_b -> wbac01)
      const weaponId = baseName.split('_').slice(0, -2).join('_') || baseName.split('_')[0];
      group.model = file.data;
    } else if (ext === 'nsbtx') {
      group.textures.set(file.name, file.data);
    } else if (ext === 'nsbca') {
      group.animations.set(file.name, file.data);
    }
  });

  // Group by weapon ID (e.g., wbac01, wdac01, etc.)
  const weaponsByType = new Map<string, typeof weaponGroups>();

  weaponGroups.forEach((group, baseName) => {
    // Extract base weapon ID
    const parts = baseName.split('_');
    const weaponId = parts.length >= 2 ? parts.slice(0, -2).join('_') : parts[0];

    if (!weaponsByType.has(weaponId)) {
      weaponsByType.set(weaponId, new Map());
    }

    weaponsByType.get(weaponId)!.set(baseName, group);
  });

  console.log(`📊 Found ${weaponsByType.size} unique weapons\n`);

  const results: ProcessResult[] = [];
  let processedCount = 0;

  // Process each weapon type
  for (const [weaponId, variants] of weaponsByType) {
    try {
      processedCount++;
      console.log(`📦 [${processedCount}/${weaponsByType.size}] Processing ${weaponId}...`);

      if (variants.size === 0) {
        console.log(`  ⚠️  No variants found`);
        results.push({ success: false, weapon: weaponId, error: 'No variants' });
        continue;
      }

      // Create temp directory for this weapon
      const tempWeaponDir = join(TEMP_DIR, weaponId);
      mkdirSync(tempWeaponDir, { recursive: true });

      // Collect animations (shared across all variants)
      const allAnimations = new Map<string, ArrayBuffer>();
      variants.forEach((variant, name) => {
        variant.animations.forEach((data, animName) => {
          allAnimations.set(animName, data);
        });
      });

      // Save animations
      if (allAnimations.size > 0) {
        allAnimations.forEach((data, animName) => {
          const animPath = join(tempWeaponDir, animName);
          writeFileSync(animPath, Buffer.from(data));
        });
      }

      // Convert each variant to GLB
      const outputWeaponDir = join(OUTPUT_DIR, weaponId);
      mkdirSync(outputWeaponDir, { recursive: true });

      const convertedVariants: string[] = [];
      let totalTextures = 0;
      let conversionFailed = false;

      for (const [variantName, variantData] of variants.entries()) {
        // Skip variants without a model
        if (!variantData.model) {
          continue;
        }

        // Save model file
        const modelPath = join(tempWeaponDir, `${variantName}.nsbmd`);
        writeFileSync(modelPath, Buffer.from(variantData.model));

        // Save texture for this variant
        let texturePath = '';
        if (variantData.textures.size > 0) {
          const [texName, texData] = Array.from(variantData.textures.entries())[0];
          texturePath = join(tempWeaponDir, texName);
          writeFileSync(texturePath, Buffer.from(texData));
          totalTextures++;
        }

        // Convert to GLB - use variant name in output path
        const variantOutputDir = join(outputWeaponDir, weaponId);
        const variantOutputPath = join(variantOutputDir, variantName);

        try {
          let convertCmd = `apicula convert "${modelPath}"`;

          // Add texture if available
          if (texturePath) {
            convertCmd += ` "${texturePath}"`;
          }

          // Add animations if available
          if (allAnimations.size > 0) {
            convertCmd += ` "${tempWeaponDir}"/*.nsbca --all-animations`;
          }

          convertCmd += ` -o "${variantOutputPath}" -f glb --overwrite`;

          execSync(convertCmd, { stdio: 'pipe' });
          convertedVariants.push(variantName);

        } catch (error) {
          console.error(`  ⚠️  Failed to convert variant ${variantName}`);
          conversionFailed = true;
        }
      }

      if (convertedVariants.length === 0) {
        console.error(`  ❌ Failed to convert any variants`);
        results.push({
          success: false,
          weapon: weaponId,
          error: 'No variants converted'
        });
        continue;
      }

      console.log(`  ✅ Converted ${convertedVariants.length} variants (${totalTextures} textures, ${allAnimations.size} animations)`);

      // Save weapon metadata
      const weaponInfo = {
        id: weaponId,
        name: convertedVariants[0], // Default to first variant
        textureCount: totalTextures,
        animationCount: allAnimations.size,
        variants: convertedVariants
      };

      writeFileSync(
        join(outputWeaponDir, 'info.json'),
        JSON.stringify(weaponInfo, null, 2)
      );

      results.push({
        success: true,
        weapon: weaponId,
        hasAnimation: allAnimations.size > 0,
        textureVariants: convertedVariants.length
      });

    } catch (error) {
      console.error(`  ❌ Error:`, error instanceof Error ? error.message : String(error));
      results.push({
        success: false,
        weapon: weaponId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Summary');
  console.log('='.repeat(60));
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const withAnimations = results.filter(r => r.success && r.hasAnimation).length;

  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`🎬 With animations: ${withAnimations}`);

  if (failed > 0) {
    console.log('\nFailed weapons:');
    results.filter(r => !r.success).slice(0, 10).forEach(r => {
      console.log(`  - ${r.weapon}: ${r.error}`);
    });
    if (failed > 10) {
      console.log(`  ... and ${failed - 10} more`);
    }
  }

  console.log(`\n✨ Processing complete!`);
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
}

main().catch(console.error);
