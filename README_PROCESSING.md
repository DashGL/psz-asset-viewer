# Processing Scripts & Pages

## Scripts

### Process Player Characters
```bash
npm run processPlayer
```
Processes all player character models from `raw/player/` directory. Outputs to `public/player/[character_name]/`:
- Character model GLB
- `info.json` - Character metadata
- `textures.json` - List of 45 texture variants
- Texture PNG samples

Also creates `public/player/animations/` with:
- `animations.json` - 22 shared animations (wait, run, attack, damage, etc.)

### Process Enemies
```bash
npm run processEnemies
```
Processes all enemy NARC files from `raw/enemy/` directory. Outputs to `public/enemies/[enemy_name]/`:
- Main model GLB with embedded animations
- Effect model GLBs
- Textures
- `info.json` - Enemy metadata
- `animations.json` - Animation list
- `effects.json` - Effect model list

#### Test Script
```bash
npm run processEnemiesTest
```
Processes only sample enemies (frog, rappy, jigobooma) for testing.

### Process City (Scene 00)
```bash
npm run processCity
```
Processes **Scene 00** with areas:
- `00/a` → `public/city_a/`
- `00/e` → `public/city_e/`

### Process Gurhacia Valley (Scene 01)
```bash
npm run processValley
```
Processes **Scene 01** with areas:
- `01/a` → `public/valley_a/`
- `01/b` → `public/valley_b/`
- `01/e` → `public/valley_e/`
- `01/z` → `public/valley_z/`

### Process Ozette Wetlands (Scene 02)
```bash
npm run processWetlands
```
Processes **Scene 02** with areas:
- `02/a` → `public/wetlands_a/`
- `02/b` → `public/wetlands_b/`
- `02/e` → `public/wetlands_e/`
- `02/z` → `public/wetlands_z/`

### Process Rioh Snowfield (Scene 03)
```bash
npm run processSnowfield
```
Processes **Scene 03** with areas:
- `03/a` → `public/snowfield_a/`
- `03/b` → `public/snowfield_b/`
- `03/e` → `public/snowfield_e/`
- `03/z` → `public/snowfield_z/`

### Process Makara Ruins (Scene 04)
```bash
npm run processMakara
```
Processes **Scene 04** with areas:
- `04/a` → `public/makara_a/`
- `04/b` → `public/makara_b/`
- `04/e` → `public/makara_e/`
- `04/z` → `public/makara_z/`

### Process Oblivion City Paru (Scene 05)
```bash
npm run processParu
```
Processes **Scene 05** with areas:
- `05/a` → `public/paru_a/`
- `05/b` → `public/paru_b/`
- `05/e` → `public/paru_e/`
- `05/z` → `public/paru_z/`

### Process Arca Plant (Scene 06)
```bash
npm run processArca
```
Processes **Scene 06** with areas:
- `06/a` → `public/arca_a/`
- `06/b` → `public/arca_b/`
- `06/e` → `public/arca_e/`
- `06/z` → `public/arca_z/`

### Process Dark Shrine (Scene 07)
```bash
npm run processShrine
```
Processes **Scene 07** with areas:
- `07/a` → `public/shrine_a/`
- `07/b` → `public/shrine_b/`
- `07/e` → `public/shrine_e/`
- `07/z` → `public/shrine_z/`

### Process Eternal Tower (Scene 08)
```bash
npm run processTower
```
Processes **Scene 08** with areas:
- `08/0` → `public/tower_0/`
- `08/1` → `public/tower_1/`
- `08/2` → `public/tower_2/`
- `08/3` → `public/tower_3/`
- `08/4` → `public/tower_4/`
- `08/5` → `public/tower_5/`
- `08/6` → `public/tower_6/`
- `08/7` → `public/tower_7/`
- `08/e` → `public/tower_e/`

### Process Any Scene (Advanced)
```bash
# List all available scenes
bun run scripts/process-scenes.ts

# Process specific scene/area combinations
bun run scripts/process-scenes.ts 02/a 02/b

# Process everything
bun run scripts/process-scenes.ts --all
```

## Pages

Your viewer now has dedicated pages for each area:

### Player Characters
- http://localhost:4322/player - Player Character List (61 available)
  - Browse all processed player character models
  - Click any character to view its 3D model
- http://localhost:4322/player/[name] - Individual Player Viewer
  - Interactive 3D viewer with animation playback
  - 45 texture variants per character
  - 22 shared animations (wait, run, attack, etc.)
  - Example: http://localhost:4322/player/pc_000

### Enemies
- http://localhost:4322/enemies - Enemy List (60 available)
  - Browse all processed enemy models
  - Click any enemy to view its 3D model
