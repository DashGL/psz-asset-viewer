// Decoder for Nintendo NITRO 2D sprite formats (NCLR/NCGR/NSCR/NCER).
// Renders tile-sheet PNGs and, when screen data (NSCR) is available, the
// composed screen image as well.
//
// File format references: GBATek, NCLR/NCGR/NSCR specs from the NDS decomp
// community. All multi-byte fields are little-endian.

import { readFileSync } from 'fs';
import zpr from '../ArchiveUnpacker/src/zpr';

export type RGBA = { r: number; g: number; b: number; a: number };

export function readMaybeZpr(path: string): Buffer {
  const b = readFileSync(path);
  if (b.subarray(0, 4).toString('ascii') !== 'ZPR\0') return b;
  const ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  return Buffer.from(zpr(ab));
}

// NITRO container header: 16 bytes.
//   off 0 : 4-byte magic (reversed, e.g. "RLCN" for NCLR)
//   off 4 : BOM 0xFFFE
//   off 6 : version
//   off 8 : total file size (u32)
//   off 0C: header size u16 (0x10)
//   off 0E: num sections u16
function parseNitroHeader(buf: Buffer): { magic: string; numSections: number; headerSize: number } {
  const magic = buf.subarray(0, 4).toString('ascii');
  const headerSize = buf.readUInt16LE(0x0c);
  const numSections = buf.readUInt16LE(0x0e);
  return { magic, numSections, headerSize };
}

// Walk sections starting at offset; returns a map of sectionMagic → [start, size].
function findSections(
  buf: Buffer, startOffset: number, numSections: number,
): Map<string, { start: number; size: number }> {
  const out = new Map<string, { start: number; size: number }>();
  let off = startOffset;
  for (let i = 0; i < numSections; i++) {
    if (off + 8 > buf.length) break;
    const magic = buf.subarray(off, off + 4).toString('ascii');
    const size = buf.readUInt32LE(off + 4);
    out.set(magic, { start: off, size });
    off += size;
  }
  return out;
}

// === NCLR ===
// Magic: "RLCN"
// PLTT section: "TTLP"
//   off 08: bit depth (u32, 3=4bpp, 4=8bpp)
//   off 0C: unused
//   off 10: palette data size (u32, bytes)
//   off 14: colors per palette (u32) — often 0, sometimes 0x10
//   off 18: palette data (BGR555 u16 entries)
export function parseNclr(buf: Buffer): { bpp: 4 | 8; palettes: RGBA[][] } {
  const { numSections, headerSize } = parseNitroHeader(buf);
  const sections = findSections(buf, headerSize, numSections);
  const plttSection = sections.get('TTLP');
  if (!plttSection) throw new Error('No TTLP section in NCLR');

  const base = plttSection.start;
  const bitDepth = buf.readUInt32LE(base + 0x08);
  const bpp: 4 | 8 = bitDepth === 3 ? 4 : 8;
  const dataSize = buf.readUInt32LE(base + 0x10);
  const dataOffset = buf.readUInt32LE(base + 0x14);
  // dataOffset is relative to the start of the PLTT section's data area
  // (i.e. from base + 0x08). When zero, we default to 0x10 beyond that.
  const dataStart = base + 0x08 + (dataOffset || 0x10);
  const actualDataSize = Math.min(dataSize || plttSection.size, buf.length - dataStart);

  const colors: RGBA[] = [];
  for (let i = 0; i + 1 < actualDataSize; i += 2) {
    const v = buf.readUInt16LE(dataStart + i);
    const r = Math.round(((v >> 0) & 0x1f) * 255 / 31);
    const g = Math.round(((v >> 5) & 0x1f) * 255 / 31);
    const b = Math.round(((v >> 10) & 0x1f) * 255 / 31);
    // Index 0 is conventionally transparent for sprites
    colors.push({ r, g, b, a: (i >> 1) === 0 ? 0 : 255 });
  }

  // Split into per-palette banks based on bpp
  const bankSize = bpp === 4 ? 16 : 256;
  const palettes: RGBA[][] = [];
  for (let i = 0; i < colors.length; i += bankSize) {
    palettes.push(colors.slice(i, i + bankSize));
  }
  if (palettes.length === 0) palettes.push(colors);
  return { bpp, palettes };
}

