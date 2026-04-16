import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import sharp from 'sharp';
import zpr from '../ArchiveUnpacker/src/zpr';

const RAW = 'raw/titleseq';
const OUT = 'public/titleseq';
const TEMP = 'temp/titleseq_decompressed';

mkdirSync(OUT, { recursive: true });
mkdirSync(TEMP, { recursive: true });

type RGBA = { r: number; g: number; b: number; a: number };

function decompressIfZpr(path: string): Buffer {
  const raw = readFileSync(path);
  if (raw.subarray(0, 4).toString('ascii') !== 'ZPR\0') return raw;
  const ab = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
  return Buffer.from(zpr(ab));
}

// NDS BGR555: 16-bit LE; index 0 is transparent per sprite convention.
function decodePalette(buf: Buffer, byteOffset: number, colorCount: number): RGBA[] {
  const out: RGBA[] = [];
  for (let i = 0; i < colorCount; i++) {
    const o = byteOffset + i * 2;
    if (o + 1 >= buf.length) { out.push({ r: 0, g: 0, b: 0, a: 0 }); continue; }
    const v = buf.readUInt16LE(o);
    const r = Math.round(((v >> 0) & 0x1f) * 255 / 31);
    const g = Math.round(((v >> 5) & 0x1f) * 255 / 31);
    const b = Math.round(((v >> 10) & 0x1f) * 255 / 31);
    out.push({ r, g, b, a: i === 0 ? 0 : 255 });
  }
  return out;
}

async function writePng(
  rgba: Buffer, width: number, height: number, outPath: string,
): Promise<void> {
  mkdirSync(dirname(outPath), { recursive: true });
  await sharp(rgba, { raw: { width, height, channels: 4 } }).png().toFile(outPath);
}

async function renderBitmap(
  pixels: Buffer, palette: RGBA[], width: number, bpp: 4 | 8, outPath: string,
): Promise<void> {
  const pixelsPerByte = bpp === 4 ? 2 : 1;
  const totalPixels = pixels.length * pixelsPerByte;
  const height = Math.ceil(totalPixels / width);
  const rgba = Buffer.alloc(width * height * 4, 0);
  for (let i = 0; i < totalPixels; i++) {
    let idx: number;
    if (bpp === 8) {
      idx = pixels[i] ?? 0;
    } else {
      const byte = pixels[i >> 1] ?? 0;
      idx = (i & 1) === 0 ? byte & 0x0f : (byte >> 4) & 0x0f;
    }
    const c = palette[idx] ?? { r: 0, g: 0, b: 0, a: 0 };
    const o = ((i / width | 0) * width + (i % width)) * 4;
    rgba[o] = c.r; rgba[o + 1] = c.g; rgba[o + 2] = c.b; rgba[o + 3] = c.a;
  }
  await writePng(rgba, width, height, outPath);
  console.log(`  ✏️  ${outPath} (${width}x${height}, ${bpp}bpp)`);
}

async function renderPaletteStrip(palette: RGBA[], outPath: string): Promise<void> {
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
  await writePng(rgba, width, height, outPath);
  console.log(`  🎨 ${outPath}`);
}

// Per-sprite palette layout. Reverse-engineered empirically — each sprite's
// palette is a sequence of overlapping 256-color banks, and each frame uses a
// specific bank offset in bytes. 4bpp sprites use a single 16-color bank at 0.
type SpriteConfig = {
  name: string;
  bpp: 4 | 8;
  // Palette byte offset to use per frame. length determines how many frames
  // we render; must match what dscse says. Use the same offset repeated if a
  // frame group shares a palette.
  frameOffsets: number[];
};

