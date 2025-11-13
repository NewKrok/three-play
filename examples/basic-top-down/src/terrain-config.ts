import type { TerrainConfig } from '@newkrok/three-play';
import { WATER_LEVEL } from './constants.js';

const terrainConfig: TerrainConfig = {
  layers: [
    {
      textureAssetId: 'sand',
      minHeight: 0.0,
      maxHeight: WATER_LEVEL + 1.5,
      textureScale: 100.0,
    },
    {
      textureAssetId: 'mud',
      minHeight: WATER_LEVEL + 0.5,
      maxHeight: WATER_LEVEL + 2.5,
      textureScale: 80.0,
    },
    {
      textureAssetId: 'grass',
      minHeight: WATER_LEVEL + 1.0,
      maxHeight: WATER_LEVEL + 25.0,
      textureScale: 512 / 4, // WORLD_WIDTH / 4
    },
  ],
  blendDistance: 1.5,
  noise: {
    textureAssetId: 'noise-a',
    scale: 30,
    strength: 0.8,
    offset: -0.5,
  },
};

export default terrainConfig;
