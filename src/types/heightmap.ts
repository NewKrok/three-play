import * as THREE from 'three';

/**
 * Result of heightmap loading operation
 */
export type HeightmapData = {
  heightmap: Float32Array;
  heightMapTexture: THREE.Texture;
};

/**
 * Configuration for heightmap in world config
 */
export type WorldHeightmapConfig = {
  assetId: string;
  resolution?: number;
  elevationRatio?: number;
};

/**
 * Configuration for heightmap resolution and world dimensions
 */
export type HeightmapConfig = {
  /** Width of the world in Three.js units */
  worldWidth: number;
  /** Height of the world in Three.js units */
  worldHeight: number;
  /** Resolution of the heightmap (width and height in pixels) */
  resolution: number;
  /** Multiplier for height values from the heightmap */
  elevationRatio: number;
};

/**
 * Configuration for heightmap integration
 */
export type HeightmapIntegrationConfig = {
  heightmapAssetId: string;
  worldWidth: number;
  worldHeight: number;
  resolution?: number;
  elevationRatio?: number;
};

/**
 * Result of heightmap utility calculations
 */
export type HeightmapUtils = {
  /** Get the height at a specific world position */
  getHeightFromPosition: (position: THREE.Vector3) => number;
  /** Get a random position above a minimum height */
  getPositionByHeight: (
    minHeight: number,
  ) => { x: number; y: number; z: number } | null;
  /** Apply heightmap data to a PlaneGeometry */
  applyHeightmapToGeometry: (geometry: THREE.PlaneGeometry) => void;
  /** The loaded heightmap data */
  heightmapData: HeightmapData;
  /** The heightmap configuration */
  config: HeightmapConfig;
};

/**
 * Position in heightmap coordinates
 */
export type HeightmapPosition = {
  x: number;
  z: number;
};

/**
 * Resolution ratio for coordinate conversion
 */
export type ResolutionRatio = {
  width: number;
  depth: number;
};

/**
 * Heightmap manager for handling heightmap utilities
 */
export type HeightmapManager = {
  utils: HeightmapUtils | null;
  destroy: () => void;
};