// === NCGR ===
// Magic: "RGCN"
// CHAR section: "RAHC"
//   off 08: tile height (u16, in tiles; 0xFFFF if linear)
//   off 0A: tile width (u16, in tiles; 0xFFFF if linear)
//   off 0C: bit depth (u32, 3=4bpp, 4=8bpp)
//   off 10: mapping (u16)
//   off 12: screen type (u16)  — 0=tiled, 1=linear/bitmap
//   off 14: padding (u32)
//   off 18: pixel data size (u32, bytes)
//   off 1C: data offset (u32, typically 0x18 — relative to end of section header)
//   data starts at (section_base + 8 + data_offset)
export function parseNcgr(
  buf: Buffer,
): {
  bpp: 4 | 8;
  tileWidth: number | null;
  tileHeight: number | null;
  isLinear: boolean;
  data: Buffer;
} {
  const { numSections, headerSize } = parseNitroHeader(buf);
  const sections = findSections(buf, headerSize, numSections);
  const charSection = sections.get('RAHC');
  if (!charSection) throw new Error('No RAHC section in NCGR');

  const base = charSection.start;
  const tileHeightRaw = buf.readUInt16LE(base + 0x08);
  const tileWidthRaw = buf.readUInt16LE(base + 0x0a);
  const bitDepth = buf.readUInt32LE(base + 0x0c);
  const bpp: 4 | 8 = bitDepth === 3 ? 4 : 8;
  const screenType = buf.readUInt16LE(base + 0x12);
  const isLinear = screenType === 1 || tileWidthRaw === 0xffff || tileHeightRaw === 0xffff;
  const dataSize = buf.readUInt32LE(base + 0x18);
  const dataOffset = buf.readUInt32LE(base + 0x1c);
  const dataStart = base + 0x08 + dataOffset;
  const end = Math.min(dataStart + dataSize, buf.length);
  const data = buf.subarray(dataStart, end);

  return {
    bpp,
    tileWidth: tileWidthRaw === 0xffff ? null : tileWidthRaw,
    tileHeight: tileHeightRaw === 0xffff ? null : tileHeightRaw,
    isLinear,
    data,
  };
}

// === NSCR ===
// Magic: "RCSN"
// SCRN section: "NRCS"
//   off 08: screen width (u16, pixels)
//   off 0A: screen height (u16, pixels)
//   off 0C: bg mode (u32)
//   off 10: data size (u32)
//   off 14: tile-map u16 entries
//     bits  0-9 : tile index
//     bit  10   : horizontal flip
//     bit  11   : vertical flip
//     bits 12-15: palette bank
export function parseNscr(
  buf: Buffer,
): { screenWidth: number; screenHeight: number; entries: Uint16Array } {
  const { numSections, headerSize } = parseNitroHeader(buf);
  const sections = findSections(buf, headerSize, numSections);
  const scrSection = sections.get('NRCS');
  if (!scrSection) throw new Error('No NRCS section in NSCR');

  const base = scrSection.start;
  const screenWidth = buf.readUInt16LE(base + 0x08);
  const screenHeight = buf.readUInt16LE(base + 0x0a);
  const dataSize = buf.readUInt32LE(base + 0x10);
  const dataStart = base + 0x14;
  const entries = new Uint16Array(dataSize / 2);
  for (let i = 0; i < entries.length; i++) {
    entries[i] = buf.readUInt16LE(dataStart + i * 2);
  }
  return { screenWidth, screenHeight, entries };
}

// Decode a single 8x8 tile at the given byte offset in the NCGR pixel data.
// Returns palette indexes 0..15 or 0..255.
export function decodeTile(data: Buffer, tileIdx: number, bpp: 4 | 8): Uint8Array {
  const bytesPerTile = bpp === 4 ? 32 : 64;
  const base = tileIdx * bytesPerTile;
  const out = new Uint8Array(64);
  if (bpp === 8) {
    for (let i = 0; i < 64; i++) out[i] = data[base + i] ?? 0;
  } else {
    for (let i = 0; i < 32; i++) {
      const byte = data[base + i] ?? 0;
      out[i * 2] = byte & 0x0f;
      out[i * 2 + 1] = (byte >> 4) & 0x0f;
    }
  }
  return out;
}

