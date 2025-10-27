import * as THREE from 'three';
import type {
  AssetsConfig,
  LoadedAssets,
  ProgressCallback,
  ReadyCallback,
} from './assets.js';
import type { HeightmapUtils } from './heightmap.js';
import type { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import type { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import type { Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import type { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import type { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';

/**
 * Update callback function type
 */
export type UpdateCallback = (deltaTime: number, elapsedTime: number) => void;

/**
 * Simple and flexible outline configuration
 */
export type OutlineConfig = {
  color?: string; // Outline color (visible and hidden edge color)
  visibleColor?: string; // Visible edge color (overrides color)
  hiddenColor?: string; // Hidden edge color (overrides color)
  strength?: number; // Edge strength (0-10, default: 1)
  thickness?: number; // Edge thickness (0-10, default: 1)
  glow?: number; // Edge glow (0-1, default: 0)
  pulse?: boolean | number; // Pulse animation (true/false or pulse period)
  priority?: number; // Priority for overlapping outlines (higher wins)
  enabled?: boolean; // Enable/disable without removing (default: true)
};

/**
 * Object outline entry for internal management
 */
export type OutlineEntry = {
  object: THREE.Object3D;
  config: Required<OutlineConfig>;
  id: string; // Unique identifier for this outline entry
};

/**
 * Configuration for post-processing setup
 */
export type PostProcessingConfig = {
  useComposer: boolean;
  customPasses?: Pass[];
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
};

/**
 * Post-processing manager for handling passes and composer
 */
export type PostProcessingManager = {
  composer: EffectComposer | null;
  ssaoPass: SSAOPass | null;
  outlinePass: OutlinePass | null;
  fxaaPass: ShaderPass | null;
  setSize: (width: number, height: number) => void;
  destroy: () => void;
};

/**
 * Configuration for heightmap integration
 */
export type HeightmapIntegrationConfig = {
  heightmapUrl: string;
  worldWidth: number;
  worldHeight: number;
  resolution?: number;
  elevationRatio?: number;
};

/**
 * Heightmap manager for handling loading and initialization
 */
export type HeightmapManager = {
  utils: HeightmapUtils | null;
  isLoading: boolean;
  isLoaded: boolean;
  error: Error | null;
  initialize: () => Promise<void>;
  destroy: () => void;
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
