import type * as THREE from 'three';

import type { EasingType } from './common.js';

/**
 * Easing function types for day/night transitions
 * Extends the general EasingType with day/night specific options
 */
export type EasingFunction = EasingType | 'smoothstep' | 'power' | 'custom';

/**
 * Custom easing function type
 */
export type CustomEasingFunction = (t: number) => number;

/**
 * Color configuration for different times of day
 */
export type DayNightColors = {
  ambient: {
    day: THREE.ColorRepresentation;
    night: THREE.ColorRepresentation;
  };
  directional: {
    day: THREE.ColorRepresentation;
    night: THREE.ColorRepresentation;
  };
  moon: {
    /** Moon light color (used during night) */
    color: THREE.ColorRepresentation;
  };
  fog: {
    day: THREE.ColorRepresentation;
    night: THREE.ColorRepresentation;
  };
};

/**
 * Light intensity configuration
 */
export type LightIntensityConfig = {
  ambient: {
    min: number;
    max: number;
  };
  directional: {
    min: number;
    max: number;
  };
  moon: {
    min: number;
    max: number;
  };
};

/**
 * Fog configuration for different times of day
 */
export type FogConfig = {
  /** Enable fog changes based on time of day */
  enabled: boolean;
  /** Fog density configuration */
  density: {
    min: number;
    max: number;
  };
};

/**
 * Sun position configuration
 */
export type SunPositionConfig = {
  /** Radius of the sun's circular path around the target */
  radius: number;
  /** Height offset above the target position */
  heightOffset: number;
  /** Additional Z-axis offset for sun position */
  zOffset: number;
  /** Optional target object to follow (for optimized shadows) */
  followTarget?: THREE.Object3D;
  /** If no followTarget, use this static position */
  staticCenter?: THREE.Vector3;
};

/**
 * Moon position and lighting configuration
 */
export type MoonConfig = {
  /** Enable moon light during night */
  enabled: boolean;
  /** Radius of the moon's circular path (opposite to sun) */
  radius: number;
  /** Height offset above the target position */
  heightOffset: number;
  /** Additional Z-axis offset for moon position */
  zOffset: number;
  /** Phase offset in radians (0 = full moon always, PI = new moon always) */
  phaseOffset: number;
};

/**
 * Day/Night cycle configuration
 */
export type DayNightConfig = {
  /** Enable/disable the day-night system */
  enabled: boolean;
  /** Length of a full day in seconds */
  dayLengthSeconds: number;
  /** Starting time of day (0.0 = midnight, 0.25 = 6am, 0.5 = noon, 0.75 = 6pm) */
  startTimeOfDay: number;
  /** Color configuration for lights */
  colors: DayNightColors;
  /** Light intensity configuration */
  intensity: LightIntensityConfig;
  /** Fog configuration for atmospheric effects */
  fog: FogConfig;
  /** Sun position and movement configuration */
  sunPosition: SunPositionConfig;
  /** Moon configuration for night lighting */
  moon: MoonConfig;
  /** Easing function for smooth transitions */
  easing: EasingFunction | CustomEasingFunction;
  /** Power value for 'power' easing function (ignored for other easing types) */
  easingPower?: number;
};

/**
 * Current time information
 */
export type TimeInfo = {
  /** Normalized time of day (0.0 to 1.0) */
  timeOfDay: number;
  /** Current hour (0-23) */
  hours: number;
  /** Current minutes (0-59) */
  minutes: number;
  /** Time formatted as HH:MM string */
  formattedTime: string;
  /** Eased interpolation value for smooth transitions (0.0 to 1.0) */
  easedValue: number;
};

/**
 * Day/Night manager interface
 */
export type DayNightManager = {
  /** Get current time information */
  getTimeInfo(): TimeInfo;
  /** Update the day-night cycle (called automatically by world) */
  update(deltaTime: number): void;
  /** Set time of day manually (0.0 to 1.0) */
  setTimeOfDay(timeOfDay: number): void;
  /** Pause/resume the time progression */
  setPaused(paused: boolean): void;
  /** Check if time progression is paused */
  isPaused(): boolean;
  /** Get the current configuration */
  getConfig(): Readonly<DayNightConfig>;
  /** Update configuration at runtime */
  updateConfig(config: Partial<DayNightConfig>): void;
  /** Dispose resources */
  dispose(): void;
};
