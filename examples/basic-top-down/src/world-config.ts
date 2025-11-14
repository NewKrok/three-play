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
    dayLengthSeconds: 120, // 2 minutes for a full day-night cycle
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
      moon: {
        color: 0xb3d9ff, // Cool moonlight blue
      },
      fog: {
        day: 0xe6f3ff,
        night: 0x2a3a5c,
      },
    },
    intensity: {
      ambient: { min: 0.6, max: 0.9 },
      directional: { min: 0.4, max: 1.0 },
      moon: { min: 0.0, max: 0.7 }, // Subtle but visible moonlight shadows
    },
    fog: {
      enabled: true,
      density: { min: 0.003, max: 0.012 },
    },
    sunPosition: {
      radius: 100,
      heightOffset: 20,
      zOffset: -40,
    },
    moon: {
      enabled: true,
      radius: 80, // Slightly closer for more dramatic shadows
      heightOffset: 25,
      zOffset: 30, // Opposite side from sun
      phaseOffset: 0, // Full moon
    },
    easing: 'ease-in-out',
    easingPower: 0.7,
  },
};

export default worldConfig;
