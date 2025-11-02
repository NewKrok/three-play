import * as THREE from 'three';
import { createOutlineManager } from '../core/effects/outline-manager.js';
import type { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';

// Mock OutlinePass
class MockOutlinePass implements Partial<OutlinePass> {
  selectedObjects: THREE.Object3D[] = [];
  edgeStrength = 1.0;
  edgeGlow = 0.0;
  edgeThickness = 1.0;
  pulsePeriod = 0;
  visibleEdgeColor = new THREE.Color();
  hiddenEdgeColor = new THREE.Color();

  setSize = jest.fn();
  dispose = jest.fn();
}

const createMockOutlinePass = (): OutlinePass => {
  return new MockOutlinePass() as unknown as OutlinePass;
};

describe('Outline Manager', () => {
  let outlinePass: OutlinePass;
  let outlineManager: ReturnType<typeof createOutlineManager>;
  let testObjects: THREE.Object3D[];

  beforeEach(() => {
    outlinePass = createMockOutlinePass();
    outlineManager = createOutlineManager({ outlinePass });

    // Create test objects
    testObjects = [new THREE.Mesh(), new THREE.Mesh(), new THREE.Group()];
  });

  afterEach(() => {
    outlineManager.destroy();
  });

  describe('addOutline', () => {
    it('should add outline to single object', () => {
      const config = { color: '#ff0000', strength: 2 };
      const outlineId = outlineManager.addOutline(testObjects[0], config);

      expect(outlineId).toMatch(/^outline_\d+_\d+$/);
      expect(outlinePass.selectedObjects).toHaveLength(1);
      expect(outlinePass.selectedObjects[0]).toBe(testObjects[0]);
      expect(outlinePass.edgeStrength).toBe(2);
    });

    it('should add outline to multiple objects', () => {
      const config = { color: '#00ff00', thickness: 3 };
      const outlineId = outlineManager.addOutline(testObjects, config);

      expect(outlineId).toMatch(/^outline_\d+_\d+$/);
      expect(outlinePass.selectedObjects).toHaveLength(3);
      expect(outlinePass.selectedObjects).toEqual(testObjects);
      expect(outlinePass.edgeThickness).toBe(3);
    });

    it('should apply default configuration values', () => {
      const outlineId = outlineManager.addOutline(testObjects[0], {});

      expect(outlinePass.edgeStrength).toBe(1.0);
      expect(outlinePass.edgeThickness).toBe(1.0);
      expect(outlinePass.edgeGlow).toBe(0.0);
      expect(outlinePass.pulsePeriod).toBe(0);
    });

    it('should handle pulse configuration', () => {
      // Test boolean pulse
      outlineManager.addOutline(testObjects[0], { pulse: true });
      expect(outlinePass.pulsePeriod).toBe(1);

      // Clear and test numeric pulse
      outlineManager.clearOutlines();
      outlineManager.addOutline(testObjects[1], { pulse: 2.5 });
      expect(outlinePass.pulsePeriod).toBe(2.5);

      // Clear and test no pulse
      outlineManager.clearOutlines();
      outlineManager.addOutline(testObjects[2], { pulse: false });
      expect(outlinePass.pulsePeriod).toBe(0);
    });

    it('should handle priority system correctly', () => {
      // Add low priority outline
      outlineManager.addOutline(testObjects[0], {
        color: '#ff0000',
        strength: 1,
        priority: 1,
      });

      // Add high priority outline
      outlineManager.addOutline(testObjects[1], {
        color: '#00ff00',
        strength: 5,
        priority: 10,
      });

      // High priority should take precedence
      expect(outlinePass.edgeStrength).toBe(5);
      expect(outlinePass.selectedObjects).toHaveLength(2);
    });

    it('should warn when outline pass is not available', () => {
      const consoleWarn = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});
      const managerWithoutPass = createOutlineManager({ outlinePass: null });

      const result = managerWithoutPass.addOutline(testObjects[0], {});

      expect(result).toBe('');
      expect(consoleWarn).toHaveBeenCalledWith(
        'Outline pass is not available. Make sure useComposer is enabled.',
      );

      consoleWarn.mockRestore();
      managerWithoutPass.destroy();
    });

    it('should warn when manager is destroyed', () => {
      const consoleWarn = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});
      outlineManager.destroy();

      const result = outlineManager.addOutline(testObjects[0], {});

      expect(result).toBe('');
      expect(consoleWarn).toHaveBeenCalledWith(
        'Cannot add outline: outline manager is destroyed',
      );

      consoleWarn.mockRestore();
    });
  });

  describe('removeOutline', () => {
    it('should remove outline by ID', () => {
      const outlineId = outlineManager.addOutline(testObjects[0], {});
      expect(outlinePass.selectedObjects).toHaveLength(1);

      outlineManager.removeOutline(outlineId);
      expect(outlinePass.selectedObjects).toHaveLength(0);
    });

    it('should remove multiple objects with same outline ID', () => {
      const outlineId = outlineManager.addOutline(testObjects, {});
      expect(outlinePass.selectedObjects).toHaveLength(3);

      outlineManager.removeOutline(outlineId);
      expect(outlinePass.selectedObjects).toHaveLength(0);
    });

    it('should warn when manager is destroyed', () => {
      const consoleWarn = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});
      outlineManager.destroy();

      outlineManager.removeOutline('test');

      expect(consoleWarn).toHaveBeenCalledWith(
        'Cannot remove outline: outline manager is destroyed',
      );

      consoleWarn.mockRestore();
    });
  });

  describe('updateOutline', () => {
    it('should update existing outline configuration', () => {
      const outlineId = outlineManager.addOutline(testObjects[0], {
        strength: 1,
        color: '#ff0000',
      });

      outlineManager.updateOutline(outlineId, {
        strength: 5,
        glow: 0.8,
      });

      expect(outlinePass.edgeStrength).toBe(5);
      expect(outlinePass.edgeGlow).toBe(0.8);
    });

    it('should warn when outline ID not found', () => {
      const consoleWarn = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});

      outlineManager.updateOutline('nonexistent', { strength: 5 });

      expect(consoleWarn).toHaveBeenCalledWith(
        'Outline with ID nonexistent not found',
      );

      consoleWarn.mockRestore();
    });

    it('should warn when manager is destroyed', () => {
      const consoleWarn = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});
      outlineManager.destroy();

      outlineManager.updateOutline('test', {});

      expect(consoleWarn).toHaveBeenCalledWith(
        'Cannot update outline: outline manager is destroyed',
      );

      consoleWarn.mockRestore();
    });
  });

  describe('clearOutlines', () => {
    it('should clear all outlines', () => {
      outlineManager.addOutline(testObjects[0], {});
      outlineManager.addOutline(testObjects[1], {});
      expect(outlinePass.selectedObjects).toHaveLength(2);

      outlineManager.clearOutlines();
      expect(outlinePass.selectedObjects).toHaveLength(0);
    });

    it('should warn when manager is destroyed', () => {
      const consoleWarn = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});
      outlineManager.destroy();

      outlineManager.clearOutlines();

      expect(consoleWarn).toHaveBeenCalledWith(
        'Cannot clear outlines: outline manager is destroyed',
      );

      consoleWarn.mockRestore();
    });
  });

  describe('getOutlines', () => {
    it('should return all current outlines', () => {
      const outlineId1 = outlineManager.addOutline(testObjects[0], {
        color: '#ff0000',
      });
      const outlineId2 = outlineManager.addOutline(testObjects[1], {
        color: '#00ff00',
      });

      const outlines = outlineManager.getOutlines();

      expect(outlines).toHaveLength(2);
      expect(outlines[0].object).toBe(testObjects[0]);
      expect(outlines[1].object).toBe(testObjects[1]);
      expect(outlines[0].id).toContain(outlineId1.split('_')[1]);
      expect(outlines[1].id).toContain(outlineId2.split('_')[1]);
    });

    it('should return empty array when no outlines exist', () => {
      const outlines = outlineManager.getOutlines();
      expect(outlines).toEqual([]);
    });

    it('should warn and return empty array when manager is destroyed', () => {
      const consoleWarn = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});
      outlineManager.destroy();

      const result = outlineManager.getOutlines();

      expect(result).toEqual([]);
      expect(consoleWarn).toHaveBeenCalledWith(
        'Cannot get outlines: outline manager is destroyed',
      );

      consoleWarn.mockRestore();
    });
  });

  describe('destroy', () => {
    it('should clear all outlines and reset outline pass', () => {
      outlineManager.addOutline(testObjects, {});
      expect(outlinePass.selectedObjects).toHaveLength(3);

      outlineManager.destroy();
      expect(outlinePass.selectedObjects).toHaveLength(0);
    });

    it('should be safe to call destroy multiple times', () => {
      outlineManager.destroy();
      expect(() => outlineManager.destroy()).not.toThrow();
    });

    it('should handle null outline pass gracefully', () => {
      const managerWithoutPass = createOutlineManager({ outlinePass: null });
      expect(() => managerWithoutPass.destroy()).not.toThrow();
    });
  });

  describe('configuration validation', () => {
    it('should handle color fallbacks correctly', () => {
      outlineManager.addOutline(testObjects[0], {
        color: '#ff0000',
      });

      // Both visible and hidden should use the main color
      expect(outlinePass.visibleEdgeColor.getHexString()).toBe('ff0000');
      expect(outlinePass.hiddenEdgeColor.getHexString()).toBe('ff0000');
    });

    it('should handle separate visible and hidden colors', () => {
      outlineManager.addOutline(testObjects[0], {
        visibleColor: '#ff0000',
        hiddenColor: '#00ff00',
      });

      expect(outlinePass.visibleEdgeColor.getHexString()).toBe('ff0000');
      expect(outlinePass.hiddenEdgeColor.getHexString()).toBe('00ff00');
    });

    it('should handle enabled/disabled state', () => {
      // Add enabled outline
      outlineManager.addOutline(testObjects[0], {
        enabled: true,
      });
      expect(outlinePass.selectedObjects).toHaveLength(1);

      // Add disabled outline - should not affect the pass
      const disabledId = outlineManager.addOutline(testObjects[1], {
        enabled: false,
      });
      expect(outlinePass.selectedObjects).toHaveLength(1);

      // Enable the disabled outline
      outlineManager.updateOutline(disabledId, { enabled: true });
      expect(outlinePass.selectedObjects).toHaveLength(2);
    });
  });
});
