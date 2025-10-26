// Core world functionality
export { default as createWorld } from './core/world/world.js';

// Heightmap utilities
export {
  HeightmapUtils,
  loadHeightmap,
  createHeightmapUtils,
} from './core/heightmap/index.js';

// Types
export type { WorldConfig, WorldInstance } from './types/world.js';
export type {
  HeightmapData,
  HeightmapConfig,
  HeightmapUtils as HeightmapUtilsType,
  HeightmapPosition,
  ResolutionRatio,
} from './types/heightmap.js';
