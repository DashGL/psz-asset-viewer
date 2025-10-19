# PSZ Asset Viewer - Usage Guide

This project processes Phantasy Star Zero scene assets and displays them in an interactive 3D viewer.

## Overview

The workflow consists of two main steps:

1. **Process Assets**: Convert compressed NARC/NSBTX files to GLB 3D models
2. **View Assets**: Browse and interact with the converted models in a web interface

## Prerequisites

- [Bun](https://bun.sh/) installed
- [apicula](https://github.com/scurest/apicula) installed (for NARC/NSBTX to GLB conversion)
- Node.js dependencies installed: `npm install`

## Step 1: Process Scene Assets

The processing script will:
- Decompress ZPR-compressed NARC and NSBTX files
- Extract 3D models and textures
- Convert them to GLB format using apicula
- Export textures as PNG files

### Run the processor:

```bash
npm run process-scenes
```

This will process all assets in `raw/scene/*/a` and `raw/scene/*/e` folders and output them to:
- `public/city_a/` - Assets from 'a' folders
- `public/city_e/` - Assets from 'e' folders

### Output Structure:

```
public/
├── city_a/
│   ├── s00a_nr1/
│   │   ├── 00.glb
│   │   └── textures/
│   │       └── *.png
│   ├── s00a_nr2/
│   └── ...
└── city_e/
    ├── s00e_sa1/
    └── ...
```

## Step 2: View Assets

Start the development server:

```bash
npm run dev
```

Then open your browser to:
- **City A**: http://localhost:4321/city_a
- **City E**: http://localhost:4321/city_e

## Features

### 3D Model Viewer
- **Orbit Controls**: Click and drag to rotate the view
- **Zoom**: Scroll to zoom in/out
- **Pan**: Right-click and drag to pan
- **Lighting**: Automatic lighting setup for best viewing

### Asset Browser
- Browse all processed assets in the left sidebar
- Switch between different models within each asset
- View extracted textures below the 3D viewer

## File Structure

```
psz-asset-viewer/
├── scripts/
│   └── process-scenes.ts      # Asset processing script
├── src/
│   ├── components/
│   │   ├── ModelViewer.tsx    # 3D viewer component
│   │   └── CityGallery.tsx    # Asset gallery component
│   └── pages/
│       ├── city_a.astro       # City A viewer page
│       └── city_e.astro       # City E viewer page
├── raw/
│   └── scene/                 # Source NARC/NSBTX files
│       ├── 00/
│       │   ├── a/
│       │   └── e/
│       └── ...
├── public/
│   ├── city_a/                # Processed City A assets
│   └── city_e/                # Processed City E assets
└── ArchiveUnpacker/           # Decompression library
```

## How It Works

### Processing Pipeline

1. **ZPR Decompression**: NARC and NSBTX files are compressed with ZPR format
2. **NARC Extraction**: Decompressed NARC contains multiple NSBMD (3D model) files
3. **Texture Pairing**: NSBTX files contain textures referenced by the models
4. **apicula Conversion**: Converts Nintendo DS formats to modern GLB format
5. **Texture Export**: Extracts textures as PNG files

### Asset Pairing

The script automatically pairs files based on their base names:
- `s00a_nr1.narc` + `s00a_nr1.nsbtx` → `s00a_nr1/` folder

### Technologies Used

- **Astro**: Static site framework
- **React**: UI components
- **React Three Fiber**: 3D rendering with Three.js
- **@react-three/drei**: 3D helpers and utilities
- **ArchiveUnpacker**: Custom ZPR/NARC decompression library
- **apicula**: Nintendo DS 3D format converter

## Troubleshooting

### "apicula not found"
Install apicula: https://github.com/scurest/apicula

### "Invalid ZPR magic"
The file may not be ZPR compressed or could be corrupted

### Models not displaying
- Check browser console for errors
- Ensure GLB files were created successfully
- Verify the asset paths are correct

### No assets showing in viewer
Run `npm run process-scenes` first to generate the GLB files

## Building for Production

```bash
npm run build
npm run preview
```

The built site will be in the `dist/` directory.
