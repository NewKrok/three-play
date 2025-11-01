// Core world functionality
export { default as createWorld } from './core/world/world.js';

// Heightmap utilities
export {
  HeightmapUtils,
  loadFromTexture,
  createHeightmapUtils,
} from './core/heightmap/index.js';

// Water utilities
export { WaterUtils, createWaterInstance, NoiseGenerator } from './core/water/index.js';

// Asset loading utilities
export { AssetLoader } from './core/assets/index.js';

// Effects utilities
export { createOutlineManager } from './core/effects/index.js';

// Types
export type {
  WorldConfig,
  WorldInstance,
  UpdateCallback,
} from './types/world.js';
export type { WaterConfig, WaterInstance, InternalWaterConfig } from './types/water.js';
export type {
  OutlineConfig,
  OutlineEntry,
  PostProcessingConfig,
  PostProcessingManager,
} from './types/effects.js';
export type {
  HeightmapData,
  HeightmapConfig,
  HeightmapUtils as HeightmapUtilsType,
  HeightmapPosition,
  ResolutionRatio,
  WorldHeightmapConfig,
  HeightmapIntegrationConfig,
  HeightmapManager,
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
