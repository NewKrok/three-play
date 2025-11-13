import * as THREE from 'three';
import type { LoadedAssets } from '../../types/assets.js';
import type { HeightmapUtils } from '../../types/heightmap.js';
import type {
  TerrainConfig,
  InternalTerrainConfig,
  TerrainInstance,
  TerrainUtils,
} from '../../types/terrain.js';

/**
 * Get terrain shader fragments for material modification
 *
 * This function generates GLSL shader code fragments that enable multi-layer terrain rendering
 * with height-based texture blending, noise variation, and smooth transitions between layers.
 *
 * @param layerCount - Number of terrain layers to support (minimum 1)
 * @returns Object containing vertex and fragment shader parts for terrain material
 */
const getShaderFragments = (layerCount: number) => {
  // Vertex shader fragment for world position and UV coordinates
  const vertexShader = `
    #include <worldpos_vertex>
    vWorldPosition = worldPosition.xyz;
    vUvCustom = uv;
  `;

  // Generate dynamic uniform declarations for each terrain layer
  // Each layer needs texture, height range, and scale uniforms
  const layerUniformDeclarations = Array.from(
    { length: layerCount },
    (_, i) => `
    uniform sampler2D uLayerTexture${i};
    uniform float uLayerMinHeight${i};
    uniform float uLayerMaxHeight${i};
    uniform float uLayerTextureScale${i};
  `,
  ).join('');

  // First part of fragment shader with uniforms and utilities
  const fragmentShaderPart1 = `
    uniform float uWaterLevel;
    ${layerUniformDeclarations}
    
    // Number of terrain layers for dynamic blending
    uniform int uLayerCount;
    
    // Blend distance for smooth height-based transitions between layers
    uniform float uBlendDistance;
    
    // Noise configuration uniforms for terrain variation
    uniform sampler2D uNoiseTexture;
    uniform float uNoiseScale;
    uniform float uNoiseAmplitude;
    uniform float uNoiseOffset;
    uniform bool uUseNoiseTexture;
    
    // Varying variables passed from vertex shader
    varying vec3 vWorldPosition;
    varying vec2 vUvCustom;
  `;

  // Generate dynamic layer blending code for height-based texture transitions
  const layerBlendingCode = Array.from(
    { length: layerCount },
    (_, i) => `
    // Layer ${i} height-based blending calculation
    float layer${i}Weight = 0.0;
    if (currentHeight >= uLayerMinHeight${i} && currentHeight <= uLayerMaxHeight${i}) {
      float layerCenter = (uLayerMinHeight${i} + uLayerMaxHeight${i}) * 0.5;
      float layerRange = (uLayerMaxHeight${i} - uLayerMinHeight${i}) * 0.5;
      layer${i}Weight = 1.0 - smoothstep(layerRange - uBlendDistance, layerRange, abs(currentHeight - layerCenter));
    }
  `,
  ).join('');

  // Generate texture sampling code for each layer with individual scaling
  const layerTexturesampling = Array.from(
    { length: layerCount },
    (_, i) => `
    vec3 layer${i}Color = texture2D(uLayerTexture${i}, vUvCustom * uLayerTextureScale${i}).rgb;
  `,
  ).join('');

  // Create expression for summing all layer weights for normalization
  const layerWeightSum = Array.from(
    { length: layerCount },
    (_, i) => `layer${i}Weight`,
  ).join(' + ');

  // Generate code to normalize weights so they sum to 1.0
  const layerNormalization = Array.from(
    { length: layerCount },
    (_, i) => `
    layer${i}Weight /= totalWeight;
  `,
  ).join('');

  // Generate final color blending expression combining all layers
  const layerBlending =
    layerCount > 0
      ? Array.from({ length: layerCount }, (_, i) =>
          i === 0
            ? `layer${i}Color * layer${i}Weight`
            : ` + layer${i}Color * layer${i}Weight`,
        ).join('')
      : 'vec3(0.5, 0.5, 0.5)'; // Fallback gray color when no layers

  // Second part of fragment shader handling terrain noise and final color calculation
  const fragmentShaderPart2 = `
    // Calculate terrain noise variation using provided noise texture
    float terrainNoise = 0.0;
    if (uUseNoiseTexture) {
      terrainNoise = texture2D(uNoiseTexture, vUvCustom * uNoiseScale).r;
    }
    float terrainVariation = terrainNoise * uNoiseAmplitude + uNoiseOffset;
    
    #include <color_fragment>
    
    // Get current world height for layer blending calculations
    float currentHeight = vWorldPosition.y;
    
    // Sample all layer textures with their respective scaling
    ${layerTexturesampling}
    
    // Calculate blend weights for each layer based on height ranges and blend distance
    ${layerBlendingCode}
    
    // Normalize weights to ensure they sum to 1.0 for proper blending
    float totalWeight = ${layerWeightSum || '0.0'};
    if (totalWeight > 0.0) {
      ${layerNormalization}
    } else {
      // Fallback to first layer if no other layer is active
      ${layerCount > 0 ? 'layer0Weight = 1.0;' : '// No layers available'}
    }
    
    // Blend textures based on calculated weights FIRST
    diffuseColor.rgb = ${layerBlending};
    
    // THEN apply terrain variation as brightness modulation for realistic surface detail
    // Convert variation to a brightness factor: 0.0 = dark, 1.0 = normal, >1.0 = bright
    float brightnessFactor = 1.0 + terrainVariation;
    brightnessFactor = clamp(brightnessFactor, 0.1, 2.0); // Prevent complete black or excessive brightness
    diffuseColor.rgb *= brightnessFactor;
  `;

  return {
    vertexShader,
    fragmentShaderPart1,
    fragmentShaderPart2,
  };
};

