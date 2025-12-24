/**
 * Team identifier - can be any string (e.g., 'player', 'soldiers', 'zombies')
 */
export type TeamId = string;

/**
 * Team configuration
 */
export type TeamConfig = {
  /** Unique team identifier */
  id: TeamId;
  /** Display name for the team */
  name?: string;
  /** List of enemy team IDs */
  enemyTeams?: TeamId[];
};

/**
 * Team manager configuration
 */
export type TeamManagerConfig = {
  /** Enable friendly fire (units can damage same team) */
  enableFriendlyFire?: boolean;
  /** Registered teams */
  teams?: TeamConfig[];
};

/**
 * Team utilities for checking relationships between units
 */
export type TeamUtils = {
  /**
   * Check if two teams are enemies
   * @param teamA - First team ID
   * @param teamB - Second team ID
   * @param config - Team manager config
   * @returns True if teams are enemies
   */
  isEnemy: (
    teamA: TeamId | undefined,
    teamB: TeamId | undefined,
    config?: TeamManagerConfig,
  ) => boolean;

  /**
   * Check if two teams are friendly (same team)
   * @param teamA - First team ID
   * @param teamB - Second team ID
   * @returns True if teams are the same
   */
  isFriendly: (teamA: TeamId | undefined, teamB: TeamId | undefined) => boolean;

  /**
   * Check if an attack should be allowed between two teams
   * @param attackerTeam - Attacker's team ID
   * @param targetTeam - Target's team ID
   * @param config - Team manager config
   * @returns True if attack is allowed
   */
  canAttack: (
    attackerTeam: TeamId | undefined,
    targetTeam: TeamId | undefined,
    config?: TeamManagerConfig,
  ) => boolean;
};