const SPRITES: Record<string, SpriteConfig> = {
  // title_m is a single 256-color palette, skipping the first 32 colors.
  // Both frames (top+bottom DS screen) use the same bank.
  title_m: { name: 'title_m', bpp: 8, frameOffsets: [64, 64] },

  // Single 16-color 4bpp bank, one frame.
  back: { name: 'back', bpp: 4, frameOffsets: [0] },

  // cast/numan: 4 frames, palette has two 256-color banks overlapping by 16
  // colors (992 = 2*512 - 32). Frames 0-1 use bank 0, frames 2-3 use bank 1
  // at byte offset 480.
  cast:  { name: 'cast',  bpp: 8, frameOffsets: [0, 0, 480, 480] },
  numan: { name: 'numan', bpp: 8, frameOffsets: [0, 0, 480, 480] },

  // human: 6 frames, palette 1488 bytes. Frames 0-1 use bank 0 (offset 0);
  // frames 3-4 use bank at offset 976. Frames 2 and 5 don't line up cleanly
  // with any byte-aligned window — likely text/overlay frames that need the
  // dscse layout map to decode correctly; best-effort offsets used below.
  human: { name: 'human', bpp: 8, frameOffsets: [0, 0, 488, 976, 976, 976] },

  // race: 3 frames, 3 banks of 256 colors (1536 = 3*512), one per frame.
  race: { name: 'race', bpp: 8, frameOffsets: [0, 512, 1024] },
};

async function processSprite(
  cfg: SpriteConfig,
  ntftPath: string, ntfpPath: string, outDir: string,
): Promise<void> {
  console.log(`\n🖼️  ${cfg.name}`);
  const ntft = decompressIfZpr(ntftPath);
  const ntfp = decompressIfZpr(ntfpPath);
  writeFileSync(join(TEMP, `${cfg.name}.ntft`), ntft);
  writeFileSync(join(TEMP, `${cfg.name}.ntfp`), ntfp);

  const width = 256;
  const colorsPerBank = cfg.bpp === 4 ? 16 : 256;
  const frameCount = cfg.frameOffsets.length;
  const frameBytes = Math.floor(ntft.length / frameCount);

  // Palette strip from first bank, for reference.
  const firstBank = decodePalette(ntfp, cfg.frameOffsets[0], colorsPerBank);
  await renderPaletteStrip(firstBank, join(outDir, `${cfg.name}.palette.png`));

  if (frameCount === 1) {
    await renderBitmap(ntft, firstBank, width, cfg.bpp, join(outDir, `${cfg.name}.png`));
    return;
  }

  for (let f = 0; f < frameCount; f++) {
    const palette = decodePalette(ntfp, cfg.frameOffsets[f], colorsPerBank);
    const frameBuf = ntft.subarray(f * frameBytes, (f + 1) * frameBytes);
    await renderBitmap(
      frameBuf, palette, width, cfg.bpp,
      join(outDir, `${cfg.name}.frame${f}.png`),
    );
  }
}

async function processNsbtxPair(
  name: string, nsbmdPath: string, nsbtxPath: string, outDir: string,
): Promise<void> {
  console.log(`\n🗿 ${name}`);
  mkdirSync(outDir, { recursive: true });
  const nsbmd = decompressIfZpr(nsbmdPath);
  const nsbtx = decompressIfZpr(nsbtxPath);
  const nsbmdTemp = join(TEMP, `${name}.nsbmd`);
  const nsbtxTemp = join(TEMP, `${name}.nsbtx`);
  writeFileSync(nsbmdTemp, nsbmd);
  writeFileSync(nsbtxTemp, nsbtx);
  execSync(
    `apicula convert "${nsbmdTemp}" "${nsbtxTemp}" -o "${outDir}" -f glb --overwrite`,
    { stdio: 'inherit' },
  );
}

async function main() {
  await processSprite(
    SPRITES.title_m,
    join(RAW, 'title_m.ntft'),
    join(RAW, 'title_m.ntfp'),
    join(OUT, 'title_m'),
  );

  for (const name of ['back', 'cast', 'human', 'numan', 'race']) {
    await processSprite(
      SPRITES[name],
      join(RAW, 'chara_create', name, `${name}.ntft`),
      join(RAW, 'chara_create', name, `${name}.ntfp`),
      join(OUT, 'chara_create', name),
    );
  }

  await processNsbtxPair(
    'dstitle',
    join(RAW, 'titletop/model/dstitle.nsbmd'),
    join(RAW, 'titletop/model/dstitle.nsbtx'),
    join(OUT, 'titletop'),
  );

  console.log('\n✅ Done.');
}

main().catch(e => { console.error(e); process.exit(1); });
