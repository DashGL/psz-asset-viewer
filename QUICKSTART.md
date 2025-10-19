# Quick Start Guide

## TL;DR

```bash
# 1. Process the assets
npm run process-scenes

# 2. Start the dev server
npm run dev

# 3. Open http://localhost:4321
```

## What This Does

1. **Processing Script** (`scripts/process-scenes.ts`):
   - Scans `raw/scene/*/a` and `raw/scene/*/e` folders
   - Decompresses ZPR-compressed NARC and NSBTX files using ArchiveUnpacker
   - Converts Nintendo DS 3D models to GLB format using apicula
   - Extracts textures as PNG files
   - Outputs everything to `public/city_a` and `public/city_e`

2. **Web Viewer**:
   - Home page: Lists both cities with asset counts
   - City A page: `/city_a` - Interactive 3D viewer for 'a' assets
   - City E page: `/city_e` - Interactive 3D viewer for 'e' assets

## Project Structure

```
psz-asset-viewer/
├── scripts/
│   └── process-scenes.ts          # Main processing script
├── src/
│   ├── components/
│   │   ├── ModelViewer.tsx        # Three.js 3D viewer
│   │   └── CityGallery.tsx        # Asset browser UI
│   └── pages/
│       ├── index.astro            # Home page
│       ├── city_a.astro           # City A viewer
│       └── city_e.astro           # City E viewer
├── raw/scene/                     # Source assets (NARC/NSBTX)
├── public/                        # Output assets (GLB/PNG)
│   ├── city_a/
│   └── city_e/
└── ArchiveUnpacker/               # ZPR/NARC decompression library
```

## Asset Flow

```
raw/scene/00/a/s00a_nr1.narc    ──┐
raw/scene/00/a/s00a_nr1.nsbtx   ──┤
                                  │
                    [process-scenes.ts]
                                  │
                    ┌─────────────┴─────────────┐
                    ↓                           ↓
    public/city_a/s00a_nr1/00.glb   public/city_a/s00a_nr1/textures/*.png
                    │
                    ↓
            [Astro + React Three Fiber]
                    │
                    ↓
            http://localhost:4321/city_a
```

## Requirements

- Node.js/Bun
- [apicula](https://github.com/scurest/apicula) - For converting Nintendo DS 3D formats

## Tips

- The processing script creates a `temp/` directory for intermediate files
- Each asset pair (NARC + NSBTX) gets its own folder in the output
- The 3D viewer supports orbit controls (drag to rotate, scroll to zoom)
- Textures are displayed below each 3D model
- If you add new assets, just re-run `npm run process-scenes`

## Troubleshooting

**No models appear**: Run `npm run process-scenes` first

**apicula errors**: Make sure apicula is installed and in your PATH

**Models look wrong**: Check that NARC and NSBTX pairs match correctly

**Textures missing**: Some models may not have associated textures
