import * as THREE from 'three';
import { TeamUtils } from '../core/utils/team-utils.js';
import type { Unit, UnitDefinition } from '../types/units.js';
import type { TeamManagerConfig } from '../types/team.js';

// Mock THREE.js
jest.mock('three', () => {
  const THREE = jest.requireActual('three');
  return {
    ...THREE,
    Vector3: jest.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
      x,
      y,
      z,
      clone: jest.fn().mockReturnThis(),
      copy: jest.fn().mockReturnThis(),
      distanceTo: jest.fn((other: any) => {
        return Math.sqrt(
          Math.pow(other.x - x, 2) +
            Math.pow(other.y - y, 2) +
            Math.pow(other.z - z, 2),
        );
      }),
    })),
  };
});

describe('TeamUtils', () => {
  let mockUnit1: Unit;
  let mockUnit2: Unit;
  let mockUnit3: Unit;

  const createMockDefinition = (
    id: string,
    team?: string,
    enemyTeams?: string[],
  ): UnitDefinition => ({
    id,
    type: 'npc',
    team,
    enemyTeams,
    modelAssets: {
      baseModel: 'test',
      animations: {},
    },
    stats: {
      speed: 1,
      health: 100,
    },
  });

  const createMockUnit = (
    id: string,
    team?: string,
    enemyTeams?: string[],
    position = { x: 0, y: 0, z: 0 },
  ): Unit => ({
    id,
    definition: createMockDefinition(id, team, enemyTeams),
    team,
    model: {
      position: new THREE.Vector3(position.x, position.y, position.z),
    } as THREE.Group,
    mixer: {} as THREE.AnimationMixer,
    actions: {},
    currentAnimation: 'idle',
    stats: {
      health: 100,
      maxHealth: 100,
      speed: 1,
      attackDamage: 10,
      collisionRadius: 0.5,
    },
  });

  beforeEach(() => {
    mockUnit1 = createMockUnit('unit1', 'team-a', ['team-b']);
    mockUnit2 = createMockUnit('unit2', 'team-b', ['team-a']);
    mockUnit3 = createMockUnit('unit3', 'team-a', ['team-b']);
  });

  describe('isEnemy', () => {
    it('should return true when teams are enemies', () => {
      expect(TeamUtils.isEnemy('team-a', 'team-b', mockUnit1, mockUnit2)).toBe(
        true,
      );
    });

    it('should return true when only first unit declares enemy', () => {
      mockUnit2.definition.enemyTeams = [];
      expect(TeamUtils.isEnemy('team-a', 'team-b', mockUnit1, mockUnit2)).toBe(
        true,
      );
    });

    it('should return true when only second unit declares enemy', () => {
      mockUnit1.definition.enemyTeams = [];
      expect(TeamUtils.isEnemy('team-a', 'team-b', mockUnit1, mockUnit2)).toBe(
        true,
      );
    });

    it('should return false when teams are the same', () => {
      expect(TeamUtils.isEnemy('team-a', 'team-a', mockUnit1, mockUnit3)).toBe(
        false,
      );
    });

    it('should return false when teams are not declared enemies', () => {
      const unit4 = createMockUnit('unit4', 'team-c', ['team-d']);
      expect(TeamUtils.isEnemy('team-a', 'team-c', mockUnit1, unit4)).toBe(
        false,
      );
    });

    it('should return false when either team is undefined', () => {
      expect(TeamUtils.isEnemy(undefined, 'team-b')).toBe(false);
      expect(TeamUtils.isEnemy('team-a', undefined)).toBe(false);
      expect(TeamUtils.isEnemy(undefined, undefined)).toBe(false);
    });
  });

  describe('isFriendly', () => {
    it('should return true when teams are the same', () => {
      expect(TeamUtils.isFriendly('team-a', 'team-a')).toBe(true);
    });

    it('should return false when teams are different', () => {
      expect(TeamUtils.isFriendly('team-a', 'team-b')).toBe(false);
    });

    it('should return false when either team is undefined', () => {
      expect(TeamUtils.isFriendly(undefined, 'team-a')).toBe(false);
      expect(TeamUtils.isFriendly('team-a', undefined)).toBe(false);
      expect(TeamUtils.isFriendly(undefined, undefined)).toBe(false);
    });
  });

  describe('canAttack', () => {
    it('should allow attack on enemy teams', () => {
      expect(TeamUtils.canAttack(mockUnit1, mockUnit2)).toBe(true);
    });

    it('should not allow attack on friendly teams without friendly fire', () => {
      expect(TeamUtils.canAttack(mockUnit1, mockUnit3)).toBe(false);
    });

    it('should allow attack on friendly teams with friendly fire enabled', () => {
      const config: TeamManagerConfig = { enableFriendlyFire: true };
      expect(TeamUtils.canAttack(mockUnit1, mockUnit3, config)).toBe(true);
    });

    it('should allow attack when either unit has no team', () => {
      const noTeamUnit = createMockUnit('noTeam', undefined);
      expect(TeamUtils.canAttack(mockUnit1, noTeamUnit)).toBe(true);
      expect(TeamUtils.canAttack(noTeamUnit, mockUnit1)).toBe(true);
    });

    it('should not allow attack on same team with friendly fire disabled', () => {
      const config: TeamManagerConfig = { enableFriendlyFire: false };
      expect(TeamUtils.canAttack(mockUnit1, mockUnit3, config)).toBe(false);
    });
  });

  describe('findNearestEnemy', () => {
    let allUnits: Unit[];

    beforeEach(() => {
      mockUnit1 = createMockUnit('unit1', 'team-a', ['team-b'], {
        x: 0,
        y: 0,
        z: 0,
      });
      mockUnit2 = createMockUnit('unit2', 'team-b', ['team-a'], {
        x: 5,
        y: 0,
        z: 0,
      });
      mockUnit3 = createMockUnit('unit3', 'team-a', ['team-b'], {
        x: 10,
        y: 0,
        z: 0,
      });
      const unit4 = createMockUnit('unit4', 'team-b', ['team-a'], {
        x: 15,
        y: 0,
        z: 0,
      });

      allUnits = [mockUnit1, mockUnit2, mockUnit3, unit4];
    });

    it('should find the nearest enemy within range', () => {
      const nearest = TeamUtils.findNearestEnemy(mockUnit1, allUnits, 10);
      expect(nearest?.id).toBe('unit2');
    });

    it('should return null if no enemies within range', () => {
      const nearest = TeamUtils.findNearestEnemy(mockUnit1, allUnits, 2);
      expect(nearest).toBeNull();
    });

    it('should not target self', () => {
      const nearest = TeamUtils.findNearestEnemy(mockUnit1, [mockUnit1], 10);
      expect(nearest).toBeNull();
    });

    it('should not target dead units', () => {
      mockUnit2.stats.health = 0;
      const nearest = TeamUtils.findNearestEnemy(mockUnit1, allUnits, 20);
      expect(nearest?.id).toBe('unit4');
    });

    it('should not target friendly units', () => {
      const nearest = TeamUtils.findNearestEnemy(mockUnit1, allUnits, 20);
      expect(nearest?.id).not.toBe('unit3'); // unit3 is same team
    });
  });

  describe('getEnemiesInRange', () => {
    let allUnits: Unit[];

    beforeEach(() => {
      mockUnit1 = createMockUnit('unit1', 'team-a', ['team-b'], {
        x: 0,
        y: 0,
        z: 0,
      });
      mockUnit2 = createMockUnit('unit2', 'team-b', ['team-a'], {
        x: 5,
        y: 0,
        z: 0,
      });
      mockUnit3 = createMockUnit('unit3', 'team-a', ['team-b'], {
        x: 10,
        y: 0,
        z: 0,
      });
      const unit4 = createMockUnit('unit4', 'team-b', ['team-a'], {
        x: 8,
        y: 0,
        z: 0,
      });

      allUnits = [mockUnit1, mockUnit2, mockUnit3, unit4];
    });

    it('should return all enemies within range', () => {
      const enemies = TeamUtils.getEnemiesInRange(mockUnit1, allUnits, 10);
      expect(enemies).toHaveLength(2);
      expect(enemies.map((u) => u.id)).toContain('unit2');
      expect(enemies.map((u) => u.id)).toContain('unit4');
    });

    it('should return empty array if no enemies within range', () => {
      const enemies = TeamUtils.getEnemiesInRange(mockUnit1, allUnits, 2);
      expect(enemies).toHaveLength(0);
    });

    it('should not include self', () => {
      const enemies = TeamUtils.getEnemiesInRange(mockUnit1, allUnits, 100);
      expect(enemies.map((u) => u.id)).not.toContain('unit1');
    });

    it('should not include dead units', () => {
      mockUnit2.stats.health = 0;
      const enemies = TeamUtils.getEnemiesInRange(mockUnit1, allUnits, 10);
      expect(enemies.map((u) => u.id)).not.toContain('unit2');
    });

    it('should not include friendly units', () => {
      const enemies = TeamUtils.getEnemiesInRange(mockUnit1, allUnits, 100);
      expect(enemies.map((u) => u.id)).not.toContain('unit3');
    });
  });
});
