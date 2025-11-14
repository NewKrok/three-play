import * as THREE from 'three';
import type {
  AssetsConfig,
  LoadedAssets,
  ProgressCallback,
  ReadyCallback,
} from './assets.js';
import type { OutlineConfig, OutlineEntry } from './effects.js';
import type { HeightmapUtils, WorldHeightmapConfig } from './heightmap.js';
import type { InputManager, InputManagerConfig } from './input.js';
import type { TerrainConfig, TerrainInstance } from './terrain.js';
import type { WaterConfig, WaterInstance } from './water.js';
import type { Logger, LoggerConfig } from '../core/utils/logger.js';
import type { DayNightConfig, DayNightManager } from './day-night.js';
import type { Pass } from 'three/examples/jsm/postprocessing/Pass.js';

/**
 * Update callback function type
 */
export type UpdateCallback = (deltaTime: number, elapsedTime: number) => void;

/**
 * Configuration type for world creation
 */
export type WorldConfig = {
  world: {
    size: {
      x: number;
      y: number;
    };
  };
  render?: {
    useComposer?: boolean;
    customPasses?: Pass[];
  };
  light?: {
    ambient?: {
      color?: THREE.ColorRepresentation;
      intensity?: number;
    };
    directional?: {
      color?: THREE.ColorRepresentation;
      intensity?: number;
    };
  };
  update?: {
    autoStart?: boolean;
    onUpdate?: UpdateCallback;
  };
  input?: InputManagerConfig;
  heightmap?: WorldHeightmapConfig;
  water?: WaterConfig;
  terrain?: TerrainConfig;
  assets?: AssetsConfig;
  logging?: LoggerConfig;
  dayNight?: DayNightConfig;
};

/**
 * World instance interface
 */
export type WorldInstance = {
  getConfig(): Readonly<WorldConfig>;
  getScene(): THREE.Scene;
  getCamera(): THREE.PerspectiveCamera;
  getRenderer(): THREE.WebGLRenderer;
  getComposer(): any | null; // EffectComposer type or null if useComposer is false
  getAmbientLight(): THREE.AmbientLight;
  getDirectionalLight(): THREE.DirectionalLight;
  getHeightmapUtils(): HeightmapUtils | null; // Heightmap utilities if loaded
  getLoadedAssets(): LoadedAssets | null; // Loaded assets if available
  getWaterInstance(): WaterInstance | null; // Water instance if water is enabled
  getTerrainInstance(): TerrainInstance | null; // Terrain instance if terrain is enabled
  getInputManager(): InputManager; // Input manager instance
  getLogger(): Logger; // Logger instance for this world
  getDayNightManager(): DayNightManager | null; // Day/night manager if enabled

  // Simple outline system methods
  addOutline(
    objects: THREE.Object3D | THREE.Object3D[],
    config: OutlineConfig,
  ): string; // Returns outline ID
  removeOutline(outlineId: string): void; // Remove by ID
  updateOutline(outlineId: string, config: Partial<OutlineConfig>): void; // Update existing outline
  clearOutlines(): void; // Clear all outlines
  getOutlines(): OutlineEntry[]; // Get all outlines

  start(): void;
  pause(): void;
  resume(): void;
  onUpdate(callback: UpdateCallback): () => void; // Returns unsubscribe function
  onProgress(callback: ProgressCallback): () => void; // Returns unsubscribe function for asset loading progress
  onReady(callback: ReadyCallback): () => void; // Returns unsubscribe function for asset loading completion
  destroy(): void; // Complete cleanup and memory deallocation
};
