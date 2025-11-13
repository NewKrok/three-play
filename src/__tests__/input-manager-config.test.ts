import { createInputManager } from '../core/input/index.js';
import type { InputManager, InputManagerConfig } from '../types/input.js';

describe('InputManager Configuration', () => {
  let inputManager: InputManager;

  afterEach(() => {
    if (inputManager) {
      inputManager.destroy();
    }
  });

  describe('Actions Configuration in World Config', () => {
    test('should initialize actions from config', () => {
      const config: InputManagerConfig = {
        actions: {
          'test-action': {
            action: {
              type: 'continuous',
              valueType: 'boolean',
            },
            bindings: [
              {
                type: 'keyboard',
                key: 'KeyW',
              },
            ],
          },
          'move-action': {
            action: {
              type: 'trigger',
              valueType: 'number',
            },
            bindings: [
              {
                type: 'keyboard',
                key: 'Space',
              },
              {
                type: 'mouse',
                button: 0,
              },
            ],
          },
        },
      };

      inputManager = createInputManager(config);

      // Check that actions were registered
      expect(inputManager.hasAction('test-action')).toBe(true);
      expect(inputManager.hasAction('move-action')).toBe(true);
      expect(inputManager.getActionNames()).toContain('test-action');
      expect(inputManager.getActionNames()).toContain('move-action');
    });

    test('should handle empty actions config', () => {
      const config: InputManagerConfig = {
        actions: {},
      };

      inputManager = createInputManager(config);

      expect(inputManager.getActionNames()).toHaveLength(0);
    });

    test('should handle config without actions', () => {
      const config: InputManagerConfig = {
        enabled: true,
      };

      inputManager = createInputManager(config);

      expect(inputManager.getActionNames()).toHaveLength(0);
      expect(inputManager.isEnabled()).toBe(true);
    });

    test('should initialize complex action configurations', () => {
      const config: InputManagerConfig = {
        actions: {
          roll: {
            action: {
              type: 'trigger',
              valueType: 'boolean',
            },
            bindings: [
              {
                type: 'keyboard',
                key: 'KeyR',
              },
            ],
          },
          move: {
            action: {
              type: 'continuous',
              valueType: 'vector2',
            },
            bindings: [
              {
                type: 'gamepad',
                axis: 'leftStickX',
                deadzone: 0.2,
              },
              {
                type: 'gamepad',
                axis: 'leftStickY',
                deadzone: 0.2,
              },
            ],
          },
        },
      };

      inputManager = createInputManager(config);

      expect(inputManager.hasAction('roll')).toBe(true);
      expect(inputManager.hasAction('move')).toBe(true);
      expect(inputManager.getActionNames()).toHaveLength(2);

      // Test that actions return appropriate default values
      expect(inputManager.getActionValue('roll')).toBe(false);
      expect(inputManager.getActionValue('move')).toBeInstanceOf(Object);
    });

    test('should support actions with easing configurations', () => {
      const config: InputManagerConfig = {
        actions: {
          'smooth-action': {
            action: {
              type: 'continuous',
              valueType: 'number',
            },
            bindings: [
              {
                type: 'keyboard',
                key: 'KeyA',
                easing: {
                  type: 'ease-in-out',
                  duration: 0.5,
                },
              },
            ],
          },
        },
      };

      inputManager = createInputManager(config);

      expect(inputManager.hasAction('smooth-action')).toBe(true);
      expect(inputManager.getActionValue('smooth-action')).toBe(0);
    });

    test('should maintain existing configuration options', () => {
      const config: InputManagerConfig = {
        enabled: false,
        preventDefaultKeyboard: true,
        gamepadDeadzone: 0.15,
        actions: {
          'test-action': {
            action: {
              type: 'continuous',
              valueType: 'boolean',
            },
            bindings: [
              {
                type: 'keyboard',
                key: 'KeyT',
              },
            ],
          },
        },
      };

      inputManager = createInputManager(config);

      expect(inputManager.isEnabled()).toBe(false);
      expect(inputManager.hasAction('test-action')).toBe(true);
    });

    test('should allow manual action registration after config initialization', () => {
      const config: InputManagerConfig = {
        actions: {
          'config-action': {
            action: {
              type: 'trigger',
              valueType: 'boolean',
            },
            bindings: [
              {
                type: 'keyboard',
                key: 'KeyC',
              },
            ],
          },
        },
      };

      inputManager = createInputManager(config);

      // Add action manually after initialization
      inputManager.registerAction('manual-action', {
        type: 'continuous',
        valueType: 'number',
      });

      inputManager.bindInput('manual-action', {
        type: 'keyboard',
        key: 'KeyM',
      });

      expect(inputManager.hasAction('config-action')).toBe(true);
      expect(inputManager.hasAction('manual-action')).toBe(true);
      expect(inputManager.getActionNames()).toHaveLength(2);
    });
  });
});
