import { describe, it, expect, beforeEach } from '@jest/globals';
import * as THREE from 'three';
import {
  calculateDamage,
  applyCalculatedDamage,
  regenerateHealth,
  DamageCalculatorUtils,
} from '../core/utils/damage-calculator';
import type { Unit } from '../types/units';

/**
 * Create a mock unit for testing
 */
const createMockUnit = (overrides: Partial<Unit> = {}): Unit => {
  const baseUnit: Unit = {
    id: 'test-unit',
    definition: {
      id: 'test-def',
      type: 'player',
      modelAssets: {
        baseModel: 'test',
        animations: {},
      },
      stats: {
        speed: 1.0,
        health: 100,
      },
    },
    model: new THREE.Group(),
    mixer: new THREE.AnimationMixer(new THREE.Group()),
    actions: {},
    currentAnimation: 'idle',
    stats: {
      health: 100,
      maxHealth: 100,
      speed: 1.0,
      attackDamage: 20,
      collisionRadius: 0.5,
    },
    ...overrides,
  };

  return baseUnit;
};

describe('DamageCalculator', () => {
  describe('calculateDamage', () => {
    it('should calculate damage within min-max range', () => {
      const attacker = createMockUnit({
        stats: {
          health: 100,
          maxHealth: 100,
          speed: 1.0,
          attackDamage: 20,
          collisionRadius: 0.5,
          combat: {
            attackDamageMin: 10,
            attackDamageMax: 20,
            damageType: 'normal',
            armor: 0,
            armorType: 'medium',
            attackSpeed: 1000,
            healthRegen: 0,
            critChance: 0,
            critMultiplier: 2.0,
            attackRange: 2.0,
            health: 100,
            maxHealth: 100,
          },
        },
      });

      const target = createMockUnit({
        stats: {
          health: 100,
          maxHealth: 100,
          speed: 1.0,
          attackDamage: 20,
          collisionRadius: 0.5,
          combat: {
            attackDamageMin: 10,
            attackDamageMax: 20,
            damageType: 'normal',
            armor: 0,
            armorType: 'unarmored',
            attackSpeed: 1000,
            healthRegen: 0,
            critChance: 0,
            critMultiplier: 2.0,
            attackRange: 2.0,
            health: 100,
            maxHealth: 100,
          },
        },
      });

      // Run test multiple times to check range
      for (let i = 0; i < 10; i++) {
        const result = calculateDamage(attacker, target);
        expect(result.baseDamage).toBeGreaterThanOrEqual(10);
        expect(result.baseDamage).toBeLessThanOrEqual(20);
      }
    });

    it('should apply critical hit multiplier', () => {
      const attacker = createMockUnit({
        stats: {
          health: 100,
          maxHealth: 100,
          speed: 1.0,
          attackDamage: 20,
          collisionRadius: 0.5,
          combat: {
            attackDamageMin: 20,
            attackDamageMax: 20,
            damageType: 'normal',
            armor: 0,
            armorType: 'medium',
            attackSpeed: 1000,
            healthRegen: 0,
            critChance: 1.0, // 100% crit chance for testing
            critMultiplier: 2.0,
            attackRange: 2.0,
            health: 100,
            maxHealth: 100,
          },
        },
      });

      const target = createMockUnit({
        stats: {
          health: 100,
          maxHealth: 100,
          speed: 1.0,
          attackDamage: 20,
          collisionRadius: 0.5,
          combat: {
            attackDamageMin: 10,
            attackDamageMax: 20,
            damageType: 'normal',
            armor: 0,
            armorType: 'unarmored',
            attackSpeed: 1000,
            healthRegen: 0,
            critChance: 0,
            critMultiplier: 2.0,
            attackRange: 2.0,
            health: 100,
            maxHealth: 100,
          },
        },
      });

      const result = calculateDamage(attacker, target);
      expect(result.wasCritical).toBe(true);
      expect(result.finalDamage).toBe(40); // 20 * 2.0
    });

    it('should apply armor reduction', () => {
      const attacker = createMockUnit({
        stats: {
          health: 100,
          maxHealth: 100,
          speed: 1.0,
          attackDamage: 100,
          collisionRadius: 0.5,
          combat: {
            attackDamageMin: 100,
            attackDamageMax: 100,
            damageType: 'normal',
            armor: 0,
            armorType: 'medium',
            attackSpeed: 1000,
            healthRegen: 0,
            critChance: 0,
            critMultiplier: 2.0,
            attackRange: 2.0,
            health: 100,
            maxHealth: 100,
          },
        },
      });

      const target = createMockUnit({
        stats: {
          health: 100,
          maxHealth: 100,
          speed: 1.0,
          attackDamage: 20,
          collisionRadius: 0.5,
          combat: {
            attackDamageMin: 10,
            attackDamageMax: 20,
            damageType: 'normal',
            armor: 10, // 10 armor
            armorType: 'unarmored',
            attackSpeed: 1000,
            healthRegen: 0,
            critChance: 0,
            critMultiplier: 2.0,
            attackRange: 2.0,
            health: 100,
            maxHealth: 100,
          },
        },
      });

      const result = calculateDamage(attacker, target);
      // With 10 armor, damage should be reduced
      // Formula: 1 - (0.06 * 10) / (1 + 0.06 * 10) = 1 - 0.6 / 1.6 = 1 - 0.375 = 0.625
      // 100 * 0.625 = 62.5, floored to 62
      expect(result.finalDamage).toBeLessThan(100);
      expect(result.armorReduction).toBeGreaterThan(0);
    });

    it('should apply damage type effectiveness', () => {
      const pierceAttacker = createMockUnit({
        stats: {
          health: 100,
          maxHealth: 100,
          speed: 1.0,
          attackDamage: 100,
          collisionRadius: 0.5,
          combat: {
            attackDamageMin: 100,
            attackDamageMax: 100,
            damageType: 'pierce', // Pierce is 2.0x effective vs light armor
            armor: 0,
            armorType: 'medium',
            attackSpeed: 1000,
            healthRegen: 0,
            critChance: 0,
            critMultiplier: 2.0,
            attackRange: 2.0,
            health: 100,
            maxHealth: 100,
          },
        },
      });

      const lightArmorTarget = createMockUnit({
        stats: {
          health: 100,
          maxHealth: 100,
          speed: 1.0,
          attackDamage: 20,
          collisionRadius: 0.5,
          combat: {
            attackDamageMin: 10,
            attackDamageMax: 20,
            damageType: 'normal',
            armor: 0,
            armorType: 'light',
            attackSpeed: 1000,
            healthRegen: 0,
            critChance: 0,
            critMultiplier: 2.0,
            attackRange: 2.0,
            health: 100,
            maxHealth: 100,
          },
        },
      });

      const result = calculateDamage(pierceAttacker, lightArmorTarget);
      expect(result.typeMultiplier).toBe(2.0); // Pierce vs light armor
      expect(result.finalDamage).toBe(200); // 100 * 2.0
    });

    it('should enforce minimum damage', () => {
      const weakAttacker = createMockUnit({
        stats: {
          health: 100,
          maxHealth: 100,
          speed: 1.0,
          attackDamage: 5,
          collisionRadius: 0.5,
          combat: {
            attackDamageMin: 1,
            attackDamageMax: 1,
            damageType: 'normal',
            armor: 0,
            armorType: 'medium',
            attackSpeed: 1000,
            healthRegen: 0,
            critChance: 0,
            critMultiplier: 2.0,
            attackRange: 2.0,
            health: 100,
            maxHealth: 100,
          },
        },
      });

      const heavyArmorTarget = createMockUnit({
        stats: {
          health: 100,
          maxHealth: 100,
          speed: 1.0,
          attackDamage: 20,
          collisionRadius: 0.5,
          combat: {
            attackDamageMin: 10,
            attackDamageMax: 20,
            damageType: 'normal',
            armor: 50, // Very high armor
            armorType: 'heavy',
            attackSpeed: 1000,
            healthRegen: 0,
            critChance: 0,
            critMultiplier: 2.0,
            attackRange: 2.0,
            health: 100,
            maxHealth: 100,
          },
        },
      });

      const result = calculateDamage(weakAttacker, heavyArmorTarget, {
        minDamage: 1,
      });
      expect(result.finalDamage).toBeGreaterThanOrEqual(1);
    });
  });

  describe('applyCalculatedDamage', () => {
    it('should reduce unit health by damage amount', () => {
      const unit = createMockUnit({
        stats: {
          health: 100,
          maxHealth: 100,
          speed: 1.0,
          attackDamage: 20,
          collisionRadius: 0.5,
        },
      });

      const damageResult = {
        finalDamage: 30,
        wasCritical: false,
        baseDamage: 30,
        typeMultiplier: 1.0,
        armorReduction: 0,
      };

      applyCalculatedDamage(unit, damageResult);
      expect(unit.stats.health).toBe(70);
    });

    it('should not reduce health below 0', () => {
      const unit = createMockUnit({
        stats: {
          health: 20,
          maxHealth: 100,
          speed: 1.0,
          attackDamage: 20,
          collisionRadius: 0.5,
        },
      });

      const damageResult = {
        finalDamage: 50,
        wasCritical: false,
        baseDamage: 50,
        typeMultiplier: 1.0,
        armorReduction: 0,
      };

      const isDead = applyCalculatedDamage(unit, damageResult);
      expect(unit.stats.health).toBe(0);
      expect(isDead).toBe(true);
    });

    it('should return true when unit dies', () => {
      const unit = createMockUnit({
        stats: {
          health: 10,
          maxHealth: 100,
          speed: 1.0,
          attackDamage: 20,
          collisionRadius: 0.5,
        },
      });

      const damageResult = {
        finalDamage: 10,
        wasCritical: false,
        baseDamage: 10,
        typeMultiplier: 1.0,
        armorReduction: 0,
      };

      const isDead = applyCalculatedDamage(unit, damageResult);
      expect(isDead).toBe(true);
      expect(unit.stats.health).toBe(0);
    });
  });

  describe('regenerateHealth', () => {
    it('should regenerate health over time', () => {
      const unit = createMockUnit({
        stats: {
          health: 50,
          maxHealth: 100,
          speed: 1.0,
          attackDamage: 20,
          collisionRadius: 0.5,
          combat: {
            attackDamageMin: 10,
            attackDamageMax: 20,
            damageType: 'normal',
            armor: 0,
            armorType: 'medium',
            attackSpeed: 1000,
            healthRegen: 10, // 10 HP per second
            critChance: 0,
            critMultiplier: 2.0,
            attackRange: 2.0,
            health: 50,
            maxHealth: 100,
          },
        },
      });

      regenerateHealth(unit, 1.0); // 1 second
      expect(unit.stats.health).toBe(60);
    });

    it('should not exceed max health', () => {
      const unit = createMockUnit({
        stats: {
          health: 95,
          maxHealth: 100,
          speed: 1.0,
          attackDamage: 20,
          collisionRadius: 0.5,
          combat: {
            attackDamageMin: 10,
            attackDamageMax: 20,
            damageType: 'normal',
            armor: 0,
            armorType: 'medium',
            attackSpeed: 1000,
            healthRegen: 10, // 10 HP per second
            critChance: 0,
            critMultiplier: 2.0,
            attackRange: 2.0,
            health: 95,
            maxHealth: 100,
          },
        },
      });

      regenerateHealth(unit, 1.0); // Would regen to 105, but capped at 100
      expect(unit.stats.health).toBe(100);
    });

    it('should not regenerate if at max health', () => {
      const unit = createMockUnit({
        stats: {
          health: 100,
          maxHealth: 100,
          speed: 1.0,
          attackDamage: 20,
          collisionRadius: 0.5,
          combat: {
            attackDamageMin: 10,
            attackDamageMax: 20,
            damageType: 'normal',
            armor: 0,
            armorType: 'medium',
            attackSpeed: 1000,
            healthRegen: 10,
            critChance: 0,
            critMultiplier: 2.0,
            attackRange: 2.0,
            health: 100,
            maxHealth: 100,
          },
        },
      });

      regenerateHealth(unit, 1.0);
      expect(unit.stats.health).toBe(100);
    });
  });

  describe('DamageCalculatorUtils', () => {
    it('should calculate armor reduction correctly', () => {
      // 10 armor: 1 - (0.06 * 10) / (1 + 0.06 * 10) = 0.625 multiplier
      const multiplier = DamageCalculatorUtils.calculateArmorReduction(10);
      expect(multiplier).toBeCloseTo(0.625, 3);
    });

    it('should handle negative armor (increased damage)', () => {
      // -10 armor: 1 - (0.06 * -10) / (1 + 0.06 * 10) = 1.375 multiplier
      const multiplier = DamageCalculatorUtils.calculateArmorReduction(-10);
      expect(multiplier).toBeGreaterThan(1.0);
    });

    it('should check critical hit chance', () => {
      // Test 100% crit chance
      expect(DamageCalculatorUtils.rollCriticalHit(1.0)).toBe(true);

      // Test 0% crit chance
      expect(DamageCalculatorUtils.rollCriticalHit(0.0)).toBe(false);
    });
  });
});
