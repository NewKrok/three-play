import * as THREE from 'three';
import { createUnitManager } from '../core/units/unit-manager.js';
import type {
  UnitManagerConfig,
  Unit,
  UnitDefinition,
  UnitType,
  CreateUnitParams,
} from '../types/units.js';
import type { LoadedAssets } from '../types/assets.js';

// Mock THREE.js
jest.mock('three', () => {
  const THREE = jest.requireActual('three');

  const MockScene = jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    remove: jest.fn(),
    traverse: jest.fn(),
  }));

  const MockGroup = jest.fn().mockImplementation(() => ({
    position: new THREE.Vector3(),
    rotation: new THREE.Euler(),
    scale: new THREE.Vector3(1, 1, 1),
    add: jest.fn(),
    remove: jest.fn(),
    children: [],
    name: '',
    userData: {},
    traverse: jest.fn(),
    clone: jest.fn(() => new MockGroup()),
  }));

  const MockAnimationMixer = jest.fn().mockImplementation(() => ({
    clipAction: jest.fn(() => ({
      play: jest.fn(),
      stop: jest.fn(),
      reset: jest.fn(),
      setDuration: jest.fn(),
      setLoop: jest.fn(() => ({
        setEffectiveTimeScale: jest.fn(),
        setEffectiveWeight: jest.fn(),
        crossFadeFrom: jest.fn(),
        crossFadeTo: jest.fn(),
      })),
      crossFadeFrom: jest.fn(),
      crossFadeTo: jest.fn(),
      setEffectiveTimeScale: jest.fn(),
      setEffectiveWeight: jest.fn(),
      fadeIn: jest.fn(),
      fadeOut: jest.fn(),
    })),
    update: jest.fn(),
    stopAllAction: jest.fn(),
  }));

  return {
    ...THREE,
    Scene: MockScene,
    Group: MockGroup,
    AnimationMixer: MockAnimationMixer,
    Vector3: THREE.Vector3,
    Euler: THREE.Euler,
    Clock: jest.fn().mockImplementation(() => ({
      getDelta: jest.fn(() => 0.016),
      getElapsedTime: jest.fn(() => 1.0),
    })),
  };
});

// Mock animation controller
jest.mock('../core/units/animation-controller.js', () => ({
  createAnimationController: jest.fn(() => ({
    addUnit: jest.fn(),
    removeUnit: jest.fn(),
    playAnimation: jest.fn(),
    updateAnimations: jest.fn(),
    stopAllAnimations: jest.fn(),
    getAnimationController: jest.fn(() => ({
      clipAction: jest.fn(() => ({
        play: jest.fn(),
        stop: jest.fn(),
        reset: jest.fn(),
        setDuration: jest.fn(),
        setLoop: jest.fn(),
        crossFadeFrom: jest.fn(),
        crossFadeTo: jest.fn(),
        setEffectiveTimeScale: jest.fn(),
        setEffectiveWeight: jest.fn(),
        fadeIn: jest.fn(),
        fadeOut: jest.fn(),
      })),
      update: jest.fn(),
      stopAllAction: jest.fn(),
    })),
  })),
}));

// Mock AI behavior controller
jest.mock('../core/units/ai-behavior-controller.js', () => ({
  createAIBehaviorController: jest.fn(() => ({
    addBehavior: jest.fn(),
    removeBehavior: jest.fn(),
    updateBehaviors: jest.fn(),
    setBehaviorState: jest.fn(),
    getBehaviorState: jest.fn(() => 'idle'),
    dispose: jest.fn(),
  })),
  AIBehaviorUtils: {
    calculateDistance: jest.fn(() => 5.0),
    isInRange: jest.fn(() => false),
    findNearestEnemy: jest.fn(() => null),
    moveTowards: jest.fn(),
  },
}));

// Mock combat controller
jest.mock('../core/units/combat-controller.js', () => ({
  createCombatController: jest.fn(() => ({
    performLightAttack: jest.fn(() => ({
      success: true,
      hitUnits: [],
      damages: [{ unit: {}, damage: 25 }],
    })),
    performHeavyAttack: jest.fn(() => ({
      success: true,
      hitUnits: [],
      damages: [{ unit: {}, damage: 50 }],
    })),
    applyDamage: jest.fn(() => true),
    canAttack: jest.fn(() => true),
    updateCombat: jest.fn(),
    initializeCombat: jest.fn(),
    setStamina: jest.fn(),
    getUnitsInAttackRange: jest.fn(() => []),
  })),
}));

