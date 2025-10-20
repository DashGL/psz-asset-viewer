#!/usr/bin/env bun

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import narc from '../ArchiveUnpacker/src/narc';
import zpr from '../ArchiveUnpacker/src/zpr';

interface ProcessResult {
  success: boolean;
  object: string;
  modelCount?: number;
  error?: string;
}

const OBJECT_DIR = './raw/object';
const OUTPUT_DIR = './public/objects';
const TEMP_DIR = './temp/objects';

if (!existsSync(TEMP_DIR)) {
  mkdirSync(TEMP_DIR, { recursive: true });
}

if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function processObjectSet(objectDir: string, objectName: string, modelFile: string, textureFile: string): Promise<ProcessResult> {
  try {
    console.log(`📦 Processing ${objectName}...`);

    // Create temp directory for this object set
    const tempObjectDir = join(TEMP_DIR, objectName);
    mkdirSync(tempObjectDir, { recursive: true });

    // Read and decompress model NARC (ZPR compressed)
    const modelPath = join(objectDir, modelFile);
    const modelCompressed = readFileSync(modelPath);
    const modelDecompressed = zpr(modelCompressed.buffer);
    const modelFiles = narc(modelDecompressed);

    console.log(`  Found ${modelFiles.length} model files`);

    // Read and decompress texture NARC (ZPR compressed)
    const texturePath = join(objectDir, textureFile);
    const textureCompressed = readFileSync(texturePath);
    const textureDecompressed = zpr(textureCompressed.buffer);
    const textureFiles = narc(textureDecompressed);

    console.log(`  Found ${textureFiles.length} texture files`);

    // Save all model files
    modelFiles.forEach(file => {
      const filePath = join(tempObjectDir, file.name);
      writeFileSync(filePath, Buffer.from(file.data));
    });

    // Save all texture files
    textureFiles.forEach(file => {
      const filePath = join(tempObjectDir, file.name);
      writeFileSync(filePath, Buffer.from(file.data));
    });

    // Create output directory for this object set
    const outputObjectDir = join(OUTPUT_DIR, objectName);
    mkdirSync(outputObjectDir, { recursive: true });

    // Convert each model with its matching texture
    let convertedCount = 0;
    const convertedModels: string[] = [];
    const modelNsbmdFiles = modelFiles.filter(f => f.name.endsWith('.nsbmd'));

    for (const modelFile of modelNsbmdFiles) {
      const baseName = modelFile.name.replace('.nsbmd', '');
      const modelFilePath = join(tempObjectDir, modelFile.name);

      // Look for matching texture
      const textureFile = textureFiles.find(f => f.name === `${baseName}.nsbtx`);

      try {
        const outputPath = join(outputObjectDir, baseName);
        let convertCmd = `apicula convert "${modelFilePath}"`;

        if (textureFile) {
          const textureFilePath = join(tempObjectDir, textureFile.name);
          convertCmd += ` "${textureFilePath}"`;
        }

        convertCmd += ` -o "${outputPath}" -f glb --overwrite`;

        execSync(convertCmd, { stdio: 'pipe' });
        convertedCount++;
        convertedModels.push(baseName);
      } catch (error) {
        console.error(`  ⚠️  Failed to convert ${baseName}`);
      }
    }

    console.log(`  ✅ Converted ${convertedCount}/${modelNsbmdFiles.length} objects`);

    // Save metadata
    const objectInfo = {
      id: objectName,
      modelCount: convertedCount,
      totalModels: modelNsbmdFiles.length,
      textureCount: textureFiles.length,
      models: convertedModels
    };

    writeFileSync(
      join(outputObjectDir, 'info.json'),
      JSON.stringify(objectInfo, null, 2)
    );

    return {
      success: true,
      object: objectName,
      modelCount: convertedCount
    };

  } catch (error) {
    console.error(`  ❌ Error:`, error instanceof Error ? error.message : String(error));
    return {
      success: false,
      object: objectName,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function main() {
  console.log('🚀 PSZ Object Model Processor');
  console.log('Converting object models to GLB format\n');

  const results: ProcessResult[] = [];

  // Process numbered object directories (00-08)
  const objectDirs = readdirSync(OBJECT_DIR).filter(name => /^\d{2}$/.test(name)).sort();

  console.log(`Found ${objectDirs.length} numbered object directories\n`);

  for (const dirName of objectDirs) {
    const dirPath = join(OBJECT_DIR, dirName);
    const files = readdirSync(dirPath);

    // Find all _mdl.narc files
    const modelFiles = files.filter(f => f.endsWith('_mdl.narc'));

    for (const modelFile of modelFiles) {
      const baseName = modelFile.replace('_mdl.narc', '');
      const textureFile = `${baseName}_tex.narc`;

      if (files.includes(textureFile)) {
        const objectName = `${dirName}_${baseName}`;
        const result = await processObjectSet(dirPath, objectName, modelFile, textureFile);
        results.push(result);
      } else {
        console.log(`⚠️  No texture file found for ${modelFile}`);
      }
    }
  }

  // Process special objects
  console.log('\n📦 Processing special objects...\n');
  const specialDir = join(OBJECT_DIR, 'special');
  if (existsSync(specialDir)) {
    const files = readdirSync(specialDir);
    const modelFiles = files.filter(f => f.endsWith('_mdl.narc'));

    for (const modelFile of modelFiles) {
      const baseName = modelFile.replace('_mdl.narc', '');
      const textureFile = `${baseName}_tex.narc`;

      if (files.includes(textureFile)) {
        const objectName = baseName;
        const result = await processObjectSet(specialDir, objectName, modelFile, textureFile);
        results.push(result);
      } else {
        console.log(`⚠️  No texture file found for ${modelFile}`);
      }
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Summary');
  console.log('='.repeat(60));
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalModels = results.filter(r => r.success).reduce((sum, r) => sum + (r.modelCount || 0), 0);

  console.log(`✅ Successful object sets: ${successful}`);
  console.log(`❌ Failed object sets: ${failed}`);
  console.log(`📦 Total objects converted: ${totalModels}`);

  if (failed > 0) {
    console.log('\nFailed object sets:');
    results.filter(r => !r.success).slice(0, 10).forEach(r => {
      console.log(`  - ${r.object}: ${r.error}`);
    });
    if (failed > 10) {
      console.log(`  ... and ${failed - 10} more`);
    }
  }

  console.log(`\n✨ Processing complete!`);
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
}

main().catch(console.error);