- http://localhost:4322/enemies/[name] - Individual Enemy Viewer
  - Interactive 3D viewer with animation playback
  - Play animations and view effects
  - Example: http://localhost:4322/enemies/frog

### City (Scene 00)
- http://localhost:4322/city_a - City Area A
- http://localhost:4322/city_e - City Area E

### Gurhacia Valley (Scene 01)
- http://localhost:4322/valley_a - Valley Area A
- http://localhost:4322/valley_b - Valley Area B
- http://localhost:4322/valley_e - Valley Area E
- http://localhost:4322/valley_z - Valley Area Z

### Ozette Wetlands (Scene 02)
- http://localhost:4322/wetlands_a - Wetlands Area A
- http://localhost:4322/wetlands_b - Wetlands Area B
- http://localhost:4322/wetlands_e - Wetlands Area E
- http://localhost:4322/wetlands_z - Wetlands Area Z

### Rioh Snowfield (Scene 03)
- http://localhost:4322/snowfield_a - Snowfield Area A
- http://localhost:4322/snowfield_b - Snowfield Area B
- http://localhost:4322/snowfield_e - Snowfield Area E
- http://localhost:4322/snowfield_z - Snowfield Area Z

### Makara Ruins (Scene 04)
- http://localhost:4322/makara_a - Makara Area A
- http://localhost:4322/makara_b - Makara Area B
- http://localhost:4322/makara_e - Makara Area E
- http://localhost:4322/makara_z - Makara Area Z

### Oblivion City Paru (Scene 05)
- http://localhost:4322/paru_a - Paru Area A
- http://localhost:4322/paru_b - Paru Area B
- http://localhost:4322/paru_e - Paru Area E
- http://localhost:4322/paru_z - Paru Area Z

### Arca Plant (Scene 06)
- http://localhost:4322/arca_a - Arca Area A
- http://localhost:4322/arca_b - Arca Area B
- http://localhost:4322/arca_e - Arca Area E
- http://localhost:4322/arca_z - Arca Area Z

### Dark Shrine (Scene 07)
- http://localhost:4322/shrine_a - Shrine Area A
- http://localhost:4322/shrine_b - Shrine Area B
- http://localhost:4322/shrine_e - Shrine Area E
- http://localhost:4322/shrine_z - Shrine Area Z

### Eternal Tower (Scene 08)
- http://localhost:4322/tower_0 - Tower Floor 0
- http://localhost:4322/tower_1 - Tower Floor 1
- http://localhost:4322/tower_2 - Tower Floor 2
- http://localhost:4322/tower_3 - Tower Floor 3
- http://localhost:4322/tower_4 - Tower Floor 4
- http://localhost:4322/tower_5 - Tower Floor 5
- http://localhost:4322/tower_6 - Tower Floor 6
- http://localhost:4322/tower_7 - Tower Floor 7
- http://localhost:4322/tower_e - Tower Area E

### Other Pages
- http://localhost:4322/ - Home page with all areas
- http://localhost:4322/scenes - Dynamic list of all processed scenes

## Workflow

1. **Start the dev server** (if not running):
   ```bash
   npm run dev
   ```

2. **Process player characters, enemies, or locations**:
   ```bash
   # Process player characters
   npm run processPlayer       # Process all 61 player character models

   # Process enemies
   npm run processEnemiesTest  # Process 3 sample enemies (frog, rappy, jigobooma)
   npm run processEnemies      # Process all 67 enemies

   # Process scene locations
   npm run processCity       # Process the city
   npm run processValley     # Process the valley
   npm run processWetlands   # Process the wetlands
   npm run processSnowfield  # Process the snowfield
   npm run processMakara     # Process Makara Ruins
   npm run processParu       # Process Oblivion City Paru
   npm run processArca       # Process Arca Plant
   npm run processShrine     # Process Dark Shrine
   npm run processTower      # Process Eternal Tower
   ```

3. **View in browser**:
   - Open http://localhost:4322/
   - Click on any area to view its assets
   - The dev server will hot-reload as you process new scenes

## File Structure