// Mock character asset utils
jest.mock('../core/units/character-asset-utils.js', () => ({
  CharacterAssetUtils: {
    createInstance: jest.fn(() => {
      const THREE = jest.requireActual('three');
      const group = new THREE.Group();
      const mixer = new THREE.AnimationMixer(group);
      return {
        model: group, // Changed from 'group' to 'model'
        mixer,
        actions: {
          idle: { play: jest.fn(), stop: jest.fn() },
          walk: { play: jest.fn(), stop: jest.fn() },
          attack: { play: jest.fn(), stop: jest.fn() },
        },
        userData: {},
      };
    }),
    validateCharacterAsset: jest.fn(() => true),
    findBoneByName: jest.fn(() => null),
  },
}));

describe('UnitManager', () => {
  let scene: THREE.Scene;
  let loadedAssets: LoadedAssets;
  let config: UnitManagerConfig;
  let unitManager: ReturnType<typeof createUnitManager>;

  beforeEach(() => {
    // Create fresh mocks for each test
    scene = new THREE.Scene();
    loadedAssets = {
      textures: {},
      models: {
        knight: new THREE.Group(),
        orc: new THREE.Group(),
      },
    };

    config = {
      scene,
      loadedAssets,
      enabled: true,
      maxUnits: 100,
      enableCollision: true,
      collision: {
        minDistance: 1.0,
        pushStrength: 0.5,
      },
    };

    unitManager = createUnitManager(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Unit Definition Registration', () => {
    it('should register a unit definition', () => {
      const unitDef: UnitDefinition = {
        id: 'test-knight',
        type: 'enemy',
        modelAssets: {
          baseModel: 'knight',
          animations: {
            idle: 'knight-idle',
            walk: 'knight-walk',
            attack: 'knight-attack',
          },
        },
        stats: {
          speed: 2.0,
          health: 100,
          attackDamage: 25,
          collisionRadius: 0.5,
        },
      };

      expect(() => {
        unitManager.registerDefinition(unitDef);
      }).not.toThrow();
    });
  });

  describe('Unit Creation', () => {
    let unitDef: UnitDefinition;

    beforeEach(() => {
      unitDef = {
        id: 'test-knight',
        type: 'enemy',
        modelAssets: {
          baseModel: 'knight',
          animations: {
            idle: 'knight-idle',
            walk: 'knight-walk',
            attack: 'knight-attack',
          },
        },
        stats: {
          speed: 2.0,
          health: 100,
          attackDamage: 25,
          collisionRadius: 0.5,
        },
      };
      unitManager.registerDefinition(unitDef);
    });

    it('should create a unit with valid parameters', () => {
      const createParams: CreateUnitParams = {
        definitionId: 'test-knight',
        position: new THREE.Vector3(0, 0, 0),
        rotation: 0,
      };

      const unit = unitManager.createUnit(createParams);

      expect(unit).toBeDefined();
      expect(unit!.id).toBeDefined();
      expect(unit!.definition.id).toBe('test-knight');
      expect(unit!.stats.health).toBe(100);
      expect(unit!.stats.maxHealth).toBe(100);
      expect(unit!.stats.speed).toBe(2.0);
    });

    it('should reject creation with unknown definition ID', () => {
      const createParams: CreateUnitParams = {
        definitionId: 'unknown-unit',
        position: new THREE.Vector3(0, 0, 0),
      };

      const unit = unitManager.createUnit(createParams);
      expect(unit).toBeNull();
    });

    it('should respect max units limit', () => {
      const smallConfig = { ...config, maxUnits: 1 };
      const smallUnitManager = createUnitManager(smallConfig);
      smallUnitManager.registerDefinition(unitDef);

      const createParams: CreateUnitParams = {
        definitionId: 'test-knight',
        position: new THREE.Vector3(0, 0, 0),
      };

      // First unit should succeed
      const unit1 = smallUnitManager.createUnit(createParams);
      expect(unit1).toBeDefined();

      // Second unit should be rejected
      const unit2 = smallUnitManager.createUnit({
        ...createParams,
        position: new THREE.Vector3(1, 0, 0),
      });
      expect(unit2).toBeNull();
    });
  });

  describe('Unit Management', () => {
    let unit: Unit;
    let unitDef: UnitDefinition;

    beforeEach(() => {
      unitDef = {
        id: 'test-knight',
        type: 'enemy',
        modelAssets: {
          baseModel: 'knight',
          animations: {
            idle: 'knight-idle',
            walk: 'knight-walk',
            attack: 'knight-attack',
          },
        },
        stats: {
          speed: 2.0,
          health: 100,
          attackDamage: 25,
          collisionRadius: 0.5,
        },
      };
      unitManager.registerDefinition(unitDef);

      const createParams: CreateUnitParams = {
        definitionId: 'test-knight',
        position: new THREE.Vector3(0, 0, 0),
      };
      unit = unitManager.createUnit(createParams)!;
    });

    it('should get unit by id', () => {
      const retrievedUnit = unitManager.getUnit(unit.id);
      expect(retrievedUnit).toBeDefined();
      expect(retrievedUnit?.id).toBe(unit.id);
    });

    it('should return null for non-existent unit', () => {
      const retrievedUnit = unitManager.getUnit('non-existent-id');
      expect(retrievedUnit).toBeNull();
    });

    it('should get all units', () => {
      const allUnits = unitManager.getAllUnits();
      expect(allUnits).toHaveLength(1);
      expect(allUnits[0].id).toBe(unit.id);
    });

    it('should get units by type', () => {
      const enemyUnits = unitManager.getUnitsByType('enemy');
      expect(enemyUnits).toHaveLength(1);
      expect(enemyUnits[0].id).toBe(unit.id);

      const playerUnits = unitManager.getUnitsByType('player');
      expect(playerUnits).toHaveLength(0);
    });

    it('should remove unit successfully', () => {
      const removed = unitManager.removeUnit(unit.id);
      expect(removed).toBe(true);
      expect(unitManager.getUnit(unit.id)).toBeNull();
    });

    it('should return false when removing non-existent unit', () => {
      const removed = unitManager.removeUnit('non-existent-id');
      expect(removed).toBe(false);
    });
  });

  describe('System Updates', () => {
    let unit: Unit;
    let unitDef: UnitDefinition;

    beforeEach(() => {
      unitDef = {
        id: 'test-knight',
        type: 'enemy',
        modelAssets: {
          baseModel: 'knight',
          animations: {
            idle: 'knight-idle',
            walk: 'knight-walk',
            attack: 'knight-attack',
          },
        },
        stats: {
          speed: 2.0,
          health: 100,
          attackDamage: 25,
          collisionRadius: 0.5,
        },
      };
      unitManager.registerDefinition(unitDef);

      const createParams: CreateUnitParams = {
        definitionId: 'test-knight',
        position: new THREE.Vector3(0, 0, 0),
      };
      unit = unitManager.createUnit(createParams)!;
    });

    it('should update all systems', () => {
      expect(() => {
        unitManager.update(0.016);
      }).not.toThrow();
    });

    it('should update with elapsed time', () => {
      expect(() => {
        unitManager.update(0.016, 1.0);
      }).not.toThrow();
    });
  });

  describe('Disposal', () => {
    it('should dispose unit manager', () => {
      const unitDef: UnitDefinition = {
        id: 'test-knight',
        type: 'enemy',
        modelAssets: {
          baseModel: 'knight',
          animations: {
            idle: 'knight-idle',
            walk: 'knight-walk',
            attack: 'knight-attack',
          },
        },
        stats: {
          speed: 2.0,
          health: 100,
          attackDamage: 25,
          collisionRadius: 0.5,
        },
      };
      unitManager.registerDefinition(unitDef);

      const createParams: CreateUnitParams = {
        definitionId: 'test-knight',
        position: new THREE.Vector3(0, 0, 0),
      };
      unitManager.createUnit(createParams);

      expect(() => {
        unitManager.dispose();
      }).not.toThrow();

      expect(unitManager.getAllUnits()).toHaveLength(0);
    });
  });
});
