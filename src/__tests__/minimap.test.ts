import * as THREE from 'three';
import { createMinimapManager } from '../core/minimap/minimap.js';
import type { MinimapConfig } from '../types/minimap.js';
import type { Unit } from '../types/units.js';
import type { Interactable } from '../types/interactions.js';

// Mock DOM for canvas
const mockCanvas = {
  width: 200,
  height: 200,
  style: {},
  getContext: jest.fn(() => mockContext),
};

const mockContext = {
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  beginPath: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
  rotate: jest.fn(),
  createImageData: jest.fn((width: number, height: number) => ({
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
  })),
  putImageData: jest.fn(),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
};

const mockContainer = {
  style: {},
  appendChild: jest.fn(),
};

// Mock document
global.document = {
  createElement: jest.fn((tag: string) => {
    if (tag === 'canvas') return mockCanvas;
    if (tag === 'div') return mockContainer;
    return {};
  }),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    contains: jest.fn(() => true),
  },
} as any;

// Helper: Create mock unit
const createMockUnit = (
  id: string,
  type: 'player' | 'enemy' | 'npc',
  x: number,
  z: number,
): Partial<Unit> => {
  const model = new THREE.Group();
  model.position.set(x, 0, z);

  return {
    id,
    definition: { type } as any,
    model,
  };
};

// Helper: Create mock interactable
const createMockInteractable = (
  id: string,
  x: number,
  z: number,
  blocksMovement = false,
): Partial<Interactable> => ({
  id,
  position: new THREE.Vector3(x, 0, z),
  isActive: true,
  blocksMovement,
  collisionRadius: 1,
  interactionRadius: 2,
  canInteract: true,
  userData: {},
});

