import * as THREE from 'three';
import type { WaterConfig, WaterInstance } from '../../types/world.js';
import type { HeightmapUtils } from '../../types/heightmap.js';

/**
 * Water fragment shader for realistic water rendering
 */
const WATER_FRAGMENT_SHADER = `
  precision mediump float;

  uniform float uTime;
  uniform vec3 uDeepColor;
  uniform vec3 uShallowColor;
  uniform float uShallowStrength;
  uniform vec3 uFoamColor;
  uniform float uFoamWidth;
  uniform float uFoamStrength;
  uniform sampler2D uTerrainHeightMap;
  uniform float uWaterLevel;
  uniform float uWorldWidth;
  uniform float uWorldHeight;
  uniform float uMaxTerrainHeight;
  uniform float uOpacity;

  varying float vHeight;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vOriginalWorldPos;

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

    for(int i = 0; i < 4; i++) {
      value += amplitude * noise(p * frequency);
      frequency *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 terrainUv = clamp(vec2(
      vOriginalWorldPos.x / uWorldWidth,
      1.0 - vOriginalWorldPos.z / uWorldHeight
    ), 0.0, 1.0);

    float terrainH = texture2D(uTerrainHeightMap, terrainUv).r * uMaxTerrainHeight;
    float effectiveWaterLevel = uWaterLevel + vHeight;
    float depth = effectiveWaterLevel - terrainH;

    float shallowFactor = smoothstep(0.0, 3.0, depth);

    float foamWidth = 2.0;
    float foamFactor = 1.0 - smoothstep(0.0, uFoamWidth, depth);

    vec2 noiseUv = vUv * 8.0 + uTime * 0.15;
    float waterNoise = fbm(noiseUv);

    vec3 waterColor = mix(uDeepColor, uShallowColor, shallowFactor * uShallowStrength);
    waterColor = mix(waterColor, uFoamColor, foamFactor * uFoamStrength);

    waterColor += (waterNoise - 0.5) * 0.25;
    vec3 N = normalize(vNormal);
    vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));
    float fresnel = pow(1.0 - max(dot(N, viewDir), 0.0), 3.0);
    waterColor += vec3(1.0) * 0.2 * fresnel;
    gl_FragColor = vec4(waterColor, uOpacity);
  }
`;

/**
 * Water vertex shader for wave animation
 */
const WATER_VERTEX_SHADER = `
  precision mediump float;

  uniform float uTime;
  uniform float uAmplitude;
  uniform float uFrequency;
  uniform float uSpeed;

  varying vec2 vUv;
  varying float vHeight;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vOriginalWorldPos;

  float heightAt(vec2 uv){
    float t = uTime * uSpeed;
    vec2 uvScaled = uv * 20.0;

    float h1 = sin(dot(uvScaled, vec2(1.0, 1.2)) * uFrequency + t) * 0.15;
    float h2 = sin(dot(uvScaled, vec2(-1.3, 0.7)) * (uFrequency * 0.8) + t * 1.3) * 0.1;
    float h3 = sin(dot(uvScaled, vec2(0.5, -1.5)) * (uFrequency * 1.4) + t * 0.08) * 0.08;
    float h4 = sin(dot(uvScaled, vec2(0.7, 0.3)) * (uFrequency * 1.1) + t * 0.9) * 0.05;

    return (h1 + h2 + h3 + h4) * uAmplitude;
  }

  void main() {
    vUv = uv;
    
    vec4 originalWorldPosition = modelMatrix * vec4(position, 1.0);
    vOriginalWorldPos = originalWorldPosition.xyz;
  
    float h = heightAt(uv);
    vec3 displacedPosition = position;
    displacedPosition.z += h;
    vHeight = h;
    vNormal = normalize(normalMatrix * normal);

    vec4 worldPosition = modelMatrix * vec4(displacedPosition, 1.0);
    vWorldPos = worldPosition.xyz;

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

/**
 * Default water configuration values
 */
const DEFAULT_WATER_CONFIG: Required<WaterConfig> = {
  level: 0,
  deepColor: 0x013a5b,
  shallowColor: 0x2fc7ff,
  shallowStrength: 0.2,
  foamColor: 0xf6f9ff,
  foamWidth: 0.4,
  foamStrength: 0.2,
  opacity: 0.8,
  amplitude: 1.0,
  frequency: 4.0,
  speed: 1.5,
  resolution: 64,
};

/**
 * Create water instance with specified configuration
 */
export const createWaterInstance = (
  config: WaterConfig,
  worldWidth: number,
  worldHeight: number,
  heightmapUtils: HeightmapUtils | null,
): WaterInstance => {
  const finalConfig = { ...DEFAULT_WATER_CONFIG, ...config };

  // Create uniforms for the water shader
  const uniforms = {
    uTime: { value: 0.0 },
    uAmplitude: { value: finalConfig.amplitude },
    uFrequency: { value: finalConfig.frequency },
    uSpeed: { value: finalConfig.speed },
    uDeepColor: { value: new THREE.Color(finalConfig.deepColor) },
    uShallowColor: { value: new THREE.Color(finalConfig.shallowColor) },
    uShallowStrength: { value: finalConfig.shallowStrength },
    uFoamColor: { value: new THREE.Color(finalConfig.foamColor) },
    uFoamWidth: { value: finalConfig.foamWidth },
    uFoamStrength: { value: finalConfig.foamStrength },
    uTerrainHeightMap: {
      value: heightmapUtils?.heightmapData?.heightMapTexture || null,
    },
    uWaterLevel: { value: finalConfig.level },
    uMaxTerrainHeight: {
      value: heightmapUtils?.config?.elevationRatio || 30,
    },
    uWorldWidth: { value: worldWidth },
    uWorldHeight: { value: worldHeight },
    uOpacity: { value: finalConfig.opacity },
  };

  // Create shader material
  const material = new THREE.ShaderMaterial({
    vertexShader: WATER_VERTEX_SHADER,
    fragmentShader: WATER_FRAGMENT_SHADER,
    uniforms,
    side: THREE.DoubleSide,
    transparent: true,
  });

  // Create geometry
  const geometry = new THREE.PlaneGeometry(
    worldWidth,
    worldHeight,
    finalConfig.resolution,
    finalConfig.resolution,
  );

  // Create mesh
  const mesh = new THREE.Mesh(geometry, material);

  // Position the water plane
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(worldWidth / 2, finalConfig.level, worldHeight / 2);

  return {
    mesh,
    uniforms,
    update: (deltaTime: number) => {
      uniforms.uTime.value += deltaTime;
    },
    destroy: () => {
      geometry.dispose();
      material.dispose();
    },
  };
};

/**
 * Water utilities namespace
 */
export const WaterUtils = {
  createWaterInstance,
  DEFAULT_WATER_CONFIG,
} as const;