/**
 * Create terrain material with shader modifications
 * @param config - Internal terrain configuration with loaded textures
 * @returns Configured terrain material
 */
const createTerrainMaterial = (
  config: InternalTerrainConfig,
): THREE.MeshStandardMaterial => {
  const layers = config.layers || [];
  const layerCount = Math.max(1, layers.length); // Ensure at least 1 layer

  // Use the first layer's texture as the base material texture, or create a basic material
  const firstLayer = layers[0];
  const firstLayerTexture =
    config.layerTextures && firstLayer
      ? config.layerTextures[firstLayer.textureAssetId]
      : null;

  const material = new THREE.MeshStandardMaterial({
    map: firstLayerTexture || null,
  });

  // Apply the first layer's texture scale if available
  if (firstLayerTexture && firstLayer?.textureScale) {
    firstLayerTexture.repeat.set(
      firstLayer.textureScale,
      firstLayer.textureScale,
    );
  }

  const shaderFragments = getShaderFragments(layerCount);

  material.onBeforeCompile = (shader) => {
    // Add dynamic layer uniforms based on the layers array
    layers.forEach((layer, index) => {
      // Add texture uniform
      if (config.layerTextures && config.layerTextures[layer.textureAssetId]) {
        shader.uniforms[`uLayerTexture${index}`] = {
          value: config.layerTextures[layer.textureAssetId],
        };
      }

      // Add height range uniforms
      shader.uniforms[`uLayerMinHeight${index}`] = {
        value: layer.minHeight,
      };
      shader.uniforms[`uLayerMaxHeight${index}`] = {
        value: layer.maxHeight,
      };

      // Add texture scale uniform
      shader.uniforms[`uLayerTextureScale${index}`] = {
        value: layer.textureScale || 100.0,
      };
    });

    // Add layer count uniform
    shader.uniforms.uLayerCount = {
      value: layerCount,
    };

    // Blend distance uniform
    shader.uniforms.uBlendDistance = {
      value: config.blendDistance ?? 1.5,
    };

    // Noise uniforms
    const noise = config.noise || {};
    const hasNoiseTexture = config.noiseTexture !== undefined;

    // Support both 'strength' and 'amplitude' for backwards compatibility
    const noiseStrength = noise.strength ?? noise.amplitude ?? 0.2;

    shader.uniforms.uNoiseTexture = { value: config.noiseTexture || null };
    shader.uniforms.uUseNoiseTexture = { value: hasNoiseTexture };
    shader.uniforms.uNoiseScale = { value: noise.scale ?? 1.0 };
    shader.uniforms.uNoiseAmplitude = { value: noiseStrength };
    shader.uniforms.uNoiseOffset = { value: noise.offset ?? 0.0 }; // Add custom varyings to vertex shader
    shader.vertexShader =
      'varying vec3 vWorldPosition;\nvarying vec2 vUvCustom;\n' +
      shader.vertexShader;

    // Replace worldpos_vertex include
    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      shaderFragments.vertexShader,
    );

    // Add fragment shader parts
    shader.fragmentShader =
      shaderFragments.fragmentShaderPart1 + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      shaderFragments.fragmentShaderPart2,
    );

    // Apply terrain noise effect
    const lastBraceIndex = shader.fragmentShader.lastIndexOf('}');
    if (lastBraceIndex !== -1) {
      // No debug colors, just the noise effect
      shader.fragmentShader =
        shader.fragmentShader.slice(0, lastBraceIndex) +
        shader.fragmentShader.slice(lastBraceIndex);
    }
  };

  return material;
};