// Render an NCGR's tile data as a flat sheet PNG (tiles arranged left-to-right,
// top-to-bottom) using a single palette bank.
export function renderTileSheet(
  ncgrData: Buffer, bpp: 4 | 8, palette: RGBA[], tilesPerRow: number,
): { rgba: Buffer; width: number; height: number } {
  const bytesPerTile = bpp === 4 ? 32 : 64;
  const tileCount = Math.floor(ncgrData.length / bytesPerTile);
  const rows = Math.ceil(tileCount / tilesPerRow);
  const width = tilesPerRow * 8;
  const height = rows * 8;
  const rgba = Buffer.alloc(width * height * 4, 0);

  for (let t = 0; t < tileCount; t++) {
    const tx = (t % tilesPerRow) * 8;
    const ty = ((t / tilesPerRow) | 0) * 8;
    const tile = decodeTile(ncgrData, t, bpp);
    for (let py = 0; py < 8; py++) {
      for (let px = 0; px < 8; px++) {
        const idx = tile[py * 8 + px];
        const c = palette[idx] ?? { r: 0, g: 0, b: 0, a: 0 };
        const o = ((ty + py) * width + tx + px) * 4;
        rgba[o] = c.r; rgba[o + 1] = c.g; rgba[o + 2] = c.b; rgba[o + 3] = c.a;
      }
    }
  }
  return { rgba, width, height };
}

// Render an NSCR screen onto a bitmap using NCGR tile data and multiple
// palette banks (for 4bpp) or a single 256-color palette (for 8bpp).
export function renderScreen(
  ncgrData: Buffer, bpp: 4 | 8, palettes: RGBA[][], scr: ReturnType<typeof parseNscr>,
): { rgba: Buffer; width: number; height: number } {
  const { screenWidth, screenHeight, entries } = scr;
  const rgba = Buffer.alloc(screenWidth * screenHeight * 4, 0);
  const tilesX = screenWidth / 8;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const tileIdx = entry & 0x3ff;
    const hFlip = (entry >> 10) & 1;
    const vFlip = (entry >> 11) & 1;
    const palBank = (entry >> 12) & 0xf;
    const palette = palettes[palBank] ?? palettes[0] ?? [];

    const tx = (i % tilesX) * 8;
    const ty = ((i / tilesX) | 0) * 8;
    const tile = decodeTile(ncgrData, tileIdx, bpp);

    for (let py = 0; py < 8; py++) {
      for (let px = 0; px < 8; px++) {
        const sx = hFlip ? 7 - px : px;
        const sy = vFlip ? 7 - py : py;
        const idx = tile[sy * 8 + sx];
        const c = palette[idx] ?? { r: 0, g: 0, b: 0, a: 0 };
        const o = ((ty + py) * screenWidth + tx + px) * 4;
        rgba[o] = c.r; rgba[o + 1] = c.g; rgba[o + 2] = c.b; rgba[o + 3] = c.a;
      }
    }
  }
  return { rgba, width: screenWidth, height: screenHeight };
}

export function renderPaletteStrip(palette: RGBA[]): { rgba: Buffer; width: number; height: number } {
  const swatch = 16;
  const cols = Math.min(16, palette.length);
  const rows = Math.ceil(palette.length / cols);
  const width = cols * swatch;
  const height = rows * swatch;
  const rgba = Buffer.alloc(width * height * 4, 0);
  for (let i = 0; i < palette.length; i++) {
    const cx = (i % cols) * swatch;
    const cy = ((i / cols) | 0) * swatch;
    const c = palette[i];
    for (let py = 0; py < swatch; py++) {
      for (let px = 0; px < swatch; px++) {
        const o = ((cy + py) * width + cx + px) * 4;
        rgba[o] = c.r; rgba[o + 1] = c.g; rgba[o + 2] = c.b; rgba[o + 3] = 255;
      }
    }
  }
  return { rgba, width, height };
}
