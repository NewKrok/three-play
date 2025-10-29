import { loadFromTexture, createHeightmapUtils } from './heightmap-utils.js';
import type {
  HeightmapUtils,
  HeightmapConfig,
  HeightmapIntegrationConfig,
  HeightmapManager,
} from '../../types/heightmap.js';
import type { LoadedAssets } from '../../types/assets.js';
import type { WorldConfig } from '../../types/world.js';

/**
 * Creates a heightmap integration configuration from world config
 * @param worldConfig - The world configuration
 * @returns Heightmap integration config or null if not configured
 */
export const createHeightmapIntegrationConfig = (
  worldConfig: WorldConfig,
): HeightmapIntegrationConfig | null => {
  const heightmapConfig = worldConfig.heightmap;

  if (!heightmapConfig?.assetId) {
    return null;
  }

  return {
    heightmapAssetId: heightmapConfig.assetId,
    worldWidth: worldConfig.world.size.x,
    worldHeight: worldConfig.world.size.y,
    resolution: heightmapConfig.resolution ?? 256,
    elevationRatio: heightmapConfig.elevationRatio ?? 30,
  };
};

/**
 * Creates a heightmap manager for handling heightmap utilities
 * @param config - Configuration for heightmap integration
 * @param loadedAssets - The loaded assets containing the heightmap texture
 * @returns Heightmap manager instance
 */
export const createHeightmapManager = (
  config: HeightmapIntegrationConfig,
  loadedAssets: LoadedAssets,
): HeightmapManager => {
  let utils: HeightmapUtils | null = null;

  // Initialize heightmap utils immediately if texture is available
  const texture = loadedAssets.textures[config.heightmapAssetId];
  if (texture) {
    const heightmapConfig: HeightmapConfig = {
      worldWidth: config.worldWidth,
      worldHeight: config.worldHeight,
      resolution: config.resolution ?? 256,
      elevationRatio: config.elevationRatio ?? 30,
    };

    const heightmapData = loadFromTexture(texture);
    utils = createHeightmapUtils(heightmapData, heightmapConfig);
  } else {
    console.warn(
      `Heightmap texture with ID '${config.heightmapAssetId}' not found in loaded assets`,
    );
  }

  const destroy = (): void => {
    // Clean up heightmap resources if needed
    utils = null;
  };

  return {
    get utils() {
      return utils;
    },
    destroy,
  };
};

/**
 * Utility function to check if heightmap should be loaded
 * @param worldConfig - The world configuration
 * @returns True if heightmap should be loaded
 */
export const shouldLoadHeightmap = (worldConfig: WorldConfig): boolean => {
  return Boolean(worldConfig.heightmap?.assetId);
};
