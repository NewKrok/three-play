import * as THREE from 'three';
import { EasingFunctions } from '../utils/easing-utils.js';
import type {
  DayNightConfig,
  DayNightManager,
  TimeInfo,
  EasingFunction,
  CustomEasingFunction,
} from '../../types/day-night.js';
import type { EasingType } from '../../types/common.js';

/**
 * Default day/night configuration
 */
const DEFAULT_CONFIG: DayNightConfig = {
  enabled: true,
  dayLengthSeconds: 1200, // 20 minutes real time = 24 hours game time
  startTimeOfDay: 0.25, // 6:00 AM
  colors: {
    ambient: {
      day: 0xfef9e6,
      night: 0x99bbff,
    },
    directional: {
      day: 0xffffff,
      night: 0xffd18b,
    },
    fog: {
      day: 0xe6f3ff, // Light blue-white for day
      night: 0x2a3a5c, // Dark blue-grey for night
    },
  },
  intensity: {
    ambient: { min: 0.6, max: 0.9 },
    directional: { min: 0.4, max: 1.0 },
  },
  fog: {
    enabled: true,
    density: { min: 0.002, max: 0.008 }, // Subtle atmospheric fog by default
  },
  sunPosition: {
    radius: 100,
    heightOffset: 20,
    zOffset: -40,
    staticCenter: new THREE.Vector3(0, 0, 0),
  },
  easing: 'ease-in-out', // Use existing easing function as default
  easingPower: 0.7,
};

/**
 * Additional easing functions specific to day/night cycles
 */
const DAY_NIGHT_EASING_FUNCTIONS = {
  smoothstep: (t: number) => t * t * (3.0 - 2.0 * t),
  power: (t: number, power: number = 2) => Math.pow(t, power),
};

/**
 * Creates a day/night cycle manager
 */
