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
      lightAttack: 'zombie-attack', // AI uses this for attacking
      hitToBody: 'hit-to-body',
      death1: 'death-1',
      death2: 'death-2',
      death3: 'death-3',
    },
  },
  stats: {
    speed: 0.8,
    health: 550, // DOTA-like melee creep health
    attackDamage: 19,
    collisionRadius: 0.5,
    combat: {
      attackDamageMin: 19,  // DOTA melee creep: 19-21 damage
      attackDamageMax: 21,
      damageType: 'normal',
      armor: 0,  // DOTA melee creeps have 0 armor
      armorType: 'light',
      attackSpeed: 1000, // DOTA creeps attack once per second
      healthRegen: 0.5, // 0.5 HP per second (DOTA-like)
      critChance: 0, // Creeps don't crit in DOTA
      critMultiplier: 1.0,
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
    health: 550, // DOTA-like melee creep health (same as zombies for balance)
    attackDamage: 21,
    collisionRadius: 0.5,
    combat: {
      attackDamageMin: 21,  // DOTA melee creep: slightly higher than zombies
      attackDamageMax: 23,
      damageType: 'pierce',
      armor: 2,  // DOTA melee creeps have ~2 armor for allies
      armorType: 'heavy',
      attackSpeed: 1000, // DOTA creeps attack once per second
      healthRegen: 0.5, // 0.5 HP per second (DOTA-like)
      critChance: 0, // Creeps don't crit in DOTA
      critMultiplier: 1.0,
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

/**
 * Ranged zombie enemy unit definition - throws apples
 */
export const zombieRangedUnitDefinition: UnitDefinition = {
  id: 'zombie-ranged-enemy',
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
      lightAttack: 'zombie-attack',
      throw: 'throw', // Use throw animation for ranged attacks
      hitToBody: 'hit-to-body',
      death1: 'death-1',
      death2: 'death-2',
      death3: 'death-3',
    },
  },
  stats: {
    speed: 0.8,
    health: 300, // DOTA-like ranged creep health (lower than melee)
    attackDamage: 23,
    collisionRadius: 0.5,
    combat: {
      attackDamageMin: 23, // DOTA ranged creep: 23-27 damage
      attackDamageMax: 27,
      damageType: 'normal',
      armor: 0, // DOTA ranged creeps have 0 armor
      armorType: 'light',
      attackSpeed: 1000, // DOTA creeps attack once per second
      healthRegen: 0.5,
      critChance: 0, // Creeps don't crit in DOTA
      critMultiplier: 1.0,
      attackRange: 1.5, // Melee fallback range
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
      detectionRange: 30.0,
      attackRange: 12.0, // Prefer ranged attacks
    },
    movement: {
      speed: 4.0,
    },
  },

  rangedAttack: {
    projectileId: 'apple',
    animation: 'throw',
    range: 12.0,
    cooldown: 1500,
    staminaCost: 0, // NPCs don't use stamina
    actionDelay: 400,
    ammoType: 'apple',
    canTargetGround: false,
    spawnBone: 'mixamorigRightHand',
    spawnOffset: { x: 0.2, y: -0.1, z: 0 },
  },

  death: {
    animations: ['death1', 'death2', 'death3'],
    removeDelay: 2000,
    loop: false,
    clampWhenFinished: true,
    autoHandle: true,
  },
};

/**
 * Ranged soldier unit definition - DEBUG: Disabled, just stands idle
 */
export const soldierRangedUnitDefinition: UnitDefinition = {
  id: 'soldier-ranged-ally',
  type: 'npc',
  team: 'soldiers',
  enemyTeams: ['zombies'],
  modelAssets: {
    baseModel: 'human-idle',
    animations: {
      idle: 'human-idle',
      walk: 'walk',
      run: 'run',
      attack: 'light-attack',
      lightAttack: 'light-attack',
      throw: 'throw',
      hitToBody: 'hit-to-body',
    },
  },
  stats: {
    speed: 1.0,
    health: 300, // DOTA-like ranged creep health (same as zombie ranged)
    attackDamage: 25,
    collisionRadius: 0.5,
    combat: {
      attackDamageMin: 25, // DOTA ranged creep: slightly higher than zombies
      attackDamageMax: 29,
      damageType: 'pierce',
      armor: 2, // DOTA ranged creeps have ~2 armor for allies
      armorType: 'heavy',
      attackSpeed: 1000, // DOTA creeps attack once per second
      healthRegen: 0.5,
      critChance: 0, // Creeps don't crit in DOTA
      critMultiplier: 1.0,
      attackRange: 1.5, // Melee fallback range
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
      detectionRange: 30.0,
      attackRange: 12.0,
    },
    movement: {
      speed: 4.0,
    },
  },

  rangedAttack: {
    projectileId: 'apple',
    animation: 'throw',
    range: 12.0,
    cooldown: 1500,
    staminaCost: 0,
    actionDelay: 400,
    ammoType: 'apple',
    canTargetGround: false,
    spawnBone: 'mixamorigRightHand',
    spawnOffset: { x: 0.2, y: -0.1, z: 0 },
  },
};
