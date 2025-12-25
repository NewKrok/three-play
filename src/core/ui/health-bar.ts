import * as THREE from 'three';
import type { Unit } from '../../types/units.js';

/**
 * Health bar configuration
 */
export type HealthBarConfig = {
  /** Width of the health bar in world units */
  width?: number;
  /** Height of the health bar in world units */
  height?: number;
  /** Offset above the unit's position */
  yOffset?: number;
  /** Background color */
  backgroundColor?: THREE.ColorRepresentation;
  /** Health color (full health) */
  healthColor?: THREE.ColorRepresentation;
  /** Low health color (< 30% health) */
  lowHealthColor?: THREE.ColorRepresentation;
  /** Border color */
  borderColor?: THREE.ColorRepresentation;
  /** Border width */
  borderWidth?: number;
  /** Whether to always show the health bar or only when damaged */
  alwaysShow?: boolean;
};

/**
 * Health bar instance attached to a unit
 */
export type HealthBar = {
  /** The visual container for the health bar */
  container: THREE.Group;
  /** Background plane */
  background: THREE.Mesh;
  /** Health fill plane */
  healthFill: THREE.Mesh;
  /** Border (if enabled) */
  border?: THREE.Line;
  /** Configuration */
  config: Required<HealthBarConfig>;
  /** Unit this health bar is attached to */
  unit: Unit;
};

/**
 * Health bar manager for creating and updating health bars
 */
export type HealthBarManager = {
  /** Create a health bar for a unit */
  createHealthBar: (unit: Unit, config?: HealthBarConfig) => HealthBar;
  /** Remove a health bar */
  removeHealthBar: (healthBar: HealthBar) => void;
  /** Update all health bars (call this in your update loop) */
  updateHealthBars: (camera: THREE.Camera) => void;
  /** Get health bar for a unit */
  getHealthBar: (unit: Unit) => HealthBar | null;
  /** Remove all health bars */
  removeAllHealthBars: () => void;
};

const DEFAULT_CONFIG: Required<HealthBarConfig> = {
  width: 1.0,
  height: 0.1,
  yOffset: 2.0,
  backgroundColor: 0x333333,
  healthColor: 0x00ff00,
  lowHealthColor: 0xff0000,
  borderColor: 0x000000,
  borderWidth: 0.02,
  alwaysShow: false,
};

/**
 * Create a health bar manager
 */
