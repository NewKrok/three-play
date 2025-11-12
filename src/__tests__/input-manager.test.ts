import { createInputManager } from '../core/input/index.js';
import type { InputManager } from '../types/input.js';

describe('InputManager', () => {
  let inputManager: InputManager;

  beforeEach(() => {
    inputManager = createInputManager();
  });

  afterEach(() => {
    inputManager.destroy();
  });

  describe('Action Registration', () => {
    test('should register a new action', () => {
      inputManager.registerAction('test-action', {
        type: 'continuous',
        valueType: 'boolean',
      });

      expect(inputManager.hasAction('test-action')).toBe(true);
      expect(inputManager.getActionNames()).toContain('test-action');
    });

    test('should register action with different value types', () => {
      inputManager.registerAction('boolean-action', {
        type: 'continuous',
        valueType: 'boolean',
      });

      inputManager.registerAction('number-action', {
        type: 'continuous',
        valueType: 'number',
      });

      inputManager.registerAction('vector2-action', {
        type: 'continuous',
        valueType: 'vector2',
      });

      expect(inputManager.hasAction('boolean-action')).toBe(true);
      expect(inputManager.hasAction('number-action')).toBe(true);
      expect(inputManager.hasAction('vector2-action')).toBe(true);
    });

    test('should warn when registering duplicate action', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      inputManager.registerAction('duplicate', {
        type: 'continuous',
        valueType: 'boolean',
      });

      inputManager.registerAction('duplicate', {
        type: 'trigger',
        valueType: 'number',
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Action 'duplicate' is already registered. Overwriting.",
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Input Binding', () => {
    beforeEach(() => {
      inputManager.registerAction('move-forward', {
        type: 'continuous',
        valueType: 'number',
      });
    });

    test('should bind keyboard input to action', () => {
      const binding = {
        type: 'keyboard' as const,
        key: 'KeyW',
      };

      inputManager.bindInput('move-forward', binding);

      // Should not throw and action should still exist
      expect(inputManager.hasAction('move-forward')).toBe(true);
    });

    test('should bind mouse input to action', () => {
      const binding = {
        type: 'mouse' as const,
        button: 0,
      };

      inputManager.bindInput('move-forward', binding);

      expect(inputManager.hasAction('move-forward')).toBe(true);
    });

    test('should bind gamepad input to action', () => {
      const binding = {
        type: 'gamepad' as const,
        axis: 'leftStickY' as const,
      };

      inputManager.bindInput('move-forward', binding);

      expect(inputManager.hasAction('move-forward')).toBe(true);
    });

    test('should error when binding to non-existent action', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const binding = {
        type: 'keyboard' as const,
        key: 'KeyW',
      };

      inputManager.bindInput('non-existent', binding);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Cannot bind input to unknown action 'non-existent'. Register the action first.",
      );

      consoleSpy.mockRestore();
    });

    test('should warn when binding duplicate input', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const binding = {
        type: 'keyboard' as const,
        key: 'KeyW',
      };

      inputManager.bindInput('move-forward', binding);
      inputManager.bindInput('move-forward', binding);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Binding already exists for action 'move-forward'.",
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Action Values', () => {
    test('should return default values for different value types', () => {
      inputManager.registerAction('boolean-action', {
        type: 'continuous',
        valueType: 'boolean',
      });

      inputManager.registerAction('number-action', {
        type: 'continuous',
        valueType: 'number',
      });

      inputManager.registerAction('vector2-action', {
        type: 'continuous',
        valueType: 'vector2',
      });

      expect(inputManager.getActionValue('boolean-action')).toBe(false);
      expect(inputManager.getActionValue('number-action')).toBe(0);

      const vector2Value = inputManager.getActionValue('vector2-action');
      expect(vector2Value).toHaveProperty('x', 0);
      expect(vector2Value).toHaveProperty('y', 0);
    });

    test('should return false for isActionActive with default values', () => {
      inputManager.registerAction('test-action', {
        type: 'continuous',
        valueType: 'boolean',
      });

      expect(inputManager.isActionActive('test-action')).toBe(false);
    });

    test('should return false for trigger events on first frame', () => {
      inputManager.registerAction('trigger-action', {
        type: 'trigger',
        valueType: 'boolean',
      });

      expect(inputManager.wasActionTriggered('trigger-action')).toBe(false);
      expect(inputManager.wasActionReleased('trigger-action')).toBe(false);
    });
  });

  describe('Action Management', () => {
    test('should remove action completely', () => {
      inputManager.registerAction('temp-action', {
        type: 'continuous',
        valueType: 'boolean',
      });

      expect(inputManager.hasAction('temp-action')).toBe(true);

      inputManager.removeAction('temp-action');

      expect(inputManager.hasAction('temp-action')).toBe(false);
      expect(inputManager.getActionNames()).not.toContain('temp-action');
    });

    test('should warn when removing non-existent action', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      inputManager.removeAction('non-existent');

      expect(consoleSpy).toHaveBeenCalledWith(
        "Action 'non-existent' does not exist.",
      );

      consoleSpy.mockRestore();
    });

    test('should clear all bindings from action', () => {
      inputManager.registerAction('test-action', {
        type: 'continuous',
        valueType: 'number',
      });

      inputManager.bindInput('test-action', {
        type: 'keyboard',
        key: 'KeyW',
      });

      inputManager.bindInput('test-action', {
        type: 'keyboard',
        key: 'ArrowUp',
      });

      inputManager.clearBindings('test-action');

      // Action should still exist but with no bindings
      expect(inputManager.hasAction('test-action')).toBe(true);
    });
  });

  describe('Enable/Disable', () => {
    test('should enable and disable input manager', () => {
      expect(inputManager.isEnabled()).toBe(true);

      inputManager.setEnabled(false);
      expect(inputManager.isEnabled()).toBe(false);

      inputManager.setEnabled(true);
      expect(inputManager.isEnabled()).toBe(true);
    });

    test('should return default values when disabled', () => {
      inputManager.registerAction('test-action', {
        type: 'continuous',
        valueType: 'boolean',
      });

      inputManager.setEnabled(false);

      expect(inputManager.getActionValue('test-action')).toBe(false);
      expect(inputManager.isActionActive('test-action')).toBe(false);
      expect(inputManager.wasActionTriggered('test-action')).toBe(false);
      expect(inputManager.wasActionReleased('test-action')).toBe(false);
    });
  });

  describe('Update', () => {
    test('should update without errors', () => {
      inputManager.registerAction('test-action', {
        type: 'continuous',
        valueType: 'boolean',
      });

      expect(() => {
        inputManager.update(0.016); // 60 FPS
      }).not.toThrow();
    });

    test('should handle multiple updates', () => {
      inputManager.registerAction('test-action', {
        type: 'continuous',
        valueType: 'boolean',
      });

      expect(() => {
        for (let i = 0; i < 10; i++) {
          inputManager.update(0.016);
        }
      }).not.toThrow();
    });
  });
});
