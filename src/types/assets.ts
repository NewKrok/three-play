import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Texture asset configuration
 */
export type TextureAssetConfig = {
  url: string;
  flipY?: boolean;
  wrapS?: THREE.Wrapping;
  wrapT?: THREE.Wrapping;
  magFilter?: THREE.TextureFilter;
  minFilter?: THREE.TextureFilter;
};

/**
 * Model asset configuration
 */
export type ModelAssetConfig = {
  url: string;
  scale?: number | [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
};

/**
 * Assets configuration
 */
export type AssetsConfig = {
  textures?: Record<string, TextureAssetConfig>;
  models?: Record<string, ModelAssetConfig>;
};

/**
 * Loaded assets container
 */
export type LoadedAssets = {
  textures: Record<string, THREE.Texture>;
  models: Record<string, GLTF>;
};

/**
 * Asset loading progress information
 */
export type AssetProgress = {
  percentage: number;
  loadedTextures: {
    current: number;
    total: number;
  };
  loadedModels: {
    current: number;
    total: number;
  };
  totalAssets: {
    current: number;
    total: number;
  };
};

/**
 * Progress callback function type
 */
export type ProgressCallback = (progress: AssetProgress) => void;

/**
 * Ready callback function type
 */
export type ReadyCallback = (assets: LoadedAssets) => void;
