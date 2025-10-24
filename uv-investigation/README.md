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

## Investigation Results

### Confirmed Findings

✅ **Apicula viewer shows identical broken textures as GLB export**
- Viewed with `apicula view lndmd.nsbmd s00e_sa1.nsbtx`
- Same texture issues appear in the viewer as in exported GLB
- **This rules out apicula conversion bugs**

✅ **Textures are packed in atlas patterns**
- Example: `s00_0_set02b.png` contains floor texture (top) + character sprites (bottom)
- Multiple textures combined in single images due to DS VRAM limitations

✅ **Texture matrix warnings are the root cause**
- Apicula reports: `[WARN] material: texture matrix is unimplemented`
- Sega used DS hardware texture matrix transformations (UV offset/scale)
- These matrices told the DS GPU which region of the atlas to use
- Apicula doesn't export texture matrices to GLB format

### Conclusion

The issue is **not a bug in apicula** - it's that Sega used DS-specific hardware features (texture matrices) that don't have direct equivalents in GLB/GLTF format. The texture atlases are correctly packed in the source files, but the UV transformation data that tells which part of the atlas to use isn't being preserved during export.

## Next Steps - Recommended Approaches

### Option 1: Extract and Apply Texture Matrix Data (Systematic Fix)
Investigate the NSBMD file format to extract texture matrix values, then write a post-processing script to apply those transformations to GLB UVs. This would fix all models systematically.

**Pros**: Fixes all maps at once, preserves original art
**Cons**: Requires understanding NSBMD binary format, complex implementation

### Option 2: Manual Texture Atlas Splitting
Split packed textures into individual PNGs and manually remap UVs in Blender for each model.

**Pros**: Full control, proven workflow
**Cons**: Time-consuming, would need to do for every area

### Option 3: Use As Reference and Rebuild
Accept the broken textures but use the geometry and art style as reference to rebuild the city with new textures.

**Pros**: Creative freedom, clean result
**Cons**: Most work, loses original textures entirely

---

## Selected Approach: Empirical UV Pattern Analysis

Instead of diving into binary format reverse engineering, we're taking a practical, empirical approach focused on gameplay development.

### UV Investigation Viewer Tool

**URL**: `/city-uv-investigation` or `http://localhost:4321/psz-asset-viewer/city-uv-investigation`

**Features**:
- ✅ **Toggle individual meshes on/off** - Isolate specific geometry to study
- ✅ **Group meshes by material** - See which meshes share the same textures
- ✅ **View texture atlas previews** - See the atlas packing for each material
- ✅ **Select meshes for detailed info** - Click to see mesh name, material, texture
- ✅ **Real-time 3D view** - Study UV mapping in context with the model
- ✅ **Show/Hide All controls** - Quickly isolate problem areas

### Workflow

1. **Load the city model** in the UV investigation viewer
2. **Toggle meshes on/off** to isolate specific geometry
3. **Study the texture atlas** used by each mesh
4. **Identify patterns** in how different meshes use their atlases (top half, bottom half, quadrants, etc.)
5. **Document systematic patterns** found across multiple meshes
6. **Write a post-processing script** to apply the discovered transformation patterns

### Benefits

- **Stays focused on gameplay** - No deep dive into binary formats
- **Empirical approach** - Study what we have, find patterns
- **Practical solution** - Can implement fixes as patterns are discovered
- **Systematic once understood** - Same patterns likely apply to all areas

This approach allows us to solve the texture issue while keeping development momentum on gameplay features.
