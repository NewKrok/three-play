import { loadHeightmap, createHeightmapUtils } from '../heightmap/index.js';
import type { HeightmapUtils, HeightmapConfig } from '../../types/heightmap.js';
import type {
  WorldConfig,
  HeightmapIntegrationConfig,
  HeightmapManager,
} from '../../types/world.js';

/**
 * Creates a heightmap integration configuration from world config
 * @param worldConfig - The world configuration
 * @returns Heightmap integration config or null if not configured
 */
export const createHeightmapIntegrationConfig = (
  worldConfig: WorldConfig,
): HeightmapIntegrationConfig | null => {
  const heightmapConfig = worldConfig.heightmap;

  if (!heightmapConfig?.url) {
    return null;
  }

  return {
    heightmapUrl: heightmapConfig.url,
    worldWidth: worldConfig.world.size.x,
    worldHeight: worldConfig.world.size.y,
    resolution: heightmapConfig.resolution ?? 256,
    elevationRatio: heightmapConfig.elevationRatio ?? 30,
  };
};

/**
 * Creates a heightmap manager for handling heightmap loading and utilities
 * @param config - Configuration for heightmap integration
 * @returns Heightmap manager instance
 */
export const createHeightmapManager = (
  config: HeightmapIntegrationConfig,
): HeightmapManager => {
  let utils: HeightmapUtils | null = null;
  let isLoading = false;
  let isLoaded = false;
  let error: Error | null = null;

  const initialize = async (): Promise<void> => {
    if (isLoading || isLoaded) {
      return;
    }

    isLoading = true;
    error = null;

    try {
      // Create heightmap config using world dimensions
      const heightmapConfig: HeightmapConfig = {
        worldWidth: config.worldWidth,
        worldHeight: config.worldHeight,
        resolution: config.resolution ?? 256,
        elevationRatio: config.elevationRatio ?? 30,
      };

      const heightmapData = await loadHeightmap(config.heightmapUrl);
      utils = createHeightmapUtils(heightmapData, heightmapConfig);
      isLoaded = true;
    } catch (loadError) {
      error =
        loadError instanceof Error
          ? loadError
          : new Error('Failed to load heightmap');
      console.error('Failed to auto-load heightmap:', error);
    } finally {
      isLoading = false;
    }
  };

  const destroy = (): void => {
    // Clean up heightmap resources if needed
    utils = null;
    isLoading = false;
    isLoaded = false;
    error = null;
  };

  return {
    get utils() {
      return utils;
    },
    get isLoading() {
      return isLoading;
    },
    get isLoaded() {
      return isLoaded;
    },
    get error() {
      return error;
    },
    initialize,
    destroy,
  };
};

/**
 * Utility function to check if heightmap should be loaded
 * @param worldConfig - The world configuration
 * @returns True if heightmap should be loaded
 */
export const shouldLoadHeightmap = (worldConfig: WorldConfig): boolean => {
  return Boolean(worldConfig.heightmap?.url);
};
