#!/usr/bin/env bun
// One-off helper: extract pc_000_000.nsbmd from player_model.zarc into the
// temp reference location expected by processPlayerAnimations.ts.
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import zarc from '../ArchiveUnpacker/src/zarc';

const PLAYER_DIR = './raw/player';
const TEMP_DIR = './temp/player';
const TARGET = 'pc_000_000.nsbmd';

const modelFiles = zarc(readFileSync(join(PLAYER_DIR, 'player_model.zarc')).buffer);
const match = modelFiles.find((f: { name: string }) => f.name === TARGET);
if (!match) {
  console.error(`❌ ${TARGET} not found in player_model.zarc. Available:`, modelFiles.map((f: { name: string }) => f.name).slice(0, 10));
  process.exit(1);
}

const outDir = join(TEMP_DIR, 'pc_000');
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, TARGET);
writeFileSync(outPath, Buffer.from(match.data));
console.log(`✅ Wrote reference model: ${outPath}`);
