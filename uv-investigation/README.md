# UV Investigation for s00e_sa1 (City Area E)

This folder contains extracted assets from `raw/scene/00/e/s00e_sa1.narc` for UV mapping investigation.

## Folder Structure

```
uv-investigation/
├── raw-files/           # Decompressed NSBMD + NSBTX for apicula viewer
│   ├── lndmd.nsbmd     # Main 3D model file
│   ├── s00e_sa1.nsbtx  # Texture file
│   ├── lndta.nsbta     # Texture animation
│   ├── lndcl           # Collision data
│   └── lndpr           # Unknown
├── glb-models/lndmd/    # Converted GLB + textures
│   ├── s00e_sa1_m.glb  # Converted 3D model
│   └── *.png           # 24 extracted textures
└── textures/            # (empty - textures are in glb-models/)
```

## Using apicula Viewer

To view the model with its textures in apicula's built-in viewer:

```bash
cd /home/kion/GitHub/psz-asset-viewer
apicula view uv-investigation/raw-files/lndmd.nsbmd uv-investigation/raw-files/s00e_sa1.nsbtx
```

This will open an interactive 3D viewer where you can inspect:
- UV mapping on the 3D model
- Texture application
- Identify any texture atlas packing issues

## Known Issues

### Texture Matrix Warnings
During conversion, apicula reported multiple warnings:
```
[WARN] material: texture matrix is unimplemented
```

This suggests the model uses texture matrices (for UV transformation/animation) that aren't fully supported by apicula's GLB exporter. This could be related to the UV atlas issue.

## Texture Atlas Packing Pattern

The Nintendo DS has limited VRAM, so multiple textures are often packed into single images (atlas packing). Common patterns:
- **Top/Bottom split**: Two textures stacked vertically in one image
- **Grid packing**: Multiple textures in a 2x2 or larger grid

When this happens, the UVs should reference the appropriate region:
- Top half: UV range (0, 0) to (1, 0.5)
- Bottom half: UV range (0, 0.5) to (1, 1)

But if the exporter doesn't handle this correctly, UVs might reference the full image (0, 0) to (1, 1), causing textures to appear scrambled.

## Next Steps

1. **View in apicula viewer** to inspect UV mapping on the actual model
2. **Check texture PNGs** in `glb-models/lndmd/` to identify atlas packing patterns
3. **Examine GLB in Blender/Three.js** to see how textures are applied
4. **Compare with working models** (if any exist) to identify the correct UV pattern

## Investigation Questions

- [ ] Does apicula viewer show correct textures?
- [ ] Are textures packed in atlas patterns (top/bottom, grid)?
- [ ] Do UVs reference full image or sub-regions?
- [ ] Is the "texture matrix" warning related to the UV issue?
- [ ] Can we write a script to fix UVs post-conversion?
