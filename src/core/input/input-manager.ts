import * as THREE from 'three';
import type {
  InputAction,
  InputBinding,
  InputState,
  InputManagerConfig,
  InputManager,
} from '../../types/input.js';
import {
  createKeyboardHandler,
  type KeyboardHandlerInstance,
} from './keyboard-handler.js';
import {
  createMouseHandler,
  type MouseHandlerInstance,
} from './mouse-handler.js';
import {
  createGamepadHandler,
  type GamepadHandlerInstance,
} from './gamepad-handler.js';

/**
 * Create an input manager instance for handling all input devices and actions
 */
export const createInputManager = (
  config: InputManagerConfig = {},
): InputManager => {
  const actions = new Map<string, InputAction>();
  const actionStates = new Map<string, Map<string, InputState>>();
  let enabled = config.enabled !== false;
  let currentTime = 0;

  // Initialize input handlers
  const keyboardHandler = createKeyboardHandler({
    preventDefaultKeys: config.preventDefaultKeyboard || false,
  });

  const mouseHandler = createMouseHandler({
    preventContextMenu: config.preventDefaultMouse || false,
  });

  const gamepadHandler = createGamepadHandler({
    globalDeadzone: config.gamepadDeadzone || 0.1,
  });

  const createInputState = (): InputState => ({
    currentValue: 0,
    previousValue: 0,
    targetValue: 0,
    easingStartTime: 0,
    easingDuration: 0,
    easingType: 'linear',
  });

  const getBindingKey = (binding: InputBinding): string => {
    if (binding.type === 'keyboard') {
      return `keyboard:${binding.key}`;
    } else if (binding.type === 'mouse') {
      if (binding.button !== undefined) {
        return `mouse:button:${binding.button}`;
      } else if (binding.axis) {
        return `mouse:axis:${binding.axis}`;
      } else {
        return 'mouse:position';
      }
    } else if (binding.type === 'gamepad') {
      const gamepadIndex = binding.gamepadIndex || 0;
      if (binding.button !== undefined) {
        return `gamepad:${gamepadIndex}:button:${binding.button}`;
      } else if (binding.axis) {
        return `gamepad:${gamepadIndex}:axis:${binding.axis}`;
      }
    }
    return 'unknown';
  };

  const getBindingValue = (
    binding: InputBinding,
    state: InputState,
  ): boolean | number | THREE.Vector2 => {
    if (!enabled) {
      return binding.type === 'keyboard' ||
        (binding.type === 'mouse' && binding.button !== undefined) ||
        (binding.type === 'gamepad' && binding.button !== undefined)
        ? false
        : 0;
    }

    switch (binding.type) {
      case 'keyboard':
        return keyboardHandler.getValue(binding, state, currentTime);
      case 'mouse':
        return mouseHandler.getValue(binding, state, currentTime);
      case 'gamepad':
        return gamepadHandler.getValue(binding, state, currentTime);
      default:
        return 0;
    }
  };

  const combineValues = (
    values: (boolean | number | THREE.Vector2)[],
    valueType: string,
  ): boolean | number | THREE.Vector2 => {
    if (values.length === 0) {
      return valueType === 'boolean'
        ? false
        : valueType === 'vector2'
          ? new THREE.Vector2()
          : 0;
    }

    switch (valueType) {
      case 'boolean':
        return values.some((v) => Boolean(v));
      case 'number':
        return values.reduce((sum, v) => {
          const num = typeof v === 'number' ? v : Boolean(v) ? 1 : 0;
          return (typeof sum === 'number' ? sum : 0) + num;
        }, 0) as number;
      case 'vector2':
        const result = new THREE.Vector2();
        values.forEach((v) => {
          if (v instanceof THREE.Vector2) {
            result.add(v);
          }
        });
        return result;
      default:
        return 0;
    }
  };

  const inputManagerInstance = {
    /**
     * Register a new action with the input manager
     */
    registerAction(
      actionName: string,
      config: Omit<InputAction, 'bindings'>,
    ): void {
      // Warn if action already exists
      if (actions.has(actionName)) {
        console.warn(
          `Action '${actionName}' is already registered. Overwriting.`,
        );
      }

      const action: InputAction = {
        ...config,
        bindings: [],
      };

      actions.set(actionName, action);
      actionStates.set(actionName, new Map());
    },

    /**
     * Bind an input source to an existing action
     */
    bindInput(actionName: string, binding: InputBinding): void {
      const action = actions.get(actionName);
      if (!action) {
        console.error(
          `Cannot bind input to unknown action '${actionName}'. Register the action first.`,
        );
        return;
      }

      // Check for duplicate bindings
      const bindingKey = getBindingKey(binding);
      const existingBinding = action.bindings.find(
        (b) => getBindingKey(b) === bindingKey,
      );

      if (existingBinding) {
        console.warn(`Binding already exists for action '${actionName}'.`);
        return;
      }

      action.bindings.push(binding);

      // Initialize state for this binding
      const states = actionStates.get(actionName);
      if (states) {
        states.set(bindingKey, createInputState());
      }
    },

    /**
     * Remove a specific binding from an action
     */
    unbindInput(actionName: string, binding: InputBinding): void {
      const action = actions.get(actionName);
      if (!action) return;

      const bindingKey = getBindingKey(binding);
      const index = action.bindings.findIndex(
        (b) => getBindingKey(b) === bindingKey,
      );

      if (index !== -1) {
        action.bindings.splice(index, 1);

        // Remove state for this binding
        const states = actionStates.get(actionName);
        if (states) {
          states.delete(bindingKey);
        }
      }
    },

    /**
     * Remove all bindings from an action
     */
    clearBindings(actionName: string): void {
      const action = actions.get(actionName);
      if (!action) return;

      action.bindings = [];

      // Clear all states for this action
      const states = actionStates.get(actionName);
      if (states) {
        states.clear();
      }
    },

    /**
     * Check if an action is currently active (for continuous actions)
     */
    isActionActive(actionName: string): boolean {
      const value = this.getActionValue(actionName);
      return Boolean(value);
    },

    /**
     * Get the current value of an action
     */
    getActionValue(actionName: string): boolean | number | THREE.Vector2 {
      const action = actions.get(actionName);
      if (!action) {
        return false; // Default fallback
      }

      const states = actionStates.get(actionName);
      if (!states) {
        return action.valueType === 'boolean'
          ? false
          : action.valueType === 'vector2'
            ? new THREE.Vector2()
            : 0;
      }

      const values: (boolean | number | THREE.Vector2)[] = [];

      for (const binding of action.bindings) {
        const bindingKey = getBindingKey(binding);
        let state = states.get(bindingKey);

        if (!state) {
          state = createInputState();
          states.set(bindingKey, state);
        }

        const value = getBindingValue(binding, state);
        values.push(value);
      }

      return combineValues(values, action.valueType);
    },

    /**
     * Check if an action was triggered this frame (for trigger actions)
     */
    wasActionTriggered(actionName: string): boolean {
      const action = actions.get(actionName);
      if (!action || action.type !== 'trigger') return false;

      const states = actionStates.get(actionName);
      if (!states) return false;

      // Check if any binding transitioned from false/0 to true/non-zero
      for (const binding of action.bindings) {
        const bindingKey = getBindingKey(binding);
        const state = states.get(bindingKey);

        if (state) {
          const currentValue = Boolean(state.currentValue);
          const previousValue = Boolean(state.previousValue);

          if (currentValue && !previousValue) {
            return true;
          }
        }
      }

      return false;
    },

    /**
     * Check if an action was released this frame (for trigger actions)
     */
    wasActionReleased(actionName: string): boolean {
      const action = actions.get(actionName);
      if (!action || action.type !== 'trigger') return false;

      const states = actionStates.get(actionName);
      if (!states) return false;

      // Check if any binding transitioned from true/non-zero to false/0
      for (const binding of action.bindings) {
        const bindingKey = getBindingKey(binding);
        const state = states.get(bindingKey);

        if (state) {
          const currentValue = Boolean(state.currentValue);
          const previousValue = Boolean(state.previousValue);

          if (!currentValue && previousValue) {
            return true;
          }
        }
      }

      return false;
    },

    /**
     * Update the input manager (should be called every frame)
     */
    update(deltaTime: number): void {
      currentTime += deltaTime;

      // Update previous values for trigger detection
      for (const [actionName, states] of actionStates) {
        for (const [bindingKey, state] of states) {
          state.previousValue = state.currentValue;
        }
      }
    },

    /**
     * Get all registered action names
     */
    getActionNames(): string[] {
      return Array.from(actions.keys());
    },

    /**
     * Check if an action exists
     */
    hasAction(actionName: string): boolean {
      return actions.has(actionName);
    },

    /**
     * Remove an action completely
     */
    removeAction(actionName: string): void {
      if (!actions.has(actionName)) {
        console.warn(`Action '${actionName}' does not exist.`);
        return;
      }

      actions.delete(actionName);
      actionStates.delete(actionName);
    },

    /**
     * Enable/disable the input manager
     */
    setEnabled(newEnabled: boolean): void {
      enabled = newEnabled;
      keyboardHandler.setEnabled(enabled);
      mouseHandler.setEnabled(enabled);
      gamepadHandler.setEnabled(enabled);
    },

    /**
     * Check if the input manager is enabled
     */
    isEnabled(): boolean {
      return enabled;
    },

    /**
     * Clean up resources and event listeners
     */
    destroy(): void {
      keyboardHandler.destroy();
      mouseHandler.destroy();
      gamepadHandler.destroy();

      actions.clear();
      actionStates.clear();
    },
  };

  // Initialize actions from config if provided
  if (config.actions) {
    for (const [actionName, actionConfig] of Object.entries(config.actions)) {
      inputManagerInstance.registerAction(actionName, actionConfig.action);
      
      // Bind all configured inputs
      for (const binding of actionConfig.bindings) {
        inputManagerInstance.bindInput(actionName, binding);
      }
    }
  }

  return inputManagerInstance;
};
