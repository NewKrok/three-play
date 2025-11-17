import { createWorld } from '@newkrok/three-play';
import type {
  ProjectileManager,
  UnitManagerType,
  Unit,
} from '@newkrok/three-play';
import {
  updateParticleSystems,
  createParticleSystem,
} from 'https://esm.sh/@newkrok/three-particles';
import { createAppleProjectileDefinition } from './projectiles-config.js';
import {
  humanUnitDefinition,
  zombieUnitDefinition,
} from './unit-definitions.js';

import * as THREE from 'three';
import {
  runningEffect,
  runningInWaterEffect,
  dustEffect,
  splashEffect,
} from './effects-config.js';
import worldConfig from './world-config.js';
import * as Constants from './constants.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/Addons.js';
import { LIGHT_ATTACK_ACTION_DELAY } from './constants.js';

// Destructure constants for easier access
const {
  WALK_SPEED,
  RUN_SPEED,
  ROLL_SPEED,
  FAST_ROLL_SPEED,
  WATER_SPEED_MULTIPLIER,
  WATER_SPEED_LEVEL,
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
  STAMINA_FOR_LIGHT_ATTACK,
  LIGHT_ATTACK_COOLDOWN,
  STAMINA_FOR_HEAVY_ATTACK,
  HEAVY_ATTACK_COOLDOWN,
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
let trees = [];
let character: Unit | null = null;

let crates = [];
let nearbyCreateOutlines = new Map();
let crateProxyMeshes = new Map(); // Individual meshes for outlined crates
let lastThrowTime = 0;
let lastRollTime = 0;

// Unit and Projectile systems
let unitManager: UnitManagerType;
let projectileManager: ProjectileManager;
let lastLightAttackTime = 0;
let lastHeavyAttackTime = 0;
let isRolling = false;
let isAttacking = false;
const throwCooldown = 250;
const rollCooldown = 500;
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

worldConfig.units = {
  enabled: true,
  maxUnits: 50,
  enableCollision: true,
  collision: {
    minDistance: 1.0,
    pushStrength: 0.5,
  },
  definitions: [humanUnitDefinition, zombieUnitDefinition],
} as any;

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

  // Get unit manager from world instance
  unitManager = worldInstance.getUnitManager();

  if (!unitManager) {
    logger.error('Unit manager not available - check world config');
    return;
  }

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

  // Create player character using unit manager
  character = unitManager.createUnit({
    definitionId: 'human-player',
    position: startingPosition,
  });

  if (character) {
    // Add particle effects to character
    const runningEffectParticleSystem = createParticleSystem(
      runningEffect,
      cycleData.now,
    );
    const runningEffectInstance = runningEffectParticleSystem.instance;
    character.model.add(runningEffectInstance);

    const runningInWaterEffectParticleSystem = createParticleSystem(
      runningInWaterEffect,
      cycleData.now,
    );
    const runningInWaterEffectInstance =
      runningInWaterEffectParticleSystem.instance;
    character.model.add(runningInWaterEffectInstance);

    const { instance: dustEffectInstance } = createParticleSystem(
      dustEffect,
      cycleData.now,
    );
    character.model.add(dustEffectInstance);

    // Store effects in character userData for later access
    character.userData.effects = {
      running: runningEffectParticleSystem,
      runningInWater: runningInWaterEffectParticleSystem,
    };
  }

  // Configure day/night system to follow the main character for optimized shadows
  const dayNightManager = worldInstance.getDayNightManager();
  if (dayNightManager && character) {
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

  // Create enemies using unit manager
  const createEnemies = async (count: number) => {
    for (let i = 0; i < count; i++) {
      const position = startingPosition.clone();
      position.x += 10 + i * 1.5 - Math.floor(i / 5) * (5 * 1.5);
      position.z += -10 + Math.floor(i / 5) * 2;
      position.y = heightmapUtils.getHeightFromPosition(position);

      const enemy = unitManager.createUnit({
        definitionId: 'zombie-enemy',
        position,
      });

      if (enemy) {
        logger.info(`Created enemy ${i + 1}/${count}`);
      }
    }
  };

  createEnemies(ENEMY_COUNT);

  // Initialize combat for player character
  if (character) {
    unitManager.initializeCombat(character, MAX_STAMINA);
  }

  // Create world objects (trees, rocks, crates) - same as original
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

  // Initialize projectile manager
  const appleProjectileDefinition = createAppleProjectileDefinition(
    appleGeometry,
    appleMaterial,
    throwSpread,
  );

  projectileManager = worldInstance.getProjectileManager();

  if (projectileManager) {
    projectileManager.registerDefinition(appleProjectileDefinition);
  } else {
    logger.warn('Projectile manager not available - check world config');
  }

  // Set up projectile event handlers
  projectileManager.onHit((event) => {
    const { projectile, target, position } = event;

    if (projectile.definition.id === 'apple') {
      // Create splash effect
      const { instance: splashEffectInstance, dispose } = createParticleSystem(
        splashEffect,
        cycleData.now,
      );
      splashEffectInstance.position.copy(position);
      scene.add(splashEffectInstance);
      setTimeout(dispose, 1000);

      // Check if hit a unit (enemy) using unit manager
      const allUnits = unitManager.getAllUnits();
      for (const unit of allUnits) {
        if (unit === character) continue; // Don't hit the player
        const dist = position.distanceTo(unit.model.position);
        if (dist < APPLE_HIT_RADIUS) {
          // Apply knockback using unit physics
          const away = unit.model.position.clone().sub(position).normalize();
          const knockback = away.multiplyScalar(APPLE_PUSH_FORCE);

          // Add knockback to unit
          if (!unit.userData.knockbackVelocity)
            unit.userData.knockbackVelocity = new THREE.Vector3();
          unit.userData.knockbackVelocity.add(knockback);

          // Show floating text
          showFloatingLabel({
            text: getSplashText(),
            position: unit.model.position,
          });

          // Update score
          gameState.score++;
          break;
        }
      }
    }
  });

  // Create trees with apples
  for (let i = 0; i < TREE_COUNT; i++) {
    const scale = 1 + Math.random();
    const position = heightmapUtils.getPositionByHeight(9);
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

  // Create rocks
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
    const position = heightmapUtils.getPositionByHeight(7);
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

  // Create crates
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
    const position = heightmapUtils.getPositionByHeight(WATER_LEVEL);
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

  // Helper functions
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

  const updateCamera = () => {
    if (!character) return;
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

  // Player input handling
  const handlePlayerInput = () => {
    if (!character) return;

    // Movement input
    const moveLeft = inputManager.isActionActive('moveLeft');
    const moveRight = inputManager.isActionActive('moveRight');
    const moveUp = inputManager.isActionActive('moveUp');
    const moveDown = inputManager.isActionActive('moveDown');
    const isRunningKey = inputManager.isActionActive('run');

    // Calculate direction
    if (moveLeft) direction = Math.PI;
    if (moveRight) direction = 0;
    if (moveUp) direction = Math.PI / 2;
    if (moveDown) direction = -Math.PI / 2;
    if (moveLeft && moveUp) direction = Math.PI - Math.PI / 4;
    if (moveLeft && moveDown) direction = Math.PI + Math.PI / 4;
    if (moveRight && moveUp) direction = Math.PI / 4;
    if (moveRight && moveDown) direction = Math.PI + (Math.PI / 4) * 3;

    // Apply rotation
    if (!isRolling && !isAttacking) {
      rotationTargetQuaternion.setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        direction,
      );
      character.model.quaternion.slerp(
        rotationTargetQuaternion,
        cycleData.delta * (isAttacking ? 0.5 : 10),
      );
    }

    // Handle movement
    const isMoving = moveLeft || moveRight || moveUp || moveDown;
    let isRunning = false;

    if (isMoving && isRunningKey && !isRolling && !isAttacking) {
      if (gameState.stamina > 0) {
        isRunning = true;
        gameState.stamina -= STAMINA_DRAIN * cycleData.delta;
        gameState.stamina = Math.max(gameState.stamina, 0);
      }
    } else {
      gameState.stamina += STAMINA_RECOVERY * cycleData.delta;
      gameState.stamina = Math.min(gameState.stamina, MAX_STAMINA);
    }

    if (isMoving && !isRolling && !isAttacking) {
      character.model.getWorldDirection(charactersWorldDirection);
      correctedDir.set(
        charactersWorldDirection.z,
        0,
        -charactersWorldDirection.x,
      );
      character.userData.oldPos = character.model.position.clone();
      character.model.position.addScaledVector(
        correctedDir,
        (isRunning ? RUN_SPEED : WALK_SPEED) *
          (character.model.position.y < WATER_SPEED_LEVEL
            ? WATER_SPEED_MULTIPLIER
            : 1) *
          cycleData.delta,
      );

      // Use unit manager for animation
      if (isRunning) {
        unitManager.playAnimation(character, 'run');
      } else {
        unitManager.playAnimation(character, 'walk');
      }

      // Handle terrain height
      const terrainHeight = heightmapUtils.getHeightFromPosition(
        new THREE.Vector3(
          character.model.position.x,
          0,
          character.model.position.z,
        ),
      );
      if (terrainHeight < WATER_LEVEL - 0.5) {
        character.model.position.copy(character.userData.oldPos);
      }
    } else if (!isRolling && !isAttacking) {
      unitManager.playAnimation(character, 'idle');
    }

    // Handle combat
    handleCombatInput();
    handleRollInput();
    handleThrowInput();
  };

  const handleCombatInput = () => {
    if (!character) return;

    const now = performance.now();

    // Light attack
    if (
      inputManager.isActionActive('lightAttack') &&
      !isRolling &&
      !isAttacking &&
      lastLightAttackTime + LIGHT_ATTACK_COOLDOWN < now &&
      gameState.stamina >= STAMINA_FOR_LIGHT_ATTACK
    ) {
      isAttacking = true;
      lastLightAttackTime = now;
      gameState.stamina -= STAMINA_FOR_LIGHT_ATTACK;
      gameState.stamina = Math.max(gameState.stamina, 0);

      // Use unit manager for combat
      const result = unitManager.performLightAttack(character, now);
      unitManager.playAnimation(character, 'lightAttack');

      setTimeout(() => {
        isAttacking = false;
        unitManager.playAnimation(character, 'idle');
      }, LIGHT_ATTACK_ACTION_DELAY); // Approximate attack duration
    }

    // Heavy attack
    if (
      inputManager.isActionActive('heavyAttack') &&
      !isRolling &&
      !isAttacking &&
      lastHeavyAttackTime + HEAVY_ATTACK_COOLDOWN < now &&
      gameState.stamina >= STAMINA_FOR_HEAVY_ATTACK
    ) {
      isAttacking = true;
      lastHeavyAttackTime = now;
      gameState.stamina -= STAMINA_FOR_HEAVY_ATTACK;
      gameState.stamina = Math.max(gameState.stamina, 0);

      // Use unit manager for heavy attack
      const result = unitManager.performHeavyAttack(character, now);
      unitManager.playAnimation(character, 'heavyAttack');

      setTimeout(() => {
        isAttacking = false;
        unitManager.playAnimation(character, 'idle');
      }, Constants.HEAVY_ATTACK_ACTION_DELAY); // Approximate attack duration
    }
  };

  const handleRollInput = () => {
    if (!character) return;

    const now = performance.now();
    const rollActive = inputManager.isActionActive('roll');

    if (rollActive && !isRolling) {
      if (now - lastRollTime > rollCooldown) {
        isRolling = true;
        unitManager.playAnimation(character, 'roll');
        lastRollTime = now;
      }
    } else if (isRolling) {
      // Handle roll movement and end
      if (lastRollTime + 1000 <= now) {
        // Approximate roll duration
        isRolling = false;
        unitManager.playAnimation(character, 'idle');
      } else {
        const forward = new THREE.Vector3(1, 0, 0);
        forward.applyQuaternion(character.model.quaternion);
        character.userData.oldPos = character.model.position.clone();
        character.model.position.addScaledVector(
          forward,
          (inputManager.isActionActive('run') ? FAST_ROLL_SPEED : ROLL_SPEED) *
            cycleData.delta,
        );

        // Handle terrain height
        const terrainHeight = heightmapUtils.getHeightFromPosition(
          character.model.position,
        );
        if (terrainHeight < WATER_LEVEL - 0.5) {
          character.model.position.copy(character.userData.oldPos);
        }
      }
    }
  };

  const handleThrowInput = () => {
    if (!character) return;

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

  const throwApple = () => {
    if (!character) return;

    const origin = character.model.position.clone();
    origin.y += 0.5; // Throw from slightly above character

    // Get character's forward direction
    const direction = character.model.getWorldDirection(new THREE.Vector3());
    direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);

    // Add some upward trajectory
    direction.y += 0.2;
    direction.normalize();

    // Launch projectile with spread and strength
    const projectile = projectileManager.launch({
      definitionId: 'apple',
      origin,
      direction,
      strength: throwStrength,
      userData: { thrownBy: 'player' },
    });

    if (projectile) {
      logger.info('Apple thrown successfully!');
    } else {
      logger.warn('Failed to throw apple - no projectiles available');
    }
  };

  // Handle world object interactions
  const handleWorldInteractions = () => {
    if (!character) return;

    const allUnits = unitManager.getAllUnits();

    for (const unit of allUnits) {
      // Handle tree collisions and apple collection
      for (const tree of trees) {
        const { position, appleIndices, isActive } = tree;
        const dist = unit.model.position.distanceTo(position);

        if (dist < TREE_COLLISION_RADIUS) {
          const away = unit.model.position.clone().sub(position).normalize();
          unit.model.position.addScaledVector(
            away,
            (TREE_COLLISION_RADIUS - dist) * 0.2,
          );

          if (unit === character && appleIndices && isActive) {
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

      // Handle crate interactions
      for (const crate of crates) {
        const { position, effect, index, isActive } = crate;
        if (!isActive) continue;

        const dist = unit.model.position.distanceTo(position);

        // Check if player is nearby for outline effect
        if (unit === character) {
          const isNearby = dist < CRATE_INTERACTION_RADIUS;
          const hasOutline = nearbyCreateOutlines.has(index);

          if (isNearby && !hasOutline) {
            // Create individual mesh for this crate to apply outline
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
          const away = unit.model.position.clone().sub(position).normalize();
          unit.model.position.addScaledVector(
            away,
            (CRATE_COLLISION_RADIUS - dist) * 0.2,
          );

          if (unit === character && isActive) {
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
              text: JSON.stringify(effect),
              position: character.model.position,
            });
            removeCrate(index);
          }
        }
      }
    }
  };

  // Update particle effects based on character position
  const updateParticleEffects = () => {
    if (!character) return;

    if (character.model.position.y < WATER_SPEED_LEVEL) {
      character.userData.effects.running.pauseEmitter();
      character.userData.effects.runningInWater.resumeEmitter();
    } else {
      character.userData.effects.running.resumeEmitter();
      character.userData.effects.runningInWater.pauseEmitter();
    }
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

  // Update characters Y position based on heightmap
  const updateCharactersYPosition = () => {
    const allUnits = unitManager.getAllUnits();
    allUnits.forEach((unit) => {
      unit.model.position.y = heightmapUtils.getHeightFromPosition(
        unit.model.position,
      );
    });
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
        character?.model.position.x || 0,
        12,
        character?.model.position.z || 0,
      ),
      duration: 0.5,
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
      handlePlayerInput();
    }

    // Update world interactions
    handleWorldInteractions();

    // Update particle effects
    updateParticleEffects();

    // Update character positions
    updateCharactersYPosition();

    // UnitManager handles all unit updates automatically (AI, animation, combat, physics)
    // No need for manual updateUnits() as the UnitManager is called in worldInstance.onUpdate()

    updateTimeDisplay();
    cinamaticCameraController.update(cycleData.delta);

    // Render CSS2D labels
    labelRenderer.render(scene, camera);
  });

  // Start the THREE Play update loop
  worldInstance.start();
});
