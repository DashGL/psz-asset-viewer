import localforage from 'localforage';

// Configure LocalForage instance for GLB assets
const glbCache = localforage.createInstance({
  name: 'psz-asset-viewer',
  storeName: 'glb_cache',
  description: 'Cache for GLB model files'
});

// Configure LocalForage instance for texture assets
const textureCache = localforage.createInstance({
  name: 'psz-asset-viewer',
  storeName: 'texture_cache',
  description: 'Cache for texture image files'
});

export interface CachedAsset {
  url: string;
  blob: Blob;
  cachedAt: number;
}

/**
 * Load a GLB file with caching
 * @param url URL to the GLB file
 * @returns Blob URL for the cached or fetched asset
 */
export async function loadGLB(url: string): Promise<string> {
  try {
    // Check if asset exists in cache
    const cached = await glbCache.getItem<CachedAsset>(url);

    if (cached && cached.blob) {
      console.log(`[Cache HIT] GLB: ${url}`);
      return URL.createObjectURL(cached.blob);
    }

    // Fetch from network
    console.log(`[Cache MISS] GLB: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }

    const blob = await response.blob();

    // Store in cache
    await glbCache.setItem(url, {
      url,
      blob,
      cachedAt: Date.now()
    });

    return URL.createObjectURL(blob);
  } catch (error) {
    console.error(`Error loading GLB ${url}:`, error);
    throw error;
  }
}

/**
 * Load a texture image with caching
 * @param url URL to the texture file
 * @returns Blob URL for the cached or fetched asset
 */
export async function loadTexture(url: string): Promise<string> {
  try {
    // Check if asset exists in cache
    const cached = await textureCache.getItem<CachedAsset>(url);

    if (cached && cached.blob) {
      console.log(`[Cache HIT] Texture: ${url}`);
      return URL.createObjectURL(cached.blob);
    }

    // Fetch from network
    console.log(`[Cache MISS] Texture: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }

    const blob = await response.blob();

    // Store in cache
    await textureCache.setItem(url, {
      url,
      blob,
      cachedAt: Date.now()
    });

    return URL.createObjectURL(blob);
  } catch (error) {
    console.error(`Error loading texture ${url}:`, error);
    throw error;
  }
}

/**
 * Clear all cached assets
 */
export async function clearCache(): Promise<void> {
  await glbCache.clear();
  await textureCache.clear();
  console.log('Cache cleared');
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  glbCount: number;
  textureCount: number;
}> {
  const glbCount = await glbCache.length();
  const textureCount = await textureCache.length();

  return { glbCount, textureCount };
}
