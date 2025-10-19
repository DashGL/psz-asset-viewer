# Processing Scripts & Pages

## Scripts

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

### Other Pages
- http://localhost:4322/ - Home page with all areas
- http://localhost:4322/scenes - Dynamic list of all processed scenes

## Workflow

1. **Start the dev server** (if not running):
   ```bash
   npm run dev
   ```

2. **Process a location**:
   ```bash
   npm run processCity       # Process the city
   npm run processValley     # Process the valley
   npm run processWetlands   # Process the wetlands
   npm run processSnowfield  # Process the snowfield
   npm run processMakara     # Process Makara Ruins
   npm run processParu       # Process Oblivion City Paru
   ```

3. **View in browser**:
   - Open http://localhost:4322/
   - Click on any area to view its assets
   - The dev server will hot-reload as you process new scenes

## File Structure

```
public/
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
└── paru_z/          # Scene 05, Area Z

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
└── 05/
    ├── a/          # Paru A source files
    ├── b/          # Paru B source files
    ├── e/          # Paru E source files
    └── z/          # Paru Z source files
```

## Naming Convention

- **City** = Scene 00 (areas: a, e)
- **Gurhacia Valley** = Scene 01 (areas: a, b, e, z)
- **Ozette Wetlands** = Scene 02 (areas: a, b, e, z)
- **Rioh Snowfield** = Scene 03 (areas: a, b, e, z)
- **Makara Ruins** = Scene 04 (areas: a, b, e, z)
- **Oblivion City Paru** = Scene 05 (areas: a, b, e, z)

Each area gets its own output directory and dedicated viewer page!
