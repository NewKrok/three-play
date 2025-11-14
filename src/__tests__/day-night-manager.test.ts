import { jest } from '@jest/globals';
import * as THREE from 'three';
import { createDayNightManager } from '../core/day-night/day-night-manager.js';
import type { DayNightConfig } from '../types/day-night.js';

describe('DayNightManager', () => {
  let scene: THREE.Scene;
  let ambientLight: THREE.AmbientLight;
  let directionalLight: THREE.DirectionalLight;
  let mockConfig: Partial<DayNightConfig>;

  beforeEach(() => {
    scene = new THREE.Scene();
    ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    scene.add(ambientLight);
    scene.add(directionalLight);

    mockConfig = {
      enabled: true,
      dayLengthSeconds: 120, // 2 minutes for faster testing
      startTimeOfDay: 0.25, // 6:00 AM
      colors: {
        ambient: {
          day: 0xffffff,
          night: 0x000080,
        },
        directional: {
          day: 0xffffff,
          night: 0xff8000,
        },
      },
      intensity: {
        ambient: { min: 0.3, max: 0.9 },
        directional: { min: 0.2, max: 1.0 },
      },
      sunPosition: {
        radius: 50,
        heightOffset: 10,
        zOffset: -20,
        staticCenter: new THREE.Vector3(0, 0, 0),
      },
      easing: 'linear',
    };
  });

  afterEach(() => {
    scene.clear();
  });

  describe('initialization', () => {
    it('should create a day/night manager with default configuration', () => {
      const manager = createDayNightManager(
        {},
        scene,
        ambientLight,
        directionalLight,
      );

      expect(manager).toBeDefined();
      expect(typeof manager.getTimeInfo).toBe('function');
      expect(typeof manager.update).toBe('function');
      expect(typeof manager.setTimeOfDay).toBe('function');
    });

    it('should apply custom configuration correctly', () => {
      const manager = createDayNightManager(
        mockConfig,
        scene,
        ambientLight,
        directionalLight,
      );
      const config = manager.getConfig();

      expect(config.dayLengthSeconds).toBe(120);
      expect(config.startTimeOfDay).toBe(0.25);
      expect(config.easing).toBe('linear');
    });

    it('should set initial time of day correctly', () => {
      const manager = createDayNightManager(
        mockConfig,
        scene,
        ambientLight,
        directionalLight,
      );
      const timeInfo = manager.getTimeInfo();

      expect(timeInfo.timeOfDay).toBe(0.25);
      expect(timeInfo.hours).toBe(6);
      expect(timeInfo.minutes).toBe(0);
    });
  });

  describe('time management', () => {
    it('should update time of day correctly', () => {
      const manager = createDayNightManager(
        mockConfig,
        scene,
        ambientLight,
        directionalLight,
      );

      // Simulate 30 seconds (1/4 of day length = 1/4 of 24 hours = 6 hours)
      manager.update(30);

      const timeInfo = manager.getTimeInfo();
      expect(timeInfo.timeOfDay).toBeCloseTo(0.5, 2); // Should be around noon
      expect(timeInfo.hours).toBe(12);
    });

    it('should wrap time correctly when exceeding 24 hours', () => {
      const manager = createDayNightManager(
        mockConfig,
        scene,
        ambientLight,
        directionalLight,
      );

      // Simulate full day plus extra
      manager.update(150); // More than dayLengthSeconds (120)

      const timeInfo = manager.getTimeInfo();
      expect(timeInfo.timeOfDay).toBeLessThan(1);
      expect(timeInfo.timeOfDay).toBeGreaterThan(0);
    });

    it('should format time correctly', () => {
      const manager = createDayNightManager(
        mockConfig,
        scene,
        ambientLight,
        directionalLight,
      );

      manager.setTimeOfDay(0.5); // Noon
      let timeInfo = manager.getTimeInfo();
      expect(timeInfo.formattedTime).toBe('12:00');

      manager.setTimeOfDay(0.75); // 6 PM
      timeInfo = manager.getTimeInfo();
      expect(timeInfo.formattedTime).toBe('18:00');
    });

    it('should pause and resume correctly', () => {
      const manager = createDayNightManager(
        mockConfig,
        scene,
        ambientLight,
        directionalLight,
      );
      const initialTime = manager.getTimeInfo().timeOfDay;

      manager.setPaused(true);
      expect(manager.isPaused()).toBe(true);

      manager.update(10);
      expect(manager.getTimeInfo().timeOfDay).toBe(initialTime);

      manager.setPaused(false);
      expect(manager.isPaused()).toBe(false);

      manager.update(10);
      expect(manager.getTimeInfo().timeOfDay).not.toBe(initialTime);
    });
  });

  describe('lighting updates', () => {
    it('should update light intensities based on time of day', () => {
      const manager = createDayNightManager(
        mockConfig,
        scene,
        ambientLight,
        directionalLight,
      );

      // Test at noon (maximum intensity)
      manager.setTimeOfDay(0.5);
      expect(ambientLight.intensity).toBeCloseTo(0.9, 1);
      expect(directionalLight.intensity).toBeCloseTo(1.0, 1);

      // Test at midnight (minimum intensity)
      manager.setTimeOfDay(0.0);
      expect(ambientLight.intensity).toBeCloseTo(0.3, 1);
      expect(directionalLight.intensity).toBeCloseTo(0.2, 1);
    });

    it('should update light colors based on time of day', () => {
      const manager = createDayNightManager(
        mockConfig,
        scene,
        ambientLight,
        directionalLight,
      );

      // Test at noon (day colors)
      manager.setTimeOfDay(0.5);
      const dayAmbientColor = new THREE.Color(0xffffff);
      const dayDirectionalColor = new THREE.Color(0xffffff);

      expect(ambientLight.color.r).toBeCloseTo(dayAmbientColor.r, 1);
      expect(directionalLight.color.r).toBeCloseTo(dayDirectionalColor.r, 1);
    });

    it('should update sun position correctly', () => {
      const manager = createDayNightManager(
        mockConfig,
        scene,
        ambientLight,
        directionalLight,
      );
      const initialPosition = directionalLight.position.clone();

      manager.setTimeOfDay(0.75); // 6 PM - sun should move

      expect(directionalLight.position.x).not.toBe(initialPosition.x);
      expect(directionalLight.position.y).not.toBe(initialPosition.y);
    });
  });

  describe('easing functions', () => {
    it('should apply linear easing correctly', () => {
      const manager = createDayNightManager(
        { ...mockConfig, easing: 'linear' },
        scene,
        ambientLight,
        directionalLight,
      );

      manager.setTimeOfDay(0.5); // Noon
      const timeInfo = manager.getTimeInfo();
      expect(timeInfo.easedValue).toBeCloseTo(1.0, 1);
    });

    it('should apply smoothstep easing correctly', () => {
      const manager = createDayNightManager(
        { ...mockConfig, easing: 'smoothstep' },
        scene,
        ambientLight,
        directionalLight,
      );

      manager.setTimeOfDay(0.5); // Noon
      const timeInfo = manager.getTimeInfo();
      expect(timeInfo.easedValue).toBeCloseTo(1.0, 1);
    });

    it('should apply power easing correctly', () => {
      const manager = createDayNightManager(
        { ...mockConfig, easing: 'power', easingPower: 2 },
        scene,
        ambientLight,
        directionalLight,
      );

      manager.setTimeOfDay(0.5); // Noon
      const timeInfo = manager.getTimeInfo();
      expect(timeInfo.easedValue).toBeCloseTo(1.0, 1);
    });

    it('should apply custom easing function correctly', () => {
      const customEasing = (t: number) => t * t; // Quadratic
      const manager = createDayNightManager(
        { ...mockConfig, easing: customEasing },
        scene,
        ambientLight,
        directionalLight,
      );

      manager.setTimeOfDay(0.5); // Noon
      const timeInfo = manager.getTimeInfo();
      expect(timeInfo.easedValue).toBeCloseTo(1.0, 1);
    });
  });

  describe('shadow optimization', () => {
    it('should update shadow bounds when following a target', () => {
      const target = new THREE.Object3D();
      target.position.set(10, 5, 15);
      scene.add(target);

      const configWithTarget: Partial<DayNightConfig> = {
        ...mockConfig,
        sunPosition: {
          ...mockConfig.sunPosition!,
          followTarget: target,
        },
      };

      const manager = createDayNightManager(
        configWithTarget,
        scene,
        ambientLight,
        directionalLight,
      );

      // Update should position the light target at the followed object
      manager.update(0.1);

      expect(directionalLight.target.position.x).toBeCloseTo(
        target.position.x,
        1,
      );
      expect(directionalLight.target.position.y).toBeCloseTo(
        target.position.y,
        1,
      );
      expect(directionalLight.target.position.z).toBeCloseTo(
        target.position.z,
        1,
      );
    });

    it('should use static center when no target is provided', () => {
      const manager = createDayNightManager(
        mockConfig,
        scene,
        ambientLight,
        directionalLight,
      );

      manager.update(0.1);

      expect(directionalLight.target.position.x).toBe(0);
      expect(directionalLight.target.position.y).toBe(0);
      expect(directionalLight.target.position.z).toBe(0);
    });
  });

  describe('configuration updates', () => {
    it('should update configuration at runtime', () => {
      const manager = createDayNightManager(
        mockConfig,
        scene,
        ambientLight,
        directionalLight,
      );

      const newConfig = {
        dayLengthSeconds: 240,
        colors: {
          ambient: {
            day: 0xff0000,
            night: 0x0000ff,
          },
          directional: {
            day: 0xffffff,
            night: 0xff8000,
          },
        },
      };

      manager.updateConfig(newConfig);
      const updatedConfig = manager.getConfig();

      expect(updatedConfig.dayLengthSeconds).toBe(240);
      expect(updatedConfig.colors.ambient.day).toBe(0xff0000);
    });

    it('should immediately apply lighting changes when config is updated', () => {
      const manager = createDayNightManager(
        mockConfig,
        scene,
        ambientLight,
        directionalLight,
      );

      manager.setTimeOfDay(0.5); // Noon
      const initialIntensity = ambientLight.intensity;

      manager.updateConfig({
        intensity: {
          ambient: { min: 0.1, max: 0.5 },
          directional: { min: 0.1, max: 0.5 },
        },
      });

      expect(ambientLight.intensity).not.toBe(initialIntensity);
      expect(ambientLight.intensity).toBeCloseTo(0.5, 1);
    });
  });

  describe('cleanup', () => {
    it('should dispose resources correctly', () => {
      const manager = createDayNightManager(
        mockConfig,
        scene,
        ambientLight,
        directionalLight,
      );

      expect(() => manager.dispose()).not.toThrow();
    });
  });

  describe('disabled state', () => {
    it('should not update when disabled', () => {
      const disabledConfig = { ...mockConfig, enabled: false };
      const manager = createDayNightManager(
        disabledConfig,
        scene,
        ambientLight,
        directionalLight,
      );

      const initialTimeInfo = manager.getTimeInfo();
      manager.update(10);
      const updatedTimeInfo = manager.getTimeInfo();

      expect(updatedTimeInfo.timeOfDay).toBe(initialTimeInfo.timeOfDay);
    });
  });
});
