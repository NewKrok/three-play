import * as THREE from 'three';
import type { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import type {
  OutlineConfig,
  OutlineEntry,
} from '../../types/effects.js';

/**
 * Configuration for outline manager
 */
export type OutlineManagerConfig = {
  outlinePass: OutlinePass | null;
};

/**
 * Outline manager for handling object outlines with priority system
 */
export type OutlineManager = {
  addOutline(
    objects: THREE.Object3D | THREE.Object3D[],
    config: OutlineConfig,
  ): string;
  removeOutline(outlineId: string): void;
  updateOutline(outlineId: string, config: Partial<OutlineConfig>): void;
  clearOutlines(): void;
  getOutlines(): OutlineEntry[];
  destroy(): void;
};

/**
 * Creates an outline manager instance
 * @param config - The outline manager configuration
 * @returns Outline manager instance
 */
export const createOutlineManager = (
  config: OutlineManagerConfig,
): OutlineManager => {
  const { outlinePass } = config;

  // Outline management system
  const outlineEntries = new Map<string, OutlineEntry>();
  let outlineIdCounter = 0;
  let isDestroyed = false;

  /**
   * Helper function to generate unique outline IDs
   */
  const generateOutlineId = (): string => {
    return `outline_${++outlineIdCounter}_${Date.now()}`;
  };

  /**
   * Helper function to apply outline configuration with defaults
   */
  const getOutlineConfigWithDefaults = (
    config: OutlineConfig,
  ): Required<OutlineConfig> => {
    return {
      color: config.color ?? '#ffff00',
      visibleColor: config.visibleColor ?? config.color ?? '#ffff00',
      hiddenColor: config.hiddenColor ?? config.color ?? '#ffff00',
      strength: config.strength ?? 1.0,
      thickness: config.thickness ?? 1.0,
      glow: config.glow ?? 0.0,
      pulse: config.pulse ?? false,
      priority: config.priority ?? 0,
      enabled: config.enabled ?? true,
    };
  };

  /**
   * Function to update the outline pass with current highest priority settings
   */
  const updateOutlinePass = () => {
    if (!outlinePass) return;

    // Get all enabled outlines sorted by priority (highest first)
    const enabledOutlines = Array.from(outlineEntries.values())
      .filter((entry) => entry.config.enabled)
      .sort((a, b) => b.config.priority - a.config.priority);

    if (enabledOutlines.length === 0) {
      // No outlines, clear the pass
      outlinePass.selectedObjects = [];
      return;
    }

    // Use the highest priority outline's configuration
    const highestPriorityConfig = enabledOutlines[0].config;

    // Collect all objects from enabled outlines
    const allObjects = enabledOutlines.map((entry) => entry.object);
    outlinePass.selectedObjects = allObjects;

    // Apply the highest priority configuration
    outlinePass.edgeStrength = highestPriorityConfig.strength;
    outlinePass.edgeGlow = highestPriorityConfig.glow;
    outlinePass.edgeThickness = highestPriorityConfig.thickness;

    // Handle pulse configuration
    if (typeof highestPriorityConfig.pulse === 'number') {
      outlinePass.pulsePeriod = highestPriorityConfig.pulse;
    } else if (highestPriorityConfig.pulse === true) {
      outlinePass.pulsePeriod = 1; // Default pulse period
    } else {
      outlinePass.pulsePeriod = 0; // No pulse
    }

    outlinePass.visibleEdgeColor.set(highestPriorityConfig.visibleColor);
    outlinePass.hiddenEdgeColor.set(highestPriorityConfig.hiddenColor);
  };

  return {
    /**
     * Add outline to objects with flexible configuration
     * @param objects - Single object or array of objects to outline
     * @param config - Outline configuration
     * @returns Unique outline ID for management
     */
    addOutline(
      objects: THREE.Object3D | THREE.Object3D[],
      config: OutlineConfig,
    ): string {
      if (isDestroyed) {
        console.warn('Cannot add outline: outline manager is destroyed');
        return '';
      }

      if (!outlinePass) {
        console.warn(
          'Outline pass is not available. Make sure useComposer is enabled.',
        );
        return '';
      }

      const objectArray = Array.isArray(objects) ? objects : [objects];
      const outlineId = generateOutlineId();
      const fullConfig = getOutlineConfigWithDefaults(config);

      // Create outline entries for each object
      objectArray.forEach((object) => {
        const entryId = `${outlineId}_${object.uuid}`;
        outlineEntries.set(entryId, {
          id: entryId,
          object,
          config: fullConfig,
        });
      });

      updateOutlinePass();
      return outlineId;
    },

    /**
     * Remove outline by ID
     * @param outlineId - The outline ID to remove
     */
    removeOutline(outlineId: string): void {
      if (isDestroyed) {
        console.warn('Cannot remove outline: outline manager is destroyed');
        return;
      }

      // Remove all entries that start with this outline ID
      const keysToRemove = Array.from(outlineEntries.keys()).filter((key) =>
        key.startsWith(outlineId),
      );

      keysToRemove.forEach((key) => outlineEntries.delete(key));
      updateOutlinePass();
    },

    /**
     * Update existing outline configuration
     * @param outlineId - The outline ID to update
     * @param config - Partial configuration to update
     */
    updateOutline(outlineId: string, config: Partial<OutlineConfig>): void {
      if (isDestroyed) {
        console.warn('Cannot update outline: outline manager is destroyed');
        return;
      }

      // Find all entries that start with this outline ID
      const entriesToUpdate = Array.from(outlineEntries.entries()).filter(
        ([key]) => key.startsWith(outlineId),
      );

      if (entriesToUpdate.length === 0) {
        console.warn(`Outline with ID ${outlineId} not found`);
        return;
      }

      // Update all matching entries
      entriesToUpdate.forEach(([key, entry]) => {
        const updatedConfig = getOutlineConfigWithDefaults({
          ...entry.config,
          ...config,
        });

        outlineEntries.set(key, {
          ...entry,
          config: updatedConfig,
        });
      });

      updateOutlinePass();
    },

    /**
     * Clear all outlines
     */
    clearOutlines(): void {
      if (isDestroyed) {
        console.warn('Cannot clear outlines: outline manager is destroyed');
        return;
      }

      outlineEntries.clear();
      updateOutlinePass();
    },

    /**
     * Get all current outlines
     * @returns Array of outline entries
     */
    getOutlines(): OutlineEntry[] {
      if (isDestroyed) {
        console.warn('Cannot get outlines: outline manager is destroyed');
        return [];
      }

      return Array.from(outlineEntries.values());
    },

    /**
     * Destroy the outline manager and clean up resources
     */
    destroy(): void {
      if (isDestroyed) return;

      isDestroyed = true;
      outlineEntries.clear();

      if (outlinePass) {
        outlinePass.selectedObjects = [];
      }
    },
  };
};
