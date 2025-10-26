import * as THREE from 'three';
import type { HeightmapUtils } from './heightmap.js';
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
  heightmap?: {
    url: string;
    resolution?: number;
    elevationRatio?: number;
  };
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
  start(): void;
  pause(): void;
  resume(): void;
  onUpdate(callback: UpdateCallback): () => void; // Returns unsubscribe function
  destroy(): void; // Complete cleanup and memory deallocation
};