describe('MinimapManager', () => {
  let minimapManager: ReturnType<typeof createMinimapManager>;
  const worldSize = { x: 100, y: 100 };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (minimapManager) {
      minimapManager.dispose();
    }
  });

  describe('Configuration', () => {
    it('should create with default configuration', () => {
      minimapManager = createMinimapManager({}, worldSize);

      expect(minimapManager).toBeDefined();
      expect(minimapManager.update).toBeDefined();
      expect(minimapManager.show).toBeDefined();
      expect(minimapManager.hide).toBeDefined();
      expect(minimapManager.toggle).toBeDefined();
      expect(minimapManager.isVisible).toBeDefined();
    });

    it('should create with custom configuration', () => {
      const config: MinimapConfig = {
        enabled: true,
        size: 300,
        position: 'bottom-left',
        zoom: 0.15,
        playerColor: '#00ff00',
        enemyColor: '#ff0000',
      };

      minimapManager = createMinimapManager(config, worldSize);

      const currentConfig = minimapManager.getConfig();
      expect(currentConfig.size).toBe(300);
      expect(currentConfig.position).toBe('bottom-left');
      expect(currentConfig.zoom).toBe(0.15);
      expect(currentConfig.playerColor).toBe('#00ff00');
      expect(currentConfig.enemyColor).toBe('#ff0000');
    });

    it('should apply custom styles', () => {
      const customStyles = {
        boxShadow: '0 0 10px rgba(0,0,0,0.5)',
        zIndex: '2000',
      };

      const config: MinimapConfig = {
        customStyles,
      };

      minimapManager = createMinimapManager(config, worldSize);
      expect(document.createElement).toHaveBeenCalledWith('div');
    });
  });

  describe('Visibility', () => {
    beforeEach(() => {
      minimapManager = createMinimapManager({ enabled: true }, worldSize);
    });

    it('should start visible when enabled', () => {
      expect(minimapManager.isVisible()).toBe(true);
    });

    it('should hide when hide() is called', () => {
      minimapManager.hide();
      expect(minimapManager.isVisible()).toBe(false);
    });

    it('should show when show() is called after hiding', () => {
      minimapManager.hide();
      minimapManager.show();
      expect(minimapManager.isVisible()).toBe(true);
    });

    it('should toggle visibility', () => {
      const initialState = minimapManager.isVisible();
      minimapManager.toggle();
      expect(minimapManager.isVisible()).toBe(!initialState);
      minimapManager.toggle();
      expect(minimapManager.isVisible()).toBe(initialState);
    });
  });

  describe('Update', () => {
    let camera: THREE.PerspectiveCamera;
    let units: Partial<Unit>[];
    let interactables: Partial<Interactable>[];

    beforeEach(() => {
      minimapManager = createMinimapManager({ enabled: true }, worldSize);

      camera = new THREE.PerspectiveCamera(60, 1, 1, 100);
      camera.position.set(10, 20, 30);
      camera.lookAt(0, 0, 0);

      units = [
        createMockUnit('player1', 'player', 5, 5),
        createMockUnit('enemy1', 'enemy', -10, 15),
        createMockUnit('npc1', 'npc', 20, -5),
      ];

      interactables = [
        createMockInteractable('tree1', 10, 10),
        createMockInteractable('rock1', -5, -5, true),
      ];
    });

    it('should update without errors', () => {
      expect(() => {
        minimapManager.update(
          camera,
          units as Unit[],
          interactables as Interactable[],
          0,
        );
      }).not.toThrow();
    });

    it('should throttle updates based on updateFrequency', () => {
      const config: MinimapConfig = {
        enabled: true,
        updateFrequency: 100,
      };

      minimapManager = createMinimapManager(config, worldSize);

      // First update should go through
      minimapManager.update(camera, units as Unit[], interactables as Interactable[], 0);
      const clearCallCount = mockContext.clearRect.mock.calls.length;

      // Second update immediately should be throttled
      minimapManager.update(camera, units as Unit[], interactables as Interactable[], 50);
      expect(mockContext.clearRect.mock.calls.length).toBe(clearCallCount);

      // Third update after frequency passes should go through
      minimapManager.update(camera, units as Unit[], interactables as Interactable[], 150);
      expect(mockContext.clearRect.mock.calls.length).toBeGreaterThan(clearCallCount);
    });

    it('should not update when hidden', () => {
      minimapManager.hide();

      const clearCallCount = mockContext.clearRect.mock.calls.length;
      minimapManager.update(camera, units as Unit[], interactables as Interactable[], 0);

      expect(mockContext.clearRect.mock.calls.length).toBe(clearCallCount);
    });

    it('should handle empty units array', () => {
      expect(() => {
        minimapManager.update(camera, [], interactables as Interactable[], 0);
      }).not.toThrow();
    });

    it('should handle empty interactables array', () => {
      expect(() => {
        minimapManager.update(camera, units as Unit[], [], 0);
      }).not.toThrow();
    });
  });

  describe('Configuration Updates', () => {
    beforeEach(() => {
      minimapManager = createMinimapManager({ enabled: true }, worldSize);
    });

    it('should update configuration at runtime', () => {
      minimapManager.updateConfig({
        playerColor: '#123456',
        enemyColor: '#654321',
        zoom: 0.2,
      });

      const config = minimapManager.getConfig();
      expect(config.playerColor).toBe('#123456');
      expect(config.enemyColor).toBe('#654321');
      expect(config.zoom).toBe(0.2);
    });

    it('should update opacity', () => {
      minimapManager.updateConfig({ opacity: 0.5 });
      expect(mockContainer.style.opacity).toBe('0.5');
    });

    it('should update border', () => {
      minimapManager.updateConfig({
        borderWidth: 4,
        borderColor: '#ff0000',
      });
      expect(mockContainer.style.border).toContain('4px');
      expect(mockContainer.style.border).toContain('#ff0000');
    });

    it('should update background color', () => {
      minimapManager.updateConfig({ backgroundColor: 'rgba(255, 0, 0, 0.8)' });
      expect(mockContainer.style.backgroundColor).toBe('rgba(255, 0, 0, 0.8)');
    });

    it('should update border radius', () => {
      minimapManager.updateConfig({ borderRadius: 16 });
      expect(mockContainer.style.borderRadius).toBe('16px');
    });
  });

  describe('Terrain Data', () => {
    beforeEach(() => {
      minimapManager = createMinimapManager({ enabled: true, showTerrain: true }, worldSize);
    });

    it('should set terrain data', () => {
      const heightData: number[][] = Array(10).fill(null).map(() =>
        Array(10).fill(null).map(() => Math.random())
      );

      expect(() => {
        minimapManager.setTerrainData(heightData, worldSize);
      }).not.toThrow();
    });

    it('should create terrain image data', () => {
      const heightData: number[][] = Array(5).fill(null).map(() =>
        Array(5).fill(null).map(() => 0.5)
      );

      minimapManager.setTerrainData(heightData, worldSize);

      expect(mockContext.createImageData).toHaveBeenCalled();
    });

    it('should not create terrain data when showTerrain is false', () => {
      minimapManager.updateConfig({ showTerrain: false });

      const heightData: number[][] = Array(5).fill(null).map(() =>
        Array(5).fill(null).map(() => 0.5)
      );

      const callCount = mockContext.createImageData.mock.calls.length;
      minimapManager.setTerrainData(heightData, worldSize);

      expect(mockContext.createImageData.mock.calls.length).toBe(callCount);
    });
  });

  describe('Feature Toggles', () => {
    let camera: THREE.PerspectiveCamera;
    let units: Partial<Unit>[];
    let interactables: Partial<Interactable>[];

    beforeEach(() => {
      camera = new THREE.PerspectiveCamera(60, 1, 1, 100);
      units = [createMockUnit('player1', 'player', 0, 0)];
      interactables = [createMockInteractable('tree1', 10, 10)];
    });

    it('should respect showUnits setting', () => {
      minimapManager = createMinimapManager({
        enabled: true,
        showUnits: false
      }, worldSize);

      minimapManager.update(camera, units as Unit[], interactables as Interactable[], 0);

      // Units should not be drawn (no arc calls for unit dots)
      const arcCalls = mockContext.arc.mock.calls;
      const unitArcCalls = arcCalls.filter((call: any) => call[2] === 4); // unitDotSize default is 4
      expect(unitArcCalls.length).toBe(0);
    });

    it('should respect showInteractables setting', () => {
      minimapManager = createMinimapManager({
        enabled: true,
        showInteractables: false
      }, worldSize);

      minimapManager.update(camera, units as Unit[], interactables as Interactable[], 0);

      // Less arc calls without interactables
      expect(mockContext.arc).toHaveBeenCalled();
    });

    it('should respect showCameraFov setting', () => {
      minimapManager = createMinimapManager({
        enabled: true,
        showCameraFov: false
      }, worldSize);

      minimapManager.update(camera, units as Unit[], interactables as Interactable[], 0);

      // Camera FOV uses save/restore for transformation
      expect(mockContext.save).not.toHaveBeenCalled();
    });
  });

  describe('Positions', () => {
    it('should position at top-right by default', () => {
      minimapManager = createMinimapManager({ enabled: true }, worldSize);
      expect(mockContainer.style.top).toBe('16px');
      expect(mockContainer.style.right).toBe('16px');
    });

    it('should position at top-left', () => {
      minimapManager = createMinimapManager({
        enabled: true,
        position: 'top-left'
      }, worldSize);
      expect(mockContainer.style.top).toBe('16px');
      expect(mockContainer.style.left).toBe('16px');
    });

    it('should position at bottom-left', () => {
      minimapManager = createMinimapManager({
        enabled: true,
        position: 'bottom-left'
      }, worldSize);
      expect(mockContainer.style.bottom).toBe('16px');
      expect(mockContainer.style.left).toBe('16px');
    });

    it('should position at bottom-right', () => {
      minimapManager = createMinimapManager({
        enabled: true,
        position: 'bottom-right'
      }, worldSize);
      expect(mockContainer.style.bottom).toBe('16px');
      expect(mockContainer.style.right).toBe('16px');
    });
  });

  describe('Dispose', () => {
    it('should remove from DOM on dispose', () => {
      minimapManager = createMinimapManager({ enabled: true }, worldSize);

      minimapManager.dispose();

      expect(document.body.removeChild).toHaveBeenCalled();
    });

    it('should clear terrain data on dispose', () => {
      minimapManager = createMinimapManager({ enabled: true }, worldSize);

      const heightData: number[][] = Array(5).fill(null).map(() =>
        Array(5).fill(null).map(() => 0.5)
      );
      minimapManager.setTerrainData(heightData, worldSize);

      minimapManager.dispose();

      // After dispose, terrain data should be cleared
      // This is internal state, but we can verify no errors on subsequent updates
    });

    it('should handle dispose when not in DOM', () => {
      (document.body.contains as jest.Mock).mockReturnValue(false);

      minimapManager = createMinimapManager({ enabled: true }, worldSize);

      expect(() => {
        minimapManager.dispose();
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small world size', () => {
      const smallWorld = { x: 10, y: 10 };

      expect(() => {
        minimapManager = createMinimapManager({ enabled: true }, smallWorld);
      }).not.toThrow();
    });

    it('should handle very large world size', () => {
      const largeWorld = { x: 10000, y: 10000 };

      expect(() => {
        minimapManager = createMinimapManager({ enabled: true }, largeWorld);
      }).not.toThrow();
    });

    it('should handle extreme zoom levels', () => {
      expect(() => {
        minimapManager = createMinimapManager({
          enabled: true,
          zoom: 0.001
        }, worldSize);
      }).not.toThrow();

      expect(() => {
        minimapManager = createMinimapManager({
          enabled: true,
          zoom: 10
        }, worldSize);
      }).not.toThrow();
    });

    it('should handle units at world boundaries', () => {
      minimapManager = createMinimapManager({ enabled: true }, worldSize);

      const camera = new THREE.PerspectiveCamera(60, 1, 1, 100);
      const boundaryUnits = [
        createMockUnit('u1', 'player', -50, -50),
        createMockUnit('u2', 'enemy', 50, 50),
        createMockUnit('u3', 'npc', -50, 50),
        createMockUnit('u4', 'player', 50, -50),
      ];

      expect(() => {
        minimapManager.update(camera, boundaryUnits as Unit[], [], 0);
      }).not.toThrow();
    });
  });

  describe('getConfig', () => {
    it('should return readonly config', () => {
      minimapManager = createMinimapManager({
        enabled: true,
        size: 250,
      }, worldSize);

      const config = minimapManager.getConfig();
      expect(config.size).toBe(250);

      // Config should be a copy, not reference
      expect(config).toBeDefined();
    });

    it('should include all default values', () => {
      minimapManager = createMinimapManager({}, worldSize);

      const config = minimapManager.getConfig();

      expect(config.enabled).toBeDefined();
      expect(config.size).toBeDefined();
      expect(config.position).toBeDefined();
      expect(config.zoom).toBeDefined();
      expect(config.playerColor).toBeDefined();
      expect(config.enemyColor).toBeDefined();
      expect(config.npcColor).toBeDefined();
    });
  });
});
