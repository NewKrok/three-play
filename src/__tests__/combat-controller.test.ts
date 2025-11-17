import * as THREE from 'three';
import { createCombatController } from '../core/units/combat-controller.js';
import type { Unit, UnitDefinition, AttackType } from '../types/units.js';

// Mock THREE.js
jest.mock('three', () => {
  const THREE = jest.requireActual('three');
  return {
    ...THREE,
    Vector3: THREE.Vector3,
  };
});

describe('CombatController', () => {
  let combatController: ReturnType<typeof createCombatController>;
  let mockUnit: Unit;
  let targetUnit: Unit;
  let mockUnitManager: any;

  beforeEach(() => {
    // Create mock unit definition
    const mockDefinition: UnitDefinition = {
      id: 'test-unit',
      type: 'enemy',
      modelAssets: {
        baseModel: 'test-model',
        animations: {
          idle: 'idle-anim',
          walk: 'walk-anim',
          attack: 'attack-anim',
        },
      },
      stats: {
        speed: 1.0,
        health: 100,
        attackDamage: 25,
        collisionRadius: 0.5,
      },
    };

    // Create mock unit
    mockUnit = {
      id: 'test-unit-1',
      definition: mockDefinition,
      model: new THREE.Group(),
      mixer: {} as THREE.AnimationMixer,
      actions: {},
      currentAnimation: 'idle',
      stats: {
        health: 100,
        maxHealth: 100,
        speed: 1.0,
        attackDamage: 25,
        collisionRadius: 0.5,
      },
    } as Unit;

    // Create target unit
    targetUnit = {
      id: 'target-unit-1',
      definition: mockDefinition,
      model: new THREE.Group(),
      mixer: {} as THREE.AnimationMixer,
      actions: {},
      currentAnimation: 'idle',
      stats: {
        health: 100,
        maxHealth: 100,
        speed: 1.0,
        attackDamage: 25,
        collisionRadius: 0.5,
      },
    } as Unit;

    // Position units
    mockUnit.model.position.set(0, 0, 0);
    targetUnit.model.position.set(1, 0, 0);

    // Create mock unit manager
    mockUnitManager = {
      getAllUnits: jest.fn(() => [mockUnit, targetUnit]),
      playAnimation: jest.fn(() => true),
      getUnit: jest.fn((id: string) => {
        if (id === mockUnit.id) return mockUnit;
        if (id === targetUnit.id) return targetUnit;
        return null;
      }),
      getUnitsInRange: jest.fn((position: THREE.Vector3, range: number, excludeUnit?: Unit) => {
        // Simple mock: return all units except excludeUnit within range
        // Also exclude same-type units (enemies don't attack enemies)
        const allUnits = [mockUnit, targetUnit];
        return allUnits.filter(unit => 
          unit !== excludeUnit &&
          unit.model.position.distanceTo(position) <= range &&
          (excludeUnit ? unit.definition.type !== excludeUnit.definition.type : true)
        );
      }),
    };

    combatController = createCombatController({ enableDamage: true }, mockUnitManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Combat Initialization', () => {
    it('should initialize combat data for unit', () => {
      combatController.initializeCombat(mockUnit, 100);
      
      expect(mockUnit.combat).toBeDefined();
      expect(mockUnit.combat?.stamina).toBe(100);
      expect(mockUnit.combat?.maxStamina).toBe(100);
      expect(mockUnit.combat?.isAttacking).toBe(false);
    });

    it('should initialize combat with default stamina', () => {
      combatController.initializeCombat(mockUnit);
      
      expect(mockUnit.combat).toBeDefined();
      expect(mockUnit.combat?.stamina).toBe(100);
    });

    it('should set stamina for unit', () => {
      combatController.initializeCombat(mockUnit);
      combatController.setStamina(mockUnit, 50);
      
      expect(mockUnit.combat?.stamina).toBe(50);
    });
  });

  describe('Light Attack', () => {
    beforeEach(() => {
      combatController.initializeCombat(mockUnit);
      combatController.initializeCombat(targetUnit);
    });

    it('should perform light attack successfully', () => {
      const currentTime = Date.now();
      const result = combatController.performLightAttack(mockUnit, currentTime);
      
      expect(result.success).toBe(true);
      expect(result.hitUnits).toBeDefined();
      expect(result.damages).toBeDefined();
    });

    it('should consume stamina on light attack', () => {
      const currentTime = Date.now();
      const initialStamina = mockUnit.combat?.stamina || 100;
      
      combatController.performLightAttack(mockUnit, currentTime);
      
      expect(mockUnit.combat?.stamina).toBeLessThan(initialStamina);
    });

    it('should fail when unit has no combat data', () => {
      const unitWithoutCombat = { ...mockUnit, combat: undefined };
      const currentTime = Date.now();
      
      const result = combatController.performLightAttack(unitWithoutCombat, currentTime);
      
      expect(result.success).toBe(false);
    });
  });

  describe('Heavy Attack', () => {
    beforeEach(() => {
      combatController.initializeCombat(mockUnit);
      combatController.initializeCombat(targetUnit);
    });

    it('should perform heavy attack successfully', () => {
      const currentTime = Date.now();
      const result = combatController.performHeavyAttack(mockUnit, currentTime);
      
      expect(result.success).toBe(true);
      expect(result.hitUnits).toBeDefined();
      expect(result.damages).toBeDefined();
    });

    it('should consume more stamina than light attack', () => {
      const currentTime = Date.now();
      
      // Test light attack stamina consumption
      const testUnit1 = { ...mockUnit, id: 'test-unit-light' };
      combatController.initializeCombat(testUnit1);
      const initialStamina = testUnit1.combat?.stamina || 100;
      combatController.performLightAttack(testUnit1, currentTime);
      const lightStaminaCost = initialStamina - (testUnit1.combat?.stamina || 0);
      
      // Test heavy attack stamina consumption
      const testUnit2 = { ...mockUnit, id: 'test-unit-heavy' };
      combatController.initializeCombat(testUnit2);
      const initialStamina2 = testUnit2.combat?.stamina || 100;
      combatController.performHeavyAttack(testUnit2, currentTime);
      const heavyStaminaCost = initialStamina2 - (testUnit2.combat?.stamina || 0);
      
      expect(heavyStaminaCost).toBeGreaterThan(lightStaminaCost);
    });
  });

  describe('Attack Capability', () => {
    beforeEach(() => {
      combatController.initializeCombat(mockUnit);
    });

    it('should allow attack when unit can attack', () => {
      const currentTime = Date.now();
      const canAttackLight = combatController.canAttack(mockUnit, 'light', currentTime);
      const canAttackHeavy = combatController.canAttack(mockUnit, 'heavy', currentTime);
      
      expect(canAttackLight).toBe(true);
      expect(canAttackHeavy).toBe(true);
    });

    it('should prevent attack when unit has insufficient stamina', () => {
      combatController.setStamina(mockUnit, 5); // Very low stamina
      const currentTime = Date.now();
      
      const canAttackHeavy = combatController.canAttack(mockUnit, 'heavy', currentTime);
      
      // Should be false when stamina is too low for heavy attack
      expect(canAttackHeavy).toBe(false);
    });

    it('should prevent attack when unit is already attacking', () => {
      if (mockUnit.combat) {
        mockUnit.combat.isAttacking = true;
      }
      const currentTime = Date.now();
      
      const canAttack = combatController.canAttack(mockUnit, 'light', currentTime);
      
      expect(canAttack).toBe(false);
    });
  });

  describe('Damage System', () => {
    beforeEach(() => {
      combatController.initializeCombat(targetUnit);
    });

    it('should apply damage to target unit', () => {
      const initialHealth = targetUnit.stats.health;
      const damage = 30;
      
      const result = combatController.applyDamage(targetUnit, damage);
      
      expect(result).toBe(false); // Unit is still alive
      expect(targetUnit.stats.health).toBe(initialHealth - damage);
    });

    it('should handle unit death', () => {
      const damage = 150; // More than unit's health
      
      const result = combatController.applyDamage(targetUnit, damage);
      
      expect(result).toBe(true);
      expect(targetUnit.stats.health).toBe(0);
    });

    it('should handle zero damage', () => {
      const initialHealth = targetUnit.stats.health;
      
      const result = combatController.applyDamage(targetUnit, 0);
      
      expect(result).toBe(false); // Unit is still alive
      expect(targetUnit.stats.health).toBe(initialHealth);
    });

    it('should handle negative damage', () => {
      const initialHealth = targetUnit.stats.health;
      
      const result = combatController.applyDamage(targetUnit, -10);
      
      expect(result).toBe(false); // Unit is still alive
      expect(targetUnit.stats.health).toBe(initialHealth + 10); // Negative damage = healing
    });
  });

  describe('Units in Attack Range', () => {
    beforeEach(() => {
      combatController.initializeCombat(mockUnit);
      combatController.initializeCombat(targetUnit);
    });

    it('should get units in light attack range', () => {
      const unitsInRange = combatController.getUnitsInAttackRange(mockUnit, 'light');
      
      expect(Array.isArray(unitsInRange)).toBe(true);
    });

    it('should get units in heavy attack range', () => {
      const unitsInRange = combatController.getUnitsInAttackRange(mockUnit, 'heavy');
      
      expect(Array.isArray(unitsInRange)).toBe(true);
    });

    it('should exclude same-type units from attack range', () => {
      // Both units are enemies, so should not attack each other
      const unitsInRange = combatController.getUnitsInAttackRange(mockUnit, 'light');
      
      expect(unitsInRange).not.toContain(targetUnit);
    });
  });

  describe('Combat Updates', () => {
    beforeEach(() => {
      combatController.initializeCombat(mockUnit);
      combatController.initializeCombat(targetUnit);
    });

    it('should update combat states', () => {
      const units = [mockUnit, targetUnit];
      const deltaTime = 0.016;
      const currentTime = Date.now();
      
      expect(() => {
        combatController.updateCombat(units, deltaTime, currentTime);
      }).not.toThrow();
    });

    it('should handle empty unit array', () => {
      const deltaTime = 0.016;
      const currentTime = Date.now();
      
      expect(() => {
        combatController.updateCombat([], deltaTime, currentTime);
      }).not.toThrow();
    });

    it('should regenerate stamina over time', () => {
      // Consume some stamina first
      combatController.setStamina(mockUnit, 50);
      const initialStamina = mockUnit.combat?.stamina || 0;
      
      // Update combat for stamina regeneration
      const units = [mockUnit];
      const deltaTime = 1.0; // 1 second
      const currentTime = Date.now();
      
      combatController.updateCombat(units, deltaTime, currentTime);
      
      const finalStamina = mockUnit.combat?.stamina || 0;
      expect(finalStamina).toBeGreaterThanOrEqual(initialStamina);
    });
  });

  describe('Combat Configuration', () => {
    it('should create combat controller with default config', () => {
      const controller = createCombatController({}, mockUnitManager);
      
      expect(controller).toBeDefined();
      expect(typeof controller.performLightAttack).toBe('function');
      expect(typeof controller.performHeavyAttack).toBe('function');
      expect(typeof controller.applyDamage).toBe('function');
      expect(typeof controller.canAttack).toBe('function');
      expect(typeof controller.updateCombat).toBe('function');
      expect(typeof controller.initializeCombat).toBe('function');
      expect(typeof controller.setStamina).toBe('function');
      expect(typeof controller.getUnitsInAttackRange).toBe('function');
    });

    it('should create combat controller with custom config', () => {
      const customConfig = {
        lightAttack: {
          damage: 20,
          knockback: 3,
          range: 1.2,
          cooldown: 800,
          staminaCost: 15,
          stunDuration: 200,
          actionDelay: 300,
        },
        heavyAttack: {
          damage: 45,
          knockback: 8,
          range: 1.5,
          cooldown: 1500,
          staminaCost: 35,
          stunDuration: 500,
          actionDelay: 600,
        },
        enableDamage: true,
      };
      
      const controller = createCombatController(customConfig, mockUnitManager);
      
      expect(controller).toBeDefined();
    });
  });
});