```
public/
├── enemies/         # Enemy models
│   ├── frog/
│   │   ├── s_020/
│   │   │   ├── s_020.glb
│   │   │   └── s_020.png
│   │   ├── effects/
│   │   │   ├── ef_c_stt_w/
│   │   │   └── ...
│   │   ├── textures/
│   │   ├── info.json
│   │   ├── animations.json
│   │   └── effects.json
│   ├── rappy/
│   ├── jigobooma/
│   └── ... (67 total enemies)
├── city_a/          # Scene 00, Area A
├── city_e/          # Scene 00, Area E
├── valley_a/        # Scene 01, Area A
├── valley_b/        # Scene 01, Area B
├── valley_e/        # Scene 01, Area E
├── valley_z/        # Scene 01, Area Z
├── wetlands_a/      # Scene 02, Area A
├── wetlands_b/      # Scene 02, Area B
├── wetlands_e/      # Scene 02, Area E
├── wetlands_z/      # Scene 02, Area Z
├── snowfield_a/     # Scene 03, Area A
├── snowfield_b/     # Scene 03, Area B
├── snowfield_e/     # Scene 03, Area E
├── snowfield_z/     # Scene 03, Area Z
├── makara_a/        # Scene 04, Area A
├── makara_b/        # Scene 04, Area B
├── makara_e/        # Scene 04, Area E
├── makara_z/        # Scene 04, Area Z
├── paru_a/          # Scene 05, Area A
├── paru_b/          # Scene 05, Area B
├── paru_e/          # Scene 05, Area E
├── paru_z/          # Scene 05, Area Z
├── arca_a/          # Scene 06, Area A
├── arca_b/          # Scene 06, Area B
├── arca_e/          # Scene 06, Area E
├── arca_z/          # Scene 06, Area Z
├── shrine_a/        # Scene 07, Area A
├── shrine_b/        # Scene 07, Area B
├── shrine_e/        # Scene 07, Area E
├── shrine_z/        # Scene 07, Area Z
├── tower_0/         # Scene 08, Floor 0
├── tower_1/         # Scene 08, Floor 1
├── tower_2/         # Scene 08, Floor 2
├── tower_3/         # Scene 08, Floor 3
├── tower_4/         # Scene 08, Floor 4
├── tower_5/         # Scene 08, Floor 5
├── tower_6/         # Scene 08, Floor 6
├── tower_7/         # Scene 08, Floor 7
└── tower_e/         # Scene 08, Area E

raw/enemy/
├── frog.narc        # Frog enemy (ZPR compressed NARC)
├── rappy.narc       # Rappy enemy
├── jigobooma.narc   # Jigobooma enemy
└── ... (67 .narc files total)

raw/scene/
├── 00/
│   ├── a/          # City A source files
│   └── e/          # City E source files
├── 01/
│   ├── a/          # Valley A source files
│   ├── b/          # Valley B source files
│   ├── e/          # Valley E source files
│   └── z/          # Valley Z source files
├── 02/
│   ├── a/          # Wetlands A source files
│   ├── b/          # Wetlands B source files
│   ├── e/          # Wetlands E source files
│   └── z/          # Wetlands Z source files
├── 03/
│   ├── a/          # Snowfield A source files
│   ├── b/          # Snowfield B source files
│   ├── e/          # Snowfield E source files
│   └── z/          # Snowfield Z source files
├── 04/
│   ├── a/          # Makara A source files
│   ├── b/          # Makara B source files
│   ├── e/          # Makara E source files
│   └── z/          # Makara Z source files
├── 05/
│   ├── a/          # Paru A source files
│   ├── b/          # Paru B source files
│   ├── e/          # Paru E source files
│   └── z/          # Paru Z source files
├── 06/
│   ├── a/          # Arca A source files
│   ├── b/          # Arca B source files
│   ├── e/          # Arca E source files
│   └── z/          # Arca Z source files
├── 07/
│   ├── a/          # Shrine A source files
│   ├── b/          # Shrine B source files
│   ├── e/          # Shrine E source files
│   └── z/          # Shrine Z source files
└── 08/
    ├── 0/          # Tower Floor 0 source files
    ├── 1/          # Tower Floor 1 source files
    ├── 2/          # Tower Floor 2 source files
    ├── 3/          # Tower Floor 3 source files
    ├── 4/          # Tower Floor 4 source files
    ├── 5/          # Tower Floor 5 source files
    ├── 6/          # Tower Floor 6 source files
    ├── 7/          # Tower Floor 7 source files
    └── e/          # Tower E source files
```

## Naming Convention

- **City** = Scene 00 (areas: a, e)
- **Gurhacia Valley** = Scene 01 (areas: a, b, e, z)
- **Ozette Wetlands** = Scene 02 (areas: a, b, e, z)
- **Rioh Snowfield** = Scene 03 (areas: a, b, e, z)
- **Makara Ruins** = Scene 04 (areas: a, b, e, z)
- **Oblivion City Paru** = Scene 05 (areas: a, b, e, z)
- **Arca Plant** = Scene 06 (areas: a, b, e, z)
- **Dark Shrine** = Scene 07 (areas: a, b, e, z)
- **Eternal Tower** = Scene 08 (areas: 0, 1, 2, 3, 4, 5, 6, 7, e)

Each area gets its own output directory and dedicated viewer page!
