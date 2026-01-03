import * as THREE from 'three';
import type { ProjectileDefinition } from '@newkrok/three-play';

/**
 * Creates the apple projectile definition
 * @param appleGeometry - The geometry to use for the apple projectile
 * @param appleMaterial - The material to use for the apple projectile
 * @returns The apple projectile definition
 */
export const createAppleProjectileDefinition = (
  appleGeometry: THREE.SphereGeometry,
  appleMaterial: THREE.MeshStandardMaterial,
): ProjectileDefinition => {
  return {
    id: 'apple',
    name: 'Apple',
    physics: {
      velocity: new THREE.Vector3(0, 0, 0), // Will be set when launching
      gravity: new THREE.Vector3(0, -9.8, 0),
      airResistance: 0.98,
      bounciness: 0,
      stickOnHit: false,
      lifetime: 5,
    },
    visual: {
      geometry: appleGeometry,
      material: appleMaterial,
      castShadow: true,
      receiveShadow: true,
    },
    collision: {
      radius: 0.15,
      layers: ['default'],
      checkTerrain: true,
      checkObjects: true,
    },
    spread: {
      horizontal: 0.02,
      vertical: 0.02,
      velocityVariance: 0.02,
    },
    poolSize: 50,
  };
};
