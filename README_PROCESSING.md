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
   npm run processCity     # Process the city
   npm run processValley   # Process the valley
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
└── valley_z/        # Scene 01, Area Z

raw/scene/
├── 00/
│   ├── a/          # City A source files
│   └── e/          # City E source files
└── 01/
    ├── a/          # Valley A source files
    ├── b/          # Valley B source files
    ├── e/          # Valley E source files
    └── z/          # Valley Z source files
```

## Naming Convention

- **City** = Scene 00
- **Gurhacia Valley** = Scene 01
- Areas = a, b, e, z (subfolders within each scene)

Each area gets its own output directory and dedicated viewer page!