export const createHealthBarManager = (scene: THREE.Scene): HealthBarManager => {
  const healthBars = new Map<string, HealthBar>();

  const createHealthBar = (
    unit: Unit,
    config: HealthBarConfig = {},
  ): HealthBar => {
    const fullConfig = { ...DEFAULT_CONFIG, ...config };

    // Create container that will hold all health bar elements
    const container = new THREE.Group();
    container.position.y = fullConfig.yOffset;

    // Create background
    const backgroundGeometry = new THREE.PlaneGeometry(
      fullConfig.width,
      fullConfig.height,
    );
    const backgroundMaterial = new THREE.MeshBasicMaterial({
      color: fullConfig.backgroundColor,
      transparent: true,
      opacity: 0.8,
      depthTest: false,
    });
    const background = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
    container.add(background);

    // Create health fill
    const healthGeometry = new THREE.PlaneGeometry(
      fullConfig.width,
      fullConfig.height,
    );
    const healthMaterial = new THREE.MeshBasicMaterial({
      color: fullConfig.healthColor,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
    });
    const healthFill = new THREE.Mesh(healthGeometry, healthMaterial);
    healthFill.position.z = 0.01; // Slightly in front of background
    container.add(healthFill);

    // Create border
    let border: THREE.Line | undefined;
    if (fullConfig.borderWidth > 0) {
      const borderPoints = [
        new THREE.Vector3(
          -fullConfig.width / 2,
          -fullConfig.height / 2,
          0.02,
        ),
        new THREE.Vector3(
          fullConfig.width / 2,
          -fullConfig.height / 2,
          0.02,
        ),
        new THREE.Vector3(
          fullConfig.width / 2,
          fullConfig.height / 2,
          0.02,
        ),
        new THREE.Vector3(
          -fullConfig.width / 2,
          fullConfig.height / 2,
          0.02,
        ),
        new THREE.Vector3(
          -fullConfig.width / 2,
          -fullConfig.height / 2,
          0.02,
        ),
      ];
      const borderGeometry = new THREE.BufferGeometry().setFromPoints(
        borderPoints,
      );
      const borderMaterial = new THREE.LineBasicMaterial({
        color: fullConfig.borderColor,
        linewidth: fullConfig.borderWidth,
        depthTest: false,
      });
      border = new THREE.Line(borderGeometry, borderMaterial);
      container.add(border);
    }

    // Set render order to render on top
    container.renderOrder = 999;
    background.renderOrder = 999;
    healthFill.renderOrder = 1000;
    if (border) border.renderOrder = 1001;

    // Add to scene directly, not to unit model, to avoid inheriting rotation
    scene.add(container);

    // Set initial position above unit
    container.position.copy(unit.model.position);
    container.position.y += fullConfig.yOffset;

    // Hide if not always showing
    if (!fullConfig.alwaysShow && unit.stats.health === unit.stats.maxHealth) {
      container.visible = false;
    }

    const healthBar: HealthBar = {
      container,
      background,
      healthFill,
      border,
      config: fullConfig,
      unit,
    };

    healthBars.set(unit.id, healthBar);
    return healthBar;
  };

  const removeHealthBar = (healthBar: HealthBar): void => {
    // Remove from scene (not from unit.model, since we added it to scene directly)
    scene.remove(healthBar.container);

    // Dispose geometries and materials
    healthBar.background.geometry.dispose();
    (healthBar.background.material as THREE.Material).dispose();
    healthBar.healthFill.geometry.dispose();
    (healthBar.healthFill.material as THREE.Material).dispose();

    if (healthBar.border) {
      healthBar.border.geometry.dispose();
      (healthBar.border.material as THREE.Material).dispose();
    }

    healthBars.delete(healthBar.unit.id);
  };

  const updateHealthBars = (camera: THREE.Camera): void => {
    for (const healthBar of healthBars.values()) {
      const { unit, healthFill, container, config } = healthBar;

      // Update position to follow unit
      container.position.copy(unit.model.position);
      container.position.y += config.yOffset;

      // Calculate health percentage
      const healthPercent = unit.stats.health / unit.stats.maxHealth;

      // Update health fill scale
      healthFill.scale.x = Math.max(0, healthPercent);
      // Adjust position to keep left-aligned
      healthFill.position.x = -(config.width / 2) * (1 - healthPercent);

      // Update color based on health percentage
      const material = healthFill.material as THREE.MeshBasicMaterial;
      if (healthPercent < 0.3) {
        material.color.set(config.lowHealthColor);
      } else {
        // Interpolate between low health and full health color
        const t = (healthPercent - 0.3) / 0.7;
        material.color.lerpColors(
          new THREE.Color(config.lowHealthColor),
          new THREE.Color(config.healthColor),
          t,
        );
      }

      // Show/hide based on config and health
      if (!config.alwaysShow) {
        container.visible = healthPercent < 1.0;
      }

      // Make health bar always face camera (billboard effect)
      container.quaternion.copy(camera.quaternion);
    }
  };

  const getHealthBar = (unit: Unit): HealthBar | null => {
    return healthBars.get(unit.id) || null;
  };

  const removeAllHealthBars = (): void => {
    for (const healthBar of healthBars.values()) {
      removeHealthBar(healthBar);
    }
  };

  return {
    createHealthBar,
    removeHealthBar,
    updateHealthBars,
    getHealthBar,
    removeAllHealthBars,
  };
};
