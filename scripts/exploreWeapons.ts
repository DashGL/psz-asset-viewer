#!/usr/bin/env bun

import { readFileSync } from 'fs';
import { join } from 'path';
import zarc from '../ArchiveUnpacker/src/zarc';

const ITEM_DIR = './raw/item';

console.log('🔍 Exploring Weapon Files\n');

// Check weapon.zarc
console.log('📦 Examining weapon.zarc...');
const weaponZarcPath = join(ITEM_DIR, 'weapon.zarc');
const weaponZarcData = readFileSync(weaponZarcPath);
const weaponFiles = zarc(weaponZarcData.buffer);

console.log(`  Found ${weaponFiles.length} weapon models`);

// Group by file extension
const weaponTypes = new Map<string, number>();
weaponFiles.forEach(f => {
  const ext = f.name.split('.').pop() || 'no-ext';
  weaponTypes.set(ext, (weaponTypes.get(ext) || 0) + 1);
});

console.log('  File types:');
weaponTypes.forEach((count, ext) => {
  console.log(`    ${ext}: ${count}`);
});

console.log('\n  First 30 weapons:');
weaponFiles.slice(0, 30).forEach((f, idx) => {
  console.log(`    ${idx}: ${f.name}`);
});

console.log('\n  Last 10 weapons:');
weaponFiles.slice(-10).forEach((f, idx) => {
  console.log(`    ${weaponFiles.length - 10 + idx}: ${f.name}`);
});

console.log('\n✅ Exploration complete!');
