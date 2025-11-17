import * as THREE from 'three';
import type { UnitDefinition } from '@newkrok/three-play';

/**
 * Human player unit definition
 */
export const humanUnitDefinition: UnitDefinition = {
  id: 'human-player',
  type: 'player',
  modelAssets: {
    baseModel: 'human-idle',
    animations: {
      idle: 'human-idle',
      walk: 'walk',
      run: 'run',
      roll: 'roll',
      lightAttack: 'light-attack',
      heavyAttack: 'heavy-attack',
      hitToBody: 'hit-to-body',
    },
  },
  stats: {
    speed: 1.0,
    health: 100,
    attackDamage: 25,
    collisionRadius: 0.5,
  },
  appearance: {
    scale: 1.0,
    rotation: Math.PI / 2, // Adjust for correct orientation
  },
};

/**
 * Zombie enemy unit definition
 */
export const zombieUnitDefinition: UnitDefinition = {
  id: 'zombie-enemy',
  type: 'enemy',
  modelAssets: {
    baseModel: 'zombie-idle',
    animations: {
      idle: 'zombie-idle',
      walk: 'zombie-walk',
      run: 'zombie-run',
      attack: 'zombie-attack',
      hitToBody: 'hit-to-body',
    },
  },
  stats: {
    speed: 0.8,
    health: 75,
    attackDamage: 15,
    collisionRadius: 0.5,
  },
  appearance: {
    scale: 1.0,
    rotation: Math.PI / 2,
    materialModifier: (model: THREE.Object3D) => {
      // Color zombies green
      model.traverse((child) => {
        if ((child as any).isMesh) {
          const mesh = child as THREE.Mesh;
          if (mesh.material) {
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((mat) => {
                if (mat instanceof THREE.MeshStandardMaterial) {
                  mat.color.setHex(0x4caf50);
                }
              });
            } else if (mesh.material instanceof THREE.MeshStandardMaterial) {
              mesh.material.color.setHex(0x4caf50);
            }
          }
        }
      });
    },
  },

  ai: {
    type: 'chase',
    targeting: {
      preferredTargets: ['player'],
      detectionRange: 8.0,
      attackRange: 1.5,
    },
    movement: {
      speed: 0.8,
    },
  },
};
