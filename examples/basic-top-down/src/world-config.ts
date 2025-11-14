import type { WorldConfig } from '@newkrok/three-play';
import * as THREE from 'three';
import assetConfig from './assets-config.js';
import terrainConfig from './terrain-config.js';
import inputConfig from './input-config.js';
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  HEIGHT_MAP_RESOLUTION,
  ELEVATION_RATIO,
  WATER_LEVEL,
} from './constants.js';

const worldConfig: WorldConfig = {
  world: {
    size: {
      x: WORLD_WIDTH,
      y: WORLD_HEIGHT,
    },
  },
  render: {
    useComposer: true,
  },
  heightmap: {
    assetId: 'heightmap',
    resolution: HEIGHT_MAP_RESOLUTION,
    elevationRatio: ELEVATION_RATIO,
  },
  water: {
    level: WATER_LEVEL,
    textureAssetId: 'water',
    textureStrength: 0.1,
    textureScale: 40.0,
    textureFlowDirection: new THREE.Vector2(0.5, 1.0),
    textureFlowSpeed: 0.08,
    variationTextureAssetId: 'noise-a',
    variationScale: 1.3,
    variationFlowDirection: new THREE.Vector2(0.5, 1.0),
    variationFlowSpeed: 0.01,
    waveInfluencedFlow: true,
    waveFlowStrength: 1.2,
    waveFlowFrequency: 1.0,
  },
  terrain: terrainConfig,
  input: inputConfig,
  assets: assetConfig,
  logging: {
    level: 'debug',
    prefix: '[THREE-Play-Demo]',
    timestamp: true,
  },
  dayNight: {
    enabled: true,
    dayLengthSeconds: 30, // 30 seconds for quick demo
    startTimeOfDay: 0.25, // Start at dawn (6 AM)
    colors: {
      ambient: {
        day: 0xfef9e6,
        night: 0x99bbff,
      },
      directional: {
        day: 0xffffff,
        night: 0xffd18b,
      },
      fog: {
        day: 0xe6f3ff, // Light blue-white morning mist
        night: 0x2a3a5c, // Dark blue-grey evening fog
      },
    },
    intensity: {
      ambient: { min: 0.6, max: 0.9 },
      directional: { min: 0.4, max: 1.0 },
    },
    fog: {
      enabled: true,
      density: { min: 0.003, max: 0.012 }, // Visible but not overwhelming
    },
    sunPosition: {
      radius: 100,
      heightOffset: 20,
      zOffset: -40,
      // We'll set the followTarget dynamically in main.ts
    },
    easing: 'ease-in-out', // Use standard easing for smooth day/night transitions
    easingPower: 0.7,
  },
};

export default worldConfig;
