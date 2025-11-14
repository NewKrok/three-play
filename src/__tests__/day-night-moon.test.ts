import * as THREE from 'three';
import { createDayNightManager } from '../core/day-night/day-night-manager.js';
import type { DayNightConfig } from '../types/day-night.js';

describe('DayNightManager - Moon Light System', () => {
  let scene: THREE.Scene;
  let ambientLight: THREE.AmbientLight;
  let directionalLight: THREE.DirectionalLight;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    scene = new THREE.Scene();
    ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.castShadow = true;
    
    scene.add(ambientLight);
    scene.add(directionalLight);

    // Mock console methods to avoid noise in tests
    consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    if (consoleSpy) {
      consoleSpy.mockRestore();
    }
  });

  describe('Moon Light Creation', () => {
    it('should create moon light when enabled in config', () => {
      const config: Partial<DayNightConfig> = {
        moon: {
          enabled: true,
          radius: 80,
          heightOffset: 25,
          zOffset: 30,
          phaseOffset: 0,
        },
        colors: {
          moon: {
            color: 0xb3d9ff,
          },
        },
        intensity: {
          moon: { min: 0.0, max: 0.8 },
        },
      };

      const manager = createDayNightManager(config, scene, ambientLight, directionalLight);

      // Set time to midnight to activate moon shadows
      manager.setTimeOfDay(0.0);

      // Check if moon light was added to scene
      const directionalLights = scene.children.filter(
        (child) => child instanceof THREE.DirectionalLight
      );
      
      // Should have 2 directional lights: sun (original) + moon (new)
      expect(directionalLights).toHaveLength(2);
      
      // Find the moon light (should be different from the original directional light)
      const moonLight = directionalLights.find(light => light !== directionalLight) as THREE.DirectionalLight;
      expect(moonLight).toBeDefined();
      expect(moonLight.castShadow).toBe(true);
      expect(moonLight.color.getHex()).toBe(0xb3d9ff);

      manager.dispose();
    });

    it('should not create moon light when disabled in config', () => {
      const config: Partial<DayNightConfig> = {
        moon: {
          enabled: false,
          radius: 80,
          heightOffset: 25,
          zOffset: 30,
          phaseOffset: 0,
        },
      };

      const manager = createDayNightManager(config, scene, ambientLight, directionalLight);

      // Should only have the original directional light
      const directionalLights = scene.children.filter(
        (child) => child instanceof THREE.DirectionalLight
      );
      expect(directionalLights).toHaveLength(1);
      expect(directionalLights[0]).toBe(directionalLight);

      manager.dispose();
    });
  });

  describe('Moon Light Position and Intensity', () => {
    it('should position moon opposite to sun', () => {
      const config: Partial<DayNightConfig> = {
        moon: {
          enabled: true,
          radius: 80,
          heightOffset: 25,
          zOffset: 30,
          phaseOffset: 0,
        },
        colors: {
          moon: {
            color: 0xb3d9ff,
          },
        },
        intensity: {
          moon: { min: 0.0, max: 0.8 },
        },
        sunPosition: {
          staticCenter: new THREE.Vector3(0, 0, 0),
        },
      };

      const manager = createDayNightManager(config, scene, ambientLight, directionalLight);

      // Set time to noon (sun at highest point)
      manager.setTimeOfDay(0.5);

      // Find moon light
      const directionalLights = scene.children.filter(
        (child) => child instanceof THREE.DirectionalLight
      );
      const moonLight = directionalLights.find(light => light !== directionalLight) as THREE.DirectionalLight;

      // At noon, sun should be high, moon should be low (opposite)
      expect(directionalLight.position.y).toBeGreaterThan(0); // Sun high
      expect(moonLight.position.y).toBeLessThan(30); // Moon low/hidden (adjusted for heightOffset)

      // Set time to midnight (moon at highest point)
      manager.setTimeOfDay(0.0);

      // At midnight, moon should be high, sun should be low
      expect(directionalLight.position.y).toBeLessThan(30); // Sun low/hidden (adjusted for heightOffset)
      expect(moonLight.position.y).toBeGreaterThan(20); // Moon high

      manager.dispose();
    });

    it('should adjust moon intensity based on night factor', () => {
      const config: Partial<DayNightConfig> = {
        moon: {
          enabled: true,
          radius: 80,
          heightOffset: 25,
          zOffset: 30,
          phaseOffset: 0,
        },
        colors: {
          moon: {
            color: 0xb3d9ff,
          },
        },
        intensity: {
          moon: { min: 0.0, max: 0.8 },
        },
      };

      const manager = createDayNightManager(config, scene, ambientLight, directionalLight);

      // Find moon light
      const directionalLights = scene.children.filter(
        (child) => child instanceof THREE.DirectionalLight
      );
      const moonLight = directionalLights.find(light => light !== directionalLight) as THREE.DirectionalLight;

      // At noon (day time), moon intensity should be very low/zero
      manager.setTimeOfDay(0.5);
      expect(moonLight.intensity).toBeLessThan(0.1);

      // At midnight (night time), moon intensity should be higher
      manager.setTimeOfDay(0.0);
      expect(moonLight.intensity).toBeGreaterThan(0.3);

      manager.dispose();
    });
  });

  describe('Moon Light Shadows', () => {
    it('should enable shadows only when moon intensity is sufficient', () => {
      const config: Partial<DayNightConfig> = {
        moon: {
          enabled: true,
          radius: 80,
          heightOffset: 25,
          zOffset: 30,
          phaseOffset: 0,
        },
        colors: {
          moon: {
            color: 0xb3d9ff,
          },
        },
        intensity: {
          moon: { min: 0.0, max: 0.8 },
        },
      };

      const manager = createDayNightManager(config, scene, ambientLight, directionalLight);

      // Find moon light
      const directionalLights = scene.children.filter(
        (child) => child instanceof THREE.DirectionalLight
      );
      const moonLight = directionalLights.find(light => light !== directionalLight) as THREE.DirectionalLight;

      // At noon, when moon intensity is low, shadows should be disabled
      manager.setTimeOfDay(0.5);
      expect(moonLight.castShadow).toBe(false);

      // At midnight, when moon intensity is high, shadows should be enabled
      manager.setTimeOfDay(0.0);
      expect(moonLight.castShadow).toBe(true);

      manager.dispose();
    });

    it('should configure shadow camera properly', () => {
      const config: Partial<DayNightConfig> = {
        moon: {
          enabled: true,
          radius: 80,
          heightOffset: 25,
          zOffset: 30,
          phaseOffset: 0,
        },
        colors: {
          moon: {
            color: 0xb3d9ff,
          },
        },
        intensity: {
          moon: { min: 0.0, max: 0.8 },
        },
      };

      const manager = createDayNightManager(config, scene, ambientLight, directionalLight);

      // Find moon light
      const directionalLights = scene.children.filter(
        (child) => child instanceof THREE.DirectionalLight
      );
      const moonLight = directionalLights.find(light => light !== directionalLight) as THREE.DirectionalLight;

      // Check shadow camera configuration
      expect(moonLight.shadow.mapSize.width).toBe(1024);
      expect(moonLight.shadow.mapSize.height).toBe(1024);
      expect(moonLight.shadow.camera.near).toBe(0.1);
      expect(moonLight.shadow.camera.far).toBe(300);

      const shadowCamera = moonLight.shadow.camera as THREE.OrthographicCamera;
      expect(shadowCamera.left).toBe(-30);
      expect(shadowCamera.right).toBe(30);
      expect(shadowCamera.top).toBe(30);
      expect(shadowCamera.bottom).toBe(-30);

      manager.dispose();
    });
  });

  describe('Configuration Updates', () => {
    it('should handle moon enable/disable at runtime', () => {
      const config: Partial<DayNightConfig> = {
        moon: {
          enabled: false,
        },
      };

      const manager = createDayNightManager(config, scene, ambientLight, directionalLight);

      // Initially should have only one directional light
      let directionalLights = scene.children.filter(
        (child) => child instanceof THREE.DirectionalLight
      );
      expect(directionalLights).toHaveLength(1);

      // Enable moon light
      manager.updateConfig({
        moon: {
          enabled: true,
          radius: 80,
          heightOffset: 25,
          zOffset: 30,
          phaseOffset: 0,
        },
        colors: {
          moon: {
            color: 0xb3d9ff,
          },
        },
        intensity: {
          moon: { min: 0.0, max: 0.8 },
        },
      });

      // Should now have two directional lights
      directionalLights = scene.children.filter(
        (child) => child instanceof THREE.DirectionalLight
      );
      expect(directionalLights).toHaveLength(2);

      // Disable moon light again
      manager.updateConfig({
        moon: {
          enabled: false,
        },
      });

      // Should be back to one directional light
      directionalLights = scene.children.filter(
        (child) => child instanceof THREE.DirectionalLight
      );
      expect(directionalLights).toHaveLength(1);

      manager.dispose();
    });

    it('should update moon color when configuration changes', () => {
      const config: Partial<DayNightConfig> = {
        moon: {
          enabled: true,
          radius: 80,
          heightOffset: 25,
          zOffset: 30,
          phaseOffset: 0,
        },
        colors: {
          moon: {
            color: 0xb3d9ff,
          },
        },
        intensity: {
          moon: { min: 0.0, max: 0.8 },
        },
      };

      const manager = createDayNightManager(config, scene, ambientLight, directionalLight);

      // Find moon light
      const directionalLights = scene.children.filter(
        (child) => child instanceof THREE.DirectionalLight
      );
      const moonLight = directionalLights.find(light => light !== directionalLight) as THREE.DirectionalLight;

      // Initial color should be blue
      expect(moonLight.color.getHex()).toBe(0xb3d9ff);

      // Update moon color to white
      manager.updateConfig({
        colors: {
          moon: {
            color: 0xffffff,
          },
        },
      });

      // Color should be updated immediately
      expect(moonLight.color.getHex()).toBe(0xffffff);

      manager.dispose();
    });
  });

  describe('Disposal', () => {
    it('should properly dispose moon light on manager disposal', () => {
      const config: Partial<DayNightConfig> = {
        moon: {
          enabled: true,
          radius: 80,
          heightOffset: 25,
          zOffset: 30,
          phaseOffset: 0,
        },
        colors: {
          moon: {
            color: 0xb3d9ff,
          },
        },
        intensity: {
          moon: { min: 0.0, max: 0.8 },
        },
      };

      const manager = createDayNightManager(config, scene, ambientLight, directionalLight);

      // Should have moon light
      let directionalLights = scene.children.filter(
        (child) => child instanceof THREE.DirectionalLight
      );
      expect(directionalLights).toHaveLength(2);

      // Dispose manager
      manager.dispose();

      // Moon light should be removed from scene
      directionalLights = scene.children.filter(
        (child) => child instanceof THREE.DirectionalLight
      );
      expect(directionalLights).toHaveLength(1);
      expect(directionalLights[0]).toBe(directionalLight);
    });
  });
});