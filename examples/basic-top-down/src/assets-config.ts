import type { AssetsConfig } from '../../../src/types/assets.js';
import * as THREE from 'three';

const assetConfig: AssetsConfig = {
  textures: {
    grass: {
      url: 'assets/textures/grass-256.webp',
      wrapS: THREE.MirroredRepeatWrapping,
      wrapT: THREE.MirroredRepeatWrapping,
    },
    crate: {
      url: 'assets/textures/crate-256.webp',
    },
    heightmap: {
      url: 'assets/textures/heightmap-island-256.webp',
    },
  },
  models: {
    'human-idle': {
      url: 'assets/models/extra-low-poly-human/idle.fbx',
    },
    'zombie-idle': {
      url: 'assets/models/extra-low-poly-zombie/idle.fbx',
    },
    walk: {
      url: 'assets/models/extra-low-poly-animations/walk.fbx',
    },
    run: {
      url: 'assets/models/extra-low-poly-animations/run.fbx',
    },
    roll: {
      url: 'assets/models/extra-low-poly-animations/roll.fbx',
    },
    'zombie-walk': {
      url: 'assets/models/extra-low-poly-animations/zombie-walk.fbx',
    },
    'zombie-run': {
      url: 'assets/models/extra-low-poly-animations/zombie-run.fbx',
    },
    'zombie-attack': {
      url: 'assets/models/extra-low-poly-animations/zombie-attack.fbx',
    },
  },
};

export default assetConfig;
