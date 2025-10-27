// Core world functionality
export { default as createWorld } from './core/world/world.js';

// Heightmap utilities
export {
  HeightmapUtils,
  loadFromTexture,
  createHeightmapUtils,
} from './core/heightmap/index.js';

// Asset loading utilities
export { AssetLoader } from './core/assets/index.js';

// Effects utilities
export { createOutlineManager } from './core/effects/index.js';

// Types
export type { WorldConfig, WorldInstance } from './types/world.js';
export type {
  HeightmapData,
  HeightmapConfig,
  HeightmapUtils as HeightmapUtilsType,
  HeightmapPosition,
  ResolutionRatio,
} from './types/heightmap.js';
export type {
  AssetsConfig,
  LoadedAssets,
  LoadedModel,
  AssetProgress,
  ProgressCallback,
  ReadyCallback,
  TextureAssetConfig,
  ModelAssetConfig,
} from './types/assets.js';
export type {
  OutlineManager,
  OutlineManagerConfig,
} from './core/effects/index.js';
