import * as THREE from 'three';

/**
 * Water configuration type
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
