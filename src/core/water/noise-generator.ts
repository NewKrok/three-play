import * as THREE from 'three';

/**
 * Generate a procedural noise texture for water effects
 */
export const generateNoiseTexture = (
  size: number = 256,
  scale: number = 8,
): THREE.Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to get 2D context from canvas');
  }

  const imageData = context.createImageData(size, size);
  const data = imageData.data;

  // Simple noise generation using Math.random with smoothing
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = (y * size + x) * 4;

      // Generate noise value
      const noiseValue = Math.random();

      // Apply some basic smoothing by averaging with neighbors
      let smoothedValue = noiseValue;
      if (x > 0 && y > 0 && x < size - 1 && y < size - 1) {
        const neighborSum =
          data[((y - 1) * size + x) * 4] / 255 +
          data[(y * size + (x - 1)) * 4] / 255;
        smoothedValue = (noiseValue + neighborSum * 0.3) / 1.6;
      }

      // Scale the noise
      const scaledValue = Math.pow(smoothedValue, 1.0 / scale) * 255;

      // Set RGB values (grayscale noise)
      data[index] = scaledValue; // Red
      data[index + 1] = scaledValue; // Green
      data[index + 2] = scaledValue; // Blue
      data[index + 3] = 255; // Alpha
    }
  }

  context.putImageData(imageData, 0, 0);

  // Create Three.js texture from canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;

  return texture;
};

/**
 * Generate a Perlin-like noise texture using multiple octaves
 */
export const generatePerlinNoiseTexture = (
  size: number = 256,
  octaves: number = 4,
  persistence: number = 0.5,
): THREE.Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to get 2D context from canvas');
  }

  const imageData = context.createImageData(size, size);
  const data = imageData.data;

  // Simple hash function for pseudo-random values
  const hash = (x: number, y: number): number => {
    let h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return h - Math.floor(h);
  };

  // Interpolation function
  const lerp = (a: number, b: number, t: number): number => {
    return a + t * (b - a);
  };

  // Noise function at given coordinates
  const noise = (x: number, y: number): number => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;

    const a = hash(ix, iy);
    const b = hash(ix + 1, iy);
    const c = hash(ix, iy + 1);
    const d = hash(ix + 1, iy + 1);

    const i1 = lerp(a, b, fx);
    const i2 = lerp(c, d, fx);

    return lerp(i1, i2, fy);
  };

  // Generate fractal noise
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = (y * size + x) * 4;

      let value = 0;
      let amplitude = 1;
      let frequency = 1;
      let maxValue = 0;

      for (let i = 0; i < octaves; i++) {
        value +=
          noise((x * frequency) / size, (y * frequency) / size) * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= 2;
      }

      value /= maxValue;
      const colorValue = Math.floor(value * 255);

      data[index] = colorValue; // Red
      data[index + 1] = colorValue; // Green
      data[index + 2] = colorValue; // Blue
      data[index + 3] = 255; // Alpha
    }
  }

  context.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;

  return texture;
};

/**
 * Noise generator utilities namespace
 */
export const NoiseGenerator = {
  generateNoiseTexture,
  generatePerlinNoiseTexture,
} as const;
