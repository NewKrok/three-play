/**
 * Combat type definitions for damage, armor, and combat mechanics
 * Based on Warcraft 3-style combat system
 */

/**
 * Damage types that units can deal
 */
export type DamageType = 'normal' | 'pierce' | 'siege' | 'magic' | 'chaos';

/**
 * Armor types that units can have
 * Based on Warcraft 3 armor classification system
 */
export type ArmorType = 'unarmored' | 'light' | 'medium' | 'heavy' | 'hero' | 'fortified';

/**
 * Configuration for a unit's combat statistics
 */
export type CombatStats = {
  /** Current health points */
  health: number;
  /** Maximum health points */
  maxHealth: number;
  /** Minimum attack damage */
  attackDamageMin: number;
  /** Maximum attack damage */
  attackDamageMax: number;
  /** Type of damage dealt (affects effectiveness vs armor types) */
  damageType: DamageType;
  /** Armor value (reduces incoming damage) */
  armor: number;
  /** Type of armor (affects damage taken from different damage types) */
  armorType: ArmorType;
  /** Attack cooldown in milliseconds */
  attackSpeed: number;
  /** Health regeneration per second */
  healthRegen: number;
  /** Critical hit chance (0-1, where 0.15 = 15%) */
  critChance: number;
  /** Critical hit damage multiplier (2.0 = 200% damage) */
  critMultiplier: number;
  /** Attack range */
  attackRange: number;
};

/**
 * Result of a damage calculation
 */
export type DamageResult = {
  /** Final damage dealt after all calculations */
  finalDamage: number;
  /** Whether this was a critical hit */
  wasCritical: boolean;
  /** Base damage before modifications */
  baseDamage: number;
  /** Damage multiplier from armor type effectiveness */
  typeMultiplier: number;
  /** Damage reduced by armor value */
  armorReduction: number;
};

/**
 * Effectiveness multipliers for damage types vs armor types
 * Based on Warcraft 3 damage table
 */
export const DAMAGE_TYPE_EFFECTIVENESS: Record<
  DamageType,
  Record<ArmorType, number>
> = {
  normal: {
    unarmored: 1.0,
    light: 1.5,
    medium: 1.0,
    heavy: 1.0,
    hero: 1.0,
    fortified: 0.7,
  },
  pierce: {
    unarmored: 1.5,
    light: 2.0,
    medium: 0.75,
    heavy: 0.75,
    hero: 0.5,
    fortified: 0.35,
  },
  siege: {
    unarmored: 1.0,
    light: 0.5,
    medium: 1.0,
    heavy: 1.0,
    hero: 0.5,
    fortified: 1.5,
  },
  magic: {
    unarmored: 1.0,
    light: 1.0,
    medium: 2.0,
    heavy: 0.5,
    hero: 0.5,
    fortified: 0.35,
  },
  chaos: {
    unarmored: 1.0,
    light: 1.0,
    medium: 1.0,
    heavy: 1.0,
    hero: 1.0,
    fortified: 1.0,
  },
};
