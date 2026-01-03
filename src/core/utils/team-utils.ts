import type { TeamId, TeamManagerConfig } from '../../types/team.js';
import type { Unit } from '../../types/units.js';
import { AttackPriorityUtils } from './attack-priority-utils.js';

/**
 * Check if two teams are enemies based on enemyTeams configuration
 *
 * @param teamA - First team ID
 * @param teamB - Second team ID
 * @param unitA - Optional unit A (to check its definition's enemyTeams)
 * @param unitB - Optional unit B (to check its definition's enemyTeams)
 * @returns True if teams are enemies
 */
export const isEnemy = (
  teamA: TeamId | undefined,
  teamB: TeamId | undefined,
  unitA?: Unit,
  unitB?: Unit,
): boolean => {
  // If either team is undefined, they're not enemies
  if (!teamA || !teamB) return false;

  // Same team is never enemy
  if (teamA === teamB) return false;

  // Check if unitA's definition lists teamB as enemy
  if (unitA?.definition.enemyTeams?.includes(teamB)) {
    return true;
  }

  // Check if unitB's definition lists teamA as enemy
  if (unitB?.definition.enemyTeams?.includes(teamA)) {
    return true;
  }

  return false;
};

/**
 * Check if two teams are friendly (same team)
 *
 * @param teamA - First team ID
 * @param teamB - Second team ID
 * @returns True if teams are the same
 */
export const isFriendly = (
  teamA: TeamId | undefined,
  teamB: TeamId | undefined,
): boolean => {
  if (!teamA || !teamB) return false;
  return teamA === teamB;
};

/**
 * Check if an attack should be allowed between two units based on teams
 *
 * @param attacker - Attacker unit
 * @param target - Target unit
 * @param config - Team manager config (for friendly fire setting)
 * @returns True if attack is allowed
 */
export const canAttack = (
  attacker: Unit,
  target: Unit,
  config?: TeamManagerConfig,
): boolean => {
  const attackerTeam = attacker.team;
  const targetTeam = target.team;

  // If either has no team, allow attack (backwards compatibility)
  if (!attackerTeam || !targetTeam) return true;

  // Check if they're on the same team
  const areFriendly = isFriendly(attackerTeam, targetTeam);

  // If friendly fire is enabled, allow attack even on same team
  if (areFriendly && config?.enableFriendlyFire) return true;

  // If they're friendly and friendly fire is disabled, don't allow
  if (areFriendly && !config?.enableFriendlyFire) return false;

  // Check if they're enemies
  return isEnemy(attackerTeam, targetTeam, attacker, target);
};

/**
 * Find nearest enemy unit within range
 *
 * @param unit - The unit looking for enemies
 * @param allUnits - All units to search through
 * @param maxRange - Maximum detection range
 * @param config - Team manager config
 * @returns Nearest enemy unit or null
 */
export const findNearestEnemy = (
  unit: Unit,
  allUnits: Unit[],
  maxRange: number,
  config?: TeamManagerConfig,
): Unit | null => {
  const enemies: Unit[] = [];

  for (const otherUnit of allUnits) {
    // Skip self
    if (otherUnit.id === unit.id) continue;

    // Skip dead units
    if (otherUnit.stats.health <= 0) continue;

    // Check if can attack
    if (!canAttack(unit, otherUnit, config)) continue;

    // Calculate distance
    const distance = unit.model.position.distanceTo(otherUnit.model.position);

    if (distance <= maxRange) {
      enemies.push(otherUnit);
    }
  }

  // Use attack priority system to select best target
  return AttackPriorityUtils.selectBestTarget(unit, enemies);
};

/**
 * Get all enemy units within range
 *
 * @param unit - The unit looking for enemies
 * @param allUnits - All units to search through
 * @param maxRange - Maximum detection range
 * @param config - Team manager config
 * @returns Array of enemy units within range
 */
export const getEnemiesInRange = (
  unit: Unit,
  allUnits: Unit[],
  maxRange: number,
  config?: TeamManagerConfig,
): Unit[] => {
  const enemies: Unit[] = [];

  for (const otherUnit of allUnits) {
    // Skip self
    if (otherUnit.id === unit.id) continue;

    // Skip dead units
    if (otherUnit.stats.health <= 0) continue;

    // Check if can attack
    if (!canAttack(unit, otherUnit, config)) continue;

    // Calculate distance
    const distance = unit.model.position.distanceTo(otherUnit.model.position);

    if (distance <= maxRange) {
      enemies.push(otherUnit);
    }
  }

  return enemies;
};

/**
 * Team utilities namespace
 */
export const TeamUtils = {
  isEnemy,
  isFriendly,
  canAttack,
  findNearestEnemy,
  getEnemiesInRange,
} as const;
