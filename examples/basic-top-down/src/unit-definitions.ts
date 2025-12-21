import type { UnitDefinition } from '@newkrok/three-play';

/**
 * Human player unit definition
 */
export const humanUnitDefinition: UnitDefinition = {
  id: 'human-player',
  type: 'player',
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
  },
  appearance: {
    scale: 1.0,
    rotation: Math.PI / 2, // Adjust for correct orientation
  },
};

/**
 * Zombie enemy unit definition
 */
export const zombieUnitDefinition: UnitDefinition = {
  id: 'zombie-enemy',
  type: 'enemy',
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
    health: 75,
    attackDamage: 15,
    collisionRadius: 0.5,
  },
  appearance: {
    scale: 1.0,
    rotation: Math.PI / 2,
  },

  ai: {
    type: 'chase',
    targeting: {
      preferredTargets: ['player'],
      detectionRange: 8.0,
      attackRange: 1.5,
    },
    movement: {
      speed: 0.8,
    },
  },
};
