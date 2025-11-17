import * as THREE from 'three';
import { createAnimationController } from '../core/units/animation-controller.js';
import type { Unit, UnitDefinition, AnimationState } from '../types/units.js';

// Mock THREE.js
jest.mock('three', () => {
  const THREE = jest.requireActual('three');

  const MockAnimationMixer = jest.fn().mockImplementation(() => ({
    clipAction: jest.fn(() => ({
      play: jest.fn(),
      stop: jest.fn(),
      reset: jest.fn(),
      setDuration: jest.fn().mockReturnThis(),
      setLoop: jest.fn().mockReturnThis(),
      crossFadeFrom: jest.fn().mockReturnThis(),
      crossFadeTo: jest.fn().mockReturnThis(),
      setEffectiveTimeScale: jest.fn().mockReturnThis(),
      setEffectiveWeight: jest.fn().mockReturnThis(),
      fadeIn: jest.fn().mockReturnThis(),
      fadeOut: jest.fn().mockReturnThis(),
      isRunning: jest.fn(() => true),
      time: 0,
      weight: 1,
    })),
    update: jest.fn(),
    stopAllAction: jest.fn(),
  }));

  return {
    ...THREE,
    AnimationMixer: MockAnimationMixer,
    Vector3: THREE.Vector3,
    LoopRepeat: 2201,
    LoopPingPong: 2202,
    LoopOnce: 2200,
  };
});

