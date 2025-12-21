import type { AssetsConfig } from '@newkrok/three-play';
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
    smoke: {
      url: 'assets/textures/smoke-256.webp',
    },
    splash: {
      url: 'assets/textures/splash-256.webp',
      flipY: false,
    },
    'skybox-right': {
      url: 'assets/textures/skybox/simple/right.webp',
    },
    'skybox-left': {
      url: 'assets/textures/skybox/simple/left.webp',
    },
    'skybox-top': {
      url: 'assets/textures/skybox/simple/top.webp',
    },
    'skybox-bottom': {
      url: 'assets/textures/skybox/simple/bottom.webp',
    },
    'skybox-front': {
      url: 'assets/textures/skybox/simple/front.webp',
    },
    'skybox-back': {
      url: 'assets/textures/skybox/simple/back.webp',
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
    jump: {
      url: 'assets/models/extra-low-poly-animations/jump.fbx',
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
    'jog-forward': {
      url: 'assets/models/extra-low-poly-animations/jog-forward.fbx',
    },
    'jog-backward': {
      url: 'assets/models/extra-low-poly-animations/jog-backward.fbx',
    },
    'jog-strafe-left': {
      url: 'assets/models/extra-low-poly-animations/jog-strafe-left.fbx',
    },
    'jog-strafe-right': {
      url: 'assets/models/extra-low-poly-animations/jog-strafe-right.fbx',
    },
    'aim-hand-idle': {
      url: 'assets/models/extra-low-poly-animations/aim-hand-idle.fbx',
    },
    'left-turn': {
      url: 'assets/models/extra-low-poly-animations/left-turn.fbx',
    },
    'right-turn': {
      url: 'assets/models/extra-low-poly-animations/right-turn.fbx',
    },
    'throw': {
      url: 'assets/models/extra-low-poly-animations/throw.fbx',
    },
    'left-strafe': {
      url: 'assets/models/extra-low-poly-animations/left-strafe.fbx',
    },
    'right-strafe': {
      url: 'assets/models/extra-low-poly-animations/right-strafe.fbx',
    },
    'running-backward': {
      url: 'assets/models/extra-low-poly-animations/running-backward.fbx',
    },
    'low-poly-tree': {
      url: 'assets/models/environments/low-poly-tree-1.glb',
    },
    'low-poly-rock-1': {
      url: 'assets/models/environments/low-poly-rock-1.glb',
    },
    'low-poly-rock-2': {
      url: 'assets/models/environments/low-poly-rock-2.glb',
    },
  },
};

export default assetConfig;
