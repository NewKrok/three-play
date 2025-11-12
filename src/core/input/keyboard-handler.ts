import * as THREE from 'three';
import type { KeyboardBinding, InputState } from '../../types/input.js';
import { applyEasing, isEasingComplete } from './easing-utils.js';

/**
 * Keyboard input handler configuration
 */
export type KeyboardHandlerConfig = {
  preventDefaultKeys?: boolean;
};

/**
 * Keyboard input handler interface
 */
export type KeyboardHandlerInstance = {
  addPreventDefault(keyCode: string): void;
  removePreventDefault(keyCode: string): void;
  isKeyPressed(keyCode: string): boolean;
  getValue(
    binding: KeyboardBinding,
    state: InputState,
    currentTime: number,
  ): number;
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;
  destroy(): void;
};

/**
 * Create a keyboard input handler for managing keyboard events and state
 */
export const createKeyboardHandler = (
  config: KeyboardHandlerConfig = {},
): KeyboardHandlerInstance => {
  const keyStates = new Map<string, boolean>();
  const listeners: (() => void)[] = [];
  let enabled = true;
  const preventDefaults = new Set<string>();

  // Setup initial prevent defaults if enabled
  if (config.preventDefaultKeys) {
    // Common game keys that we might want to prevent default behavior for
    const defaultKeys = [
      'Space',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'KeyW',
      'KeyA',
      'KeyS',
      'KeyD',
      'Tab',
    ];
    defaultKeys.forEach((key) => preventDefaults.add(key));
  }

  const setupEventListeners = (): void => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!enabled) return;

      keyStates.set(event.code, true);

      if (preventDefaults.has(event.code)) {
        event.preventDefault();
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (!enabled) return;

      keyStates.set(event.code, false);

      if (preventDefaults.has(event.code)) {
        event.preventDefault();
      }
    };

    const onBlur = () => {
      keyStates.clear();
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    // Store cleanup functions
    listeners.push(
      () => document.removeEventListener('keydown', onKeyDown),
      () => document.removeEventListener('keyup', onKeyUp),
      () => window.removeEventListener('blur', onBlur),
    );
  };

  // Initialize event listeners
  setupEventListeners();

  return {
    /**
     * Add a key code to the prevent default list
     */
    addPreventDefault(keyCode: string): void {
      preventDefaults.add(keyCode);
    },

    /**
     * Remove a key code from the prevent default list
     */
    removePreventDefault(keyCode: string): void {
      preventDefaults.delete(keyCode);
    },

    /**
     * Check if a key is currently pressed
     */
    isKeyPressed(keyCode: string): boolean {
      return keyStates.get(keyCode) || false;
    },

    /**
     * Get the processed value for a keyboard binding with easing
     */
    getValue(
      binding: KeyboardBinding,
      state: InputState,
      currentTime: number,
    ): number {
      const isPressed = keyStates.get(binding.key) || false;

      // Determine raw value based on press state
      const targetValue = isPressed ? 1 : 0;

      // Handle easing
      if (!binding.easing || binding.easing.type === 'linear') {
        return targetValue;
      }

      // Check if we need to start a new easing transition
      if (targetValue !== state.targetValue) {
        state.previousValue = state.currentValue;
        state.targetValue = targetValue;
        state.easingStartTime = currentTime;
        state.easingDuration = binding.easing.duration;
        state.easingType = binding.easing.type;
      }

      // Apply easing if transition is not complete
      if (
        !isEasingComplete(
          state.easingStartTime,
          state.easingDuration,
          currentTime,
        )
      ) {
        const startValue =
          typeof state.currentValue === 'number' ? state.currentValue : 0;
        const endValue =
          typeof state.targetValue === 'number' ? state.targetValue : 0;

        state.currentValue = applyEasing(
          startValue,
          endValue,
          state.easingStartTime,
          state.easingDuration,
          currentTime,
          state.easingType,
        );

        return typeof state.currentValue === 'number' ? state.currentValue : 0;
      }

      return typeof state.targetValue === 'number' ? state.targetValue : 0;
    },

    /**
     * Enable or disable keyboard input processing
     */
    setEnabled(newEnabled: boolean): void {
      enabled = newEnabled;
      if (!enabled) {
        keyStates.clear();
      }
    },

    /**
     * Check if keyboard input processing is enabled
     */
    isEnabled(): boolean {
      return enabled;
    },

    /**
     * Clean up event listeners and resources
     */
    destroy(): void {
      listeners.forEach((cleanup) => cleanup());
      listeners.length = 0;
      keyStates.clear();
      preventDefaults.clear();
    },
  };
};
