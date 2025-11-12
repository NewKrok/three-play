import * as THREE from 'three';
import type { GamepadBinding, InputState } from '../../types/input.js';
import { applyEasing, isEasingComplete } from '../utils/easing-utils.js';

/**
 * Gamepad input handler configuration
 */
export type GamepadHandlerConfig = {
  globalDeadzone?: number;
  pollRate?: number;
};

/**
 * Gamepad input handler interface
 */
export type GamepadHandlerInstance = {
  isGamepadConnected(index: number): boolean;
  getConnectedGamepads(): number[];
  isButtonPressed(gamepadIndex: number, buttonIndex: number): boolean;
  getAxisValue(gamepadIndex: number, axis: string): number;
  getValue(
    binding: GamepadBinding,
    state: InputState,
    currentTime: number,
  ): number | boolean;
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;
  destroy(): void;
};

/**
 * Create a gamepad input handler for managing gamepad events and state
 */
export const createGamepadHandler = (
  config: GamepadHandlerConfig = {},
): GamepadHandlerInstance => {
  const globalDeadzone = config.globalDeadzone || 0.1;
  const pollRate = config.pollRate || 16; // milliseconds
  let enabled = true;
  let pollingInterval: NodeJS.Timeout | null = null;

  // Gamepad state tracking
  const gamepadStates = new Map<number, Gamepad>();
  const previousButtonStates = new Map<string, boolean>();

  const applyDeadzone = (value: number, deadzone: number): number => {
    if (Math.abs(value) < deadzone) {
      return 0;
    }
    // Rescale the value to account for deadzone
    const sign = Math.sign(value);
    const scaledValue = (Math.abs(value) - deadzone) / (1 - deadzone);
    return sign * scaledValue;
  };

  const getAxisValueFromGamepad = (gamepad: Gamepad, axis: string): number => {
    switch (axis) {
      case 'leftStickX':
        return gamepad.axes[0] || 0;
      case 'leftStickY':
        return gamepad.axes[1] || 0;
      case 'rightStickX':
        return gamepad.axes[2] || 0;
      case 'rightStickY':
        return gamepad.axes[3] || 0;
      case 'leftTrigger':
        // Some gamepads use buttons, others use axes for triggers
        return gamepad.buttons[6]?.value || gamepad.axes[4] || 0;
      case 'rightTrigger':
        return gamepad.buttons[7]?.value || gamepad.axes[5] || 0;
      default:
        return 0;
    }
  };

  const pollGamepads = (): void => {
    if (!enabled) return;

    const gamepads = navigator.getGamepads();
    gamepadStates.clear();

    for (let i = 0; i < gamepads.length; i++) {
      const gamepad = gamepads[i];
      if (gamepad) {
        gamepadStates.set(i, gamepad);
      }
    }
  };

  const startPolling = (): void => {
    if (pollingInterval) return;

    pollingInterval = setInterval(pollGamepads, pollRate);
  };

  const stopPolling = (): void => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  };

  // Start polling immediately
  startPolling();

  return {
    /**
     * Check if a gamepad is connected at the given index
     */
    isGamepadConnected(index: number): boolean {
      return gamepadStates.has(index);
    },

    /**
     * Get array of connected gamepad indices
     */
    getConnectedGamepads(): number[] {
      return Array.from(gamepadStates.keys());
    },

    /**
     * Check if a button is pressed on a specific gamepad
     */
    isButtonPressed(gamepadIndex: number, buttonIndex: number): boolean {
      const gamepad = gamepadStates.get(gamepadIndex);
      if (!gamepad || !gamepad.buttons[buttonIndex]) {
        return false;
      }
      return gamepad.buttons[buttonIndex].pressed;
    },

    /**
     * Get the value of an axis on a specific gamepad
     */
    getAxisValue(gamepadIndex: number, axis: string): number {
      const gamepad = gamepadStates.get(gamepadIndex);
      if (!gamepad) {
        return 0;
      }

      const rawValue = getAxisValueFromGamepad(gamepad, axis);
      return applyDeadzone(rawValue, globalDeadzone);
    },

    /**
     * Get the processed value for a gamepad binding with easing
     */
    getValue(
      binding: GamepadBinding,
      state: InputState,
      currentTime: number,
    ): number | boolean {
      const gamepadIndex = binding.gamepadIndex || 0;
      const gamepad = gamepadStates.get(gamepadIndex);

      if (!gamepad) {
        return binding.button !== undefined ? false : 0;
      }

      let rawValue: number | boolean;

      if (binding.button !== undefined) {
        // Button binding
        rawValue = gamepad.buttons[binding.button]?.pressed || false;
      } else if (binding.axis) {
        // Axis binding
        const axisValue = getAxisValueFromGamepad(gamepad, binding.axis);
        const deadzone = binding.deadzone || globalDeadzone;
        rawValue = applyDeadzone(axisValue, deadzone);
      } else {
        rawValue = 0;
      }

      // Handle easing for numeric values
      if (
        typeof rawValue === 'number' &&
        binding.easing &&
        binding.easing.type !== 'linear'
      ) {
        // Check if we need to start a new easing transition
        if (rawValue !== state.targetValue) {
          state.previousValue = state.currentValue;
          state.targetValue = rawValue;
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

          return typeof state.currentValue === 'number'
            ? state.currentValue
            : 0;
        }

        return typeof state.targetValue === 'number' ? state.targetValue : 0;
      }

      return rawValue;
    },

    /**
     * Enable or disable gamepad input processing
     */
    setEnabled(newEnabled: boolean): void {
      enabled = newEnabled;
      if (enabled) {
        startPolling();
      } else {
        stopPolling();
        gamepadStates.clear();
        previousButtonStates.clear();
      }
    },

    /**
     * Check if gamepad input processing is enabled
     */
    isEnabled(): boolean {
      return enabled;
    },

    /**
     * Clean up resources and stop polling
     */
    destroy(): void {
      stopPolling();
      gamepadStates.clear();
      previousButtonStates.clear();
    },
  };
};
