import {
  createWorld,
  createHealthBarManager,
  createDamageNumbersManager,
} from '@newkrok/three-play';
import type {
  ProjectileManager,
  UnitManagerType,
  Unit,
  HealthBarManager,
  DamageNumbersManager,
} from '@newkrok/three-play';
import {
  updateParticleSystems,
  createParticleSystem,
} from 'https://esm.sh/@newkrok/three-particles';
import { createAppleProjectileDefinition } from './projectiles-config.js';
import {
  humanUnitDefinition,
  zombieUnitDefinition,
  soldierUnitDefinition,
} from './unit-definitions.js';
import { decorateUnit, COLOR_THEMES } from './unit-decorators.js';
import { createUIManager } from './ui/index.js';
import type { UIManager } from './ui/index.js';

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
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Destructure constants for easier access
const {
  WALK_SPEED,
  RUN_SPEED,
  AIM_WALK_SPEED,
  ROLL_SPEED,
  FAST_ROLL_SPEED,
  DASH_SPEED,
  BACKWARD_SPEED_MULTIPLIER,
  WATER_SPEED_MULTIPLIER,
  WATER_SPEED_LEVEL,
  DISTANCE_FROM_CAMERA,
  SMALL_ROCK_COUNT,
  LARGE_ROCK_COUNT,
  LARGE_ROCK_COLLISION_RADIUS,
  TREE_COUNT,
  CRATE_COUNT,
  TREE_COLLISION_RADIUS,
  CRATE_COLLISION_RADIUS,
  CRATE_INTERACTION_RADIUS,
  MIN_APPLES_PER_TREE,
  MAX_APPLES_PER_TREE,
  APPLE_HIT_RADIUS,
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

const zombieSpawnPos = new THREE.Vector3(
  Constants.zombieSpawnPosition.x,
  Constants.zombieSpawnPosition.y,
  Constants.zombieSpawnPosition.z,
);

const zombieTargetPos = new THREE.Vector3(
  Constants.zombieTargetPosition.x,
  Constants.zombieTargetPosition.y,
  Constants.zombieTargetPosition.z,
);

const soldierSpawnPos = new THREE.Vector3(
  Constants.soldierSpawnPosition.x,
  Constants.soldierSpawnPosition.y,
  Constants.soldierSpawnPosition.z,
);

const soldierTargetPos = new THREE.Vector3(
  Constants.soldierTargetPosition.x,
  Constants.soldierTargetPosition.y,
  Constants.soldierTargetPosition.z,
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

let trees = [];
let largeRocks = [];
let character: Unit | null = null;

let crates = [];
let nearbyCreateOutlines = new Map();
let crateProxyMeshes = new Map(); // Individual meshes for outlined crates
let lastRollTime = 0;
let lastDashTime = 0;
let isMousePressed = false;
let isDashing = false;

// Unit and Projectile systems
let unitManager: UnitManagerType;
let projectileManager: ProjectileManager;
let uiManager: UIManager;
let healthBarManager: HealthBarManager;
let damageNumbersManager: DamageNumbersManager;
let lastLightAttackTime = 0;
let lastHeavyAttackTime = 0;
let isRolling = false;
let lastSpawnTime = 0;
let zombieCount = 0;
let soldierCount = 0;
// Note: isAttacking is now tracked in character.combat.isAttacking
const isAttacking = () => character?.combat?.isAttacking ?? false;
let isAiming = false;
let aimCameraOffset = new THREE.Vector3(0, 0, 0);
let aimCameraLookAtOffset = new THREE.Vector3(0, 0, 0);
let previousRotation = 0;
let currentAngularVelocity = 0;
let smoothedAngularVelocity = 0;
let isTurning = false;
const rollCooldown = 500;
const dashCooldown = 800;
const dashDuration = 200;
const throwSpread = 0.02; // Used by projectile config
const rotationTargetQuaternion = new THREE.Quaternion();
const dummy = new THREE.Object3D();
const mousePosition = new THREE.Vector2();
const raycasterMouse = new THREE.Raycaster();
const mouseWorldPosition = new THREE.Vector3();

const gameState = {
  collectedApples: 0,
  score: 0,
  health: MAX_HEALTH,
  maxHealth: MAX_HEALTH,
  stamina: MAX_STAMINA,
  maxStamina: MAX_STAMINA,
};

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
labelRenderer.domElement.style.pointerEvents = 'none';
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
  maxUnits: 100,
  enableCollision: true,
  collision: {
    minDistance: 1.0,
    pushStrength: 0.5,
  },
  definitions: [humanUnitDefinition, zombieUnitDefinition, soldierUnitDefinition],
} as any;

// Set up projectile collision detection callback
worldConfig.projectiles = {
  enabled: true,
  maxProjectiles: 100,
  checkObjectCollision: (projectile, radius) => {
    // This will be called during projectile update to check collisions
    const unitManagerInstance = worldInstance?.getUnitManager();
    if (!unitManagerInstance) return null;

    const allUnits = unitManagerInstance.getAllUnits();

    for (const unit of allUnits) {
      // Don't hit the player or soldiers (allies)
      if (character && unit === character) continue;
      if (unit.definition?.type === 'npc') continue; // Skip soldiers

      // Check collision with unit's body using a capsule approximation
      // Check if projectile is within horizontal range
      const horizontalDist = Math.sqrt(
        Math.pow(projectile.position.x - unit.model.position.x, 2) +
          Math.pow(projectile.position.z - unit.model.position.z, 2),
      );

      if (horizontalDist < radius + APPLE_HIT_RADIUS) {
        // Check if projectile is within vertical range (0.3 to 1.8 meters above ground)
        const verticalOffset = projectile.position.y - unit.model.position.y;
        if (verticalOffset >= 0.3 && verticalOffset <= 1.8) {
          // Hit detected! Calculate hit point on unit's body
          const unitBodyPosition = unit.model.position.clone();
          unitBodyPosition.y += Math.max(0.3, Math.min(1.8, verticalOffset));

          return {
            object: unit.model,
            point: projectile.position.clone(),
            normal: projectile.position
              .clone()
              .sub(unitBodyPosition)
              .normalize(),
          };
        }
      }
    }

    return null; // No collision
  },
};

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

  // Set up global damage callback that combat system can use
  (window as any).showDamageNumber = (target: Unit, damageResult: any) => {
    if (damageNumbersManager && damageResult) {
      const pos = target.model.position.clone();
      pos.y += 1.5;
      damageNumbersManager.showDamage(pos, damageResult);
    }
  };

  // Initialize UI Manager
  uiManager = createUIManager({
    maxHealth: MAX_HEALTH,
    maxStamina: MAX_STAMINA,
    inventorySize: { width: 9, height: 4 },
  });

  logger.info('UI Manager initialized');

  // Initialize health bar and damage numbers managers
  healthBarManager = createHealthBarManager(scene);
  damageNumbersManager = createDamageNumbersManager(scene);
  logger.info('Health bar and damage numbers managers initialized');

  // Setup health bar manager for automatic cleanup on death
  unitManager.setHealthBarManager?.(healthBarManager);

  // Initialize debug display
  const debugDisplay = document.getElementById('debug-display');
  const updateDebugDisplay = () => {
    if (!character || !debugDisplay) return;

    debugDisplay.innerHTML = `
      <div class="debug-row">
        <span class="debug-label">X:</span>
        <span class="debug-value">${character.model.position.x.toFixed(2)}</span>
      </div>
      <div class="debug-row">
        <span class="debug-label">Y:</span>
        <span class="debug-value">${character.model.position.y.toFixed(2)}</span>
      </div>
      <div class="debug-row">
        <span class="debug-label">Z:</span>
        <span class="debug-value">${character.model.position.z.toFixed(2)}</span>
      </div>
    `;
  };

  // Append renderer to DOM
  document.querySelector('#demo').appendChild(renderer.domElement);

  // Disable context menu on right click
  renderer.domElement.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });

  // Mouse button press/release handlers for throwing
  renderer.domElement.addEventListener('mousedown', (event) => {
    // Left click (button 0)
    if (event.button === 0) {
      isMousePressed = true;
    }
  });

  renderer.domElement.addEventListener('mouseup', (event) => {
    // Left click (button 0)
    if (event.button === 0) {
      isMousePressed = false;
    }
  });

  // Get crosshair element
  const crosshairElement = document.getElementById('crosshair');

  // Mouse movement tracking for aim mode
  renderer.domElement.addEventListener('mousemove', (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mousePosition.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mousePosition.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update crosshair position
    if (crosshairElement) {
      crosshairElement.style.left = `${event.clientX}px`;
      crosshairElement.style.top = `${event.clientY}px`;
    }
  });

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
  character = decorateUnit(
    unitManager.createUnit({
      definitionId: 'human-player',
      position: startingPosition,
    }),
    COLOR_THEMES.default,
  );

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

  // Shared onDamage handler for all units
  const handleUnitDamage = (attacker: any, target: any) => {
    // Death is now automatically handled by the core combat system
    // We only need to handle game-specific logic here

    // Update score if player killed an enemy
    if (target.stats.health <= 0 && attacker === character && target.team !== character.team) {
      gameState.score++;

      // Decrease counter when unit dies
      if (target.definition?.type === 'enemy') {
        zombieCount--;
      } else if (target.definition?.type === 'npc') {
        soldierCount--;
      }
    }
  };

  // Spawn a single zombie
  const spawnZombie = () => {
    if (zombieCount >= Constants.MAX_ZOMBIES) return;

    // Randomize spawn position within 2 meter radius
    const randomOffset = new THREE.Vector2(
      (Math.random() - 0.5) * 4, // -2 to +2 meters on X
      (Math.random() - 0.5) * 4  // -2 to +2 meters on Z
    );

    const position = zombieSpawnPos.clone();
    position.x += randomOffset.x;
    position.z += randomOffset.y;
    position.y = heightmapUtils.getHeightFromPosition(position);

    const enemy = decorateUnit(
      unitManager.createUnit({
        definitionId: 'zombie-enemy',
        position,
      }),
      COLOR_THEMES.zombie,
    );

    if (enemy) {
      // Initialize health tracking (3 hits to kill)
      enemy.userData.health = 3;
      enemy.userData.isDead = false;

      // Initialize AI behavior for enemy - spawn position as home
      unitManager.initializeAIBehavior(enemy, position);

      // Manually set AI to move to target position (as if returning home)
      const behaviorData = unitManager.getAIBehaviorData(enemy);
      if (behaviorData) {
        behaviorData.state = 'return'; // Use 'return' state which uses 'run' animation
        behaviorData.homePosition.copy(zombieTargetPos); // Set target as "home"
        behaviorData.targetPosition.copy(zombieTargetPos); // Set immediate target
        behaviorData.isMoving = true; // Start moving immediately
      }

      // Initialize combat for enemy
      unitManager.initializeCombat(enemy, 100, {
        onDamage: handleUnitDamage,
      });

      // Add health bar to enemy
      healthBarManager.createHealthBar(enemy, {
        yOffset: 2.2,
        alwaysShow: false,
      });

      zombieCount++;
      logger.info(`Spawned zombie (${zombieCount}/${Constants.MAX_ZOMBIES})`);
    }
  };

  // Spawn a single soldier
  const spawnSoldier = () => {
    if (soldierCount >= Constants.MAX_SOLDIERS) return;

    // Randomize spawn position within 2 meter radius
    const randomOffset = new THREE.Vector2(
      (Math.random() - 0.5) * 4, // -2 to +2 meters on X
      (Math.random() - 0.5) * 4  // -2 to +2 meters on Z
    );

    const position = soldierSpawnPos.clone();
    position.x += randomOffset.x;
    position.z += randomOffset.y;
    position.y = heightmapUtils.getHeightFromPosition(position);

    const soldier = decorateUnit(
      unitManager.createUnit({
        definitionId: 'soldier-ally',
        position,
      }),
      COLOR_THEMES.soldier,
    );

    if (soldier) {
      // Initialize health tracking
      soldier.userData.health = 5; // Soldiers are tougher than zombies
      soldier.userData.isDead = false;

      // Initialize AI behavior for soldier - spawn position as home
      unitManager.initializeAIBehavior(soldier, position);

      // Manually set AI to move to target position (as if returning home)
      const behaviorData = unitManager.getAIBehaviorData(soldier);
      if (behaviorData) {
        behaviorData.state = 'return'; // Use 'return' state which uses 'run' animation
        behaviorData.homePosition.copy(soldierTargetPos); // Set target as "home"
        behaviorData.targetPosition.copy(soldierTargetPos); // Set immediate target
        behaviorData.isMoving = true; // Start moving immediately
      }

      // Initialize combat for soldier
      unitManager.initializeCombat(soldier, 100, {
        onDamage: handleUnitDamage,
      });

      // Add health bar to soldier
      healthBarManager.createHealthBar(soldier, {
        yOffset: 2.2,
        alwaysShow: false,
      });

      soldierCount++;
      logger.info(`Spawned soldier (${soldierCount}/${Constants.MAX_SOLDIERS})`);
    }
  };

  // Initialize combat for player character
  if (character) {
    unitManager.initializeCombat(character, MAX_STAMINA, {
      rangedAttack: {
        actionDelay: 400,
        enableAmmo: true,
      },
      ammo: {
        canUseAmmo: (unit, ammoType) => {
          if (ammoType === 'apple' && unit === character) {
            return uiManager.getItemCount('apple') > 0;
          }
          return true; // NPCs have infinite ammo
        },
        consumeAmmo: (unit, ammoType, amount) => {
          if (ammoType === 'apple' && unit === character) {
            uiManager.removeItem('apple', amount);
            gameState.collectedApples -= amount;
          }
        },
      },
      onDamage: handleUnitDamage,
    });
    // Add health bar to player
    healthBarManager.createHealthBar(character, {
      yOffset: 2.5,
      alwaysShow: false, // Only show when damaged
    });
  }

  const treeModel = loadedAssets.models['low-poly-tree'] as any;

  // Get both meshes from the tree model (typically trunk and leaves)
  const treeMesh1 = treeModel.scene.children[0].children[0];
  const treeMesh2 = treeModel.scene.children[0].children[1];

  // Clone materials to avoid modifying the original
  const material1 = treeMesh1.material.clone();
  const material2 = treeMesh2.material.clone();

  // Ensure proper material setup for instancing
  if (material1 instanceof THREE.MeshStandardMaterial) {
    // Adjust material properties for better appearance
    material1.metalness = 0;
    material1.roughness = 1;

    // If no texture or color is too dark, set appropriate colors
    if (!material1.map) {
      material1.color.setHex(0x8b6f47); // Brown color for trunk
    } else {
      // If there's a texture but color is too dark, brighten it
      // GLTF often uses vertex colors or material color to tint textures
      if (
        material1.color.r < 0.3 &&
        material1.color.g < 0.3 &&
        material1.color.b < 0.3
      ) {
        material1.color.setHex(0xffffff); // Reset to white to show texture properly
      }
    }

    material1.needsUpdate = true;
  }
  if (material2 instanceof THREE.MeshStandardMaterial) {
    // Adjust material properties for better appearance
    material2.metalness = 0;
    material2.roughness = 1;

    // If no texture or color is too dark, set appropriate colors
    if (!material2.map) {
      material2.color.setHex(0x4a7c3f); // Green color for leaves
    } else {
      // If there's a texture but color is too dark, brighten it
      if (
        material2.color.r < 0.3 &&
        material2.color.g < 0.3 &&
        material2.color.b < 0.3
      ) {
        material2.color.setHex(0xffffff); // Reset to white to show texture properly
      }
    }

    material2.needsUpdate = true;
  }

  // Create instanced meshes for both parts
  const treeInstanceMesh1 = new THREE.InstancedMesh(
    treeMesh1.geometry,
    material1,
    TREE_COUNT,
  );
  treeInstanceMesh1.castShadow = true;
  treeInstanceMesh1.receiveShadow = true;
  scene.add(treeInstanceMesh1);

  const treeInstanceMesh2 = new THREE.InstancedMesh(
    treeMesh2.geometry,
    material2,
    TREE_COUNT,
  );
  treeInstanceMesh2.castShadow = true;
  treeInstanceMesh2.receiveShadow = true;
  scene.add(treeInstanceMesh2);

  // Map to track proxy meshes for occluded trees (now stores both meshes)
  const treeProxyMeshes = new Map<
    number,
    {
      meshes: THREE.Mesh[];
      opacity: number;
      matrix: THREE.Matrix4;
    }
  >();

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
  // Visual effects only - damage is handled by the combat system
  projectileManager.onHit((event) => {
    const { projectile, position } = event;

    if (projectile.definition.id === 'apple') {
      // Create splash effect
      const { instance: splashEffectInstance, dispose } = createParticleSystem(
        splashEffect,
        cycleData.now,
      );
      splashEffectInstance.position.copy(position);
      scene.add(splashEffectInstance);
      setTimeout(dispose, 1000);
    }
  });

  // Create trees with apples
  for (let i = 0; i < TREE_COUNT; i++) {
    const scale = 1.5 + Math.random();
    const position = heightmapUtils.getPositionByHeight(9);
    if (!position) continue;

    const { x, z } = position;
    const y = position.y - 1 * scale;

    dummy.position.set(x, y + 1 * scale, z);
    dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    // Set same matrix for both tree parts
    treeInstanceMesh1.setMatrixAt(i, dummy.matrix);
    treeInstanceMesh2.setMatrixAt(i, dummy.matrix);

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
  treeInstanceMesh1.instanceMatrix.needsUpdate = true;
  treeInstanceMesh2.instanceMatrix.needsUpdate = true;
  appleMesh.instanceMatrix.needsUpdate = true;

  const removeApplesFromTree = (indices) => {
    for (const idx of indices) {
      dummy.position.set(0, -100, 0);
      dummy.updateMatrix();
      appleMesh.setMatrixAt(idx, dummy.matrix);
    }
    appleMesh.instanceMatrix.needsUpdate = true;
  };

  // Create small decorative rocks (rock-1) - walkable
  const smallRockModel = loadedAssets.models['low-poly-rock-1'] as any;
  const smallRockMesh = smallRockModel.scene.children[0].children[0];
  const smallRockMaterial = smallRockMesh.material.clone();

  if (smallRockMaterial instanceof THREE.MeshStandardMaterial) {
    smallRockMaterial.metalness = 0;
    smallRockMaterial.roughness = 1;
    if (!smallRockMaterial.map) {
      smallRockMaterial.color.setHex(0x888888);
    }
    smallRockMaterial.needsUpdate = true;
  }

  const smallRockInstanceMesh = new THREE.InstancedMesh(
    smallRockMesh.geometry,
    smallRockMaterial,
    SMALL_ROCK_COUNT,
  );
  smallRockInstanceMesh.castShadow = true;
  smallRockInstanceMesh.receiveShadow = true;
  scene.add(smallRockInstanceMesh);

  for (let i = 0; i < SMALL_ROCK_COUNT; i++) {
    const position = heightmapUtils.getPositionByHeight(7);
    if (!position) continue;

    const { x, y, z } = position;
    const scale = 0.5 + Math.random() * 0.4; // 0.5-0.9x scale (small pebbles)

    dummy.position.set(x, y, z);
    dummy.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
    );
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    smallRockInstanceMesh.setMatrixAt(i, dummy.matrix);
  }
  smallRockInstanceMesh.instanceMatrix.needsUpdate = true;

  // Create large rocks (rock-2) - not walkable, with collision
  const largeRockModel = loadedAssets.models['low-poly-rock-2'] as any;
  const largeRockMesh = largeRockModel.scene.children[0].children[0];
  const largeRockMaterial = largeRockMesh.material.clone();

  if (largeRockMaterial instanceof THREE.MeshStandardMaterial) {
    largeRockMaterial.metalness = 0;
    largeRockMaterial.roughness = 1;
    if (!largeRockMaterial.map) {
      largeRockMaterial.color.setHex(0x888888);
    }
    largeRockMaterial.needsUpdate = true;
  }

  const largeRockInstanceMesh = new THREE.InstancedMesh(
    largeRockMesh.geometry,
    largeRockMaterial,
    LARGE_ROCK_COUNT,
  );
  largeRockInstanceMesh.castShadow = true;
  largeRockInstanceMesh.receiveShadow = true;
  scene.add(largeRockInstanceMesh);

  for (let i = 0; i < LARGE_ROCK_COUNT; i++) {
    const position = heightmapUtils.getPositionByHeight(9);
    if (!position) continue;

    const { x, y, z } = position;
    const scale = 1.5 + Math.random() * 1.5; // 1.5-3.0x scale (large obstacles)

    dummy.position.set(x, y, z);
    dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    largeRockInstanceMesh.setMatrixAt(i, dummy.matrix);

    // Store large rock data for collision detection
    const largeRock = {
      position: dummy.position.clone(),
    };
    largeRocks.push(largeRock);
  }
  largeRockInstanceMesh.instanceMatrix.needsUpdate = true;

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
  const updateCamera = () => {
    if (!character) return;

    let targetCameraPosition = new THREE.Vector3(
      character.model.position.x,
      character.model.position.y + DISTANCE_FROM_CAMERA,
      character.model.position.z + 8,
    );

    let targetLookAt = character.model.position.clone();

    // In aim mode, calculate target offset but lerp smoothly towards it
    if (isAiming && mouseWorldPosition) {
      const targetAimOffset = new THREE.Vector3()
        .subVectors(mouseWorldPosition, character.model.position)
        .normalize()
        .multiplyScalar(4); // Fixed offset distance

      // Smoothly interpolate current offset towards target (takes ~1 second)
      aimCameraOffset.lerp(targetAimOffset, cycleData.delta * 2);
      aimCameraLookAtOffset.lerp(targetAimOffset, cycleData.delta * 2);
    } else {
      // When not aiming, smoothly return to zero offset
      aimCameraOffset.lerp(new THREE.Vector3(0, 0, 0), cycleData.delta * 3);
      aimCameraLookAtOffset.lerp(
        new THREE.Vector3(0, 0, 0),
        cycleData.delta * 3,
      );
    }

    // Apply the smoothed offset
    targetCameraPosition.x += aimCameraOffset.x;
    targetCameraPosition.z += aimCameraOffset.z;
    targetLookAt.x += aimCameraLookAtOffset.x;
    targetLookAt.z += aimCameraLookAtOffset.z;

    camera.position.lerp(targetCameraPosition, cycleData.delta * 5);
    camera.lookAt(targetLookAt);
  };

  // Player input handling
  const handlePlayerInput = () => {
    if (!character) return;

    // Check aim mode
    const wasAiming = isAiming;
    isAiming = inputManager.isActionActive('aim');

    // Reset turn state when exiting aim mode
    if (wasAiming && !isAiming) {
      isTurning = false;
      smoothedAngularVelocity = 0;
      currentAngularVelocity = 0;
    }

    // Toggle crosshair visibility based on aim mode
    if (crosshairElement) {
      if (isAiming) {
        crosshairElement.classList.add('active');
        document.body.classList.add('aim-mode');
      } else {
        crosshairElement.classList.remove('active');
        document.body.classList.remove('aim-mode');
      }
    }

    // Movement input
    const moveLeft = inputManager.isActionActive('moveLeft');
    const moveRight = inputManager.isActionActive('moveRight');
    const moveUp = inputManager.isActionActive('moveUp');
    const moveDown = inputManager.isActionActive('moveDown');
    const isRunningKey = inputManager.isActionActive('run') && !isAiming;

    // Calculate movement direction relative to mouse position
    let movementDirection = new THREE.Vector3(0, 0, 0);

    // Get direction from character to mouse
    const toMouse = new THREE.Vector3(
      mouseWorldPosition.x - character.model.position.x,
      0,
      mouseWorldPosition.z - character.model.position.z,
    );

    if (toMouse.lengthSq() > 0) {
      toMouse.normalize();

      // Calculate right vector (perpendicular to forward)
      const rightVector = new THREE.Vector3(-toMouse.z, 0, toMouse.x);

      if (isAiming) {
        // Aim mode: allow full 8-directional movement
        // W: forward (toward mouse), S: backward (away from mouse)
        if (moveUp) movementDirection.add(toMouse);
        if (moveDown) movementDirection.sub(toMouse);

        // A: strafe left, D: strafe right (perpendicular to mouse direction)
        if (moveLeft) movementDirection.sub(rightVector);
        if (moveRight) movementDirection.add(rightVector);
      } else {
        // Normal mode: prioritize forward/backward over strafing
        if (moveUp || moveDown) {
          // If moving forward or backward, ignore strafe input
          if (moveUp) movementDirection.add(toMouse);
          if (moveDown) movementDirection.sub(toMouse);
        } else {
          // Only strafe if not moving forward/backward
          if (moveLeft) movementDirection.sub(rightVector);
          if (moveRight) movementDirection.add(rightVector);
        }
      }
    }

    if (movementDirection.lengthSq() > 0) {
      movementDirection.normalize();
    }

    // Handle rotation - always rotate toward mouse position in both modes
    if (!isRolling && !isAttacking() && !isDashing) {
      raycasterMouse.setFromCamera(mousePosition, camera);

      // Create ground plane at character's current height
      const characterGroundPlane = new THREE.Plane(
        new THREE.Vector3(0, 1, 0),
        -character.model.position.y,
      );

      const intersectPoint = new THREE.Vector3();
      raycasterMouse.ray.intersectPlane(characterGroundPlane, intersectPoint);

      if (intersectPoint) {
        mouseWorldPosition.copy(intersectPoint);
        const lookDirection = new THREE.Vector2(
          mouseWorldPosition.x - character.model.position.x,
          mouseWorldPosition.z - character.model.position.z,
        );
        // Adjust angle by -90 degrees to compensate for model orientation
        const angleToMouse =
          Math.atan2(lookDirection.x, lookDirection.y) - Math.PI / 2;

        // Get current rotation angle for angular velocity calculation
        const currentRotation = Math.atan2(
          2 *
            (character.model.quaternion.w * character.model.quaternion.y +
              character.model.quaternion.x * character.model.quaternion.z),
          1 -
            2 *
              (character.model.quaternion.y * character.model.quaternion.y +
                character.model.quaternion.z * character.model.quaternion.z),
        );

        rotationTargetQuaternion.setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          angleToMouse,
        );

        // Use slower rotation speed in aim mode, faster in normal mode
        const rotationSpeed = isAiming ? 5 : 10;
        character.model.quaternion.slerp(
          rotationTargetQuaternion,
          cycleData.delta * rotationSpeed,
        );

        // Calculate angular velocity (change in rotation per second)
        let rotationDelta = currentRotation - previousRotation;
        // Normalize to -PI to PI range
        while (rotationDelta > Math.PI) rotationDelta -= Math.PI * 2;
        while (rotationDelta < -Math.PI) rotationDelta += Math.PI * 2;

        currentAngularVelocity = rotationDelta / cycleData.delta;

        // Smooth the angular velocity using exponential moving average
        const smoothingFactor = 0.3;
        smoothedAngularVelocity =
          smoothedAngularVelocity * (1 - smoothingFactor) +
          currentAngularVelocity * smoothingFactor;

        previousRotation = currentRotation;
      }
    }

    // Handle movement
    const isMoving = moveLeft || moveRight || moveUp || moveDown;
    let isRunning = false;

    if (
      isMoving &&
      isRunningKey &&
      !isRolling &&
      !isAttacking() &&
      !isAiming &&
      !isDashing
    ) {
      if (gameState.stamina > 0) {
        isRunning = true;
        gameState.stamina -= STAMINA_DRAIN * cycleData.delta;
        gameState.stamina = Math.max(gameState.stamina, 0);
      }
    } else {
      gameState.stamina += STAMINA_RECOVERY * cycleData.delta;
      gameState.stamina = Math.min(gameState.stamina, MAX_STAMINA);
    }

    if (isMoving && !isRolling && !isAttacking() && !isDashing) {
      character.userData.oldPos = character.model.position.clone();

      // Determine movement type based on input keys
      const isForward = moveUp && !moveDown;
      const isBackward = moveDown && !moveUp;

      // Use different speed for aim mode
      const moveSpeed = isAiming
        ? AIM_WALK_SPEED
        : isRunning
          ? RUN_SPEED
          : WALK_SPEED;

      // Apply backward speed multiplier if moving backward
      const speedMultiplier = isBackward ? BACKWARD_SPEED_MULTIPLIER : 1;

      // Always use world space movement direction (same as aim mode)
      character.model.position.addScaledVector(
        movementDirection,
        moveSpeed *
          speedMultiplier *
          (character.model.position.y < WATER_SPEED_LEVEL
            ? WATER_SPEED_MULTIPLIER
            : 1) *
          cycleData.delta,
      );
      const isStrafeLeft = moveLeft && !moveRight;
      const isStrafeRight = moveRight && !moveLeft;

      // Choose animation based on input combination
      if (isAiming) {
        // Aim mode: use jog animations with full 8-directional support
        if (isForward && !isStrafeLeft && !isStrafeRight) {
          // Pure forward (W only) - toward mouse
          unitManager.playAnimation(character, 'jogForward');
        } else if (isBackward && !isStrafeLeft && !isStrafeRight) {
          // Pure backward (S only) - away from mouse
          unitManager.playAnimation(character, 'jogBackward');
        } else if (isStrafeRight) {
          // Strafe right (D key is pressed)
          unitManager.playAnimation(character, 'jogStrafeRight');
        } else if (isStrafeLeft) {
          // Strafe left (A key is pressed)
          unitManager.playAnimation(character, 'jogStrafeLeft');
        } else {
          // Default to forward for diagonal movement
          unitManager.playAnimation(character, 'jogForward');
        }
      } else {
        // Normal mode: forward/backward has priority over strafing
        if (isRunning) {
          if (isForward) {
            // Forward movement (W) - ignore A/D in normal mode
            unitManager.playAnimation(character, 'run');
          } else if (isBackward) {
            // Backward movement (S) - ignore A/D in normal mode
            unitManager.playAnimation(character, 'runningBackward');
          } else if (isStrafeRight) {
            // Strafe right only if no forward/backward
            unitManager.playAnimation(character, 'rightStrafe');
          } else if (isStrafeLeft) {
            // Strafe left only if no forward/backward
            unitManager.playAnimation(character, 'leftStrafe');
          }
        } else {
          // Walking
          if (isForward) {
            // Forward movement (W) - ignore A/D in normal mode
            unitManager.playAnimation(character, 'walk');
          } else if (isBackward) {
            // Backward movement (S) - ignore A/D in normal mode
            unitManager.playAnimation(character, 'jogBackward');
          } else if (isStrafeRight) {
            // Strafe right only if no forward/backward
            unitManager.playAnimation(character, 'jogStrafeRight');
          } else if (isStrafeLeft) {
            // Strafe left only if no forward/backward
            unitManager.playAnimation(character, 'jogStrafeLeft');
          }
        }
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
    } else if (!isRolling && !isAttacking() && !isDashing) {
      // Handle idle state with turn animations
      const turnOnThreshold = 1.5;
      const turnOffThreshold = 0.8;

      if (!isTurning && Math.abs(smoothedAngularVelocity) > turnOnThreshold) {
        isTurning = true;
      } else if (
        isTurning &&
        Math.abs(smoothedAngularVelocity) < turnOffThreshold
      ) {
        isTurning = false;
      }

      if (isTurning) {
        // Play turn animation based on direction
        if (smoothedAngularVelocity > 0) {
          unitManager.playAnimation(character, 'leftTurn');
        } else {
          unitManager.playAnimation(character, 'rightTurn');
        }
      } else {
        // Use different idle animation based on mode
        if (isAiming) {
          unitManager.playAnimation(character, 'aimIdle');
        } else {
          unitManager.playAnimation(character, 'idle');
        }
      }
    }

    // Handle combat
    handleCombatInput();
    handleRollInput();
    handleDashInput();
    handleThrowInput();
  };

  const handleCombatInput = () => {
    if (!character) return;

    const now = performance.now();

    // Light attack
    if (
      inputManager.isActionActive('lightAttack') &&
      !isRolling &&
      !isAttacking() &&
      !isDashing &&
      lastLightAttackTime + LIGHT_ATTACK_COOLDOWN < now &&
      gameState.stamina >= STAMINA_FOR_LIGHT_ATTACK
    ) {
      lastLightAttackTime = now;
      gameState.stamina -= STAMINA_FOR_LIGHT_ATTACK;
      gameState.stamina = Math.max(gameState.stamina, 0);

      // Use unit manager for combat (handles isAttacking state internally)
      const result = unitManager.performLightAttack(character, now);

      // Show damage numbers for hits
      if (result.success && result.damages.length > 0) {
        setTimeout(() => {
          result.damages.forEach(({ unit, damageResult }) => {
            if (damageResult) {
              const pos = unit.model.position.clone();
              pos.y += 1.5;
              damageNumbersManager.showDamage(pos, damageResult);
            }
          });
        }, LIGHT_ATTACK_ACTION_DELAY);
      }
    }

    // Heavy attack
    if (
      inputManager.isActionActive('heavyAttack') &&
      !isRolling &&
      !isAttacking() &&
      !isDashing &&
      lastHeavyAttackTime + HEAVY_ATTACK_COOLDOWN < now &&
      gameState.stamina >= STAMINA_FOR_HEAVY_ATTACK
    ) {
      lastHeavyAttackTime = now;
      gameState.stamina -= STAMINA_FOR_HEAVY_ATTACK;
      gameState.stamina = Math.max(gameState.stamina, 0);

      // Use unit manager for heavy attack (handles isAttacking state internally)
      const result = unitManager.performHeavyAttack(character, now);

      // Show damage numbers for hits
      if (result.success && result.damages.length > 0) {
        setTimeout(() => {
          result.damages.forEach(({ unit, damageResult }) => {
            if (damageResult) {
              const pos = unit.model.position.clone();
              pos.y += 1.5;
              damageNumbersManager.showDamage(pos, damageResult);
            }
          });
        }, Constants.HEAVY_ATTACK_ACTION_DELAY);
      }
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

  const handleDashInput = () => {
    if (!character) return;

    const now = performance.now();
    const dashActive = inputManager.isActionActive('dash');

    if (dashActive && !isDashing && !isRolling) {
      if (now - lastDashTime > dashCooldown) {
        isDashing = true;
        unitManager.playAnimation(character, 'jump');
        lastDashTime = now;
      }
    } else if (isDashing) {
      // Handle dash movement and end
      if (lastDashTime + dashDuration <= now) {
        isDashing = false;
        unitManager.playAnimation(character, 'idle');
      } else {
        const forward = new THREE.Vector3(1, 0, 0);
        forward.applyQuaternion(character.model.quaternion);
        character.userData.oldPos = character.model.position.clone();
        character.model.position.addScaledVector(
          forward,
          DASH_SPEED * cycleData.delta,
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

    // Check for mouse press and aim mode
    if (isMousePressed && isAiming && mouseWorldPosition) {
      const now = performance.now();
      // Combat system handles ammo checking and consumption via callbacks
      unitManager.performRangedAttack(character, mouseWorldPosition, now);
    }
  };

  // Handle world object interactions
  const handleWorldInteractions = () => {
    if (!character) return;

    const allUnits = unitManager.getAllUnits();

    for (const unit of allUnits) {
      // Skip dead units
      if (unit.userData.isDead) continue;
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

            // Add apples to inventory
            uiManager.addItem('apple', appleIndices.length);

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
              gameState.health = Math.min(gameState.health, MAX_HEALTH);
            }

            tree.appleIndices = null;
          }
        }
      }

      // Handle large rock collisions
      for (const rock of largeRocks) {
        const { position } = rock;
        const dist = unit.model.position.distanceTo(position);

        if (dist < LARGE_ROCK_COLLISION_RADIUS) {
          const away = unit.model.position.clone().sub(position).normalize();
          unit.model.position.addScaledVector(
            away,
            (LARGE_ROCK_COLLISION_RADIUS - dist) * 0.2,
          );
        }
      }

      // Handle crate interactions
      for (const crate of crates) {
        const { position, index, isActive } = crate;
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

            // Add 30 apples when collecting a crate
            gameState.collectedApples += 30;
            uiManager.addItem('apple', 30);
            showFloatingLabel({
              text: '+30 apples',
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

  // Occlusion detection - proxy mesh approach for per-tree transparency
  const raycaster = new THREE.Raycaster();
  const targetOpacity = 0.3;
  const fadeSpeed = 5;

  const updateTreeOcclusion = () => {
    if (!character) return;

    // Raycast from camera to character
    const cameraToCharacter = new THREE.Vector3()
      .subVectors(character.model.position, camera.position)
      .normalize();

    raycaster.set(camera.position, cameraToCharacter);
    const distance = camera.position.distanceTo(character.model.position);

    // Track which trees are currently occluding
    const currentlyOccluding = new Set<number>();

    // Temp variables for matrix decomposition
    const tempMatrix = new THREE.Matrix4();
    const tempWorldMatrix = new THREE.Matrix4();
    const tempPosition = new THREE.Vector3();
    const tempQuaternion = new THREE.Quaternion();
    const tempScale = new THREE.Vector3();

    // Check each tree by reading its actual matrix position
    for (let index = 0; index < TREE_COUNT; index++) {
      // Get actual tree position from instance matrix (use first mesh as reference)
      treeInstanceMesh1.getMatrixAt(index, tempMatrix);
      tempWorldMatrix.copy(treeInstanceMesh1.matrixWorld).multiply(tempMatrix);
      tempWorldMatrix.decompose(tempPosition, tempQuaternion, tempScale);

      const distToTree = camera.position.distanceTo(tempPosition);
      const distToCharacter = character.model.position.distanceTo(tempPosition);

      if (distToTree >= distance) continue; // Behind character or at same distance

      // Check if tree is close to the ray
      const closestPoint = new THREE.Vector3();
      raycaster.ray.closestPointToPoint(tempPosition, closestPoint);
      const distToRay = tempPosition.distanceTo(closestPoint);

      // Use larger detection radius - trees are scaled up to 2.5x (1.5 + 1.0)
      // Increased from 2.5 to 3.5 for better coverage
      const detectionRadius = TREE_COLLISION_RADIUS * 2;

      // Additional check: if tree is very close to character, always occlude
      // This catches trees where the raycast might miss due to geometry pivot offset
      const isVeryCloseToCharacter =
        distToCharacter < TREE_COLLISION_RADIUS * 2;

      if (distToRay < detectionRadius || isVeryCloseToCharacter) {
        currentlyOccluding.add(index);
      }
    }

    // Create proxy meshes for newly occluding trees
    currentlyOccluding.forEach((index) => {
      if (!treeProxyMeshes.has(index)) {
        // Create proxy meshes for both tree parts
        const proxyMeshes: THREE.Mesh[] = [];

        // Get tree's matrix from instanced mesh
        const matrix = new THREE.Matrix4();
        treeInstanceMesh1.getMatrixAt(index, matrix);

        // Apply the instance matrix to get world position
        const worldMatrix = new THREE.Matrix4();
        worldMatrix.copy(treeInstanceMesh1.matrixWorld).multiply(matrix);

        // Extract position, rotation, and scale from world matrix
        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        worldMatrix.decompose(position, quaternion, scale);

        // Create proxy for first mesh
        const proxyMaterial1 = (
          treeMesh1.material as THREE.MeshStandardMaterial
        ).clone();
        proxyMaterial1.transparent = true;
        proxyMaterial1.opacity = 1.0;
        proxyMaterial1.depthWrite = false;

        const proxyMesh1 = new THREE.Mesh(treeMesh1.geometry, proxyMaterial1);
        proxyMesh1.position.copy(position);
        proxyMesh1.quaternion.copy(quaternion);
        proxyMesh1.scale.copy(scale);
        proxyMesh1.castShadow = true;
        proxyMesh1.receiveShadow = true;
        scene.add(proxyMesh1);
        proxyMeshes.push(proxyMesh1);

        // Create proxy for second mesh
        const proxyMaterial2 = (
          treeMesh2.material as THREE.MeshStandardMaterial
        ).clone();
        proxyMaterial2.transparent = true;
        proxyMaterial2.opacity = 1.0;
        proxyMaterial2.depthWrite = false;

        const proxyMesh2 = new THREE.Mesh(treeMesh2.geometry, proxyMaterial2);
        proxyMesh2.position.copy(position);
        proxyMesh2.quaternion.copy(quaternion);
        proxyMesh2.scale.copy(scale);
        proxyMesh2.castShadow = true;
        proxyMesh2.receiveShadow = true;
        scene.add(proxyMesh2);
        proxyMeshes.push(proxyMesh2);

        // Hide original instances by scaling to 0
        dummy.position.copy(position);
        dummy.quaternion.copy(quaternion);
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        treeInstanceMesh1.setMatrixAt(index, dummy.matrix);
        treeInstanceMesh2.setMatrixAt(index, dummy.matrix);
        treeInstanceMesh1.instanceMatrix.needsUpdate = true;
        treeInstanceMesh2.instanceMatrix.needsUpdate = true;

        treeProxyMeshes.set(index, {
          meshes: proxyMeshes,
          opacity: 1.0,
          matrix,
        });
      }
    });

    // Update proxy meshes
    treeProxyMeshes.forEach((proxy, index) => {
      const isOccluding = currentlyOccluding.has(index);
      const targetAlpha = isOccluding ? targetOpacity : 1.0;

      // Fade opacity for all proxy meshes
      proxy.opacity = THREE.MathUtils.lerp(
        proxy.opacity,
        targetAlpha,
        cycleData.delta * fadeSpeed,
      );

      // Update opacity for both meshes
      proxy.meshes.forEach((mesh) => {
        (mesh.material as THREE.Material).opacity = proxy.opacity;
      });

      // Remove proxy if fully visible and restore original instances
      if (!isOccluding && proxy.opacity > 0.99) {
        proxy.meshes.forEach((mesh) => {
          scene.remove(mesh);
          mesh.geometry.dispose();
          (mesh.material as THREE.Material).dispose();
        });

        // Restore original instances for both tree parts
        treeInstanceMesh1.setMatrixAt(index, proxy.matrix);
        treeInstanceMesh2.setMatrixAt(index, proxy.matrix);
        treeInstanceMesh1.instanceMatrix.needsUpdate = true;
        treeInstanceMesh2.instanceMatrix.needsUpdate = true;

        treeProxyMeshes.delete(index);
      }
    });
  };

  // Day/Night cycle time display helper
  const updateTimeDisplay = () => {
    const dayNightManager = worldInstance.getDayNightManager();
    if (dayNightManager) {
      const timeInfo = dayNightManager.getTimeInfo();
      uiManager.updateTime(timeInfo);
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

    // Handle unit spawning
    if (elapsedTime - lastSpawnTime >= Constants.SPAWN_INTERVAL) {
      // Spawn 3 zombies for each soldier (balance)
      spawnZombie();
      spawnZombie();
      spawnZombie();
      spawnSoldier();
      lastSpawnTime = elapsedTime;
    }

    if (!cinamaticCameraController.isPlaying()) {
      updateCamera();
      handlePlayerInput();
    }

    // Update world interactions
    handleWorldInteractions();

    // Update particle effects
    updateParticleEffects();

    // Update tree occlusion (fade trees between camera and character)
    updateTreeOcclusion();

    // Update character positions
    updateCharactersYPosition();

    // UnitManager handles all unit updates automatically (AI, animation, combat, physics)
    // No need for manual updateUnits() as the UnitManager is called in worldInstance.onUpdate()
    // Death handling is now automatic via the combat system and unit definitions

    updateTimeDisplay();

    // Update UI displays
    uiManager.updateHealth(gameState.health);
    uiManager.updateStamina(gameState.stamina);

    // Update debug display
    updateDebugDisplay();

    // Update health bars and damage numbers
    healthBarManager.updateHealthBars(camera);
    damageNumbersManager.update(deltaTime, elapsedTime);

    cinamaticCameraController.update(cycleData.delta);

    // Render CSS2D labels
    labelRenderer.render(scene, camera);
  });

  // Start the THREE Play update loop
  worldInstance.start();
});
