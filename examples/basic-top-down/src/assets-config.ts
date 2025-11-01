import type { AssetsConfig } from '../../../src/types/assets.js';
import * as THREE from 'three';

const assetConfig: AssetsConfig = {
  textures: {
    grass: {
      url: 'assets/textures/grass-256.webp',
      wrapS: THREE.MirroredRepeatWrapping,
      wrapT: THREE.MirroredRepeatWrapping,
    },
    cliff: {
      url: 'assets/textures/cliff-256.webp',
      wrapS: THREE.MirroredRepeatWrapping,
      wrapT: THREE.MirroredRepeatWrapping,
    },
    mud: {
      url: 'assets/textures/mud-256.webp',
      wrapS: THREE.MirroredRepeatWrapping,
      wrapT: THREE.MirroredRepeatWrapping,
    },
    sand: {
      url: 'assets/textures/sand-256.webp',
      wrapS: THREE.MirroredRepeatWrapping,
      wrapT: THREE.MirroredRepeatWrapping,
    },
    water: {
      url: 'assets/textures/water-256.webp',
      wrapS: THREE.MirroredRepeatWrapping,
      wrapT: THREE.MirroredRepeatWrapping,
    },
    crate: {
      url: 'assets/textures/crate-256.webp',
    },
    heightmap: {
      url: 'assets/textures/heightmap-island-256.webp',
    },
    'noise-a': {
      url: 'assets/textures/noise-a-256.webp',
      wrapS: THREE.MirroredRepeatWrapping,
      wrapT: THREE.MirroredRepeatWrapping,
    },
    'noise-b': {
      url: 'assets/textures/noise-a-256.webp',
      wrapS: THREE.MirroredRepeatWrapping,
      wrapT: THREE.MirroredRepeatWrapping,
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
    'light-attack': {
      url: 'assets/models/extra-low-poly-animations/light-attack.fbx',
    },
    'heavy-attack': {
      url: 'assets/models/extra-low-poly-animations/heavy-attack.fbx',
    },
    'hit-to-body': {
      url: 'assets/models/extra-low-poly-animations/hit-to-body.fbx',
    },
  },
};

export default assetConfig;
