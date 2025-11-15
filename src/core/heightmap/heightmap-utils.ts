import { GeomUtils } from '@newkrok/three-utils';
import * as THREE from 'three';
import type {
  HeightmapData,
  HeightmapConfig,
  HeightmapUtils as HeightmapUtilsType,
  HeightmapPosition,
  ResolutionRatio,
} from '../../types/heightmap.js';

/**
 * Load heightmap data from a texture
 * @param texture - The loaded Three.js texture
 * @returns Heightmap data extracted from the texture
 */
export const loadFromTexture = (texture: THREE.Texture): HeightmapData => {
  const img = texture.image;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get 2D rendering context');
  }

  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, img.width, img.height);
  const data = imageData.data;

  const heights = new Float32Array(img.width * img.height);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    heights[j] = data[i] / 255;
  }

  return { heightmap: heights, heightMapTexture: texture };
};

/**
 * Create heightmap utilities from loaded data and configuration
 * @param heightmapData - The loaded heightmap data
 * @param config - Heightmap configuration
 * @returns Heightmap utility functions and data
 */
export const createHeightmapUtils = (
  heightmapData: HeightmapData,
  config: HeightmapConfig,
): HeightmapUtilsType => {
  const { heightmap } = heightmapData;
  const { worldWidth, worldHeight, resolution, elevationRatio } = config;

  const resolutionRatio: ResolutionRatio = {
    width: worldWidth / (resolution - 1),
    depth: worldHeight / (resolution - 1),
  };

  /**
   * Round world position to heightmap coordinates
   */
  const roundPosition = ({
    x,
    z,
  }: {
    x: number;
    z: number;
  }): HeightmapPosition => ({
    x: Math.floor(x / resolutionRatio.width),
    z: Math.floor(z / resolutionRatio.depth),
  });

  /**
   * Convert heightmap coordinates to array index
   */
  const positionToHeightMapIndex = (x: number, z: number): number =>
    x + z * resolution;

  /**
   * Get height at a specific world position using bilinear interpolation
   */
  const getHeightFromPosition = (position: THREE.Vector3): number => {
    const roundedPosition = roundPosition(position);
    const convertedPosition = {
      x: roundedPosition.x * resolutionRatio.width,
      z: roundedPosition.z * resolutionRatio.depth,
    };

    // Get the four corner points of the heightmap quad
    const pLT = new THREE.Vector3(
      convertedPosition.x,
      heightmap[
        positionToHeightMapIndex(roundedPosition.x, roundedPosition.z)
      ] || position.y,
      convertedPosition.z,
    );
    const pRT = new THREE.Vector3(
      convertedPosition.x + resolutionRatio.width,
      heightmap[
        positionToHeightMapIndex(roundedPosition.x + 1, roundedPosition.z)
      ] || position.y,
      convertedPosition.z,
    );
    const pLB = new THREE.Vector3(
      convertedPosition.x,
      heightmap[
        positionToHeightMapIndex(roundedPosition.x, roundedPosition.z + 1)
      ] || position.y,
      convertedPosition.z + resolutionRatio.depth,
    );
    const pRB = new THREE.Vector3(
      convertedPosition.x + resolutionRatio.width,
      heightmap[
        positionToHeightMapIndex(roundedPosition.x + 1, roundedPosition.z + 1)
      ] || position.y,
      convertedPosition.z + resolutionRatio.depth,
    );

    // Determine which triangle the position is in and calculate height
    const triangleCheckA = GeomUtils.isPointInATriangle(
      position,
      pLT,
      pRT,
      pLB,
    );
    const triangleCheckB = GeomUtils.isPointInATriangle(
      position,
      pRT,
      pRB,
      pLB,
    );

    if (triangleCheckA) {
      return GeomUtils.yFromTriangle(position, pLT, pRT, pLB) * elevationRatio;
    } else if (triangleCheckB) {
      return GeomUtils.yFromTriangle(position, pRT, pRB, pLB) * elevationRatio;
    }

    return 0;
  };

  /**
   * Get a random position above a minimum height
   */
  const getPositionByHeight = (
    minHeight: number,
  ): { x: number; y: number; z: number } | null => {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      attempts++;

      const x = Math.random() * worldWidth;
      const z = Math.random() * worldHeight;
      const y = getHeightFromPosition(new THREE.Vector3(x, 0, z));

      if (y > minHeight) return { x, y, z };
    }

    return null;
  };

  /**
   * Apply heightmap data to a PlaneGeometry
   */
  const applyHeightmapToGeometry = (geometry: THREE.PlaneGeometry): void => {
    const vertices = geometry.attributes.position.array as Float32Array;

    for (let i = 0, j = 0, l = vertices.length / 3; i < l; i++, j += 3) {
      vertices[j + 2] = heightmap[i] * elevationRatio;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  };

  return {
    getHeightFromPosition,
    getPositionByHeight,
    applyHeightmapToGeometry,
    heightmapData,
    config,
  };
};

/**
 * Heightmap utility namespace
 */
export const HeightmapUtils = {
  loadFromTexture,
  createHeightmapUtils,
};
