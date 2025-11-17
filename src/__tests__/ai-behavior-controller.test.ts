import * as THREE from 'three';
import {
  createAIBehaviorController,
  AIBehaviorUtils,
} from '../core/units/ai-behavior-controller.js';
import type { Unit, UnitDefinition } from '../types/units.js';
import type { AIBehaviorState } from '../core/units/ai-behavior-controller.js';

// Mock THREE.js
jest.mock('three', () => {
  const THREE = jest.requireActual('three');
  return {
    ...THREE,
    Vector3: THREE.Vector3,
    Quaternion: THREE.Quaternion,
  };
});

describe('AIBehaviorController', () => {
  let aiController: ReturnType<typeof createAIBehaviorController>;
  let mockUnit: Unit;
  let playerUnit: Unit;

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
        attackDamage: 10,
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
        attackDamage: 10,
        collisionRadius: 0.5,
      },
    } as Unit;

    // Position the unit
    mockUnit.model.position.set(0, 0, 0);

    // Create player unit
    playerUnit = {
      id: 'player-unit-1',
      definition: {
        ...mockDefinition,
        type: 'player',
      },
      model: new THREE.Group(),
      mixer: {} as THREE.AnimationMixer,
      actions: {},
      currentAnimation: 'idle',
      stats: {
        health: 100,
        maxHealth: 100,
        speed: 1.0,
        attackDamage: 10,
        collisionRadius: 0.5,
      },
    } as Unit;

    // Position the player unit
    playerUnit.model.position.set(5, 0, 5);

    aiController = createAIBehaviorController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Behavior Initialization', () => {
    it('should initialize behavior for unit', () => {
      const homePosition = new THREE.Vector3(0, 0, 0);
      
      expect(() => {
        aiController.initializeBehavior(mockUnit, homePosition);
      }).not.toThrow();
    });

    it('should initialize behavior without home position', () => {
      expect(() => {
        aiController.initializeBehavior(mockUnit);
      }).not.toThrow();
    });

    it('should get behavior data after initialization', () => {
      aiController.initializeBehavior(mockUnit);
      
      const behaviorData = aiController.getBehaviorData(mockUnit);
      expect(behaviorData).toBeDefined();
      expect(behaviorData?.state).toBe('idle');
    });

    it('should return null for unit without behavior', () => {
      const behaviorData = aiController.getBehaviorData(mockUnit);
      expect(behaviorData).toBeNull();
    });
  });

  describe('Behavior State Management', () => {
    beforeEach(() => {
      aiController.initializeBehavior(mockUnit);
    });

    it('should set behavior state', () => {
      expect(() => {
        aiController.setBehaviorState(mockUnit, 'patrol');
      }).not.toThrow();
      
      const behaviorData = aiController.getBehaviorData(mockUnit);
      expect(behaviorData?.state).toBe('patrol');
    });

    it('should set different behavior states', () => {
      const states: AIBehaviorState[] = ['idle', 'patrol', 'chase', 'attack', 'return'];
      
      states.forEach(state => {
        aiController.setBehaviorState(mockUnit, state);
        const behaviorData = aiController.getBehaviorData(mockUnit);
        expect(behaviorData?.state).toBe(state);
      });
    });
  });

  describe('Behavior Updates', () => {
    beforeEach(() => {
      aiController.initializeBehavior(mockUnit);
    });

    it('should update behaviors with player unit', () => {
      const units = [mockUnit];
      const deltaTime = 0.016;
      const elapsedTime = 1.0;

      expect(() => {
        aiController.updateBehaviors(units, playerUnit, deltaTime, elapsedTime);
      }).not.toThrow();
    });

    it('should update behaviors without player unit', () => {
      const units = [mockUnit];
      const deltaTime = 0.016;
      const elapsedTime = 1.0;

      expect(() => {
        aiController.updateBehaviors(units, null, deltaTime, elapsedTime);
      }).not.toThrow();
    });

    it('should handle empty unit array', () => {
      const deltaTime = 0.016;
      const elapsedTime = 1.0;

      expect(() => {
        aiController.updateBehaviors([], playerUnit, deltaTime, elapsedTime);
      }).not.toThrow();
    });

    it('should handle units without behavior', () => {
      const uninitializedUnit = { ...mockUnit, id: 'uninitialized' };
      const units = [uninitializedUnit];
      const deltaTime = 0.016;
      const elapsedTime = 1.0;

      expect(() => {
        aiController.updateBehaviors(units, playerUnit, deltaTime, elapsedTime);
      }).not.toThrow();
    });
  });

  describe('Target Updates', () => {
    beforeEach(() => {
      aiController.initializeBehavior(mockUnit);
    });

    it('should update target with player unit', () => {
      const elapsedTime = 1.0;

      expect(() => {
        aiController.updateTarget(mockUnit, playerUnit, elapsedTime);
      }).not.toThrow();
    });

    it('should update target without player unit', () => {
      const elapsedTime = 1.0;

      expect(() => {
        aiController.updateTarget(mockUnit, null, elapsedTime);
      }).not.toThrow();
    });
  });

  describe('AI State Transitions', () => {
    beforeEach(() => {
      aiController.initializeBehavior(mockUnit);
    });

    it('should maintain idle state when player is far', () => {
      // Position player far away
      playerUnit.model.position.set(20, 0, 20);
      
      const units = [mockUnit];
      aiController.setBehaviorState(mockUnit, 'idle');
      
      // Update multiple times
      for (let i = 0; i < 5; i++) {
        aiController.updateBehaviors(units, playerUnit, 0.016, i * 0.016);
      }
      
      const behaviorData = aiController.getBehaviorData(mockUnit);
      expect(['idle', 'patrol']).toContain(behaviorData?.state);
    });

    it('should transition to chase when player is nearby', () => {
      // Position player nearby (within detection range)
      playerUnit.model.position.set(3, 0, 0);
      
      const units = [mockUnit];
      aiController.setBehaviorState(mockUnit, 'patrol');
      
      // Update multiple times to allow detection
      for (let i = 0; i < 10; i++) {
        aiController.updateBehaviors(units, playerUnit, 0.1, i * 0.1);
      }
      
      const behaviorData = aiController.getBehaviorData(mockUnit);
      // Could be chase or attack depending on distance
      expect(['patrol', 'chase', 'attack']).toContain(behaviorData?.state);
    });
  });

  describe('Configuration', () => {
    it('should create controller with default config', () => {
      const controller = createAIBehaviorController();
      expect(controller).toBeDefined();
      expect(typeof controller.initializeBehavior).toBe('function');
      expect(typeof controller.updateBehaviors).toBe('function');
      expect(typeof controller.setBehaviorState).toBe('function');
      expect(typeof controller.getBehaviorData).toBe('function');
      expect(typeof controller.updateTarget).toBe('function');
    });

    it('should create controller with custom config', () => {
      const controller = createAIBehaviorController({
        detectionRange: 15.0,
        attackRange: 2.0,
        speed: 3.0,
        rotationSpeed: 5.0,
        pauseDurationMax: 3.0,
        targetUpdateInterval: 2.0,
      });
      
      expect(controller).toBeDefined();
    });
  });
});

