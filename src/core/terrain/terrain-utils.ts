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
 * @returns Object containing vertex and fragment shader parts
 */
const getShaderFragments = () => {
  const vertexShader = `
    #include <worldpos_vertex>
    vWorldPosition = worldPosition.xyz;
    vUvCustom = uv;
  `;

  const fragmentShaderPart1 = `
    uniform float uWaterLevel;
    uniform sampler2D uSandTexture;
    uniform sampler2D uMudTexture;
    uniform sampler2D uGrassTexture;
    
    // Height ranges for each layer
    uniform float uSandMinHeight;
    uniform float uSandMaxHeight;
    uniform float uMudMinHeight;
    uniform float uMudMaxHeight;
    uniform float uGrassMinHeight;
    uniform float uGrassMaxHeight;
    
    // Blend distances for smooth transitions
    uniform float uBlendDistance;
    
    // Noise configuration
    uniform float uNoiseScale;
    uniform float uNoiseAmplitude;
    uniform float uNoiseOffset;
    
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

  const fragmentShaderPart2 = `
    #include <color_fragment>
    
    float terrainNoise = fbm(vUvCustom * uNoiseScale);
    float terrainVariation = terrainNoise * uNoiseAmplitude + uNoiseOffset;
      
    diffuseColor.rgb += terrainVariation;
    
    float currentHeight = vWorldPosition.y;
    
    // Sample all textures
    vec3 sandTexColor = texture2D(uSandTexture, vUvCustom * 100.0).rgb;
    vec3 mudTexColor = texture2D(uMudTexture, vUvCustom * 80.0).rgb;
    vec3 grassTexColor = texture2D(uGrassTexture, vUvCustom * 128.0).rgb; // Use grass texture from uniform
    
    // Calculate blend weights for each layer based on height ranges
    float sandWeight = 0.0;
    float mudWeight = 0.0;
    float grassWeight = 0.0;
    
    // Sand layer blending
    if (currentHeight >= uSandMinHeight && currentHeight <= uSandMaxHeight) {
      float sandCenter = (uSandMinHeight + uSandMaxHeight) * 0.5;
      float sandRange = (uSandMaxHeight - uSandMinHeight) * 0.5;
      sandWeight = 1.0 - smoothstep(sandRange - uBlendDistance, sandRange, abs(currentHeight - sandCenter));
    }
    
    // Mud layer blending  
    if (currentHeight >= uMudMinHeight && currentHeight <= uMudMaxHeight) {
      float mudCenter = (uMudMinHeight + uMudMaxHeight) * 0.5;
      float mudRange = (uMudMaxHeight - uMudMinHeight) * 0.5;
      mudWeight = 1.0 - smoothstep(mudRange - uBlendDistance, mudRange, abs(currentHeight - mudCenter));
    }
    
    // Grass layer blending
    if (currentHeight >= uGrassMinHeight && currentHeight <= uGrassMaxHeight) {
      float grassCenter = (uGrassMinHeight + uGrassMaxHeight) * 0.5;
      float grassRange = (uGrassMaxHeight - uGrassMinHeight) * 0.5;
      grassWeight = 1.0 - smoothstep(grassRange - uBlendDistance, grassRange, abs(currentHeight - grassCenter));
    }
    
    // Normalize weights to ensure they sum to 1.0
    float totalWeight = sandWeight + mudWeight + grassWeight;
    if (totalWeight > 0.0) {
      sandWeight /= totalWeight;
      mudWeight /= totalWeight;
      grassWeight /= totalWeight;
    } else {
      // Fallback to grass if no other layer is active
      grassWeight = 1.0;
    }
    
    // Blend textures based on weights
    diffuseColor.rgb = sandTexColor * sandWeight + mudTexColor * mudWeight + grassTexColor * grassWeight;
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
  // Use the first layer's texture as the base material texture, or create a basic material
  const firstLayer = config.layers?.[0];
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

  const shaderFragments = getShaderFragments();

  material.onBeforeCompile = (shader) => {
    // Add layer texture uniforms dynamically based on available layers
    const layers = config.layers || [];

    // Find specific layer types
    const sandLayer = layers.find((layer) =>
      layer.textureAssetId.includes('sand'),
    );
    const mudLayer = layers.find((layer) =>
      layer.textureAssetId.includes('mud'),
    );
    const grassLayer = layers.find((layer) =>
      layer.textureAssetId.includes('grass'),
    );

    // Add texture uniforms for each layer type if available
    if (config.layerTextures) {
      if (sandLayer && config.layerTextures[sandLayer.textureAssetId]) {
        shader.uniforms.uSandTexture = {
          value: config.layerTextures[sandLayer.textureAssetId],
        };
      }
      if (mudLayer && config.layerTextures[mudLayer.textureAssetId]) {
        shader.uniforms.uMudTexture = {
          value: config.layerTextures[mudLayer.textureAssetId],
        };
      }
      if (grassLayer && config.layerTextures[grassLayer.textureAssetId]) {
        shader.uniforms.uGrassTexture = {
          value: config.layerTextures[grassLayer.textureAssetId],
        };
      }
    }

    // Layer height uniforms with fallback defaults
    shader.uniforms.uSandMinHeight = {
      value: sandLayer?.minHeight ?? 0.0,
    };
    shader.uniforms.uSandMaxHeight = {
      value: sandLayer?.maxHeight ?? 5.0,
    };

    shader.uniforms.uMudMinHeight = {
      value: mudLayer?.minHeight ?? 5.0,
    };
    shader.uniforms.uMudMaxHeight = {
      value: mudLayer?.maxHeight ?? 10.0,
    };

    shader.uniforms.uGrassMinHeight = {
      value: grassLayer?.minHeight ?? 10.0,
    };
    shader.uniforms.uGrassMaxHeight = {
      value: grassLayer?.maxHeight ?? 100.0,
    };

    // Blend distance uniform
    shader.uniforms.uBlendDistance = {
      value: config.blendDistance ?? 1.5,
    };

    // Noise uniforms
    const noise = config.noise || {};
    shader.uniforms.uNoiseScale = { value: noise.scale ?? 55.0 };
    shader.uniforms.uNoiseAmplitude = { value: noise.amplitude ?? 0.3 };
    shader.uniforms.uNoiseOffset = { value: noise.offset ?? -0.35 };

    // Add custom varyings to vertex shader
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

  return internalConfig;
};
