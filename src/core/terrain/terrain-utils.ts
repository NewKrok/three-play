import * as THREE from 'three';
import type {
  TerrainConfig,
  InternalTerrainConfig,
  TerrainInstance,
  TerrainUtils,
} from '../../types/terrain.js';
import type { HeightmapUtils } from '../../types/heightmap.js';
import type { LoadedAssets } from '../../types/assets.js';

/**
 * Get terrain shader fragments for material modification
 * @param layerCount - Number of terrain layers to support
 * @returns Object containing vertex and fragment shader parts
 */
const getShaderFragments = (layerCount: number) => {
  const vertexShader = `
    #include <worldpos_vertex>
    vWorldPosition = worldPosition.xyz;
    vUvCustom = uv;
  `;

  // Generate dynamic uniform declarations for layers
  const layerUniformDeclarations = Array.from(
    { length: layerCount },
    (_, i) => `
    uniform sampler2D uLayerTexture${i};
    uniform float uLayerMinHeight${i};
    uniform float uLayerMaxHeight${i};
    uniform float uLayerTextureScale${i};
  `,
  ).join('');

  const fragmentShaderPart1 = `
    uniform float uWaterLevel;
    ${layerUniformDeclarations}
    
    // Number of layers
    uniform int uLayerCount;
    
    // Blend distances for smooth transitions
    uniform float uBlendDistance;
    
    // Noise configuration
    uniform sampler2D uNoiseTexture;
    uniform float uNoiseScale;
    uniform float uNoiseAmplitude;
    uniform float uNoiseOffset;
    uniform bool uUseNoiseTexture;
    
    varying vec3 vWorldPosition;
    varying vec2 vUvCustom;
      
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
      
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
        
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
        
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    
    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 1.0;
        
      for(int i = 0; i < 3; i++) {
        value += amplitude * noise(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
      }
      return value;
    }
  `;

  // Generate dynamic layer blending code
  const layerBlendingCode = Array.from(
    { length: layerCount },
    (_, i) => `
    // Layer ${i} blending
    float layer${i}Weight = 0.0;
    if (currentHeight >= uLayerMinHeight${i} && currentHeight <= uLayerMaxHeight${i}) {
      float layerCenter = (uLayerMinHeight${i} + uLayerMaxHeight${i}) * 0.5;
      float layerRange = (uLayerMaxHeight${i} - uLayerMinHeight${i}) * 0.5;
      layer${i}Weight = 1.0 - smoothstep(layerRange - uBlendDistance, layerRange, abs(currentHeight - layerCenter));
    }
  `,
  ).join('');

  const layerTexturesampling = Array.from(
    { length: layerCount },
    (_, i) => `
    vec3 layer${i}Color = texture2D(uLayerTexture${i}, vUvCustom * uLayerTextureScale${i}).rgb;
  `,
  ).join('');

  const layerWeightSum = Array.from(
    { length: layerCount },
    (_, i) => `layer${i}Weight`,
  ).join(' + ');

  const layerNormalization = Array.from(
    { length: layerCount },
    (_, i) => `
    layer${i}Weight /= totalWeight;
  `,
  ).join('');

  const layerBlending =
    layerCount > 0
      ? Array.from({ length: layerCount }, (_, i) =>
          i === 0
            ? `layer${i}Color * layer${i}Weight`
            : ` + layer${i}Color * layer${i}Weight`,
        ).join('')
      : 'vec3(0.5, 0.5, 0.5)'; // Fallback gray color

  const fragmentShaderPart2 = `
    // Calculate terrain noise - use texture if available, otherwise use procedural
    float terrainNoise;
    if (uUseNoiseTexture) {
      terrainNoise = texture2D(uNoiseTexture, vUvCustom * uNoiseScale).r;
    } else {
      terrainNoise = fbm(vUvCustom * uNoiseScale);
    }
    float terrainVariation = terrainNoise * uNoiseAmplitude + uNoiseOffset;
    
    #include <color_fragment>
    
    float currentHeight = vWorldPosition.y;
    
    // Sample all layer textures
    ${layerTexturesampling}
    
    // Calculate blend weights for each layer based on height ranges
    ${layerBlendingCode}
    
    // Normalize weights to ensure they sum to 1.0
    float totalWeight = ${layerWeightSum || '0.0'};
    if (totalWeight > 0.0) {
      ${layerNormalization}
    } else {
      // Fallback to first layer if no other layer is active
      ${layerCount > 0 ? 'layer0Weight = 1.0;' : '// No layers available'}
    }
    
    // Blend textures based on weights FIRST
    diffuseColor.rgb = ${layerBlending};
    
    // THEN apply terrain variation as brightness modulation
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

    console.log('Final fragment shader:', shader.fragmentShader);
    console.log('Vertex shader:', shader.vertexShader);
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
      Object.assign(config, newConfig);
      console.warn('Terrain config update not fully implemented yet');
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
          // Don't override wrapping - use the original settings from assets config
        }
      }
    });
  }

  // Load noise texture if specified
  if (config.noise?.textureAssetId && assets.textures) {
    console.log('Looking for noise texture:', config.noise.textureAssetId);
    const noiseTexture = assets.textures[config.noise.textureAssetId];
    if (noiseTexture) {
      console.log('Found noise texture:', noiseTexture);
      internalConfig.noiseTexture = noiseTexture;
    } else {
      console.warn('Noise texture not found:', config.noise.textureAssetId);
    }
  } else {
    console.log('No noise texture specified or no assets.textures');
  }

  return internalConfig;
};
