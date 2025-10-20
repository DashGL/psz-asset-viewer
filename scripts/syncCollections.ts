#!/usr/bin/env bun
import { readdirSync, statSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const publicDir = './public';
const contentDir = './src/content';

interface InfoJson {
  [key: string]: any;
}

function syncDirectory(category: 'enemies' | 'weapons' | 'objects' | 'players') {
  const publicPath = join(publicDir, category);
  const contentPath = join(contentDir, category);

  if (!existsSync(publicPath)) {
    console.log(`Skipping ${category} - public directory doesn't exist`);
    return;
  }

  // Get all subdirectories in public/category
  const items = readdirSync(publicPath).filter(item => {
    const itemPath = join(publicPath, item);
    return statSync(itemPath).isDirectory();
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const item of items) {
    const publicItemPath = join(publicPath, item);
    const infoJsonPath = join(publicItemPath, 'info.json');

    // Check if info.json exists
    if (!existsSync(infoJsonPath)) {
      console.log(`  ⚠️  ${item} - no info.json found`);
      skipped++;
      continue;
    }

    // Read the info.json
    const infoJson: InfoJson = JSON.parse(readFileSync(infoJsonPath, 'utf-8'));

    // Create content directory for this item
    const contentItemPath = join(contentPath, item);
    if (!existsSync(contentItemPath)) {
      mkdirSync(contentItemPath, { recursive: true });
    }

    // Write index.json to content directory
    const contentIndexPath = join(contentItemPath, 'index.json');
    const alreadyExists = existsSync(contentIndexPath);

    writeFileSync(contentIndexPath, JSON.stringify(infoJson, null, 2));

    if (alreadyExists) {
      updated++;
    } else {
      created++;
    }
  }

  console.log(`✓ ${category}: ${created} created, ${updated} updated, ${skipped} skipped (${items.length} total)`);
}

console.log('Syncing collections from public/ to src/content/...\n');

syncDirectory('enemies');
syncDirectory('weapons');
syncDirectory('objects');

// Player is singular in directory name
const playerPublicPath = join(publicDir, 'player');
const playerContentPath = join(contentDir, 'players');

if (existsSync(playerPublicPath)) {
  const players = readdirSync(playerPublicPath).filter(item => {
    const itemPath = join(playerPublicPath, item);
    return statSync(itemPath).isDirectory();
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const player of players) {
    const publicPlayerPath = join(playerPublicPath, player);
    const infoJsonPath = join(publicPlayerPath, 'info.json');

    if (!existsSync(infoJsonPath)) {
      console.log(`  ⚠️  ${player} - no info.json found`);
      skipped++;
      continue;
    }

    const infoJson: InfoJson = JSON.parse(readFileSync(infoJsonPath, 'utf-8'));
    const contentPlayerPath = join(playerContentPath, player);

    if (!existsSync(contentPlayerPath)) {
      mkdirSync(contentPlayerPath, { recursive: true });
    }

    const contentIndexPath = join(contentPlayerPath, 'index.json');
    const alreadyExists = existsSync(contentIndexPath);

    writeFileSync(contentIndexPath, JSON.stringify(infoJson, null, 2));

    if (alreadyExists) {
      updated++;
    } else {
      created++;
    }
  }

  console.log(`✓ players: ${created} created, ${updated} updated, ${skipped} skipped (${players.length} total)`);
}

console.log('\n✓ Done!');
