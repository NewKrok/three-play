// Core heightmap utilities
export {
  loadFromTexture,
  createHeightmapUtils,
  HeightmapUtilsNamespace as HeightmapUtils,
} from './heightmap-utils.js';

// Heightmap integration for world creation
export {
  createHeightmapIntegrationConfig,
  createHeightmapManager,
  shouldLoadHeightmap,
} from './heightmap-integration.js';