describe('AnimationController', () => {
  let animationController: ReturnType<typeof createAnimationController>;
  let mockUnit: Unit;
  let mockMixer: jest.MockedObject<THREE.AnimationMixer>;
  let mockAction: any;

  beforeEach(() => {
    // Create mock action
    mockAction = {
      play: jest.fn().mockReturnThis(),
      stop: jest.fn().mockReturnThis(),
      reset: jest.fn().mockReturnThis(),
      setDuration: jest.fn().mockReturnThis(),
      setLoop: jest.fn().mockReturnThis(),
      crossFadeFrom: jest.fn().mockReturnThis(),
      crossFadeTo: jest.fn().mockReturnThis(),
      setEffectiveTimeScale: jest.fn().mockReturnThis(),
      setEffectiveWeight: jest.fn().mockReturnThis(),
      fadeIn: jest.fn().mockReturnThis(),
      fadeOut: jest.fn().mockReturnThis(),
      isRunning: jest.fn(() => true),
      time: 0,
      weight: 1,
    };

    // Create mock mixer
    mockMixer = {
      clipAction: jest.fn(() => mockAction),
      update: jest.fn(),
      stopAllAction: jest.fn(),
    } as any;

    // Create mock unit
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

    mockUnit = {
      id: 'test-unit-1',
      definition: mockDefinition,
      model: new THREE.Group(),
      mixer: mockMixer,
      actions: {
        idle: mockAction,
        walk: mockAction,
        attack: mockAction,
      },
      currentAnimation: 'idle',
      userData: {
        currentAnimationName: 'idle',
        lastAnimationName: null,
      },
      stats: {
        health: 100,
        maxHealth: 100,
        speed: 1.0,
        attackDamage: 10,
        collisionRadius: 0.5,
      },
    };

    animationController = createAnimationController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Animation Playback', () => {
    it('should play animation successfully', () => {
      expect(() => {
        animationController.playAnimation(mockUnit, 'walk');
      }).not.toThrow();

      expect(mockAction.play).toHaveBeenCalled();
    });

    it('should play animation with fade duration', () => {
      expect(() => {
        animationController.playAnimation(mockUnit, 'walk', 0.5);
      }).not.toThrow();

      expect(mockAction.play).toHaveBeenCalled();
    });

    it('should handle missing animation gracefully', () => {
      const unitWithoutActions = {
        ...mockUnit,
        actions: {},
      };

      expect(() => {
        animationController.playAnimation(unitWithoutActions, 'non-existent');
      }).not.toThrow();
    });

    it('should stop all animations for unit', () => {
      expect(() => {
        animationController.stopAnimations(mockUnit);
      }).not.toThrow();

      // Check that individual actions are stopped (actual implementation stops actions, not mixer)
      expect(mockUnit.actions.idle.stop).toHaveBeenCalled();
      expect(mockUnit.actions.walk.stop).toHaveBeenCalled();
      expect(mockUnit.actions.attack.stop).toHaveBeenCalled();
    });
  });

  describe('Animation Speed Control', () => {
    it('should set animation speed', () => {
      expect(() => {
        animationController.setAnimationSpeed(mockUnit, 'walk', 2.0);
      }).not.toThrow();

      expect(mockAction.setEffectiveTimeScale).toHaveBeenCalledWith(2.0);
    });

    it('should handle missing animation for speed control', () => {
      const unitWithoutActions = {
        ...mockUnit,
        actions: {},
      };

      expect(() => {
        animationController.setAnimationSpeed(
          unitWithoutActions,
          'non-existent',
          2.0,
        );
      }).not.toThrow();
    });
  });

  describe('Animation State Queries', () => {
    it('should check if animation is playing', () => {
      mockAction.isRunning.mockReturnValue(true);

      const isPlaying = animationController.isAnimationPlaying(
        mockUnit,
        'walk',
      );
      expect(isPlaying).toBe(true);
    });

    it('should return false for non-existent animation', () => {
      const unitWithoutActions = {
        ...mockUnit,
        actions: {},
      };

      const isPlaying = animationController.isAnimationPlaying(
        unitWithoutActions,
        'non-existent',
      );
      expect(isPlaying).toBe(false);
    });

    it('should get current animation name', () => {
      const currentAnim = animationController.getCurrentAnimation(mockUnit);
      expect(currentAnim).toBe('idle');
    });

    it('should return null for unit without current animation', () => {
      const unitWithoutCurrent = {
        ...mockUnit,
        currentAnimation: null as any,
        userData: {
          currentAnimationName: null,
          lastAnimationName: null,
        },
      };

      const currentAnim =
        animationController.getCurrentAnimation(unitWithoutCurrent);
      expect(currentAnim).toBeNull();
    });
  });

  describe('System Updates', () => {
    it('should update all animations', () => {
      const units = [mockUnit];
      const deltaTime = 0.016;

      expect(() => {
        animationController.updateAnimations(units, deltaTime);
      }).not.toThrow();

      expect(mockMixer.update).toHaveBeenCalledWith(deltaTime);
    });

    it('should handle empty unit array', () => {
      const deltaTime = 0.016;

      expect(() => {
        animationController.updateAnimations([], deltaTime);
      }).not.toThrow();
    });

    it('should handle units without mixers', () => {
      const unitWithoutMixer = {
        ...mockUnit,
        mixer: null as any,
      };
      const units = [unitWithoutMixer];
      const deltaTime = 0.016;

      expect(() => {
        animationController.updateAnimations(units, deltaTime);
      }).not.toThrow();
    });
  });

  describe('Animation Configuration', () => {
    it('should create controller with default config', () => {
      const controller = createAnimationController();
      expect(controller).toBeDefined();
      expect(typeof controller.playAnimation).toBe('function');
      expect(typeof controller.updateAnimations).toBe('function');
      expect(typeof controller.stopAnimations).toBe('function');
    });

    it('should create controller with custom config', () => {
      const controller = createAnimationController({
        defaultFadeDuration: 0.5,
        autoLoop: false,
      });
      expect(controller).toBeDefined();

      // Test that custom fade duration is used
      expect(() => {
        controller.playAnimation(mockUnit, 'walk');
      }).not.toThrow();
    });
  });

  describe('Cross-fade Transitions', () => {
    it('should handle cross-fade between animations', () => {
      // Set current animation
      mockUnit.currentAnimation = 'idle';
      mockUnit.previousAnimation = undefined;

      // Play new animation with fade
      animationController.playAnimation(mockUnit, 'walk', 0.3);

      expect(mockAction.play).toHaveBeenCalled();
    });

    it('should handle cross-fade with previous animation', () => {
      // Set up previous animation scenario
      mockUnit.currentAnimation = 'walk';
      mockUnit.previousAnimation = 'idle';

      // Play new animation
      animationController.playAnimation(mockUnit, 'attack', 0.2);

      expect(mockAction.play).toHaveBeenCalled();
    });
  });
});
