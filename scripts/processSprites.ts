// Batch-extract NITRO 2D sprites (NCGR/NCLR/NSCR) from raw/sprite/ into
// PNGs under public/sprites/.
//
// For each base name in a directory we look for a matching .NCGR + .NCLR and
// write a tile sheet. If an .NSCR is present we also render the composed
// screen bitmap. Nearby "shared palette" NCLR files (e.g. obs_btlcom.NCLR in
// a folder) are used as fallback when a base name has no matching NCLR.

import { readdirSync, statSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import sharp from 'sharp';
import {
  readMaybeZpr,
  parseNclr,
  parseNcgr,
  parseNscr,
  renderTileSheet,
  renderScreen,
  renderPaletteStrip,
  type RGBA,
} from './nitroSprite';

const RAW = 'raw/sprite';
const OUT = 'public/sprites';

async function writePng(
  img: { rgba: Buffer; width: number; height: number }, outPath: string,
) {
  mkdirSync(dirname(outPath), { recursive: true });
  await sharp(img.rgba, { raw: { width: img.width, height: img.height, channels: 4 } })
    .png().toFile(outPath);
}

// Walk a directory and group files by base name (strip final extension).
function groupByBase(dir: string): Map<string, Map<string, string>> {
  const groups = new Map<string, Map<string, string>>();
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (!statSync(full).isFile()) continue;
    const m = entry.match(/^(.*)\.(NCGR|NCLR|NSCR|NCER|NANR|NMAR|NMCR)$/);
    if (!m) continue;
    const [, base, ext] = m;
    if (!groups.has(base)) groups.set(base, new Map());
    groups.get(base)!.set(ext, full);
  }
  return groups;
}

// Find a usable NCLR for a base name. Priority:
//   1. The group's own NCLR
//   2. Any NCLR in the current directory
//   3. A palette inherited from an ancestor directory
function findNclr(
  groups: Map<string, Map<string, string>>, base: string,
  ancestorPalette: string | null,
): string | null {
  const own = groups.get(base)?.get('NCLR');
  if (own) return own;
  for (const [, files] of groups) {
    const pal = files.get('NCLR');
    if (pal) return pal;
  }
  return ancestorPalette;
}

async function processGroup(
  base: string, files: Map<string, string>, nclrFallback: string | null,
  outDir: string,
) {
  const ncgrPath = files.get('NCGR');
  if (!ncgrPath) return;

  const nclrPath = files.get('NCLR') ?? nclrFallback;
  if (!nclrPath) {
    console.log(`  ⚠️  ${base}: no NCLR available, skipping`);
    return;
  }

  try {
    const nclr = parseNclr(readMaybeZpr(nclrPath));
    const ncgr = parseNcgr(readMaybeZpr(ncgrPath));

    // Palette strip (first bank)
    await writePng(
      renderPaletteStrip(nclr.palettes[0] ?? []),
      join(outDir, `${base}.palette.png`),
    );

    // Tile sheet: 16 tiles wide for 4bpp, 32 tiles wide for 8bpp (arbitrary,
    // just keeps the sheet readable)
    const tilesPerRow = ncgr.bpp === 4 ? 16 : 32;
    const palette = nclr.palettes[0] ?? [];
    await writePng(
      renderTileSheet(ncgr.data, ncgr.bpp, palette, tilesPerRow),
      join(outDir, `${base}.tiles.png`),
    );

    // Composed screen (if NSCR exists in same group)
    const nscrPath = files.get('NSCR');
    if (nscrPath) {
      const scr = parseNscr(readMaybeZpr(nscrPath));
      await writePng(
        renderScreen(ncgr.data, ncgr.bpp, nclr.palettes, scr),
        join(outDir, `${base}.screen.png`),
      );
    }

    console.log(`  ✅ ${base} (${ncgr.bpp}bpp, ${nclr.palettes.length} banks)`);
  } catch (e: any) {
    console.log(`  ❌ ${base}: ${e.message}`);
  }
}

async function processDir(
  rawDir: string, outDir: string, ancestorPalette: string | null = null,
) {
  if (!existsSync(rawDir)) { console.log(`skip missing: ${rawDir}`); return; }
  console.log(`\n📁 ${rawDir}`);
  const groups = groupByBase(rawDir);

  // Any NCLR in this dir becomes the palette to pass down to child dirs
  // (shared palette pattern, e.g. radermap/obs_btlcom.NCLR).
  let dirPalette: string | null = ancestorPalette;
  for (const [, files] of groups) {
    const pal = files.get('NCLR');
    if (pal) { dirPalette = pal; break; }
  }

  for (const [base, files] of groups) {
    if (!files.has('NCGR')) continue;
    await processGroup(base, files, findNclr(groups, base, ancestorPalette), outDir);
  }

  for (const entry of readdirSync(rawDir)) {
    const full = join(rawDir, entry);
    if (statSync(full).isDirectory()) {
      await processDir(full, join(outDir, entry), dirPalette);
    }
  }
}

type Target = { src: string; dst: string; paletteFallback?: string };

const TARGETS: Target[] = [
  // HUD
  { src: 'obs_btl', dst: 'hud/obs_btl' },
  { src: 'all_map', dst: 'hud/all_map' },
  { src: 'radermap', dst: 'hud/radermap' },
  { src: 'activitylog', dst: 'hud/activitylog' },
  // actplt (action-palette) sprites share the battle-HUD palette.
  { src: 'actplt', dst: 'hud/actplt', paletteFallback: 'obs_btl/obs_btl.NCLR' },
  { src: 'editactplt', dst: 'hud/editactplt' },
  // Main menu
  { src: 'mainmenu', dst: 'mainmenu' },
  { src: 'menu', dst: 'menu' },
  // Cutscenes + logo
  { src: 'logo', dst: 'logo' },
  { src: 'ending', dst: 'ending' },
  { src: 'movie', dst: 'movie' },
  { src: 'event', dst: 'event' },
];

async function main() {
  mkdirSync(OUT, { recursive: true });
  for (const t of TARGETS) {
    const fallback = t.paletteFallback ? join(RAW, t.paletteFallback) : null;
    await processDir(join(RAW, t.src), join(OUT, t.dst), fallback);
  }
  console.log('\n✅ Done.');
}

main().catch(e => { console.error(e); process.exit(1); });
