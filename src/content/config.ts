import { defineCollection, z } from 'astro:content';

const objectsCollection = defineCollection({
  type: 'data',
  schema: z.object({
    id: z.string(),
    modelCount: z.number(),
    totalModels: z.number(),
    textureCount: z.number(),
    models: z.array(z.string()).optional(),
  }),
});

const playersCollection = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    modelFile: z.string().optional(),
    textureCount: z.number(),
    textures: z.array(z.object({
      name: z.string(),
      file: z.string(),
    })).optional(),
  }),
});

const enemiesCollection = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    modelBaseName: z.string().optional(),
    animationCount: z.number(),
    effectCount: z.number(),
    partsCount: z.number().optional(),
  }),
});

const weaponsCollection = defineCollection({
  type: 'data',
  schema: z.object({
    id: z.string(),
    name: z.string().optional(),
    animationCount: z.number(),
    textureCount: z.number(),
    variants: z.array(z.string()).optional(),
  }),
});

export const collections = {
  objects: objectsCollection,
  players: playersCollection,
  enemies: enemiesCollection,
  weapons: weaponsCollection,
};