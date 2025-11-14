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
    moon: {
      color: 0xb3d9ff, // Cool moonlight blue
    },
    fog: {
      day: 0xe6f3ff, // Light blue-white for day
      night: 0x2a3a5c, // Dark blue-grey for night
    },
  },
  intensity: {
    ambient: { min: 0.6, max: 0.9 },
    directional: { min: 0.4, max: 1.0 },
    moon: { min: 0.0, max: 0.8 }, // Moon provides subtle but visible shadows
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
  moon: {
    enabled: true,
    radius: 80, // Slightly closer than sun for more dramatic shadows
    heightOffset: 30,
    zOffset: 40, // On opposite side of sun
    phaseOffset: 0, // Full moon by default
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
    colors: { 
      ...DEFAULT_CONFIG.colors, 
      ...config.colors,
      moon: { ...DEFAULT_CONFIG.colors.moon, ...config.colors?.moon }
    },
    intensity: { 
      ...DEFAULT_CONFIG.intensity, 
      ...config.intensity,
      moon: { ...DEFAULT_CONFIG.intensity.moon, ...config.intensity?.moon }
    },
    fog: { ...DEFAULT_CONFIG.fog, ...config.fog },
    sunPosition: { ...DEFAULT_CONFIG.sunPosition, ...config.sunPosition },
    moon: { ...DEFAULT_CONFIG.moon, ...config.moon },
  };

  // Create moon light if enabled
  let moonLight: THREE.DirectionalLight | null = null;
  if (fullConfig.moon.enabled) {
    moonLight = new THREE.DirectionalLight(
      fullConfig.colors.moon.color,
      fullConfig.intensity.moon.max,
    );
    
    // Configure moon shadows
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 1024;
    moonLight.shadow.mapSize.height = 1024;
    moonLight.shadow.camera.near = 0.1;
    moonLight.shadow.camera.far = 300;
    
    // Optimize shadow bounds for moon
    const shadowCamera = moonLight.shadow.camera as THREE.OrthographicCamera;
    const shadowSize = 30;
    shadowCamera.left = -shadowSize;
    shadowCamera.right = shadowSize;
    shadowCamera.top = shadowSize;
    shadowCamera.bottom = -shadowSize;
    
    scene.add(moonLight);
    scene.add(moonLight.target);
  }

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
  const moonColor = new THREE.Color(fullConfig.colors.moon.color);

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
    const centerPosition = target?.position || fullConfig.sunPosition.staticCenter || new THREE.Vector3(0, 0, 0);
    
    // Update sun shadow bounds
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
      directionalLight.target.position.copy(centerPosition);
      directionalLight.target.updateMatrixWorld();

      // Mark shadow camera for update
      shadowCamera.updateProjectionMatrix();
    } else if (fullConfig.sunPosition.staticCenter) {
      // Use static center position
      directionalLight.target.position.copy(centerPosition);
      directionalLight.target.updateMatrixWorld();
    }

    // Update moon shadow bounds if moon light exists
    if (moonLight) {
      moonLight.target.position.copy(centerPosition);
      moonLight.target.updateMatrixWorld();
      
      const moonShadowCamera = moonLight.shadow.camera as THREE.OrthographicCamera;
      moonShadowCamera.updateProjectionMatrix();
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

    // Update moon light if enabled
    if (moonLight && fullConfig.moon.enabled) {
      // Moon is positioned opposite to the sun with phase offset
      const moonAngle = angle + Math.PI + fullConfig.moon.phaseOffset;
      
      // Update moon position
      moonLight.position.set(
        centerPosition.x + Math.cos(moonAngle) * fullConfig.moon.radius,
        centerPosition.y +
          Math.sin(moonAngle) * fullConfig.moon.radius +
          fullConfig.moon.heightOffset,
        centerPosition.z + fullConfig.moon.zOffset,
      );

      // Moon intensity is inverse of sun (strongest at night)
      const moonHeight = Math.max(0, -Math.cos(moonAngle));
      const moonEasedValue = applyEasing(moonHeight);
      
      // Moon is only visible/active during night (when sun is down)
      const nightFactor = Math.max(0, 1 - easedValue);
      
      // Calculate moon intensity (high when moon is high AND it's night)
      const finalMoonIntensity = 
        fullConfig.intensity.moon.min +
        (moonEasedValue * nightFactor) *
          (fullConfig.intensity.moon.max - fullConfig.intensity.moon.min);
      
      moonLight.intensity = finalMoonIntensity;

      // Update moon color
      moonLight.color.copy(moonColor);
      
      // Enable/disable moon shadows based on intensity
      moonLight.castShadow = finalMoonIntensity > 0.1;
    }

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
        const fogDensity =
          fullConfig.fog.density.max -
          easedValue *
            (fullConfig.fog.density.max - fullConfig.fog.density.min);
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
      // Deep merge the configuration
      if (newConfig.colors) {
        fullConfig.colors = {
          ...fullConfig.colors,
          ...newConfig.colors,
          moon: { ...fullConfig.colors.moon, ...newConfig.colors.moon }
        };
      }
      if (newConfig.intensity) {
        fullConfig.intensity = {
          ...fullConfig.intensity,
          ...newConfig.intensity,
          moon: { ...fullConfig.intensity.moon, ...newConfig.intensity.moon }
        };
      }
      if (newConfig.fog) {
        fullConfig.fog = { ...fullConfig.fog, ...newConfig.fog };
      }
      if (newConfig.sunPosition) {
        fullConfig.sunPosition = { ...fullConfig.sunPosition, ...newConfig.sunPosition };
      }
      if (newConfig.moon) {
        fullConfig.moon = { ...fullConfig.moon, ...newConfig.moon };
      }
      
      // Apply remaining simple properties
      Object.assign(fullConfig, {
        ...newConfig,
        colors: fullConfig.colors,
        intensity: fullConfig.intensity,
        fog: fullConfig.fog,
        sunPosition: fullConfig.sunPosition,
        moon: fullConfig.moon,
      });

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
        if (newConfig.colors.moon) {
          moonColor.set(fullConfig.colors.moon.color);
        }
        if (newConfig.colors.fog) {
          nightColorFog.set(fullConfig.colors.fog.night);
          dayColorFog.set(fullConfig.colors.fog.day);
        }
      }

      // Handle moon light enable/disable
      if (newConfig.moon && typeof newConfig.moon.enabled === 'boolean') {
        if (newConfig.moon.enabled && !moonLight) {
          // Create moon light if it was disabled before
          moonLight = new THREE.DirectionalLight(
            fullConfig.colors.moon.color,
            fullConfig.intensity.moon.max,
          );
          
          moonLight.castShadow = true;
          moonLight.shadow.mapSize.width = 1024;
          moonLight.shadow.mapSize.height = 1024;
          moonLight.shadow.camera.near = 0.1;
          moonLight.shadow.camera.far = 300;
          
          const shadowCamera = moonLight.shadow.camera as THREE.OrthographicCamera;
          const shadowSize = 30;
          shadowCamera.left = -shadowSize;
          shadowCamera.right = shadowSize;
          shadowCamera.top = shadowSize;
          shadowCamera.bottom = -shadowSize;
          
          scene.add(moonLight);
          scene.add(moonLight.target);
        } else if (!newConfig.moon.enabled && moonLight) {
          // Remove moon light if it was enabled before
          scene.remove(moonLight);
          scene.remove(moonLight.target);
          moonLight.dispose();
          moonLight = null;
        }
      }

      // Immediately update lighting with new config
      updateLighting();
    },

    dispose(): void {
      // Cleanup moon light if it exists
      if (moonLight) {
        scene.remove(moonLight);
        scene.remove(moonLight.target);
        moonLight.dispose();
        moonLight = null;
      }
      
      // Cleanup color objects
      tempAmbientColor.set(0);
      tempDirectionalColor.set(0);
      tempFogColor.set(0);
    },
  };

  // Initial lighting setup
  updateLighting();

  return manager;
};
