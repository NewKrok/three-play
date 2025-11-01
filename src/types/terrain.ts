import * as THREE from 'three';

/**
 * Configuration for a terrain layer
 */
export type TerrainLayerConfig = {
  /** Asset ID for the texture to use for this layer */
  textureAssetId: string;
  /** Minimum height where this layer appears */
  minHeight: number;
  /** Maximum height where this layer appears */
  maxHeight: number;
  /** Texture repeat scaling (how many times texture repeats across the terrain) */
  textureScale?: number;
};

/**
 * Configuration for terrain noise generation
 */
export type TerrainNoiseConfig = {
  /** Asset ID for the noise texture to use */
  textureAssetId?: string;
  /** Scale factor for noise UV coordinates */
  scale?: number;
  /** Noise strength (how much variation) */
  strength?: number;
  /** Noise offset (brightness adjustment) */
  offset?: number;
  /** Number of octaves for fractal noise (only for procedural noise) */
  octaves?: number;
  /** @deprecated Use strength instead */
  amplitude?: number;
};

/**
 * Configuration for terrain creation
 */
export type TerrainConfig = {
  /** Terrain layers (sand, mud, grass, etc.) */
  layers: TerrainLayerConfig[];
  /** Blend distance for smooth transitions between layers */
  blendDistance?: number;
  /** Noise configuration for terrain variation */
  noise?: TerrainNoiseConfig;
  /** Whether terrain should cast shadows */
  castShadow?: boolean;
  /** Whether terrain should receive shadows */
  receiveShadow?: boolean;
};

/**
 * Internal terrain configuration with loaded textures
 */
export type InternalTerrainConfig = TerrainConfig & {
  /** Loaded layer textures mapped by asset ID */
  layerTextures?: { [key: string]: THREE.Texture };
  /** Loaded noise texture */
  noiseTexture?: THREE.Texture;
};

/**
 * Terrain instance interface
 */
export type TerrainInstance = {
  /** The terrain mesh */
  mesh: THREE.Mesh;
  /** Get the terrain material */
  getMaterial(): THREE.MeshStandardMaterial;
  /** Update terrain configuration */
  updateConfig(config: Partial<TerrainConfig>): void;
  /** Dispose terrain resources */
  destroy(): void;
};

/**
 * Terrain utilities interface
 */
export type TerrainUtils = {
  /** Create terrain mesh with heightmap applied */
  createTerrainMesh(
    config: InternalTerrainConfig,
    worldWidth: number,
    worldHeight: number,
    heightmapResolution: number,
    heightmapUtils: any,
  ): THREE.Mesh;
  /** Create terrain material with shader modifications */
  createTerrainMaterial(
    config: InternalTerrainConfig,
  ): THREE.MeshStandardMaterial;
  /** Get terrain shader fragments */
  getShaderFragments(layerCount: number): {
    vertexShader: string;
    fragmentShaderPart1: string;
    fragmentShaderPart2: string;
  };
};
