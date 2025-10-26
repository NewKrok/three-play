import * as THREE from 'three';
import type { HeightmapUtils } from './heightmap.js';
import type { Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import type {
  AssetsConfig,
  LoadedAssets,
  ProgressCallback,
  ReadyCallback,
} from './assets.js';

/**
 * Update callback function type
 */
export type UpdateCallback = (deltaTime: number, elapsedTime: number) => void;

/**
 * Outline configuration type
 */
export type OutlineConfig = {
  edgeStrength?: number;
  edgeGlow?: number;
  edgeThickness?: number;
  pulsePeriod?: number;
  visibleEdgeColor?: string;
  hiddenEdgeColor?: string;
};

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
  heightmap?: {
    url: string;
    resolution?: number;
    elevationRatio?: number;
  };
  assets?: AssetsConfig;
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
  addOutlinedObjects(objects: THREE.Object3D[]): void; // Add objects to be outlined
  removeOutlinedObjects(objects: THREE.Object3D[]): void; // Remove objects from outline
  clearOutlinedObjects(): void; // Clear all outlined objects
  getOutlinedObjects(): THREE.Object3D[]; // Get currently outlined objects
  configureOutline(config: OutlineConfig): void; // Configure outline appearance
  start(): void;
  pause(): void;
  resume(): void;
  onUpdate(callback: UpdateCallback): () => void; // Returns unsubscribe function
  onProgress(callback: ProgressCallback): () => void; // Returns unsubscribe function for asset loading progress
  onReady(callback: ReadyCallback): () => void; // Returns unsubscribe function for asset loading completion
  destroy(): void; // Complete cleanup and memory deallocation
};
