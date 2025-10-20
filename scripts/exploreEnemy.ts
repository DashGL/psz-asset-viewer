#!/usr/bin/env bun

import { readFileSync } from 'fs';
import zpr from '../ArchiveUnpacker/src/zpr';
import narc from '../ArchiveUnpacker/src/narc';

const narcPaths = ['./raw/enemy/frog.narc', './raw/enemy/rappy.narc', './raw/enemy/jigobooma.narc'];

for (const narcPath of narcPaths) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Exploring ${narcPath}...`);

  const narcData = readFileSync(narcPath);
  const decompressedNarc = zpr(narcData.buffer);
  const narcFiles = narc(decompressedNarc);

  console.log(`\nFound ${narcFiles.length} files:\n`);

  narcFiles.forEach((file, index) => {
    console.log(`${index + 1}. ${file.name} (${file.data.byteLength} bytes)`);
  });
}
