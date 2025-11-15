/**
 * @jest-environment jsdom
 */

import {
  EasingFunctions,
  applyEasing,
  isEasingComplete,
} from '../core/utils/easing-utils.js';

describe('EasingFunctions', () => {
  describe('linear', () => {
    it('should return the input value unchanged', () => {
      expect(EasingFunctions.linear(0)).toBe(0);
      expect(EasingFunctions.linear(0.25)).toBe(0.25);
      expect(EasingFunctions.linear(0.5)).toBe(0.5);
      expect(EasingFunctions.linear(0.75)).toBe(0.75);
      expect(EasingFunctions.linear(1)).toBe(1);
    });
  });

  describe('ease-in', () => {
    it('should implement quadratic ease-in function', () => {
      expect(EasingFunctions['ease-in'](0)).toBe(0);
      expect(EasingFunctions['ease-in'](0.5)).toBe(0.25);
      expect(EasingFunctions['ease-in'](1)).toBe(1);
    });

    it('should start slow and accelerate', () => {
      const t1 = 0.2;
      const t2 = 0.8;
      const result1 = EasingFunctions['ease-in'](t1);
      const result2 = EasingFunctions['ease-in'](t2);

      // At early stage (0.2), result should be much smaller than linear
      expect(result1).toBeLessThan(t1);
      // At later stage (0.8), result should be closer to linear
      expect(result2).toBeGreaterThan(t1 * 3); // Should be accelerating
    });
  });

  describe('ease-out', () => {
    it('should implement quadratic ease-out function', () => {
      expect(EasingFunctions['ease-out'](0)).toBe(0);
      expect(EasingFunctions['ease-out'](0.5)).toBe(0.75);
      expect(EasingFunctions['ease-out'](1)).toBe(1);
    });

    it('should start fast and decelerate', () => {
      const t1 = 0.2;
      const t2 = 0.8;
      const result1 = EasingFunctions['ease-out'](t1);
      const result2 = EasingFunctions['ease-out'](t2);

      // At early stage (0.2), result should be larger than linear
      expect(result1).toBeGreaterThan(t1);
      // At later stage (0.8), should be less than 1 but close to it (deceleration)
      expect(result2).toBeGreaterThan(0.8);
      expect(result2).toBeLessThan(1);
    });
  });

  describe('ease-in-out', () => {
    it('should implement cubic ease-in-out function', () => {
      expect(EasingFunctions['ease-in-out'](0)).toBe(0);
      expect(EasingFunctions['ease-in-out'](0.5)).toBe(0.5);
      expect(EasingFunctions['ease-in-out'](1)).toBe(1);
    });

    it('should be symmetric around the midpoint', () => {
      const result1 = EasingFunctions['ease-in-out'](0.25);
      const result2 = EasingFunctions['ease-in-out'](0.75);

      // Should be symmetric: f(0.25) should equal 1 - f(0.75)
      expect(Math.abs(result1 - (1 - result2))).toBeLessThan(0.001);
    });

    it('should start slow, accelerate in middle, then slow down', () => {
      const early = EasingFunctions['ease-in-out'](0.1);
      const late = EasingFunctions['ease-in-out'](0.9);

      // Should start slow (less than linear)
      expect(early).toBeLessThan(0.1);
      // Should end slow (close to but less than 1)
      expect(late).toBeGreaterThan(0.9);
      expect(late).toBeLessThan(1);
    });
  });
});

describe('applyEasing', () => {
  const startValue = 10;
  const endValue = 100;
  const startTime = 0;
  const duration = 2;

  it('should return start value at the beginning', () => {
    const result = applyEasing(startValue, endValue, startTime, duration, 0);
    expect(result).toBe(startValue);
  });

  it('should return end value at completion', () => {
    const result = applyEasing(startValue, endValue, startTime, duration, 2);
    expect(result).toBe(endValue);
  });

  it('should return end value beyond completion', () => {
    const result = applyEasing(startValue, endValue, startTime, duration, 3);
    expect(result).toBe(endValue);
  });

  it('should return start value before start time', () => {
    const result = applyEasing(startValue, endValue, startTime, duration, -1);
    expect(result).toBe(startValue);
  });

  it('should interpolate correctly with linear easing', () => {
    const result = applyEasing(
      startValue,
      endValue,
      startTime,
      duration,
      1,
      'linear',
    );
    expect(result).toBe(55); // 50% of the way from 10 to 100
  });

  it('should interpolate correctly with ease-in', () => {
    const result = applyEasing(
      startValue,
      endValue,
      startTime,
      duration,
      1,
      'ease-in',
    );
    // At t=0.5, ease-in gives 0.25, so 10 + (100-10) * 0.25 = 32.5
    expect(result).toBe(32.5);
  });

  it('should interpolate correctly with ease-out', () => {
    const result = applyEasing(
      startValue,
      endValue,
      startTime,
      duration,
      1,
      'ease-out',
    );
    // At t=0.5, ease-out gives 0.75, so 10 + (100-10) * 0.75 = 77.5
    expect(result).toBe(77.5);
  });

  it('should handle zero duration by returning end value', () => {
    const result = applyEasing(startValue, endValue, startTime, 0, 1);
    expect(result).toBe(endValue);
  });

  it('should handle negative duration by returning end value', () => {
    const result = applyEasing(startValue, endValue, startTime, -1, 1);
    expect(result).toBe(endValue);
  });

  it('should work with negative values', () => {
    const result = applyEasing(-10, -100, 0, 2, 1, 'linear');
    expect(result).toBe(-55); // 50% of the way from -10 to -100
  });

  it('should work when start value is greater than end value', () => {
    const result = applyEasing(100, 10, 0, 2, 1, 'linear');
    expect(result).toBe(55); // 50% of the way from 100 to 10
  });
});

describe('isEasingComplete', () => {
  it('should return false when transition is in progress', () => {
    expect(isEasingComplete(0, 2, 1)).toBe(false);
  });

  it('should return true when transition is complete', () => {
    expect(isEasingComplete(0, 2, 2)).toBe(true);
  });

  it('should return true when time has exceeded duration', () => {
    expect(isEasingComplete(0, 2, 3)).toBe(true);
  });

  it('should return false when time is before start', () => {
    expect(isEasingComplete(1, 2, 0)).toBe(false);
  });

  it('should handle zero duration correctly', () => {
    expect(isEasingComplete(0, 0, 0)).toBe(true);
    expect(isEasingComplete(0, 0, 1)).toBe(true);
  });

  it('should handle negative duration correctly', () => {
    expect(isEasingComplete(0, -1, 0)).toBe(true);
    expect(isEasingComplete(0, -1, 1)).toBe(true);
  });

  it('should work with fractional times', () => {
    expect(isEasingComplete(0.5, 1.5, 1.9)).toBe(false);
    expect(isEasingComplete(0.5, 1.5, 2.0)).toBe(true);
    expect(isEasingComplete(0.5, 1.5, 2.1)).toBe(true);
  });
});
