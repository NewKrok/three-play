import * as THREE from 'three';
import type { MouseBinding, InputState } from '../../types/input.js';
import { applyEasing, isEasingComplete } from './easing-utils.js';

/**
 * Mouse input handler configuration
 */
export type MouseHandlerConfig = {
  preventContextMenu?: boolean;
  element?: HTMLElement;
};

/**
 * Mouse input handler interface
 */
export type MouseHandlerInstance = {
  getMousePosition(): THREE.Vector2;
  getMouseDelta(): THREE.Vector2;
  getWheelDelta(): number;
  isButtonPressed(button: number): boolean;
  getValue(
    binding: MouseBinding,
    state: InputState,
    currentTime: number,
  ): number | boolean | THREE.Vector2;
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;
  destroy(): void;
};

/**
 * Create a mouse input handler for managing mouse events and state
 */
export const createMouseHandler = (
  config: MouseHandlerConfig = {},
): MouseHandlerInstance => {
  const element = config.element || document;
  const buttonStates = new Map<number, boolean>();
  const listeners: (() => void)[] = [];
  let enabled = true;

  // Mouse position and movement tracking
  const mousePosition = new THREE.Vector2();
  const mouseDelta = new THREE.Vector2();
  const previousMousePosition = new THREE.Vector2();
  let wheelDelta = 0;

  const setupEventListeners = (): void => {
    const onMouseDown = (event: MouseEvent) => {
      if (!enabled) return;

      buttonStates.set(event.button, true);

      if (config.preventContextMenu && event.button === 2) {
        event.preventDefault();
      }
    };

    const onMouseUp = (event: MouseEvent) => {
      if (!enabled) return;

      buttonStates.set(event.button, false);

      if (config.preventContextMenu && event.button === 2) {
        event.preventDefault();
      }
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!enabled) return;

      // Update previous position before setting new position
      previousMousePosition.copy(mousePosition);

      // Set new position (normalized to viewport)
      if (element instanceof HTMLElement) {
        const rect = element.getBoundingClientRect();
        mousePosition.set(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          -((event.clientY - rect.top) / rect.height) * 2 + 1,
        );
      } else {
        // For document, use window dimensions
        mousePosition.set(
          (event.clientX / window.innerWidth) * 2 - 1,
          -(event.clientY / window.innerHeight) * 2 + 1,
        );
      }

      // Calculate delta
      mouseDelta.subVectors(mousePosition, previousMousePosition);
    };

    const onWheel = (event: WheelEvent) => {
      if (!enabled) return;

      wheelDelta = event.deltaY;
      event.preventDefault();
    };

    const onContextMenu = (event: Event) => {
      if (config.preventContextMenu) {
        event.preventDefault();
      }
    };

    const onBlur = () => {
      buttonStates.clear();
      mouseDelta.set(0, 0);
      wheelDelta = 0;
    };

    // Add event listeners
    element.addEventListener('mousedown', onMouseDown as EventListener);
    element.addEventListener('mouseup', onMouseUp as EventListener);
    element.addEventListener('mousemove', onMouseMove as EventListener);
    element.addEventListener('wheel', onWheel as EventListener);
    element.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('blur', onBlur);

    // Store cleanup functions
    listeners.push(
      () =>
        element.removeEventListener('mousedown', onMouseDown as EventListener),
      () => element.removeEventListener('mouseup', onMouseUp as EventListener),
      () =>
        element.removeEventListener('mousemove', onMouseMove as EventListener),
      () => element.removeEventListener('wheel', onWheel as EventListener),
      () => element.removeEventListener('contextmenu', onContextMenu),
      () => window.removeEventListener('blur', onBlur),
    );
  };

  // Initialize event listeners
  setupEventListeners();

  return {
    /**
     * Get the current mouse position (normalized to -1 to 1)
     */
    getMousePosition(): THREE.Vector2 {
      return mousePosition.clone();
    },

    /**
     * Get the mouse movement delta since last frame
     */
    getMouseDelta(): THREE.Vector2 {
      return mouseDelta.clone();
    },

    /**
     * Get the wheel delta since last frame
     */
    getWheelDelta(): number {
      return wheelDelta;
    },

    /**
     * Check if a mouse button is currently pressed
     */
    isButtonPressed(button: number): boolean {
      return buttonStates.get(button) || false;
    },

    /**
     * Get the processed value for a mouse binding with easing
     */
    getValue(
      binding: MouseBinding,
      state: InputState,
      currentTime: number,
    ): number | boolean | THREE.Vector2 {
      let rawValue: number | boolean | THREE.Vector2;

      if (binding.button !== undefined) {
        // Button binding
        rawValue = buttonStates.get(binding.button) || false;
      } else if (binding.axis) {
        // Axis binding
        switch (binding.axis) {
          case 'x':
            rawValue = mousePosition.x;
            break;
          case 'y':
            rawValue = mousePosition.y;
            break;
          case 'deltaX':
            rawValue = mouseDelta.x;
            break;
          case 'deltaY':
            rawValue = mouseDelta.y;
            break;
          case 'wheel':
            rawValue = wheelDelta;
            break;
          default:
            rawValue = 0;
        }
      } else {
        // Position binding (default)
        rawValue = mousePosition.clone();
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
     * Enable or disable mouse input processing
     */
    setEnabled(newEnabled: boolean): void {
      enabled = newEnabled;
      if (!enabled) {
        buttonStates.clear();
        mouseDelta.set(0, 0);
        wheelDelta = 0;
      }
    },

    /**
     * Check if mouse input processing is enabled
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
      buttonStates.clear();
      mouseDelta.set(0, 0);
      wheelDelta = 0;
    },
  };
};
