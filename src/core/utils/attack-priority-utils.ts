import type { Unit } from '../../types/units.js';
import type { ArmorType } from '../../types/combat.js';

/**
 * Attack priority utilities for Warcraft 3-style target selection
 *
 * In Warcraft 3, units prioritize targets based on armor type:
 * - Hero armor: Highest priority (heroes are primary targets)
 * - Combat units (heavy/medium/light): High priority
 * - Unarmored units (workers): Low priority
 * - Fortified (buildings): Lowest priority
 */

/**
 * Attack priority levels based on armor type
 * Higher number = higher priority (attacked first)
 */
const ARMOR_TYPE_PRIORITY: Record<ArmorType, number> = {
  hero: 100,       // Highest - Heroes are always prioritized
  heavy: 80,       // High - Heavy combat units
  medium: 75,      // High - Medium combat units
  light: 70,       // High - Light combat units
  unarmored: 30,   // Low - Workers, non-combat units
  fortified: 10,   // Lowest - Buildings
};

/**
 * Get attack priority value for a unit based on its armor type
 * @param unit - Unit to get priority for
 * @returns Priority value (higher = higher priority)
 */
export const getAttackPriority = (unit: Unit): number => {
  const armorType = unit.stats.combat?.armorType;

  // If no armor type specified, use default priority based on unit type
  if (!armorType) {
    // Default priorities when armor type is not specified
    if (unit.definition.type === 'player') return 90; // High priority
    return 50; // Medium priority for enemies/npcs
  }

  return ARMOR_TYPE_PRIORITY[armorType];
};

/**
 * Compare two units for attack priority
 * Returns negative if unit1 has higher priority, positive if unit2 has higher priority
 *
 * @param unit1 - First unit
 * @param unit2 - Second unit
 * @returns Comparison value for sorting (unit1 priority - unit2 priority)
 */
export const compareAttackPriority = (unit1: Unit, unit2: Unit): number => {
  const priority1 = getAttackPriority(unit1);
  const priority2 = getAttackPriority(unit2);

  // Higher priority should come first, so reverse the comparison
  return priority2 - priority1;
};

/**
 * Select best target from a list of potential targets based on attack priority
 * Prioritizes by armor type first, then by distance
 *
 * @param attacker - Unit doing the attacking
 * @param potentialTargets - Array of potential target units
 * @returns Best target unit, or null if no valid targets
 */
export const selectBestTarget = (
  attacker: Unit,
  potentialTargets: Unit[],
): Unit | null => {
  if (potentialTargets.length === 0) return null;

  // Sort by priority (highest first), then by distance (closest first)
  const sortedTargets = [...potentialTargets].sort((a, b) => {
    const priorityA = getAttackPriority(a);
    const priorityB = getAttackPriority(b);

    // If priorities are different, use priority
    if (priorityA !== priorityB) {
      return priorityB - priorityA; // Higher priority first
    }

    // If priorities are same, use distance
    const distanceA = attacker.model.position.distanceTo(a.model.position);
    const distanceB = attacker.model.position.distanceTo(b.model.position);
    return distanceA - distanceB; // Closer first
  });

  return sortedTargets[0];
};

/**
 * Filter and sort targets by attack priority
 * Useful for getting a prioritized list of targets
 *
 * @param attacker - Unit doing the attacking
 * @param potentialTargets - Array of potential target units
 * @param maxTargets - Maximum number of targets to return (optional)
 * @returns Array of targets sorted by priority
 */
export const getPrioritizedTargets = (
  attacker: Unit,
  potentialTargets: Unit[],
  maxTargets?: number,
): Unit[] => {
  // Sort by priority first, then by distance
  const sorted = [...potentialTargets].sort((a, b) => {
    const priorityA = getAttackPriority(a);
    const priorityB = getAttackPriority(b);

    if (priorityA !== priorityB) {
      return priorityB - priorityA;
    }

    const distanceA = attacker.model.position.distanceTo(a.model.position);
    const distanceB = attacker.model.position.distanceTo(b.model.position);
    return distanceA - distanceB;
  });

  return maxTargets ? sorted.slice(0, maxTargets) : sorted;
};

/**
 * Check if unit should be considered a high priority target
 * High priority targets include heroes and combat units
 *
 * @param unit - Unit to check
 * @returns True if unit is high priority
 */
export const isHighPriorityTarget = (unit: Unit): boolean => {
  const priority = getAttackPriority(unit);
  return priority >= 70; // Heavy, medium, light, and hero armor
};

/**
 * Check if unit is a low priority target (worker, building, etc.)
 *
 * @param unit - Unit to check
 * @returns True if unit is low priority
 */
export const isLowPriorityTarget = (unit: Unit): boolean => {
  const priority = getAttackPriority(unit);
  return priority <= 30; // Unarmored and fortified
};

/**
 * Attack priority utilities
 */
export const AttackPriorityUtils = {
  getAttackPriority,
  compareAttackPriority,
  selectBestTarget,
  getPrioritizedTargets,
  isHighPriorityTarget,
  isLowPriorityTarget,
} as const;