export const createDayNightManager = (
  config: Partial<DayNightConfig>,
  scene: THREE.Scene,
  ambientLight: THREE.AmbientLight,
  directionalLight: THREE.DirectionalLight,
): DayNightManager => {
  const fullConfig: DayNightConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    colors: { ...DEFAULT_CONFIG.colors, ...config.colors },
    intensity: { ...DEFAULT_CONFIG.intensity, ...config.intensity },
    sunPosition: { ...DEFAULT_CONFIG.sunPosition, ...config.sunPosition },
  };

  let currentTimeOfDay = fullConfig.startTimeOfDay;
  let isPausedState = false;

  // Pre-create color objects to avoid garbage collection
  const nightColorAmbient = new THREE.Color(fullConfig.colors.ambient.night);
  const dayColorAmbient = new THREE.Color(fullConfig.colors.ambient.day);
  const nightColorDirectional = new THREE.Color(
    fullConfig.colors.directional.night,
  );
  const dayColorDirectional = new THREE.Color(
    fullConfig.colors.directional.day,
  );
  
  // Fog color objects
  const nightColorFog = fullConfig.colors.fog 
    ? new THREE.Color(fullConfig.colors.fog.night)
    : new THREE.Color(0x2a3a5c);
  const dayColorFog = fullConfig.colors.fog
    ? new THREE.Color(fullConfig.colors.fog.day)
    : new THREE.Color(0xe6f3ff);

  // Working color objects
  const tempAmbientColor = new THREE.Color();
  const tempDirectionalColor = new THREE.Color();
  const tempFogColor = new THREE.Color();

  // Shadow optimization: dynamic shadow bounds
  const updateShadowBounds = (target?: THREE.Object3D) => {
    if (target && fullConfig.sunPosition.followTarget) {
      // Update shadow camera to follow target with optimized bounds
      const shadowCamera = directionalLight.shadow
        .camera as THREE.OrthographicCamera;

      // Smaller, focused shadow area around target
      const shadowSize = 25; // Reduced from default 40
      shadowCamera.left = -shadowSize;
      shadowCamera.right = shadowSize;
      shadowCamera.top = shadowSize;
      shadowCamera.bottom = -shadowSize;

      // Update shadow camera position
      directionalLight.target.position.copy(target.position);
      directionalLight.target.updateMatrixWorld();

      // Mark shadow camera for update
      shadowCamera.updateProjectionMatrix();
    } else if (fullConfig.sunPosition.staticCenter) {
      // Use static center position
      directionalLight.target.position.copy(
        fullConfig.sunPosition.staticCenter,
      );
      directionalLight.target.updateMatrixWorld();
    }
  };

  /**
   * Apply easing function to a normalized value
   */
  const applyEasing = (t: number): number => {
    if (typeof fullConfig.easing === 'function') {
      return (fullConfig.easing as CustomEasingFunction)(t);
    }

    const easingFunc = fullConfig.easing as EasingFunction;

    // Use existing easing functions from easing-utils
    if (easingFunc in EasingFunctions) {
      return EasingFunctions[easingFunc as EasingType](t);
    }

    // Use day/night specific easing functions
    switch (easingFunc) {
      case 'smoothstep':
        return DAY_NIGHT_EASING_FUNCTIONS.smoothstep(t);
      case 'power':
        return DAY_NIGHT_EASING_FUNCTIONS.power(t, fullConfig.easingPower || 2);
      default:
        return EasingFunctions.linear(t);
    }
  };

  /**
   * Update sun position and lighting
   */
  const updateLighting = () => {
    if (!fullConfig.enabled) return;

    const angle = currentTimeOfDay * Math.PI * 2;
    const centerPosition =
      fullConfig.sunPosition.followTarget?.position ||
      fullConfig.sunPosition.staticCenter ||
      new THREE.Vector3(0, 0, 0);

    // Update sun position
    directionalLight.position.set(
      centerPosition.x + Math.cos(angle) * fullConfig.sunPosition.radius,
      centerPosition.y +
        Math.sin(angle) * fullConfig.sunPosition.radius +
        fullConfig.sunPosition.heightOffset,
      centerPosition.z + fullConfig.sunPosition.zOffset,
    );

    // Calculate lighting intensity based on sun height
    // At timeOfDay=0.5 (noon), we want max intensity
    // At timeOfDay=0.0 or 1.0 (midnight), we want min intensity
    const sunHeight = Math.max(0, -Math.cos(angle));
    const easedValue = applyEasing(sunHeight);

    // Update light intensities
    ambientLight.intensity =
      fullConfig.intensity.ambient.min +
      easedValue *
        (fullConfig.intensity.ambient.max - fullConfig.intensity.ambient.min);

    directionalLight.intensity =
      fullConfig.intensity.directional.min +
      easedValue *
        (fullConfig.intensity.directional.max -
          fullConfig.intensity.directional.min);

    // Update light colors
    tempAmbientColor.copy(nightColorAmbient).lerp(dayColorAmbient, easedValue);
    tempDirectionalColor
      .copy(nightColorDirectional)
      .lerp(dayColorDirectional, easedValue);

    ambientLight.color.copy(tempAmbientColor);
    directionalLight.color.copy(tempDirectionalColor);

    // Initialize or update fog if enabled
    if (fullConfig.fog.enabled) {
      // Initialize fog if not already present
      if (!scene.fog) {
        scene.fog = new THREE.FogExp2(0xccddee, fullConfig.fog.density.min);
      }
      
      // Update fog color
      tempFogColor.copy(nightColorFog).lerp(dayColorFog, easedValue);
      scene.fog.color.copy(tempFogColor);
      
      // Update fog density (thicker at night, thinner during day)
      if (scene.fog instanceof THREE.FogExp2) {
        const fogDensity = fullConfig.fog.density.max - 
          easedValue * (fullConfig.fog.density.max - fullConfig.fog.density.min);
        scene.fog.density = fogDensity;
      }
    }

    // Update shadow bounds for optimization
    updateShadowBounds(fullConfig.sunPosition.followTarget);
  };

  const manager: DayNightManager = {
    getTimeInfo(): TimeInfo {
      // Convert timeOfDay (0-1) to hours (0-24)
      const totalHours = currentTimeOfDay * 24;
      const wrappedHours = totalHours >= 24 ? totalHours - 24 : totalHours;

      const hours = Math.floor(wrappedHours);
      const minutes = Math.floor((wrappedHours - hours) * 60);

      const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

      // Calculate eased value for external use
      const angle = currentTimeOfDay * Math.PI * 2;
      const sunHeight = Math.max(0, -Math.cos(angle));
      const easedValue = applyEasing(sunHeight);

      return {
        timeOfDay: currentTimeOfDay,
        hours,
        minutes,
        formattedTime,
        easedValue,
      };
    },

    update(deltaTime: number): void {
      if (!fullConfig.enabled || isPausedState) return;

      // Update time of day
      currentTimeOfDay += deltaTime / fullConfig.dayLengthSeconds;
      if (currentTimeOfDay > 1) currentTimeOfDay -= 1;

      // Update lighting
      updateLighting();
    },

    setTimeOfDay(timeOfDay: number): void {
      currentTimeOfDay = Math.max(0, Math.min(1, timeOfDay));
      updateLighting();
    },

    setPaused(paused: boolean): void {
      isPausedState = paused;
    },

    isPaused(): boolean {
      return isPausedState;
    },

    getConfig(): Readonly<DayNightConfig> {
      return { ...fullConfig };
    },

    updateConfig(newConfig: Partial<DayNightConfig>): void {
      Object.assign(fullConfig, newConfig);

      // Update color objects if colors changed
      if (newConfig.colors) {
        if (newConfig.colors.ambient) {
          nightColorAmbient.set(fullConfig.colors.ambient.night);
          dayColorAmbient.set(fullConfig.colors.ambient.day);
        }
        if (newConfig.colors.directional) {
          nightColorDirectional.set(fullConfig.colors.directional.night);
          dayColorDirectional.set(fullConfig.colors.directional.day);
        }
        if (newConfig.colors.fog) {
          nightColorFog.set(fullConfig.colors.fog.night);
          dayColorFog.set(fullConfig.colors.fog.day);
        }
      }

      // Immediately update lighting with new config
      updateLighting();
    },

    dispose(): void {
      // Cleanup if needed
      tempAmbientColor.set(0);
      tempDirectionalColor.set(0);
      tempFogColor.set(0);
    },
  };

  // Initial lighting setup
  updateLighting();

  return manager;
};
