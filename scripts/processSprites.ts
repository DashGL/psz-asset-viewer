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

    // When the NCGR is 8bpp but the palette was stored as 4bpp banks, flatten
    // all banks into one 256-color palette — common for object sheets sharing
    // a background palette file (e.g. obs_menuapc + bgs_menuapc).
    const flatPalette = nclr.palettes.flat();

    // Trust the NCGR's claimed bit depth. Some sprite sheets that look
    // wrong as 8bpp actually need a different palette (not a different bit
    // depth) — handled below with multi-bank variants and 4bpp alternates.
    const effectiveBpp: 4 | 8 = ncgr.bpp;

    // Some palette files reserve bank 0 as a magenta "unused" sentinel
    // (color 1 = #F700DE — a known NITRO debug marker). When that happens,
    // real icon colors live in the later banks and the first usable bank is
    // picked as the default for tile-sheet rendering.
    const isSentinelBank = (bank: RGBA[]) => {
      if (bank.length < 2) return false;
      const c = bank[1];
      return c.r === 247 && c.g === 0 && c.b === 222;
    };
    const firstRealBankIdx = Math.max(
      0, nclr.palettes.findIndex(b => !isSentinelBank(b)),
    );
    const defaultBank = nclr.palettes[firstRealBankIdx] ?? nclr.palettes[0] ?? [];
    const tilePalette: RGBA[] =
      effectiveBpp === 8 ? flatPalette : defaultBank;

    // Palette strip (flat palette for 8bpp, first bank for 4bpp)
    await writePng(
      renderPaletteStrip(effectiveBpp === 8 ? flatPalette : (nclr.palettes[0] ?? [])),
      join(outDir, `${base}.palette.png`),
    );

    // Tile sheet: 16 tiles wide for 4bpp, 32 tiles wide for 8bpp
    const tilesPerRow = effectiveBpp === 4 ? 16 : 32;
    await writePng(
      renderTileSheet(ncgr.data, effectiveBpp, tilePalette, tilesPerRow),
      join(outDir, `${base}.tiles.png`),
    );

    // For obs_/obm_ sprite sheets the icons are stored as N×N-tile blocks,
    // so a flat 16/32-wide grid scrambles them across rows. Emit variants
    // at tile widths 2/4/8 — the right one is whichever matches the sprite
    // size in tiles (16/32/64 px wide).
    const isSpriteSheet = base.startsWith('obs_') || base.startsWith('obm_');
    if (isSpriteSheet) {
      for (const w of [4, 2, 8]) {
        await writePng(
          renderTileSheet(ncgr.data, effectiveBpp, tilePalette, w),
          join(outDir, `${base}.tiles.w${w}.png`),
        );
      }
    }

    // For 4bpp sprites with multiple palette banks, also emit per-bank
    // variants so the viewer can pick the right bank for OAM-composed icons.
    if (effectiveBpp === 4 && nclr.palettes.length > 1) {
      for (let b = 0; b < nclr.palettes.length; b++) {
        const bank = nclr.palettes[b];
        if (isSentinelBank(bank)) continue;
        await writePng(
          renderTileSheet(ncgr.data, 4, bank, tilesPerRow),
          join(outDir, `${base}.tiles.bank${b.toString().padStart(2, '0')}.png`),
        );
      }
    }

    // For 8bpp sprite sheets that have suspiciously few unique byte values
    // (≤32), emit a 4bpp alternative interpretation as well — covers the
    // mis-reported-bpp case (e.g. obs_menuapc, some logos).
    if (isSpriteSheet && effectiveBpp === 8) {
      const used = new Set<number>();
      for (let i = 0; i < ncgr.data.length; i++) used.add(ncgr.data[i]);
      if (used.size <= 32) {
        const fourBppPal = nclr.palettes.length > 1
          ? defaultBank
          : flatPalette.slice(0, 16);
        for (const w of [4, 2, 8]) {
          await writePng(
            renderTileSheet(ncgr.data, 4, fourBppPal, w),
            join(outDir, `${base}.tiles.4bpp.w${w}.png`),
          );
        }
      }
    }

    // Composed screen (if NSCR exists in same group)
    const nscrPath = files.get('NSCR');
    if (nscrPath) {
      try {
        const scr = parseNscr(readMaybeZpr(nscrPath));
        const screenPalettes: RGBA[][] =
          effectiveBpp === 8 ? [flatPalette] : nclr.palettes;
        await writePng(
          renderScreen(ncgr.data, effectiveBpp, screenPalettes, scr),
          join(outDir, `${base}.screen.png`),
        );
      } catch (e: any) {
        console.log(`  ⚠️  ${base}.screen: ${e.message}`);
      }
    }

    const bppNote = effectiveBpp !== ncgr.bpp ? ` (detected 4bpp)` : '';
    console.log(`  ✅ ${base} (${ncgr.bpp}bpp${bppNote}, ${nclr.palettes.length} banks)`);
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
  // actplt (action-palette) sprites are 8bpp and use obs_btl.NCLR for
  // the main icons; the 4bpp alternates fall back to bgs_btlcom's banks.
  { src: 'actplt', dst: 'hud/actplt', paletteFallback: 'obs_btl/obs_btl.NCLR' },
  // editactplt's obs_menuapc (8bpp objects) uses bgs_menuapc (4bpp 256c)
  // as a flattened palette; the fallback is set explicitly in case the
  // group-local NCLR isn't found.
  { src: 'editactplt', dst: 'hud/editactplt', paletteFallback: 'editactplt/bgs_menuapc.NCLR' },
  // Main menu
  { src: 'mainmenu', dst: 'mainmenu' },
  { src: 'menu', dst: 'menu' },
  // Cutscenes + logo
  { src: 'logo', dst: 'logo' },
  { src: 'ending', dst: 'ending' },
  { src: 'movie', dst: 'movie' },
  { src: 'event', dst: 'event' },
  // Shops, quests, chat, misc UI
  { src: 'shop', dst: 'shop' },
  { src: 'shop_sub', dst: 'shop_sub' },
  { src: 'dmyshop', dst: 'dmyshop' },
  { src: 'trade', dst: 'trade' },
  { src: 'quest_counter', dst: 'quest_counter' },
  { src: 'chat', dst: 'chat' },
  { src: 'chatlog', dst: 'chatlog' },
  { src: 'soft_kbd', dst: 'soft_kbd' },
  { src: 'titleseq', dst: 'titleseq_sprites' },
];

// Process any loose NCGR/NCLR/NSCR files sitting at raw/sprite/ root (title
// backgrounds, battle-common shared sheets, etc).
async function processRootFiles(outDir: string) {
  const groups = groupByBase(RAW);
  if (groups.size === 0) return;
  console.log(`\n📁 ${RAW} (root files)`);
  for (const [base, files] of groups) {
    if (!files.has('NCGR')) continue;
    await processGroup(base, files, findNclr(groups, base, null), outDir);
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  await processRootFiles(join(OUT, 'root'));
  for (const t of TARGETS) {
    const fallback = t.paletteFallback ? join(RAW, t.paletteFallback) : null;
    await processDir(join(RAW, t.src), join(OUT, t.dst), fallback);
  }
  console.log('\n✅ Done.');
}

main().catch(e => { console.error(e); process.exit(1); });
