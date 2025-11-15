import { createWorld } from '@newkrok/three-play';
import {
  updateParticleSystems,
  createParticleSystem,
} from 'https://esm.sh/@newkrok/three-particles';

import * as THREE from 'three';
import {
  runningEffect,
  runningInWaterEffect,
  dustEffect,
  splashEffect,
} from './effects-config.js';
import worldConfig from './world-config.js';
import * as Constants from './constants.js';
import {
  CSS2DRenderer,
  CSS2DObject,
  SkeletonUtils,
} from 'three/examples/jsm/Addons.js';

/**
 * @typedef {Object} GameState
 * @property {number} collectedApples
 * @property {number} score
 * @property {number} health
 * @property {number} stamina
 */

// Initialize THREE Play engine
// Note: Logger will be initialized with world instance

// Destructure constants for easier access
const {
  WALK_SPEED,
  RUN_SPEED,
  ROLL_SPEED,
  FAST_ROLL_SPEED,
  WATER_SPEED_MULTIPLIER,
  WATER_SPEED_LEVEL,
  ENEMY_SPEED,
  DISTANCE_FROM_CAMERA,
  ROCK_COUNT,
  TREE_COUNT,
  CRATE_COUNT,
  TREE_COLLISION_RADIUS,
  CRATE_COLLISION_RADIUS,
  CRATE_INTERACTION_RADIUS,
  MIN_APPLES_PER_TREE,
  MAX_APPLES_PER_TREE,
  ENEMY_COUNT,
  APPLE_HIT_RADIUS,
  APPLE_PUSH_FORCE,
  MAX_STAMINA,
  STAMINA_RECOVERY,
  STAMINA_DRAIN,
  MAX_HEALTH,
  WATER_LEVEL,
  LIGHT_ATTACK_KNOCKBACK,
  LIGHT_ATTACK_ACTION_DELAY,
  STAMINA_FOR_LIGHT_ATTACK,
  LIGHT_ATTACK_COOLDOWN,
  LIGHT_ATTACK_EFFECT_AREA,
  LIGHT_ATTACK_STUN_DURATION,
  HEAVY_ATTACK_KNOCKBACK,
  HEAVY_ATTACK_ACTION_DELAY,
  STAMINA_FOR_HEAVY_ATTACK,
  HEAVY_ATTACK_COOLDOWN,
  HEAVY_ATTACK_EFFECT_AREA,
  HEAVY_ATTACK_STUN_DURATION,
} = Constants;

const startingPosition = new THREE.Vector3(
  Constants.startingPosition.x,
  Constants.startingPosition.y,
  Constants.startingPosition.z,
);

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
let lastLightAttackTime = 0;
let lastHeavyAttackTime = 0;
let isRolling = false;
let isAttacking = false;
const throwCooldown = 250;
const rollCooldown = 500;
const gravity = new THREE.Vector3(0, -9.8, 0);
const throwStrength = 15;
const throwSpread = 0.2;
const charactersWorldDirection = new THREE.Vector3();
const correctedDir = new THREE.Vector3();
const rotationTargetQuaternion = new THREE.Quaternion();
const dummy = new THREE.Object3D();

