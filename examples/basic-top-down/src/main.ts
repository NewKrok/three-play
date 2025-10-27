import { createWorld } from '@newkrok/three-play';
import {
  updateParticleSystems,
  createParticleSystem,
} from 'https://esm.sh/@newkrok/three-particles';
import {
  CSS2DRenderer,
  CSS2DObject,
} from 'https://esm.sh/three/examples/jsm/renderers/CSS2DRenderer.js';
import * as SkeletonUtils from 'https://esm.sh/three/examples/jsm/utils/SkeletonUtils.js';

import * as THREE from 'three';
import { runningEffect, dustEffect, splashEffect } from './effects-config.js';
import assetConfig from './assets-config.js';

/**
 * @typedef {Object} GameState
 * @property {number} collectedApples
 * @property {number} score
 * @property {number} health
 * @property {number} stamina
 */

/**
 * @typedef {Object} Keys
 * @property {boolean} [key]
 */

// Initialize THREE Play engine
console.log('Starting game with THREE Play engine');

const terrainFragmentShaderPart1 = `
  uniform float uWaterLevel;
  uniform float uSandBlendDistance;
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

const terrainFragmentShaderPart2 = `
  #include <color_fragment>
  
  float terrainNoise = fbm(vUvCustom * 55.0);
  float terrainVariation = terrainNoise * 0.3 - 0.35;
    
  diffuseColor.rgb += terrainVariation;
  
  float sandNoise1 = noise(vUvCustom * 50.0);
  float sandNoise2 = noise(vUvCustom * 100.0) * 0.5;
  float sandVariation = sandNoise1 * 0.7 + sandNoise2 * 0.3;
    
  vec3 sandBase = vec3(0.96, 0.87, 0.70);
  vec3 sandColor = sandBase * (0.8 + sandVariation * 0.4);
    
  float heightAboveWater = vWorldPosition.y - uWaterLevel;
  float sandBlend = 1.0 - smoothstep(0.0, uSandBlendDistance, heightAboveWater);
    
  diffuseColor.rgb = mix(diffuseColor.rgb, sandColor, sandBlend);
`;

const terrainVertexShader = `
  #include <worldpos_vertex>
  vWorldPosition = worldPosition.xyz;
  vUvCustom = uv;
`;

const WaterFragmentShader = `
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

