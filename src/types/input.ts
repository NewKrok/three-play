import * as THREE from 'three';
import type { EasingType } from './common.js';

/**
 * Input device types supported by the system
 */
export type InputDeviceType = 'keyboard' | 'mouse' | 'gamepad';

/**
 * Action behavior types
 */
export type ActionType = 'continuous' | 'trigger';

/**
 * Value types that actions can return
 */
export type ValueType = 'boolean' | 'number' | 'vector2';

/**
 * Keyboard input binding configuration
 */
export type KeyboardBinding = {
  type: 'keyboard';
  key: string; // KeyCode like 'KeyW', 'Space', 'ArrowUp'
  easing?: {
    type: EasingType;
    duration: number; // Duration in seconds for the transition
  };
};

/**
 * Mouse input binding configuration
 */
export type MouseBinding = {
  type: 'mouse';
  button?: number; // Mouse button (0=left, 1=middle, 2=right)
  axis?: 'x' | 'y' | 'deltaX' | 'deltaY' | 'wheel'; // Mouse movement or wheel
  easing?: {
    type: EasingType;
    duration: number;
  };
};

/**
 * Gamepad input binding configuration
 */
export type GamepadBinding = {
  type: 'gamepad';
  gamepadIndex?: number; // Which gamepad (0-3)
  button?: number; // Button index
  axis?:
    | 'leftStickX'
    | 'leftStickY'
    | 'rightStickX'
    | 'rightStickY'
    | 'leftTrigger'
    | 'rightTrigger';
  deadzone?: number; // Deadzone for analog inputs (0.0-1.0)
  easing?: {
    type: EasingType;
    duration: number;
  };
};

/**
 * Combined input binding type
 */
export type InputBinding = KeyboardBinding | MouseBinding | GamepadBinding;

/**
 * Action configuration
 */
export type InputAction = {
  type: ActionType;
  valueType: ValueType;
  bindings: InputBinding[];
};

/**
 * Input state for tracking frame-based changes
 */
export type InputState = {
  currentValue: boolean | number | THREE.Vector2;
  previousValue: boolean | number | THREE.Vector2;
  targetValue: boolean | number | THREE.Vector2;
  easingStartTime: number;
  easingDuration: number;
  easingType: EasingType;
};

/**
 * Input manager interface
 */
export type InputManager = {
  /**
   * Register a new action with the input manager
   */
  registerAction(
    actionName: string,
    config: Omit<InputAction, 'bindings'>,
  ): void;

  /**
   * Bind an input source to an existing action
   */
  bindInput(actionName: string, binding: InputBinding): void;

  /**
   * Remove a specific binding from an action
   */
  unbindInput(actionName: string, binding: InputBinding): void;

  /**
   * Remove all bindings from an action
   */
  clearBindings(actionName: string): void;

  /**
   * Check if an action is currently active (for continuous actions)
   */
  isActionActive(actionName: string): boolean;

  /**
   * Get the current value of an action
   */
  getActionValue(actionName: string): boolean | number | THREE.Vector2;

  /**
   * Check if an action was triggered this frame (for trigger actions)
   */
  wasActionTriggered(actionName: string): boolean;

  /**
   * Check if an action was released this frame (for trigger actions)
   */
  wasActionReleased(actionName: string): boolean;

  /**
   * Update the input manager (should be called every frame)
   */
  update(deltaTime: number): void;

  /**
   * Get all registered action names
   */
  getActionNames(): string[];

  /**
   * Check if an action exists
   */
  hasAction(actionName: string): boolean;

  /**
   * Remove an action completely
   */
  removeAction(actionName: string): void;

  /**
   * Enable/disable the input manager
   */
  setEnabled(enabled: boolean): void;

  /**
   * Check if the input manager is enabled
   */
  isEnabled(): boolean;

  /**
   * Clean up resources and event listeners
   */
  destroy(): void;
};

/**
 * Input manager configuration
 */
export type InputManagerConfig = {
  /**
   * Whether the input manager should start enabled
   */
  enabled?: boolean;

  /**
   * Global deadzone for gamepad inputs
   */
  gamepadDeadzone?: number;

  /**
   * Whether to prevent default browser behavior for bound keys
   */
  preventDefaultKeyboard?: boolean;

  /**
   * Whether to prevent context menu on right mouse click
   */
  preventDefaultMouse?: boolean;
};
