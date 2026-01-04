import type {
  UnitManagerType,
  Unit,
  HealthBarManager,
} from '@newkrok/three-play';
import * as THREE from 'three';
import { decorateUnit, COLOR_THEMES } from './unit-decorators.js';
import * as Constants from './constants.js';

export type SpawnManagerConfig = {
  unitManager: UnitManagerType;
  heightmapUtils: any;
  healthBarManager: HealthBarManager;
  logger: any;
  zombieSpawnPos: THREE.Vector3;
  zombieTargetPos: THREE.Vector3;
  soldierSpawnPos: THREE.Vector3;
  soldierTargetPos: THREE.Vector3;
  onDamage: (attacker: any, target: any) => void;
};

export type SpawnManager = {
  spawnZombie: (isRanged?: boolean) => void;
  spawnSoldier: (isRanged?: boolean) => void;
  getZombieCount: () => number;
  getSoldierCount: () => number;
  decrementZombieCount: () => void;
  decrementSoldierCount: () => void;
};

export const createSpawnManager = (
  config: SpawnManagerConfig,
): SpawnManager => {
  const {
    unitManager,
    heightmapUtils,
    healthBarManager,
    logger,
    zombieSpawnPos,
    zombieTargetPos,
    soldierSpawnPos,
    soldierTargetPos,
    onDamage,
  } = config;

  let zombieCount = 0;
  let soldierCount = 0;

  type UnitType = 'zombie' | 'soldier';

  type UnitTypeConfig = {
    meleeDefinitionId: string;
    rangedDefinitionId: string;
    spawnPos: THREE.Vector3;
    targetPos: THREE.Vector3;
    colorTheme: any;
    maxCount: number;
    currentCount: () => number;
    incrementCount: () => void;
    logName: string;
  };

  const unitTypeConfigs: Record<UnitType, UnitTypeConfig> = {
    zombie: {
      meleeDefinitionId: 'zombie-enemy',
      rangedDefinitionId: 'zombie-ranged-enemy',
      spawnPos: zombieSpawnPos,
      targetPos: zombieTargetPos,
      colorTheme: COLOR_THEMES.zombie,
      maxCount: Constants.MAX_ZOMBIES,
      currentCount: () => zombieCount,
      incrementCount: () => { zombieCount++; },
      logName: 'zombie',
    },
    soldier: {
      meleeDefinitionId: 'soldier-ally',
      rangedDefinitionId: 'soldier-ranged-ally',
      spawnPos: soldierSpawnPos,
      targetPos: soldierTargetPos,
      colorTheme: COLOR_THEMES.soldier,
      maxCount: Constants.MAX_SOLDIERS,
      currentCount: () => soldierCount,
      incrementCount: () => { soldierCount++; },
      logName: 'soldier',
    },
  };

  // Generic spawn function for any unit type
  const spawnUnit = (unitType: UnitType, isRanged = false) => {
    const config = unitTypeConfigs[unitType];

    if (config.currentCount() >= config.maxCount) return;

    // Randomize spawn position within 2 meter radius
    const randomOffset = new THREE.Vector2(
      (Math.random() - 0.5) * 4, // -2 to +2 meters on X
      (Math.random() - 0.5) * 4, // -2 to +2 meters on Z
    );

    const position = config.spawnPos.clone();
    position.x += randomOffset.x;
    position.z += randomOffset.y;
    position.y = heightmapUtils.getHeightFromPosition(position);

    const definitionId = isRanged
      ? config.rangedDefinitionId
      : config.meleeDefinitionId;
    const unit = decorateUnit(
      unitManager.createUnit({
        definitionId,
        position,
      }),
      config.colorTheme,
    );

    if (unit) {
      // Initialize AI behavior - spawn position as home
      unitManager.initializeAIBehavior(unit, position);

      // Manually set AI to move to target position (as if returning home)
      const behaviorData = unitManager.getAIBehaviorData(unit);
      if (behaviorData) {
        behaviorData.state = 'return'; // Use 'return' state which uses 'run' animation
        behaviorData.homePosition.copy(config.targetPos); // Set target as "home"
        behaviorData.targetPosition.copy(config.targetPos); // Set immediate target
        behaviorData.isMoving = true; // Start moving immediately
      }

      // Initialize combat
      // Ranged units don't need ammo (infinite apples for NPCs)
      unitManager.initializeCombat(unit, 100, {
        rangedAttack: {
          enableAmmo: false, // NPCs have infinite ammo
        },
        onDamage,
      });

      // Add health bar
      healthBarManager.createHealthBar(unit, {
        yOffset: 2.2,
        alwaysShow: false,
      });

      config.incrementCount();
      logger.info(
        `Spawned ${isRanged ? 'ranged' : 'melee'} ${config.logName} (${config.currentCount()}/${config.maxCount})`,
      );
    }
  };

  // Convenience wrappers for backward compatibility
  const spawnZombie = (isRanged = false) => spawnUnit('zombie', isRanged);
  const spawnSoldier = (isRanged = false) => spawnUnit('soldier', isRanged);

  return {
    spawnZombie,
    spawnSoldier,
    getZombieCount: () => zombieCount,
    getSoldierCount: () => soldierCount,
    decrementZombieCount: () => {
      zombieCount--;
    },
    decrementSoldierCount: () => {
      soldierCount--;
    },
  };
};