const WaterVertexShader = `
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

const WALK_SPEED = 5;
const RUN_SPEED = 10;
const ROLL_SPEED = 5;
const FAST_ROLL_SPEED = 10;
const WATER_SPEED_MULTIPLIER = 0.4;
const WATER_SPEED_LEVEL = 7.8;
const ENEMY_SPEED = 5;
const WORLD_WIDTH = 512;
const WORLD_HEIGHT = 512;
const HEIGHT_MAP_RESOLUTION = 256;
const ELEVATION_RATIO = 30;
const DISTANCE_FROM_CAMERA = 16;
const ROCK_COUNT = 1000;
const TREE_COUNT = 1000;
const CRATE_COUNT = 100;
const TREE_COLLISION_RADIUS = 1.5;
const CRATE_COLLISION_RADIUS = 1.2;
const CRATE_INTERACTION_RADIUS = 3.0; // New radius for outline interaction
const MIN_APPLES_PER_TREE = 2;
const MAX_APPLES_PER_TREE = 6;
const ENEMY_COUNT = 20;
const APPLE_HIT_RADIUS = 1;
const APPLE_PUSH_FORCE = 25;
const MAX_STAMINA = 10.0;
const STAMINA_RECOVERY = 1;
const STAMINA_DRAIN = 2;
const MAX_HEALTH = 100.0;
const HEALTH_RECOVERY = 0.5;
let timeOfDay = 0;
const DAY_LENGTH = 1200;
const WATER_LEVEL = 7.8;
const startingPosition = new THREE.Vector3(88, 0, 132);

const appleEffects = [
  { health: { min: 5, max: 10 } },
  { stamina: { min: 5, max: 30 } },
];

const crateEffects = [
  { health: { min: 50, max: 100 } },
  { stamina: { min: 25, max: 50 } },
  { ammo: { min: 10, max: 25 } },
  { speedBonus: { min: 1.2, max: 1.5 } },
  { damageBonus: { min: 1.5, max: 3.0 } },
];

let direction = 0;
let units = [];
let trees = [];
let apples = [];
let crates = [];
let nearbyCreateOutlines = new Map(); // Track crate outlines by crate index
let crateProxyMeshes = new Map(); // Individual meshes for outlined crates
let lastThrowTime = 0;
let lastRollTime = 0;
let isRolling = false;
const throwCooldown = 250;
const rollCooldown = 500;
const gravity = new THREE.Vector3(0, -9.8, 0);
const throwStrength = 15;
const throwSpread = 0.2;
const keys = {};
const charactersWorldDirection = new THREE.Vector3();
const correctedDir = new THREE.Vector3();
const rotationTargetQuaternion = new THREE.Quaternion();
const dummy = new THREE.Object3D();

/** @type {GameState} */
const gameState = {
  collectedApples: 0,
  score: 0,
  health: MAX_HEALTH / 2,
  stamina: MAX_STAMINA,
};

const tutorial = document.getElementById('tutorial');
const startBtn = document.getElementById('startBtn');

startBtn.addEventListener('click', () => {
  tutorial.classList.add('hidden');

  setTimeout(() => tutorial.remove(), 400);
});

const updateAppleCount = () => {
  const apples = document.querySelector('.apples');
  const countEl = document.getElementById('apple-count');
  countEl.textContent = gameState.collectedApples;

  apples.classList.add('updated');
  setTimeout(() => apples.classList.remove('updated'), 300);
};

const updateScore = () => {
  const scoreWrapper = document.querySelector('.score-wrapper');
  const scoreEl = document.getElementById('score');
  scoreEl.textContent = gameState.score;

  scoreWrapper.classList.add('updated');
  setTimeout(() => scoreWrapper.classList.remove('updated'), 300);
};

const updateStaminaUi = () => {
  const bar = document.getElementById('stamina-bar');
  const container = document.getElementById('stamina-container');

  const pct = Math.max(0, Math.min(1, gameState.stamina / MAX_STAMINA));
  const pctInt = Math.round(pct * 100);

  bar.style.transform = `scaleX(${pct})`;
  bar.style.setProperty('--s', pct);
};

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
document.body.appendChild(labelRenderer.domElement);

/**
 * Show floating label at position
 * @param {Object} params
 * @param {string} params.text
 * @param {THREE.Vector3} params.position
 * @param {number} [params.duration=1000]
 */
const playAnimation = (unit, animationName, fadeDuration = 0.2) => {
  if (unit.userData.currentAnimationName === animationName) return;

  unit.userData.lastAnimationName = unit.userData.currentAnimationName;
  unit.userData.currentAnimationName = animationName;
  if (unit.userData.lastAnimationName) {
    unit.actions[animationName]
      .reset()
      .crossFadeFrom(
        unit.actions[unit.userData.lastAnimationName],
        fadeDuration,
        true,
      );
  }

  unit.actions[animationName].play();
};

const createCinematicCameraController = (
  camera,
  sequence = [],
  onComplete = null,
) => {
  let currentIndex = 0;
  let currentTime = 0;
  let playing = false;
  let currentStep = null;

  const play = () => {
    if (sequence.length === 0) return;

    playing = true;
    currentIndex = 0;
    currentTime = 0;
    currentStep = sequence[0];

    if (currentStep.from) {
      camera.position.copy(currentStep.from);
    } else {
      currentStep.from = camera.position.clone();
    }
  };

  const stop = () => {
    playing = false;
  };

  const update = (delta) => {
    if (!playing || !currentStep) return;

    const step = currentStep;
    const duration = step.duration ?? 1;
    const wait = step.wait ?? 0;
    currentTime += delta;

    const t = Math.min(currentTime / duration, 1);
    const smoothT = t * t * (3 - 2 * t);

    if (step.from && step.to) {
      camera.position.lerpVectors(step.from, step.to, smoothT);
    }

    let lookTarget;
    if (step.lookAtFrom && step.lookAtTo) {
      lookTarget = new THREE.Vector3().lerpVectors(
        step.lookAtFrom,
        step.lookAtTo,
        smoothT,
      );
    } else if (step.lookAt) {
      lookTarget = step.lookAt;
    } else if (step.to && step.from) {
      const forward = new THREE.Vector3()
        .subVectors(step.to, step.from)
        .normalize();
      lookTarget = new THREE.Vector3().addVectors(camera.position, forward);
    } else {
      lookTarget = new THREE.Vector3(
        camera.position.x,
        camera.position.y,
        camera.position.z - 1,
      );
    }

    const targetQuat = new THREE.Quaternion();
    const currentQuat = camera.quaternion.clone();
    const lookMatrix = new THREE.Matrix4();

    lookMatrix.lookAt(camera.position, lookTarget, camera.up);
    targetQuat.setFromRotationMatrix(lookMatrix);

    camera.quaternion.slerpQuaternions(currentQuat, targetQuat, 0.1);

    if (currentTime >= duration + wait) {
      currentIndex++;
      if (currentIndex < sequence.length) {
        currentStep = sequence[currentIndex];
        currentTime = 0;

        if (!currentStep.from) {
          currentStep.from = camera.position.clone();
        } else {
          camera.position.copy(currentStep.from);
        }
      } else {
        stop();
        if (onComplete) onComplete();
      }
    }
  };

  const isPlaying = () => playing;

  return {
    play,
    stop,
    update,
    isPlaying,
  };
};

// Create THREE Play world instance with assets
const worldInstance = createWorld({
  world: {
    size: {
      x: WORLD_WIDTH,
      y: WORLD_HEIGHT,
    },
  },
  render: {
    useComposer: true,
  },
  light: {
    ambient: {
      color: 0xffffff,
      intensity: 0.9,
    },
    directional: {
      color: 0xffffff,
      intensity: 0.5,
    },
  },
  heightmap: {
    url: 'https://newkrok.com/external-assets/heightmap-island-256.webp',
    resolution: HEIGHT_MAP_RESOLUTION,
    elevationRatio: ELEVATION_RATIO,
  },
  assets: assetConfig, // Add assets configuration
});

// Add progress tracking for asset loading
worldInstance.onProgress((progress) => {
  console.log(`Loading assets: ${progress.percentage}%`);
  console.log(
    `Textures: ${progress.loadedTextures.current}/${progress.loadedTextures.total}`,
  );
  console.log(
    `Models: ${progress.loadedModels.current}/${progress.loadedModels.total}`,
  );
});

// Add ready callback for when assets are loaded
worldInstance.onReady((assets) => {
  console.log('All assets loaded successfully!', assets);

  // Get references to Three.js components
  const renderer = worldInstance.getRenderer();
  const scene = worldInstance.getScene();
  const camera = worldInstance.getCamera();
  let ambientLight = worldInstance.getAmbientLight();
  let directionalLight = worldInstance.getDirectionalLight();

  const heightmapUtils = worldInstance.getHeightmapUtils();
  const loadedAssets = worldInstance.getLoadedAssets();
  const { heightmapData } = heightmapUtils;
  const { heightMapTexture } = heightmapData;
  const getHeightFromPosition = heightmapUtils.getHeightFromPosition;

  // Append renderer to DOM
  document.querySelector('#demo').appendChild(renderer.domElement);

  // Add terrain to the scene
  const grassTexture = loadedAssets.textures.grass;
  grassTexture.repeat.x = WORLD_WIDTH / 4;
  grassTexture.repeat.y = WORLD_HEIGHT / 4;

  const material = new THREE.MeshStandardMaterial({
    map: grassTexture,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWaterLevel = { value: WATER_LEVEL };
    shader.uniforms.uSandBlendDistance = { value: 1.0 };

    shader.vertexShader =
      'varying vec3 vWorldPosition;\nvarying vec2 vUvCustom;\n' +
      shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      terrainVertexShader,
    );

    shader.fragmentShader = terrainFragmentShaderPart1 + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      terrainFragmentShaderPart2,
    );
  };

  const geometry = new THREE.PlaneGeometry(
    WORLD_WIDTH,
    WORLD_HEIGHT,
    HEIGHT_MAP_RESOLUTION - 1,
    HEIGHT_MAP_RESOLUTION - 1,
  );

  // Apply heightmap to geometry using engine utilities
  heightmapUtils.applyHeightmapToGeometry(geometry);

  geometry.rotateX(-Math.PI / 2);
  geometry.attributes.position.needsUpdate = true;
  geometry.computeVertexNormals();

  const plane = new THREE.Mesh(geometry, material);
  plane.castShadow = true;
  plane.receiveShadow = true;
  plane.position.x = WORLD_WIDTH / 2;
  plane.position.z = WORLD_HEIGHT / 2;
  scene.add(plane);

  const cycleData = {
    now: 0,
    pauseStartTime: 0,
    totalPauseTime: 0,
    elapsed: 0,
    delta: 0,
  };

  const showFloatingLabel = ({ text, position, duration = 1000 }) => {
    const div = document.createElement('div');
    div.textContent = text;
    div.style.color = 'yellow';
    div.style.fontSize = '20px';
    div.style.fontFamily = 'sans-serif';
    div.style.fontWeight = 'bold';
    div.style.pointerEvents = 'none';
    div.style.transition = 'opacity 1s ease-out';
    div.style.opacity = '1';

    const label = new CSS2DObject(div);
    label.position.copy(position);
    scene.add(label);

    setTimeout(() => {
      div.style.opacity = '0';
      setTimeout(() => {
        scene.remove(label);
      }, 1000);
    }, duration);
  };

  const createCharacterAssets = () => {
    const createInstance = (isZombie = false) => {
      const humanModel = loadedAssets.models['human-idle'] as THREE.Group;
      const zombieModel = loadedAssets.models['zombie-idle'] as THREE.Group;

      const instance = SkeletonUtils.clone(isZombie ? zombieModel : humanModel);
      const wrapper = new THREE.Group();
      instance.rotation.y = Math.PI / 2;
      wrapper.add(instance);

      const mixer = new THREE.AnimationMixer(instance);

      // Get animations from loaded models
      const animations = {
        idle: isZombie
          ? (loadedAssets.models['zombie-idle'] as THREE.Group).animations[0]
          : (loadedAssets.models['human-idle'] as THREE.Group).animations[0],
        walk: isZombie
          ? (loadedAssets.models['zombie-walk'] as THREE.Group).animations[0]
          : (loadedAssets.models.walk as THREE.Group).animations[0],
        run: isZombie
          ? (loadedAssets.models['zombie-run'] as THREE.Group).animations[0]
          : (loadedAssets.models.run as THREE.Group).animations[0],
        roll: (loadedAssets.models.roll as THREE.Group).animations[0],
        attack: (loadedAssets.models['zombie-attack'] as THREE.Group)
          .animations[0],
      };

      const actions = {
        idle: mixer.clipAction(animations.idle),
        walk: mixer.clipAction(animations.walk),
        run: mixer.clipAction(animations.run),
        roll: mixer.clipAction(animations.roll),
        attack: mixer.clipAction(animations.attack),
      };

      // Enable shadows for the instance
      instance.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.needsUpdate = true;
          }
        }
      });

      // Color zombies green
      if (isZombie) {
        instance.traverse((child) => {
          if (child.isMesh) {
            child.material.color.setHex(0x4caf50);
          }
        });
      }

      return { model: wrapper, mixer, actions, userData: {} };
    };

    return {
      createInstance,
    };
  };

  const characterAssets = createCharacterAssets();

  const getPositionByHeight = (minHeight) => {
    // Use the engine's heightmap utility function
    return heightmapUtils.getPositionByHeight(minHeight);
  };

  const createCharacter = ({ isZombie = false, position }) => {
    const character = characterAssets.createInstance(isZombie);
    playAnimation(character, 'idle');
    character.model.position.copy(position);
    scene.add(character.model);

    const { instance: runningEffectInstance } = createParticleSystem(
      runningEffect,
      cycleData.now,
    );
    character.model.add(runningEffectInstance);

    /*character.updateMatrixWorld(true);
  const exporter = new GLTFExporter();
  exporter.parse(
    character,
    (gltf) => {
      const blob = new Blob([JSON.stringify(gltf)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'character.gltf';
      a.click();
    },
    { binary: false }
  );*/

    return character;
  };
  const character = createCharacter({
    position: startingPosition,
  });
  const { instance: dustEffectInstance } = createParticleSystem(
    dustEffect,
    cycleData.now,
  );
  character.model.add(dustEffectInstance);
  units.push(character);

  const createEnemies = async (count) => {
    for (let i = 0; i < count; i++) {
      const position = startingPosition.clone();
      position.x += 10 + i * 1.5 - Math.floor(i / 5) * (5 * 1.5);
      position.z += -10 + Math.floor(i / 5) * 2;
      position.y = getHeightFromPosition(position);
      const enemy = createCharacter({
        position,
        isZombie: true,
      });
      units.push(enemy);
    }
  };
  createEnemies(ENEMY_COUNT);

  const trunkGeometry = new THREE.BoxGeometry(0.4, 2, 0.4);
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x895129 });
  const trunkMesh = new THREE.InstancedMesh(
    trunkGeometry,
    trunkMaterial,
    TREE_COUNT,
  );
  trunkMesh.castShadow = true;
  trunkMesh.receiveShadow = true;
  scene.add(trunkMesh);
  const leafGeometry = new THREE.SphereGeometry(1, 16, 16);
  const leafTexture = loadedAssets.textures.grass;
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: 0x00ff00,
    map: leafTexture,
  });
  const leafMesh = new THREE.InstancedMesh(
    leafGeometry,
    leafMaterial,
    TREE_COUNT,
  );
  leafMesh.castShadow = true;
  leafMesh.receiveShadow = true;
  scene.add(leafMesh);

  const appleGeometry = new THREE.SphereGeometry(0.2, 8, 8);
  const appleMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  const appleMesh = new THREE.InstancedMesh(
    appleGeometry,
    appleMaterial,
    TREE_COUNT * MAX_APPLES_PER_TREE * 2,
  );
  appleMesh.castShadow = true;
  appleMesh.receiveShadow = true;
  scene.add(appleMesh);
  let appleIndex = 0;
  const applesPerTree = [];

  for (let i = 0; i < TREE_COUNT; i++) {
    const scale = 1 + Math.random();
    const position = getPositionByHeight(9);
    if (!position) continue;

    const { x, z } = position;
    const y = position.y - 0.5 * scale;

    dummy.position.set(x, y + 1 * scale, z);
    dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    trunkMesh.setMatrixAt(i, dummy.matrix);
    const tree = {
      isActive: true,
      position: dummy.position.clone(),
      appleIndices: null,
    };
    trees.push(tree);

    dummy.position.set(x, y + 1.5 * scale + 1 * scale, z);
    dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    leafMesh.setMatrixAt(i, dummy.matrix);

    const appleCount =
      MIN_APPLES_PER_TREE +
      Math.floor(Math.random() * (MAX_APPLES_PER_TREE - MIN_APPLES_PER_TREE));
    const treeAppleIndices = [];
    for (let j = 0; j < appleCount; j++) {
      const offsetX = (Math.random() - 0.5) * 1.5 * scale;
      const offsetY = Math.random() * 1.5 * scale + 1.5 * scale + 0.5 * scale;
      const offsetZ = (Math.random() - 0.5) * 1.5 * scale;

      dummy.position.set(x + offsetX, y + offsetY, z + offsetZ);
      dummy.updateMatrix();

      appleMesh.setMatrixAt(appleIndex, dummy.matrix);
      treeAppleIndices.push(appleIndex);
      appleIndex++;
    }
    tree.appleIndices = treeAppleIndices;
  }
  trunkMesh.instanceMatrix.needsUpdate = true;
  leafMesh.instanceMatrix.needsUpdate = true;
  appleMesh.instanceMatrix.needsUpdate = true;

  const removeApplesFromTree = (indices) => {
    for (const idx of indices) {
      dummy.position.set(0, -100, 0);
      dummy.updateMatrix();
      appleMesh.setMatrixAt(idx, dummy.matrix);
    }
    appleMesh.instanceMatrix.needsUpdate = true;
  };

  const rockGeometry = new THREE.IcosahedronGeometry(0.3, 0);
  const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
  const rockMesh = new THREE.InstancedMesh(
    rockGeometry,
    rockMaterial,
    ROCK_COUNT,
  );
  rockMesh.castShadow = true;
  rockMesh.receiveShadow = true;
  scene.add(rockMesh);
  for (let i = 0; i < ROCK_COUNT; i++) {
    const position = getPositionByHeight(7);
    if (!position) continue;
    const { x, y, z } = position;

    dummy.position.set(x, y, z);
    dummy.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI,
    );
    const scale = 0.5 + Math.random();
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    rockMesh.setMatrixAt(i, dummy.matrix);
  }
  rockMesh.instanceMatrix.needsUpdate = true;

  const crateGeometry = new THREE.BoxGeometry(1, 1, 1);
  const crateMaterial = new THREE.MeshStandardMaterial({
    map: loadedAssets.textures.crate,
  });
  const crateMesh = new THREE.InstancedMesh(
    crateGeometry,
    crateMaterial,
    CRATE_COUNT,
  );
  crateMesh.castShadow = true;
  crateMesh.receiveShadow = true;
  scene.add(crateMesh);
  for (let i = 0; i < CRATE_COUNT; i++) {
    const position = getPositionByHeight(WATER_LEVEL);
    if (!position) continue;
    const { x, y, z } = position;

    dummy.position.set(x, y + 0.5, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    crateMesh.setMatrixAt(i, dummy.matrix);

    const effect =
      crateEffects[Math.floor(Math.random() * crateEffects.length)];

    const crate = {
      isActive: true,
      position: dummy.position.clone(),
      effect,
      index: i,
    };
    crates.push(crate);
  }
  crateMesh.instanceMatrix.needsUpdate = true;

  const removeCrate = (index) => {
    dummy.position.set(0, -100, 0);
    dummy.updateMatrix();
    crateMesh.setMatrixAt(index, dummy.matrix);
    crateMesh.instanceMatrix.needsUpdate = true;
  };

  const createKeyListeners = () => {
    const onKeyDown = (event) => (keys[event.code] = true);
    const onKeyUp = (event) => (keys[event.code] = false);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
  };
  createKeyListeners();

  const updateCamera = () => {
    camera.position.lerp(
      new THREE.Vector3(
        character.model.position.x,
        character.model.position.y + DISTANCE_FROM_CAMERA,
        character.model.position.z + 8,
      ),
      cycleData.delta * 5,
    );
    camera.lookAt(character.model.position);
  };

  const handleTerrainHeight = ({ model: unit }) => {
    const terrainHeight = getHeightFromPosition(
      new THREE.Vector3(unit.position.x, 0, unit.position.z),
    );
    if (terrainHeight < WATER_LEVEL - 0.5) {
      const direction = new THREE.Vector3()
        .subVectors(unit.userData.oldPos, unit.position)
        .normalize();

      unit.position.x = unit.userData.oldPos.x;
      if (
        getHeightFromPosition(
          new THREE.Vector3(unit.position.x, 0, unit.position.z),
        ) <
        WATER_LEVEL - 0.5
      ) {
        unit.position.z = unit.userData.oldPos.z;
        if (
          getHeightFromPosition(
            new THREE.Vector3(unit.position.x, 0, unit.position.z),
          ) <
          WATER_LEVEL - 0.5
        ) {
          unit.position.copy(unit.userData.oldPos);
        }
      }
    }
  };

  const applyCharacterRotation = () => {
    if (keys['KeyA'] || keys['ArrowLeft']) direction = Math.PI;
    if (keys['KeyD'] || keys['ArrowRight']) direction = 0;
    if (keys['KeyW'] || keys['ArrowUp']) direction = Math.PI / 2;
    if (keys['KeyS'] || keys['ArrowDown']) direction = -Math.PI / 2;
    if (
      (keys['KeyA'] || keys['ArrowLeft']) &&
      (keys['KeyW'] || keys['ArrowUp'])
    )
      direction = Math.PI - Math.PI / 4;
    if (
      (keys['KeyA'] || keys['ArrowLeft']) &&
      (keys['KeyS'] || keys['ArrowDown'])
    )
      direction = Math.PI + Math.PI / 4;
    if (
      (keys['KeyD'] || keys['ArrowRight']) &&
      (keys['KeyW'] || keys['ArrowUp'])
    )
      direction = Math.PI / 4;
    if (
      (keys['KeyD'] || keys['ArrowRight']) &&
      (keys['KeyS'] || keys['ArrowDown'])
    )
      direction = Math.PI + (Math.PI / 4) * 3;
    rotationTargetQuaternion.setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      direction,
    );
    character.model.quaternion.slerp(
      rotationTargetQuaternion,
      cycleData.delta * 10,
    );
  };
  const applyCharacterMovement = () => {
    if (isRolling) return;

    const isMoving =
      keys['KeyA'] ||
      keys['KeyS'] ||
      keys['KeyD'] ||
      keys['KeyW'] ||
      keys['ArrowLeft'] ||
      keys['ArrowDown'] ||
      keys['ArrowRight'] ||
      keys['ArrowUp'];

    const isRunningKey = keys['ShiftLeft'];
    let isRunning = false;

    if (isMoving && isRunningKey) {
      if (gameState.stamina > 0) {
        isRunning = true;
        gameState.stamina -= STAMINA_DRAIN * cycleData.delta;
        gameState.stamina = Math.max(gameState.stamina, 0);
      }
    } else {
      gameState.stamina += STAMINA_RECOVERY * cycleData.delta;
      gameState.stamina = Math.min(gameState.stamina, MAX_STAMINA);
    }

    if (isMoving) {
      character.model.getWorldDirection(charactersWorldDirection);
      correctedDir.set(
        charactersWorldDirection.z,
        0,
        -charactersWorldDirection.x,
      );
      character.model.userData.oldPos = character.model.position.clone();
      character.model.position.addScaledVector(
        correctedDir,
        (isRunning ? RUN_SPEED : WALK_SPEED) *
          (character.model.position.y < WATER_SPEED_LEVEL
            ? WATER_SPEED_MULTIPLIER
            : 1) *
          cycleData.delta,
      );
      if (isRunning) {
        playAnimation(character, 'run');
      } else {
        playAnimation(character, 'walk');
      }

      handleTerrainHeight(character);
    } else {
      playAnimation(character, 'idle');
    }
  };
  const updateCharacter = () => {
    applyCharacterRotation();
    applyCharacterMovement();
  };

  const updateLight = () => {
    timeOfDay += cycleData.delta / DAY_LENGTH;
    if (timeOfDay > 1) timeOfDay -= 1;

    const angle = timeOfDay * Math.PI * 2;
    const radius = 100;

    directionalLight.position.set(
      character.model.position.x + Math.cos(angle) * radius,
      character.model.position.y + Math.sin(angle) * radius + 20,
      character.model.position.z - 40,
    );
    directionalLight.target.position.copy(character.model.position);
    directionalLight.target.updateMatrixWorld();

    const t = Math.max(0, Math.sin(angle));
    const eased = Math.pow(t, 0.7);

    ambientLight.intensity = 0.6 + eased * 0.3;
    directionalLight.intensity = 0.4 + eased * 0.6;

    const nightColor = new THREE.Color(0x99bbff);
    const dayColor = new THREE.Color(0xfef9e6);
    ambientLight.color.copy(nightColor).lerp(dayColor, eased);

    const sunColor = new THREE.Color(0xffd18b);
    const noonColor = new THREE.Color(0xffffff);
    directionalLight.color.copy(sunColor).lerp(noonColor, eased);

    const startHour = 6;
    let totalHours = startHour + timeOfDay * 24;
    if (totalHours >= 24) totalHours -= 24;

    const hours = Math.floor(totalHours);
    const minutes = Math.floor((totalHours - hours) * 60);

    const hStr = String(hours).padStart(2, '0');
    const mStr = String(minutes).padStart(2, '0');

    const clockEl = document.getElementById('clock-text');
    if (clockEl) clockEl.textContent = `${hStr}:${mStr}`;
  };
  const updateUnits = () => {
    units.forEach((_unit, index) => {
      const { model: unit, mixer, actions } = _unit;
      mixer.update(cycleData.delta);
      if (unit.knockbackVelocity) {
        unit.position.addScaledVector(unit.knockbackVelocity, cycleData.delta);
        unit.knockbackVelocity.multiplyScalar(0.9);
        if (unit.knockbackVelocity.lengthSq() < 0.0001)
          unit.knockbackVelocity.set(0, 0, 0);
      }
      for (const tree of trees) {
        const { position, appleIndices, isActive } = tree;

        const dist = unit.position.distanceTo(position);
        if (dist < TREE_COLLISION_RADIUS) {
          const away = unit.position.clone().sub(position).normalize();
          unit.position.addScaledVector(
            away,
            (TREE_COLLISION_RADIUS - dist) * 0.2,
          );
          if (unit === character.model && appleIndices && isActive) {
            tree.isActive = false;
            removeApplesFromTree(appleIndices);
            showFloatingLabel({
              text: `+${appleIndices.length} apples`,
              position: character.model.position,
            });
            gameState.collectedApples += appleIndices.length;

            const effect =
              appleEffects[Math.floor(Math.random() * appleEffects.length)];
            if (effect.stamina) {
              gameState.stamina +=
                Math.floor(
                  Math.random() * (effect.stamina.max - effect.stamina.min + 1),
                ) + effect.stamina.min;
              gameState.stamina = Math.min(gameState.stamina, MAX_STAMINA);
            } else {
              gameState.health +=
                Math.floor(
                  Math.random() * (effect.health.max - effect.health.min + 1),
                ) + effect.health.min;
            }

            updateAppleCount();
            tree.appleIndices = null;
          }
        }
      }

      for (const crate of crates) {
        const { position, effect, index, isActive } = crate;
        if (!isActive) continue;

        const dist = unit.position.distanceTo(position);

        // Check if player is nearby for outline effect
        if (unit === character.model) {
          const isNearby = dist < CRATE_INTERACTION_RADIUS;
          const hasOutline = nearbyCreateOutlines.has(index);

          if (isNearby && !hasOutline) {
            // Create individual mesh for this crate to apply outline
            const crateGeometry = new THREE.BoxGeometry(1, 1, 1);
            const crateMaterial = new THREE.MeshStandardMaterial({
              map: loadedAssets.textures.crate,
            });
            const proxyMesh = new THREE.Mesh(crateGeometry, crateMaterial);
            proxyMesh.position.copy(position);
            proxyMesh.castShadow = true;
            proxyMesh.receiveShadow = true;
            scene.add(proxyMesh);

            // Hide the original instance by moving it far away
            dummy.position.set(0, -1000, 0);
            dummy.updateMatrix();
            crateMesh.setMatrixAt(index, dummy.matrix);
            crateMesh.instanceMatrix.needsUpdate = true;

            // Add outline to the individual mesh
            const outlineId = worldInstance.addOutline(proxyMesh, {
              color: '#ffffff',
              strength: 0.8,
              thickness: 1.5,
              glow: 0.3,
              priority: 1,
            });

            nearbyCreateOutlines.set(index, outlineId);
            crateProxyMeshes.set(index, proxyMesh);
          } else if (!isNearby && hasOutline) {
            // Remove outline and restore original instance
            const outlineId = nearbyCreateOutlines.get(index);
            const proxyMesh = crateProxyMeshes.get(index);

            worldInstance.removeOutline(outlineId);
            scene.remove(proxyMesh);

            // Restore original instance position
            dummy.position.copy(position);
            dummy.rotation.set(0, 0, 0);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            crateMesh.setMatrixAt(index, dummy.matrix);
            crateMesh.instanceMatrix.needsUpdate = true;

            nearbyCreateOutlines.delete(index);
            crateProxyMeshes.delete(index);
          }
        }

        if (dist < CRATE_COLLISION_RADIUS) {
          const away = unit.position.clone().sub(position).normalize();
          unit.position.addScaledVector(
            away,
            (CRATE_COLLISION_RADIUS - dist) * 0.2,
          );
          if (unit === character.model && isActive) {
            // Remove outline and proxy mesh when crate is collected
            if (nearbyCreateOutlines.has(index)) {
              const outlineId = nearbyCreateOutlines.get(index);
              const proxyMesh = crateProxyMeshes.get(index);

              worldInstance.removeOutline(outlineId);
              scene.remove(proxyMesh);
              nearbyCreateOutlines.delete(index);
              crateProxyMeshes.delete(index);
            }

            crate.isActive = false;
            showFloatingLabel({
              text: effect,
              position: character.model.position,
            });
            removeCrate(index);
          }
        }
      }

      const elapsedTime = cycleData.elapsed;

      if (unit === character.model) return;

      if (!unit.userData.target) unit.userData.target = new THREE.Vector3();
      if (!unit.userData.nextTargetSelectionTime)
        unit.userData.nextTargetSelectionTime = elapsedTime;
      if (!unit.userData.resumeTime)
        unit.userData.resumeTime = elapsedTime + Math.random() * 5;

      if (elapsedTime >= unit.userData.nextTargetSelectionTime) {
        unit.userData.isAttacking = false;
        unit.userData.nextTargetSelectionTime = elapsedTime + Math.random() * 5;
        unit.userData.target.copy(character.model.position);
      }

      const direction = new THREE.Vector3()
        .subVectors(
          unit.userData.isAttacking
            ? character.model.position
            : unit.userData.target,
          unit.position,
        )
        .normalize();
      const adjustQuat = new THREE.Quaternion();
      adjustQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
      rotationTargetQuaternion
        .setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction)
        .multiply(adjustQuat);
      unit.quaternion.slerp(rotationTargetQuaternion, cycleData.delta * 10);

      if (elapsedTime < unit.userData.resumeTime) return;

      playAnimation(_unit, 'run');

      unit.position.addScaledVector(direction, ENEMY_SPEED * cycleData.delta);
      unit.userData.oldPos = unit.position.clone();

      handleTerrainHeight(_unit);

      unit.userData.target.y = unit.position.y;
      if (unit.position.distanceTo(unit.userData.target) < 1.5) {
        playAnimation(_unit, 'idle');
        unit.userData.resumeTime = cycleData.elapsed + Math.random() * 3;
      }
      if (unit.position.distanceTo(character.model.position) < 1.5) {
        playAnimation(_unit, 'attack');
        unit.userData.resumeTime = cycleData.elapsed + Math.random() * 3;
        unit.userData.isAttacking = true;
      }
    });

    for (let i = 0; i < units.length; i++) {
      const e1 = units[i].model;

      for (let j = i + 1; j < units.length; j++) {
        const e2 = units[j].model;

        const dist = e1.position.distanceTo(e2.position);
        const minDist = 1;

        if (dist < minDist) {
          const pushDir = e1.position.clone().sub(e2.position).normalize();
          const overlap = minDist - dist;

          e1.position.addScaledVector(pushDir, overlap * 0.5);
          e2.position.addScaledVector(pushDir, -overlap * 0.5);
        }
      }
    }
  };

  const updateCharactersYPosition = () => {
    units.forEach(
      ({ model: unit }) =>
        (unit.position.y = getHeightFromPosition(unit.position)),
    );
  };

  const getThrowVelocity = () => {
    const direction = character.model.getWorldDirection(new THREE.Vector3());
    direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);

    direction.x += (Math.random() - 0.5) * throwSpread;
    direction.y += Math.random() * 0.2;
    direction.z += (Math.random() - 0.5) * throwSpread;

    direction.normalize();
    direction.multiplyScalar(throwStrength);
    return direction;
  };

  const updateAppleInstance = (index, position) => {
    dummy.position.copy(position);
    dummy.updateMatrix();
    appleMesh.setMatrixAt(index, dummy.matrix);
    appleMesh.instanceMatrix.needsUpdate = true;
  };

  const throwApple = () => {
    for (let i = 0; i < appleMesh.count; i++) {
      if (!apples[i] || apples[i].inactive) {
        const apple = {
          position: character.model.position.clone(),
          velocity: getThrowVelocity(),
          life: 5,
          instanceId: i,
          inactive: false,
        };
        apple.position.y += 0.5;
        apples[i] = apple;
        updateAppleInstance(i, apple.position);
        break;
      }
    }
  };

  const getSplashText = () => {
    const texts = [
      'Splash!',
      'Pow!',
      'Thud!',
      'Smash!',
      'Bam!',
      'Whack!',
      'Bonk!',
      'Kaboom!',
    ];
    return texts[Math.floor(Math.random() * texts.length)];
  };

  const updateApples = () => {
    for (let apple of apples) {
      if (apple && !apple.inactive) {
        apple.velocity.add(gravity.clone().multiplyScalar(cycleData.delta));
        apple.position.add(
          apple.velocity.clone().multiplyScalar(cycleData.delta),
        );
        updateAppleInstance(apple.instanceId, apple.position);

        const terrainHeight = getHeightFromPosition(apple.position);
        apple.life -= cycleData.delta;

        const addAppleExplosion = (position) => {
          const { instance: splashEffectInstance, dispose } =
            createParticleSystem(splashEffect, cycleData.now);
          splashEffectInstance.position.copy(position);
          scene.add(splashEffectInstance);
          setTimeout(dispose, 1000);
        };

        if (apple.position.y <= terrainHeight)
          addAppleExplosion(apple.position);

        for (let { model: unit } of units) {
          if (unit === character.model) continue;
          const dist = apple.position.distanceTo(unit.position);
          if (dist < APPLE_HIT_RADIUS) {
            const away = unit.position.clone().sub(apple.position).normalize();
            const knockback = away.multiplyScalar(APPLE_PUSH_FORCE);
            if (!unit.knockbackVelocity)
              unit.knockbackVelocity = new THREE.Vector3();
            unit.knockbackVelocity.add(knockback);

            apple.inactive = true;
            apple.velocity.set(0, 0, 0);
            addAppleExplosion(unit.position);
            showFloatingLabel({
              text: getSplashText(),
              position: unit.position,
            });
            gameState.score++;
            updateScore();

            updateAppleInstance(
              apple.instanceId,
              new THREE.Vector3(0, -100, 0),
            );
            break;
          }
        }

        if (
          apple.life <= 0 ||
          apple.position.y < 0 ||
          apple.position.y <= terrainHeight
        ) {
          apple.inactive = true;
          apple.velocity.set(0, 0, 0);
          updateAppleInstance(apple.instanceId, new THREE.Vector3(0, -100, 0));
        }
      }
    }
  };

  const updateAppleThrowRoutine = () => {
    if (keys['Space']) {
      const now = performance.now();
      if (
        now - lastThrowTime > throwCooldown &&
        gameState.collectedApples > 0
      ) {
        gameState.collectedApples--;
        updateAppleCount();
        throwApple();
        lastThrowTime = now;
      }
    }
  };

  const updateRollRoutine = () => {
    const now = performance.now();
    if (keys['KeyR'] && !isRolling) {
      if (now - lastRollTime > rollCooldown) {
        isRolling = true;
        playAnimation(character, 'roll');
        lastRollTime = now;
      }
    } else if (isRolling) {
      const rollAction = character.actions.roll;
      if (lastRollTime + rollAction.getClip().duration * 1000 <= now) {
        isRolling = false;
        playAnimation(character, 'idle');
      } else {
        const forward = new THREE.Vector3(1, 0, 0);
        forward.applyQuaternion(character.model.quaternion);
        character.model.userData.oldPos = character.model.position.clone();
        character.model.position.addScaledVector(
          forward,
          (keys['ShiftLeft'] ? FAST_ROLL_SPEED : ROLL_SPEED) * cycleData.delta,
        );
        handleTerrainHeight(character);
      }
    }
  };

  const createWater = () => {
    const uniforms = {
      uTime: { value: 0.0 },
      uAmplitude: { value: 1.0 },
      uFrequency: { value: 4.0 },
      uSpeed: { value: 1.5 },
      uDeepColor: { value: new THREE.Color(0x013a5b) },
      uShallowColor: { value: new THREE.Color(0x2fc7ff) },
      uShallowStrength: { value: 0.2 },
      uFoamColor: { value: new THREE.Color(0xf6f9ff) },
      uFoamWidth: { value: 0.4 },
      uFoamStrength: { value: 0.2 },
      uTerrainHeightMap: { value: heightMapTexture },
      uWaterLevel: { value: WATER_LEVEL },
      uMaxTerrainHeight: { value: 30 },
      uWorldWidth: { value: WORLD_WIDTH },
      uWorldHeight: { value: WORLD_HEIGHT },
      uOpacity: { value: 0.8 },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: WaterVertexShader,
      fragmentShader: WaterFragmentShader,
      uniforms,
      side: THREE.DoubleSide,
      transparent: true,
    });

    const geom = new THREE.PlaneGeometry(WORLD_WIDTH, WORLD_HEIGHT, 64, 64);
    const mesh = new THREE.Mesh(geom, material);

    return { mesh, uniforms };
  };

  const waters = [];
  const water = createWater();
  water.mesh.rotation.x = -Math.PI / 2;
  water.mesh.position.x = WORLD_WIDTH / 2;
  water.mesh.position.y = WATER_LEVEL;
  water.mesh.position.z = WORLD_HEIGHT / 2;
  scene.add(water.mesh);
  waters.push(water);
  const updateWaters = () => {
    waters.forEach(({ uniforms }) => (uniforms.uTime.value += cycleData.delta));
  };

  const cinamaticCameraController = createCinematicCameraController(camera, [
    {
      from: new THREE.Vector3(
        startingPosition.x + 150,
        40,
        startingPosition.z + 50,
      ),
      to: new THREE.Vector3(startingPosition.x - 10, 12, startingPosition.z),
      lookAt: new THREE.Vector3(250, 20, 200),
      duration: 0.4,
    },
    {
      to: new THREE.Vector3(
        character.model.position.x,
        character.model.position.y + DISTANCE_FROM_CAMERA,
        character.model.position.z + 8,
      ),
      lookAt: character.model.position,
      duration: 0.2,
    },
  ]);

  camera.lookAt(150, 20, 200);
  cinamaticCameraController.play();

  // Use THREE Play's update system
  worldInstance.onUpdate((deltaTime, elapsedTime) => {
    // Update cycle data for compatibility
    cycleData.now = Date.now() - cycleData.totalPauseTime;
    cycleData.delta = deltaTime > 0.1 ? 0.1 : deltaTime;
    cycleData.elapsed = elapsedTime;

    updateParticleSystems(cycleData);
    if (!cinamaticCameraController.isPlaying()) {
      updateCamera();
      updateCharacter();
    }
    updateUnits();
    updateCharactersYPosition();
    updateAppleThrowRoutine();
    updateRollRoutine();
    updateApples();
    updateLight();
    updateStaminaUi();
    updateWaters();

    cinamaticCameraController.update(cycleData.delta);

    // Render CSS2D labels
    labelRenderer.render(scene, camera);
  });

  // Start the THREE Play update loop
  worldInstance.start();
});
