export interface ColorOption {
  name: string;
  textureIndex: number;
}

export interface CharacterClass {
  id: string;
  name: string;
  pcPrefix: string;
  variations: string[];
  colors: ColorOption[];
  skinTones: number;
}

export interface RaceConfig {
  id: string;
  name: string;
  classes: CharacterClass[];
}

// Define the character configuration
export const CHARACTER_RACES: RaceConfig[] = [
  {
    id: 'human',
    name: 'Human',
    classes: [
      {
        id: 'humar',
        name: 'HUmar',
        pcPrefix: 'pc_00',
        variations: ['pc_000', 'pc_001', 'pc_002', 'pc_003'],
        colors: [
          { name: 'Red', textureIndex: 0 },
          { name: 'Blue', textureIndex: 1 },
          { name: 'Green', textureIndex: 2 },
          { name: 'Blue & Red', textureIndex: 3 },
          { name: 'Black & Red', textureIndex: 4 }
        ],
        skinTones: 9
      },
      {
        id: 'humarl',
        name: 'HUmarl',
        pcPrefix: 'pc_01',
        variations: ['pc_010', 'pc_011', 'pc_012', 'pc_013'],
        colors: [
          { name: 'Red', textureIndex: 0 },
          { name: 'Blue', textureIndex: 1 },
          { name: 'Green', textureIndex: 2 },
          { name: 'Blue & Red', textureIndex: 3 },
          { name: 'Black & Red', textureIndex: 4 }
        ],
        skinTones: 9
      },
      {
        id: 'ramar',
        name: 'RAmar',
        pcPrefix: 'pc_02',
        variations: ['pc_020', 'pc_021', 'pc_022', 'pc_023'],
        colors: [
          { name: 'Red', textureIndex: 0 },
          { name: 'Blue', textureIndex: 1 },
          { name: 'Green', textureIndex: 2 },
          { name: 'Blue & Red', textureIndex: 3 },
          { name: 'Black & Red', textureIndex: 4 }
        ],
        skinTones: 9
      },
      {
        id: 'ramarl',
        name: 'RAmarl',
        pcPrefix: 'pc_03',
        variations: ['pc_030', 'pc_031', 'pc_032', 'pc_033'],
        colors: [
          { name: 'Red', textureIndex: 0 },
          { name: 'Blue', textureIndex: 1 },
          { name: 'Green', textureIndex: 2 },
          { name: 'Blue & Red', textureIndex: 3 },
          { name: 'Black & Red', textureIndex: 4 }
        ],
        skinTones: 9
      },
      {
        id: 'fomar',
        name: 'FOmar',
        pcPrefix: 'pc_04',
        variations: ['pc_040', 'pc_041', 'pc_042', 'pc_043'],
        colors: [
          { name: 'Red', textureIndex: 0 },
          { name: 'Blue', textureIndex: 1 },
          { name: 'Green', textureIndex: 2 },
          { name: 'Blue & Red', textureIndex: 3 },
          { name: 'Black & Red', textureIndex: 4 }
        ],
        skinTones: 9
      },
      {
        id: 'fomarl',
        name: 'FOmarl',
        pcPrefix: 'pc_05',
        variations: ['pc_050', 'pc_051', 'pc_052', 'pc_053'],
        colors: [
          { name: 'Red', textureIndex: 0 },
          { name: 'Blue', textureIndex: 1 },
          { name: 'Green', textureIndex: 2 },
          { name: 'Blue & Red', textureIndex: 3 },
          { name: 'Black & Red', textureIndex: 4 }
        ],
        skinTones: 9
      }
    ]
  },
  {
    id: 'newman',
    name: 'Newman',
    classes: [
      {
        id: 'hunewm',
        name: 'HUnewm',
        pcPrefix: 'pc_06',
        variations: ['pc_060', 'pc_061', 'pc_062', 'pc_063'],
        colors: [
          { name: 'Red', textureIndex: 0 },
          { name: 'Blue', textureIndex: 1 },
          { name: 'Green', textureIndex: 2 },
          { name: 'Blue & Red', textureIndex: 3 },
          { name: 'Black & Red', textureIndex: 4 }
        ],
        skinTones: 9
      },
      {
        id: 'hunewearl',
        name: 'HUnewearl',
        pcPrefix: 'pc_07',
        variations: ['pc_070', 'pc_071', 'pc_072', 'pc_073'],
        colors: [
          { name: 'Red', textureIndex: 0 },
          { name: 'Blue', textureIndex: 1 },
          { name: 'Green', textureIndex: 2 },
          { name: 'Blue & Red', textureIndex: 3 },
          { name: 'Black & Red', textureIndex: 4 }
        ],
        skinTones: 9
      },
      {
        id: 'fonewm',
        name: 'FOnewm',
        pcPrefix: 'pc_08',
        variations: ['pc_080', 'pc_081', 'pc_082', 'pc_083'],
        colors: [
          { name: 'Red', textureIndex: 0 },
          { name: 'Blue', textureIndex: 1 },
          { name: 'Green', textureIndex: 2 },
          { name: 'Blue & Red', textureIndex: 3 },
          { name: 'Black & Red', textureIndex: 4 }
        ],
        skinTones: 9
      },
      {
        id: 'fonewearl',
        name: 'FOnewearl',
        pcPrefix: 'pc_09',
        variations: ['pc_090', 'pc_091', 'pc_092', 'pc_093'],
        colors: [
          { name: 'Red', textureIndex: 0 },
          { name: 'Blue', textureIndex: 1 },
          { name: 'Green', textureIndex: 2 },
          { name: 'Blue & Red', textureIndex: 3 },
          { name: 'Black & Red', textureIndex: 4 }
        ],
        skinTones: 9
      }
    ]
  },
  {
    id: 'cast',
    name: 'Cast',
    classes: [
      {
        id: 'hucast',
        name: 'HUcast',
        pcPrefix: 'pc_10',
        variations: ['pc_100', 'pc_101', 'pc_102', 'pc_103'],
        colors: [
          { name: 'Red', textureIndex: 0 },
          { name: 'Blue', textureIndex: 1 },
          { name: 'Green', textureIndex: 2 },
          { name: 'Blue & Red', textureIndex: 3 },
          { name: 'Black & Red', textureIndex: 4 }
        ],
        skinTones: 9
      },
      {
        id: 'hucaseal',
        name: 'HUcaseal',
        pcPrefix: 'pc_11',
        variations: ['pc_110', 'pc_111', 'pc_112', 'pc_113'],
        colors: [
          { name: 'Red', textureIndex: 0 },
          { name: 'Blue', textureIndex: 1 },
          { name: 'Green', textureIndex: 2 },
          { name: 'Blue & Red', textureIndex: 3 },
          { name: 'Black & Red', textureIndex: 4 }
        ],
        skinTones: 9
      },
      {
        id: 'racast',
        name: 'RAcast',
        pcPrefix: 'pc_12',
        variations: ['pc_120', 'pc_121', 'pc_122', 'pc_123'],
        colors: [
          { name: 'Red', textureIndex: 0 },
          { name: 'Blue', textureIndex: 1 },
          { name: 'Green', textureIndex: 2 },
          { name: 'Blue & Red', textureIndex: 3 },
          { name: 'Black & Red', textureIndex: 4 }
        ],
        skinTones: 9
      },
      {
        id: 'racaseal',
        name: 'RAcaseal',
        pcPrefix: 'pc_13',
        variations: ['pc_130', 'pc_131', 'pc_132', 'pc_133'],
        colors: [
          { name: 'Red', textureIndex: 0 },
          { name: 'Blue', textureIndex: 1 },
          { name: 'Green', textureIndex: 2 },
          { name: 'Blue & Red', textureIndex: 3 },
          { name: 'Black & Red', textureIndex: 4 }
        ],
        skinTones: 9
      }
    ]
  }
];

/**
 * Get the texture name for a specific character variation, color, and skin tone
 */
export function getTextureName(variation: string, colorIndex: number, skinTone: number): string {
  // Texture naming: pc_XXX_YZZ where:
  // XXX = variation number (000, 001, etc.)
  // Y = skin tone (0-8)
  // ZZ = color index (00-04)
  const skinToneDigit = skinTone;
  const colorDigits = colorIndex.toString().padStart(2, '0');
  return `${variation}_${skinToneDigit}${colorDigits}`;
}

/**
 * Get the model path for a character variation
 */
export function getModelPath(variation: string): string {
  return `/player/${variation}/${variation}/${variation}_000.glb`;
}

/**
 * Get the texture path for a character
 */
export function getTexturePath(variation: string, textureName: string): string {
  return `/player/${variation}/textures/${textureName}.png`;
}
