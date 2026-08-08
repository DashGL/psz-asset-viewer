#!/usr/bin/env bun

/**
 * Every `models` entry in an info.json must resolve to a GLB on disk.
 *
 * The viewer builds its fetch URL as `<model>/<model minus .imd>.glb`, so a
 * models[] entry is really a DIRECTORY name, not an archive member filename.
 * Writing the member filename instead produces an info.json that looks
 * perfectly reasonable and a page that 404s on load -- which is exactly what
 * shipped in #26. This catches that before it deploys.
 */

import { readdirSync, existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const ROOTS = ['./public/effects', './public/objects', './public/enemies', './public/weapons'];

let totalOk = 0;
let totalMissing = 0;

for (const root of ROOTS) {
  if (!existsSync(root)) continue;

  let ok = 0;
  const missing: string[] = [];

  for (const dir of readdirSync(root)) {
    const dirPath = join(root, dir);
    if (!statSync(dirPath).isDirectory()) continue;

    const infoPath = join(dirPath, 'info.json');
    if (!existsSync(infoPath)) continue;

    const info = JSON.parse(readFileSync(infoPath, 'utf-8'));
    for (const model of info.models ?? []) {
      // exactly the path the viewer requests
      const glb = join(dirPath, model, `${model.replace('.imd', '')}.glb`);
      if (existsSync(glb)) ok++;
      else missing.push(glb);
    }
  }

  totalOk += ok;
  totalMissing += missing.length;

  const mark = missing.length === 0 ? '✅' : '❌';
  console.log(`${mark} ${root}: ${ok} resolve, ${missing.length} missing`);
  for (const m of missing.slice(0, 5)) console.log(`     ${m}`);
  if (missing.length > 5) console.log(`     ... and ${missing.length - 5} more`);
}

console.log(`\n${totalMissing === 0 ? '✅' : '❌'} ${totalOk} models resolve, ${totalMissing} missing`);
if (totalMissing > 0) process.exit(1);