const gameState = {
  collectedApples: 0,
  score: 0,
  health: MAX_HEALTH / 2,
  stamina: MAX_STAMINA,
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
const worldInstance = createWorld(worldConfig);

// Add progress tracking for asset loading
worldInstance.onProgress((progress) => {
  const logger = worldInstance.getLogger();
  logger.info(`Loading assets: ${progress.percentage}%`);
  logger.info(
    `Textures: ${progress.loadedTextures.current}/${progress.loadedTextures.total}`,
  );
  logger.info(
    `Models: ${progress.loadedModels.current}/${progress.loadedModels.total}`,
  );
});

// Add ready callback for when assets are loaded
worldInstance.onReady((assets) => {
  const logger = worldInstance.getLogger();
  logger.info('All assets loaded successfully!', assets);

  // Get input manager (actions are already configured in world config)
  const inputManager = worldInstance.getInputManager();

  runningEffect.map = assets.textures.smoke;
  runningInWaterEffect.map = assets.textures.splash;

  // Get references to Three.js components
  const renderer = worldInstance.getRenderer();
  const scene = worldInstance.getScene();
  const camera = worldInstance.getCamera();

  const heightmapUtils = worldInstance.getHeightmapUtils();
  const loadedAssets = worldInstance.getLoadedAssets();
  const getHeightFromPosition = heightmapUtils.getHeightFromPosition;



  // Append renderer to DOM
  document.querySelector('#demo').appendChild(renderer.domElement);

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
        lightAttack: (loadedAssets.models['light-attack'] as THREE.Group)
          .animations[0],
        heavyAttack: (loadedAssets.models['heavy-attack'] as THREE.Group)
          .animations[0],
        hitToBody: (loadedAssets.models['hit-to-body'] as THREE.Group)
          .animations[0],
      };

      const actions = {
        idle: mixer.clipAction(animations.idle),
        walk: mixer.clipAction(animations.walk),
        run: mixer.clipAction(animations.run),
        roll: mixer.clipAction(animations.roll),
        attack: mixer.clipAction(animations.attack),
        lightAttack: mixer.clipAction(animations.lightAttack),
        heavyAttack: mixer.clipAction(animations.heavyAttack),
        hitToBody: mixer.clipAction(animations.hitToBody),
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

    character.effects = {};
    const runningEffectParticleSystem = createParticleSystem(
      runningEffect,
      cycleData.now,
    );
    const runningEffectInstance = runningEffectParticleSystem.instance;
    character.effects.running = runningEffectParticleSystem;
    character.model.add(runningEffectInstance);

    const runningInWaterEffectParticleSystem = createParticleSystem(
      runningInWaterEffect,
      cycleData.now,
    );
    const runningInWaterEffectInstance =
      runningInWaterEffectParticleSystem.instance;
    character.effects.runningInWater = runningInWaterEffectParticleSystem;
    character.model.add(runningInWaterEffectInstance);

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

  // Configure day/night system to follow the main character for optimized shadows
  const dayNightManager = worldInstance.getDayNightManager();
  if (dayNightManager) {
    dayNightManager.updateConfig({
      sunPosition: {
        radius: 100,
        heightOffset: 20,
        zOffset: -40,
        followTarget: character.model,
      },
    });
    logger.info('Day/night system configured to follow character');
  }

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
  const leafTexture = loadedAssets.textures.grass.clone();
  leafTexture.repeat.x = 1;
  leafTexture.repeat.y = 1;
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
    const moveLeft = inputManager.isActionActive('moveLeft');
    const moveRight = inputManager.isActionActive('moveRight');
    const moveUp = inputManager.isActionActive('moveUp');
    const moveDown = inputManager.isActionActive('moveDown');

    if (moveLeft) direction = Math.PI;
    if (moveRight) direction = 0;
    if (moveUp) direction = Math.PI / 2;
    if (moveDown) direction = -Math.PI / 2;
    if (moveLeft && moveUp) direction = Math.PI - Math.PI / 4;
    if (moveLeft && moveDown) direction = Math.PI + Math.PI / 4;
    if (moveRight && moveUp) direction = Math.PI / 4;
    if (moveRight && moveDown) direction = Math.PI + (Math.PI / 4) * 3;

    rotationTargetQuaternion.setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      direction,
    );
    character.model.quaternion.slerp(
      rotationTargetQuaternion,
      cycleData.delta * (isAttacking ? 0.5 : 10),
    );
  };
  const applyCharacterMovement = () => {
    if (isRolling || isAttacking) return;

    const isMoving =
      inputManager.isActionActive('moveLeft') ||
      inputManager.isActionActive('moveRight') ||
      inputManager.isActionActive('moveUp') ||
      inputManager.isActionActive('moveDown');

    const isRunningKey = inputManager.isActionActive('run');
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
  const applyCharacterLightAttack = () => {
    const now = performance.now();
    if (
      isRolling ||
      isAttacking ||
      !inputManager.isActionActive('lightAttack') ||
      lastLightAttackTime + LIGHT_ATTACK_COOLDOWN > now
    )
      return;

    isAttacking = true;
    lastLightAttackTime = now;
    const lightAttackAction = character.actions.lightAttack;
    setTimeout(() => {
      isAttacking = false;
      playAnimation(character, 'idle');
    }, lightAttackAction.getClip().duration * 1000);
    gameState.stamina -= STAMINA_FOR_LIGHT_ATTACK;
    gameState.stamina = Math.max(gameState.stamina, 0);
    playAnimation(character, 'lightAttack');

    setTimeout(() => {
      units.forEach((_unit) => {
        if (_unit === character) return;
        const { model: unit } = _unit;
        const away = unit.position
          .clone()
          .sub(character.model.position)
          .normalize();
        if (
          unit.position.distanceTo(character.model.position) <
          LIGHT_ATTACK_EFFECT_AREA
        ) {
          const knockback = away.multiplyScalar(LIGHT_ATTACK_KNOCKBACK);
          if (!unit.knockbackVelocity)
            unit.knockbackVelocity = new THREE.Vector3();
          unit.knockbackVelocity.add(knockback);
          unit.userData.isStunned = true;
          playAnimation(_unit, 'hitToBody');
          setTimeout(() => {
            unit.userData.isStunned = false;
            playAnimation(_unit, 'idle');
          }, LIGHT_ATTACK_STUN_DURATION);
        }
      });
    }, LIGHT_ATTACK_ACTION_DELAY);
  };
  const applyCharacterHeavyAttack = () => {
    const now = performance.now();
    if (
      isRolling ||
      isAttacking ||
      !inputManager.isActionActive('heavyAttack') ||
      lastHeavyAttackTime + HEAVY_ATTACK_COOLDOWN > now
    )
      return;

    isAttacking = true;
    lastHeavyAttackTime = now;
    const heavyAttackAction = character.actions.heavyAttack;
    setTimeout(() => {
      isAttacking = false;
      playAnimation(character, 'idle');
    }, heavyAttackAction.getClip().duration * 1000);
    gameState.stamina -= STAMINA_FOR_HEAVY_ATTACK;
    gameState.stamina = Math.max(gameState.stamina, 0);
    playAnimation(character, 'heavyAttack');

    setTimeout(() => {
      units.forEach((_unit) => {
        if (_unit === character) return;
        const { model: unit } = _unit;
        const away = unit.position
          .clone()
          .sub(character.model.position)
          .normalize();
        if (
          unit.position.distanceTo(character.model.position) <
          HEAVY_ATTACK_EFFECT_AREA
        ) {
          const knockback = away.multiplyScalar(HEAVY_ATTACK_KNOCKBACK);
          if (!unit.knockbackVelocity)
            unit.knockbackVelocity = new THREE.Vector3();
          unit.knockbackVelocity.add(knockback);
          unit.userData.isStunned = true;
          playAnimation(_unit, 'hitToBody');
          setTimeout(() => {
            unit.userData.isStunned = false;
            playAnimation(_unit, 'idle');
          }, HEAVY_ATTACK_STUN_DURATION);
        }
      });
    }, HEAVY_ATTACK_ACTION_DELAY);
  };
  const updateCharacter = () => {
    applyCharacterRotation();
    applyCharacterMovement();
    applyCharacterLightAttack();
    applyCharacterHeavyAttack();
  };

  // Day/Night cycle time display helper
  const updateTimeDisplay = () => {
    const dayNightManager = worldInstance.getDayNightManager();
    if (dayNightManager) {
      const timeInfo = dayNightManager.getTimeInfo();
      const clockEl = document.getElementById('clock-text');
      if (clockEl) clockEl.textContent = timeInfo.formattedTime;
    }
  };
  const updateUnits = () => {
    units.forEach((_unit, index) => {
      if (_unit.model.position.y < WATER_SPEED_LEVEL) {
        _unit.effects.running.pauseEmitter();
        _unit.effects.runningInWater.resumeEmitter();
      } else {
        _unit.effects.running.resumeEmitter();
        _unit.effects.runningInWater.pauseEmitter();
      }

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
      if (unit.userData.isStunned) return;

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

      const direction = new THREE.Vector3().subVectors(
        unit.userData.isAttacking
          ? character.model.position
          : unit.userData.target,
        unit.position,
      );
      // Flatten direction to horizontal plane (ignore Y component)
      direction.y = 0;
      direction.normalize();
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
    if (inputManager.isActionActive('throwApple')) {
      const now = performance.now();
      if (
        now - lastThrowTime > throwCooldown &&
        gameState.collectedApples > 0
      ) {
        gameState.collectedApples--;
        throwApple();
        lastThrowTime = now;
      }
    }
  };

  const updateRollRoutine = () => {
    const now = performance.now();
    const rollActive = inputManager.isActionActive('roll');

    if (rollActive && !isRolling) {
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
          (inputManager.isActionActive('run') ? FAST_ROLL_SPEED : ROLL_SPEED) *
            cycleData.delta,
        );
        handleTerrainHeight(character);
      }
    }
  };

  const cinamaticCameraController = createCinematicCameraController(camera, [
    {
      from: new THREE.Vector3(
        startingPosition.x - 15,
        11,
        startingPosition.z - 15,
      ),
      to: new THREE.Vector3(startingPosition.x - 10, 12, startingPosition.z),
      lookAt: new THREE.Vector3(
        character.model.position.x,
        12,
        character.model.position.z,
      ),
      duration: 5.5,
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

    // Update input manager
    inputManager.update(cycleData.delta);

    updateRollRoutine();

    updateApples();
    updateTimeDisplay();

    cinamaticCameraController.update(cycleData.delta);

    // Render CSS2D labels
    labelRenderer.render(scene, camera);
  });

  // Start the THREE Play update loop
  worldInstance.start();
});