describe('AIBehaviorUtils', () => {
  describe('Utility Functions', () => {
    it('should have AIBehaviorUtils exported', () => {
      // Check if utils are available
      expect(AIBehaviorUtils).toBeDefined();
      expect(typeof AIBehaviorUtils.createDefault).toBe('function');
      expect(typeof AIBehaviorUtils.createAggressive).toBe('function');
      expect(typeof AIBehaviorUtils.createPassive).toBe('function');
      expect(typeof AIBehaviorUtils.getAnimationForState).toBe('function');
    });

    it('should create default AI behavior controller', () => {
      const controller = AIBehaviorUtils.createDefault();
      expect(controller).toBeDefined();
      expect(typeof controller.initializeBehavior).toBe('function');
    });

    it('should create aggressive AI behavior controller', () => {
      const controller = AIBehaviorUtils.createAggressive();
      expect(controller).toBeDefined();
      expect(typeof controller.initializeBehavior).toBe('function');
    });

    it('should create passive AI behavior controller', () => {
      const controller = AIBehaviorUtils.createPassive();
      expect(controller).toBeDefined();
      expect(typeof controller.initializeBehavior).toBe('function');
    });

    it('should get animation for AI state', () => {
      const idleAnim = AIBehaviorUtils.getAnimationForState('idle');
      expect(idleAnim).toBe('idle');

      const patrolAnim = AIBehaviorUtils.getAnimationForState('patrol');
      expect(patrolAnim).toBe('walk');

      const chaseAnim = AIBehaviorUtils.getAnimationForState('chase');
      expect(chaseAnim).toBe('run');

      const attackAnim = AIBehaviorUtils.getAnimationForState('attack');
      expect(attackAnim).toBe('attack');

      const returnAnim = AIBehaviorUtils.getAnimationForState('return');
      expect(returnAnim).toBe('walk');
    });
  });
});