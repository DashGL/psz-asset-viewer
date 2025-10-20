#!/usr/bin/env bun

import { readFileSync } from 'fs';
import zpr from '../ArchiveUnpacker/src/zpr';
import narc from '../ArchiveUnpacker/src/narc';
import zarc from '../ArchiveUnpacker/src/zarc';

// Explore a sample player NARC
const playerNarc = './raw/player/00_common_m_pa00.narc';
console.log(`\n${'='.repeat(60)}`);
console.log(`Exploring ${playerNarc}...`);
console.log(`${'='.repeat(60)}`);

const narcData = readFileSync(playerNarc);
const decompressedNarc = zpr(narcData.buffer);
const narcFiles = narc(decompressedNarc);

console.log(`\nFound ${narcFiles.length} files in NARC:\n`);
narcFiles.forEach((file, index) => {
  console.log(`${index + 1}. ${file.name} (${file.data.byteLength} bytes)`);
});

// Explore a sample texture ZARC
const textureZarc = './raw/player/player_000_tex.zarc';
console.log(`\n${'='.repeat(60)}`);
console.log(`Exploring ${textureZarc}...`);
console.log(`${'='.repeat(60)}`);

const zarcData = readFileSync(textureZarc);

// Check if ZARC is ZPR compressed or not
const magic = new TextDecoder().decode(zarcData.buffer.slice(0, 4));
let zarcBuffer: ArrayBuffer;

if (magic === 'ZPR\0') {
  console.log('ZARC is ZPR compressed, decompressing...');
  zarcBuffer = zpr(zarcData.buffer);
} else {
  console.log('ZARC is not compressed');
  zarcBuffer = zarcData.buffer;
}

const zarcFiles = zarc(zarcBuffer);

console.log(`\nFound ${zarcFiles.length} texture files in ZARC:\n`);
zarcFiles.forEach((file, index) => {
  console.log(`${index + 1}. ${file.name} (${file.data.byteLength} bytes)`);
});
