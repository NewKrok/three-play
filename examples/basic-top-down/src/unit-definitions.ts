import type { UnitDefinition } from '@newkrok/three-play';

/**
 * Human player unit definition
 */
export const humanUnitDefinition: UnitDefinition = {
  id: 'human-player',
  type: 'player',
  team: 'player',
  enemyTeams: ['zombies'],
  modelAssets: {
    baseModel: 'human-idle',
    animations: {
      idle: 'human-idle',
      walk: 'walk',
      run: 'run',
      roll: 'roll',
      jump: 'jump',
      lightAttack: 'light-attack',
      heavyAttack: 'heavy-attack',
      hitToBody: 'hit-to-body',
      aimIdle: 'aim-hand-idle',
      jogForward: 'jog-forward',
      jogBackward: 'jog-backward',
      jogStrafeLeft: 'jog-strafe-left',
      jogStrafeRight: 'jog-strafe-right',
      leftTurn: 'left-turn',
      rightTurn: 'right-turn',
      throw: 'throw',
      leftStrafe: 'left-strafe',
      rightStrafe: 'right-strafe',
      runningBackward: 'running-backward',
    },
  },
  stats: {
    speed: 1.0,
    health: 100,
    attackDamage: 25,
    collisionRadius: 0.5,
    combat: {
      attackDamageMin: 20,
      attackDamageMax: 30,
      damageType: 'normal',
      armor: 2,
      armorType: 'medium',
      attackSpeed: 1000,
      healthRegen: 0.5, // 0.5 HP per second
      critChance: 0.15, // 15% crit chance
      critMultiplier: 2.0, // 200% damage on crit
      attackRange: 2.5,
    },
  },
  appearance: {
    scale: 1.0,
    rotation: Math.PI / 2, // Adjust for correct orientation
  },
  rangedAttack: {
    projectileId: 'apple',
    animation: 'throw',
    range: 15.0,
    cooldown: 1000,
    staminaCost: 20,
    actionDelay: 400,
    ammoType: 'apple',
    canTargetGround: false,
    spawnBone: 'mixamorigRightHand',
    spawnOffset: { x: 0.2, y: -0.1, z: 0 }, // Offset from wrist to palm
  },
};

/**
 * Zombie enemy unit definition
 */
export const zombieUnitDefinition: UnitDefinition = {
  id: 'zombie-enemy',
  type: 'enemy',
  team: 'zombies',
  enemyTeams: ['player', 'soldiers'],
  modelAssets: {
    baseModel: 'zombie-idle',
    animations: {
      idle: 'zombie-idle',
      walk: 'zombie-walk',
      run: 'zombie-run',
      attack: 'zombie-attack',
      hitToBody: 'hit-to-body',
      death1: 'death-1',
      death2: 'death-2',
      death3: 'death-3',
    },
  },
  stats: {
    speed: 0.8,
    health: 60, // Reduced from 75 (spawns in pairs now)
    attackDamage: 15,
    collisionRadius: 0.5,
    combat: {
      attackDamageMin: 8,  // Wider damage range for variety
      attackDamageMax: 22,
      damageType: 'normal',
      armor: 0,
      armorType: 'light',
      attackSpeed: 1500,
      healthRegen: 0.2, // 0.2 HP per second
      critChance: 0.05, // 5% crit chance
      critMultiplier: 1.5, // 150% damage on crit
      attackRange: 1.5,
    },
  },
  appearance: {
    scale: 1.0,
    rotation: Math.PI / 2,
  },

  ai: {
    type: 'chase',
    targeting: {
      preferredTargets: ['player'],
      detectionRange: 30.0, // Increased detection range to ensure zombies chase enemies
      attackRange: 1.5,
    },
    movement: {
      speed: 4.0, // Speed for running animation
    },
  },

  death: {
    animations: ['death1', 'death2', 'death3'], // Random selection from these
    removeDelay: 2000, // Wait 2 seconds before removing
    loop: false,
    clampWhenFinished: true,
    autoHandle: true, // Automatically handled by core
  },
};

/**
 * Soldier unit definition - fights against zombies
 */
export const soldierUnitDefinition: UnitDefinition = {
  id: 'soldier-ally',
  type: 'npc',
  team: 'soldiers',
  enemyTeams: ['zombies'],
  modelAssets: {
    baseModel: 'human-idle',
    animations: {
      idle: 'human-idle',
      walk: 'walk',
      run: 'run',
      attack: 'light-attack', // AI uses this for attacking
      lightAttack: 'light-attack',
      heavyAttack: 'heavy-attack',
      hitToBody: 'hit-to-body',
    },
  },
  stats: {
    speed: 1.0,
    health: 100,
    attackDamage: 30,
    collisionRadius: 0.5,
    combat: {
      attackDamageMin: 18,  // Wider damage range, lower base
      attackDamageMax: 30,
      damageType: 'pierce',
      armor: 2,  // Reduced from 3 for better balance
      armorType: 'heavy',
      attackSpeed: 1200,
      healthRegen: 0.3, // 0.3 HP per second
      critChance: 0.25, // Increased from 10% to 25% - tactical advantage
      critMultiplier: 2.0, // 200% damage on crit
      attackRange: 1.5,
    },
  },
  appearance: {
    scale: 1.0,
    rotation: Math.PI / 2,
  },

  ai: {
    type: 'chase',
    targeting: {
      preferredTargets: ['enemy'],
      detectionRange: 30.0, // Increased detection range to ensure soldiers chase zombies
      attackRange: 1.5,
    },
    movement: {
      speed: 4.0, // Speed for running animation
    },
  },
};
