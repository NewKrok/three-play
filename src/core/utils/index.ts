/**
 * Common utility functions
 */

export {
  EasingFunctions,
  applyEasing,
  isEasingComplete,
} from './easing-utils.js';
export { createObjectPool, ObjectPoolUtils } from './object-pool.js';
export { TeamUtils } from './team-utils.js';
export {
  calculateDamage,
  applyCalculatedDamage,
  regenerateHealth,
  DamageCalculatorUtils,
} from './damage-calculator.js';
export type { DamageCalculatorConfig } from './damage-calculator.js';
