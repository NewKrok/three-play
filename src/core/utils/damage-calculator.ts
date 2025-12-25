import type { Unit } from '../../types/units.js';
import type {
  DamageResult,
  DamageType,
  ArmorType,
  CombatStats,
} from '../../types/combat.js';
import { DAMAGE_TYPE_EFFECTIVENESS } from '../../types/combat.js';

/**
 * Configuration for damage calculation
 */
export type DamageCalculatorConfig = {
  /** Enable critical hits (default: true) */
  enableCriticals?: boolean;
  /** Enable armor reduction (default: true) */
  enableArmor?: boolean;
  /** Enable damage type effectiveness (default: true) */
  enableTypeEffectiveness?: boolean;
  /** Minimum damage after all reductions (default: 1) */
  minDamage?: number;
};

/**
 * Default combat stats for units without explicit combat configuration
 */
const DEFAULT_COMBAT_STATS: CombatStats = {
  health: 100,
  maxHealth: 100,
  attackDamageMin: 10,
  attackDamageMax: 15,
  damageType: 'normal',
  armor: 0,
  armorType: 'unarmored',
  attackSpeed: 1000,
  healthRegen: 0,
  critChance: 0,
  critMultiplier: 2.0,
  attackRange: 2.0,
};

/**
 * Get combat stats for a unit, using defaults if not configured
 */
const getCombatStats = (unit: Unit): CombatStats => {
  if (unit.stats.combat) {
    return {
      ...DEFAULT_COMBAT_STATS,
      ...unit.stats.combat,
      health: unit.stats.health,
      maxHealth: unit.stats.maxHealth,
    };
  }

  // Fallback to old system for backwards compatibility
  return {
    ...DEFAULT_COMBAT_STATS,
    health: unit.stats.health,
    maxHealth: unit.stats.maxHealth,
    attackDamageMin: unit.stats.attackDamage || DEFAULT_COMBAT_STATS.attackDamageMin,
    attackDamageMax: unit.stats.attackDamage || DEFAULT_COMBAT_STATS.attackDamageMax,
  };
};

/**
 * Calculate random damage within min-max range
 */
const calculateBaseDamage = (minDamage: number, maxDamage: number): number => {
  return Math.random() * (maxDamage - minDamage) + minDamage;
};

/**
 * Calculate armor reduction using WC3 formula
 * Formula: Damage Multiplier = 1 - (0.06 × Armor) / (1 + 0.06 × |Armor|)
 * Positive armor reduces damage, negative armor increases damage taken
 */
const calculateArmorReduction = (armor: number): number => {
  const absArmor = Math.abs(armor);
  const reduction = (0.06 * armor) / (1 + 0.06 * absArmor);
  return 1 - reduction;
};

/**
 * Check if attack is a critical hit
 */
const rollCriticalHit = (critChance: number): boolean => {
  return Math.random() < critChance;
};

/**
 * Calculate damage type effectiveness multiplier
 */
const getTypeEffectiveness = (
  damageType: DamageType,
  armorType: ArmorType,
): number => {
  return DAMAGE_TYPE_EFFECTIVENESS[damageType][armorType];
};

/**
 * Calculate final damage dealt from attacker to target
 * @param attacker - The attacking unit
 * @param target - The target unit
 * @param config - Damage calculation configuration
 * @returns Detailed damage result with breakdown
 */
export const calculateDamage = (
  attacker: Unit,
  target: Unit,
  config: DamageCalculatorConfig = {},
): DamageResult => {
  const {
    enableCriticals = true,
    enableArmor = true,
    enableTypeEffectiveness = true,
    minDamage = 1,
  } = config;

  const attackerStats = getCombatStats(attacker);
  const targetStats = getCombatStats(target);

  // 1. Calculate base damage (random within min-max range)
  const baseDamage = calculateBaseDamage(
    attackerStats.attackDamageMin,
    attackerStats.attackDamageMax,
  );

  // 2. Check for critical hit
  const wasCritical =
    enableCriticals && rollCriticalHit(attackerStats.critChance);
  let damage = wasCritical ? baseDamage * attackerStats.critMultiplier : baseDamage;

  // 3. Apply damage type vs armor type effectiveness
  const typeMultiplier = enableTypeEffectiveness
    ? getTypeEffectiveness(attackerStats.damageType, targetStats.armorType)
    : 1.0;
  damage *= typeMultiplier;

  // 4. Apply armor reduction
  let armorReduction = 0;
  if (enableArmor) {
    const armorMultiplier = calculateArmorReduction(targetStats.armor);
    armorReduction = damage * (1 - armorMultiplier);
    damage *= armorMultiplier;
  }

  // 5. Ensure minimum damage
  const finalDamage = Math.max(minDamage, Math.floor(damage));

  return {
    finalDamage,
    wasCritical,
    baseDamage,
    typeMultiplier,
    armorReduction,
  };
};

/**
 * Apply calculated damage to target unit
 * @param target - The target unit
 * @param damageResult - The damage calculation result
 * @returns true if unit died from damage
 */
export const applyCalculatedDamage = (
  target: Unit,
  damageResult: DamageResult,
): boolean => {
  target.stats.health -= damageResult.finalDamage;
  target.stats.health = Math.max(0, target.stats.health);

  // Update combat stats if they exist
  if (target.stats.combat) {
    target.stats.combat.health = target.stats.health;
  }

  return target.stats.health <= 0;
};

/**
 * Regenerate health for a unit
 * @param unit - The unit to regenerate health for
 * @param deltaTime - Time elapsed in seconds
 */
export const regenerateHealth = (unit: Unit, deltaTime: number): void => {
  const combatStats = getCombatStats(unit);

  if (combatStats.healthRegen <= 0) return;
  if (unit.stats.health >= unit.stats.maxHealth) return;

  const regenAmount = combatStats.healthRegen * deltaTime;
  unit.stats.health = Math.min(
    unit.stats.maxHealth,
    unit.stats.health + regenAmount,
  );

  // Update combat stats if they exist
  if (unit.stats.combat) {
    unit.stats.combat.health = unit.stats.health;
  }
};

/**
 * Damage calculator utilities
 */
export const DamageCalculatorUtils = {
  getCombatStats,
  calculateBaseDamage,
  calculateArmorReduction,
  rollCriticalHit,
  getTypeEffectiveness,
} as const;
