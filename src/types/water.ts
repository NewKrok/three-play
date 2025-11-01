import * as THREE from 'three';

/**
 * Water configuration type for public API
 */
export type WaterConfig = {
  level: number; // Water level Y position
  deepColor?: THREE.ColorRepresentation; // Deep water color
  shallowColor?: THREE.ColorRepresentation; // Shallow water color
  shallowStrength?: number; // Strength of shallow color blending
  foamColor?: THREE.ColorRepresentation; // Foam color at shallow edges
  foamWidth?: number; // Width of foam effect
  foamStrength?: number; // Strength of foam effect
  opacity?: number; // Water transparency (0-1)
  amplitude?: number; // Wave amplitude
  frequency?: number; // Wave frequency
  speed?: number; // Wave animation speed
  resolution?: number; // Water mesh resolution (segments per side)
  textureAssetId?: string; // Asset ID for texture from asset system
  textureStrength?: number; // Strength of texture overlay (0-1)
  textureScale?: number; // Scale factor for texture tiling
  textureFlowDirection?: THREE.Vector2; // Direction of texture flow (x, z components)
  textureFlowSpeed?: number; // Speed of texture flow animation
  variationTextureAssetId?: string; // Asset ID for surface variation texture from asset system
  variationScale?: number; // Scale factor for surface variation texture tiling
  variationFlowDirection?: THREE.Vector2; // Direction of variation texture flow (x, z components)
  variationFlowSpeed?: number; // Speed of variation texture flow animation
};

/**
 * Internal water configuration type with resolved texture
 */
export type InternalWaterConfig = WaterConfig & {
  texture?: THREE.Texture; // Resolved texture from asset system
  variationTexture?: THREE.Texture; // Resolved surface variation texture from asset system
};

/**
 * Water instance for managing water updates
 */
export type WaterInstance = {
  mesh: THREE.Mesh;
  uniforms: Record<string, { value: any }>;
  update: (deltaTime: number) => void;
  destroy: () => void;
};