/**
 * Create terrain mesh with heightmap applied
 * @param config - Internal terrain configuration
 * @param worldWidth - World width in units
 * @param worldHeight - World height in units
 * @param heightmapResolution - Resolution of the heightmap
 * @param heightmapUtils - Heightmap utilities for applying elevation
 * @returns Configured terrain mesh
 */
const createTerrainMesh = (
  config: InternalTerrainConfig,
  worldWidth: number,
  worldHeight: number,
  heightmapResolution: number,
  heightmapUtils: HeightmapUtils,
): THREE.Mesh => {
  // Create terrain geometry
  const geometry = new THREE.PlaneGeometry(
    worldWidth,
    worldHeight,
    heightmapResolution - 1,
    heightmapResolution - 1,
  );

  // Apply heightmap to geometry
  heightmapUtils.applyHeightmapToGeometry(geometry);

  // Rotate and update geometry
  geometry.rotateX(-Math.PI / 2);
  geometry.attributes.position.needsUpdate = true;
  geometry.computeVertexNormals();

  // Create material
  const material = createTerrainMaterial(config);

  // Create mesh
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = config.castShadow ?? true;
  mesh.receiveShadow = config.receiveShadow ?? true;
  mesh.position.x = worldWidth / 2;
  mesh.position.z = worldHeight / 2;

  return mesh;
};

/**
 * Create terrain instance with the provided configuration
 * @param config - Terrain configuration
 * @param worldWidth - World width in units
 * @param worldHeight - World height in units
 * @param heightmapResolution - Resolution of the heightmap
 * @param heightmapUtils - Heightmap utilities for terrain generation
 * @returns Terrain instance
 */
export const createTerrainInstance = (
  config: InternalTerrainConfig,
  worldWidth: number,
  worldHeight: number,
  heightmapResolution: number,
  heightmapUtils: HeightmapUtils,
): TerrainInstance => {
  const mesh = createTerrainMesh(
    config,
    worldWidth,
    worldHeight,
    heightmapResolution,
    heightmapUtils,
  );

  return {
    mesh,

    getMaterial(): THREE.MeshStandardMaterial {
      return mesh.material as THREE.MeshStandardMaterial;
    },

    updateConfig(newConfig: Partial<TerrainConfig>): void {
      // Update configuration (would need to recreate material for full updates)
      // Note: Full implementation would require recreating material
      Object.assign(config, newConfig);
    },

    destroy(): void {
      // Dispose geometry
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }

      // Dispose material
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => mat.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    },
  };
};

/**
 * Create terrain utilities
 * @returns Terrain utilities object
 */
export const createTerrainUtils = (): TerrainUtils => {
  return {
    createTerrainMesh,
    createTerrainMaterial,
    getShaderFragments,
  };
};

/**
 * Prepare terrain configuration with loaded textures from assets
 * @param config - Base terrain configuration
 * @param assets - Loaded assets containing textures
 * @returns Internal terrain configuration with loaded textures
 */
export const prepareTerrainConfig = (
  config: TerrainConfig,
  assets: LoadedAssets,
): InternalTerrainConfig => {
  const internalConfig: InternalTerrainConfig = { ...config };

  // Load layer textures
  if (config.layers && assets.textures) {
    internalConfig.layerTextures = {};

    config.layers.forEach((layer) => {
      const texture = assets.textures[layer.textureAssetId];
      if (texture) {
        // Use the asset ID as the key
        internalConfig.layerTextures![layer.textureAssetId] = texture;

        // Apply layer texture scaling (preserve original wrapping settings)
        if (layer.textureScale) {
          texture.repeat.set(layer.textureScale, layer.textureScale);
        }
      }
    });
  }

  // Load noise texture if specified
  if (config.noise?.textureAssetId && assets.textures) {
    const noiseTexture = assets.textures[config.noise.textureAssetId];
    if (noiseTexture) {
      internalConfig.noiseTexture = noiseTexture;
    }
  }

  return internalConfig;
};
