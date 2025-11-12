import type { EasingType } from '../../types/common.js';

/**
 * Collection of easing functions for smooth transitions
 */
export const EasingFunctions = {
  /**
   * Linear interpolation (no easing)
   */
  linear: (t: number): number => t,

  /**
   * Ease-in (slow start, fast end)
   */
  'ease-in': (t: number): number => t * t,

  /**
   * Ease-out (fast start, slow end)
   */
  'ease-out': (t: number): number => 1 - (1 - t) * (1 - t),

  /**
   * Ease-in-out (slow start and end, fast middle)
   */
  'ease-in-out': (t: number): number => {
    if (t < 0.5) {
      return 2 * t * t;
    }
    return 1 - Math.pow(-2 * t + 2, 2) / 2;
  },
};

/**
 * Apply easing to a value transition
 * @param startValue - The starting value
 * @param endValue - The target value
 * @param startTime - When the transition started (in seconds)
 * @param duration - How long the transition should take (in seconds)
 * @param currentTime - Current time (in seconds)
 * @param easingType - Type of easing to apply
 * @returns The interpolated value
 */
export const applyEasing = (
  startValue: number,
  endValue: number,
  startTime: number,
  duration: number,
  currentTime: number,
  easingType: EasingType = 'linear',
): number => {
  if (duration <= 0) return endValue;

  const elapsed = currentTime - startTime;

  if (elapsed <= 0) return startValue;
  if (elapsed >= duration) return endValue;

  const t = elapsed / duration;
  const easedT = EasingFunctions[easingType](t);

  return startValue + (endValue - startValue) * easedT;
};

/**
 * Check if an easing transition is complete
 * @param startTime - When the transition started
 * @param duration - How long the transition should take
 * @param currentTime - Current time
 * @returns True if the transition is complete
 */
export const isEasingComplete = (
  startTime: number,
  duration: number,
  currentTime: number,
): boolean => {
  return currentTime - startTime >= duration;
};
