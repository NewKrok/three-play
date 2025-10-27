import * as THREE from 'three';
import createWorld from '../core/world/world.js';
import type { WorldConfig, OutlineConfig } from '../types/world.js';

// Mock Three.js WebGL dependencies
jest.mock('three', () => {
  const actual = jest.requireActual('three');
  return {
    ...actual,
    WebGLRenderer: jest.fn().mockImplementation(() => ({
      shadowMap: { enabled: false, type: null },
      outputColorSpace: null,
      toneMapping: null,
      toneMappingExposure: null,
      setSize: jest.fn(),
      dispose: jest.fn(),
      render: jest.fn(),
    })),
  };
});

// Mock the DisposeUtils to avoid import issues
jest.mock('@newkrok/three-utils', () => ({
  DisposeUtils: {
    deepDispose: jest.fn(),
  },
}));

// Mock post-processing effects
jest.mock('three/examples/jsm/postprocessing/EffectComposer.js', () => ({
  EffectComposer: jest.fn().mockImplementation(() => ({
    addPass: jest.fn(),
    setSize: jest.fn(),
    render: jest.fn(),
    passes: [],
  })),
}));

jest.mock('three/examples/jsm/postprocessing/OutlinePass.js', () => ({
  OutlinePass: jest.fn().mockImplementation(() => ({
    selectedObjects: [],
    edgeStrength: 1.0,
    edgeGlow: 0.0,
    edgeThickness: 1.0,
    pulsePeriod: 0,
    visibleEdgeColor: { set: jest.fn() },
    hiddenEdgeColor: { set: jest.fn() },
    setSize: jest.fn(),
  })),
}));

jest.mock('three/examples/jsm/postprocessing/RenderPass.js', () => ({
  RenderPass: jest.fn(),
}));

jest.mock('three/examples/jsm/postprocessing/SSAOPass.js', () => ({
  SSAOPass: Object.assign(
    jest.fn().mockImplementation(() => ({
      kernelRadius: 16,
      minDistance: 0.005,
      maxDistance: 0.1,
      output: 0,
      setSize: jest.fn(),
    })),
    {
      OUTPUT: {
        Default: 0,
        SSAO: 1,
        Blur: 2,
        Beauty: 3,
        Depth: 4,
        Normal: 5,
      },
    },
  ),
}));

jest.mock('three/examples/jsm/postprocessing/UnrealBloomPass.js', () => ({
  UnrealBloomPass: jest.fn(),
}));

jest.mock('three/examples/jsm/postprocessing/ShaderPass.js', () => ({
  ShaderPass: jest.fn().mockImplementation(() => ({
    material: {
      uniforms: {
        resolution: { value: { set: jest.fn() } },
      },
    },
  })),
}));

jest.mock('three/examples/jsm/postprocessing/OutputPass.js', () => ({
  OutputPass: jest.fn(),
}));

jest.mock('three/examples/jsm/shaders/FXAAShader.js', () => ({
  FXAAShader: {},
}));

// Mock window and addEventListener
Object.defineProperty(global, 'window', {
  value: {
    innerWidth: 1024,
    innerHeight: 768,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  writable: true,
});

global.requestAnimationFrame = jest.fn();
global.cancelAnimationFrame = jest.fn();

// Mock console.log to avoid noise in tests
const originalLog = console.log;
beforeAll(() => {
  console.log = jest.fn();
});

afterAll(() => {
  console.log = originalLog;
});

describe('World Outline System', () => {
  let world: ReturnType<typeof createWorld>;
  let testObject1: THREE.Mesh;
  let testObject2: THREE.Mesh;

  const worldConfig: WorldConfig = {
    world: {
      size: { x: 100, y: 100 },
    },
    render: {
      useComposer: true,
    },
  };

  beforeEach(() => {
    // Create a new world instance for each test
    world = createWorld(worldConfig);

    // Create test objects
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    testObject1 = new THREE.Mesh(geometry, material);
    testObject2 = new THREE.Mesh(geometry, material);
  });

  afterEach(() => {
    // Clean up after each test
    if (world && typeof world.destroy === 'function') {
      world.destroy();
    }
  });

  describe('addOutline', () => {
    it('should add outline to a single object', () => {
      const config: OutlineConfig = {
        color: '#00ff00',
        strength: 2.0,
        pulse: true,
      };

      const outlineId = world.addOutline(testObject1, config);

      expect(outlineId).toBeTruthy();
      expect(typeof outlineId).toBe('string');

      const outlines = world.getOutlines();
      expect(outlines).toHaveLength(1);
      expect(outlines[0].object).toBe(testObject1);
      expect(outlines[0].config.color).toBe('#00ff00');
      expect(outlines[0].config.strength).toBe(2.0);
      expect(outlines[0].config.pulse).toBe(true);
    });

    it('should add outline to multiple objects', () => {
      const config: OutlineConfig = {
        color: '#ff0000',
        thickness: 3.0,
      };

      const outlineId = world.addOutline([testObject1, testObject2], config);

      expect(outlineId).toBeTruthy();

      const outlines = world.getOutlines();
      expect(outlines).toHaveLength(2);
      expect(outlines.map((o) => o.object)).toContain(testObject1);
      expect(outlines.map((o) => o.object)).toContain(testObject2);
    });

    it('should apply default values for missing config properties', () => {
      const config: OutlineConfig = {
        color: '#0000ff',
      };

      world.addOutline(testObject1, config);

      const outlines = world.getOutlines();
      expect(outlines[0].config.strength).toBe(1.0); // default
      expect(outlines[0].config.thickness).toBe(1.0); // default
      expect(outlines[0].config.glow).toBe(0.0); // default
      expect(outlines[0].config.pulse).toBe(false); // default
      expect(outlines[0].config.priority).toBe(0); // default
      expect(outlines[0].config.enabled).toBe(true); // default
    });

    it('should handle separate visible and hidden colors', () => {
      const config: OutlineConfig = {
        visibleColor: '#ff0000',
        hiddenColor: '#00ff00',
      };

      world.addOutline(testObject1, config);

      const outlines = world.getOutlines();
      expect(outlines[0].config.visibleColor).toBe('#ff0000');
      expect(outlines[0].config.hiddenColor).toBe('#00ff00');
    });

    it('should use color as fallback for visible and hidden colors', () => {
      const config: OutlineConfig = {
        color: '#ffff00',
      };

      world.addOutline(testObject1, config);

      const outlines = world.getOutlines();
      expect(outlines[0].config.visibleColor).toBe('#ffff00');
      expect(outlines[0].config.hiddenColor).toBe('#ffff00');
    });
  });

  describe('removeOutline', () => {
    it('should remove outline by ID', () => {
      const outlineId = world.addOutline(testObject1, { color: '#ff0000' });

      expect(world.getOutlines()).toHaveLength(1);

      world.removeOutline(outlineId);

      expect(world.getOutlines()).toHaveLength(0);
    });

    it('should remove all objects for a multi-object outline', () => {
      const outlineId = world.addOutline([testObject1, testObject2], {
        color: '#ff0000',
      });

      expect(world.getOutlines()).toHaveLength(2);

      world.removeOutline(outlineId);

      expect(world.getOutlines()).toHaveLength(0);
    });

    it('should not affect other outlines when removing one', () => {
      const outlineId1 = world.addOutline(testObject1, { color: '#ff0000' });
      const outlineId2 = world.addOutline(testObject2, { color: '#00ff00' });

      expect(world.getOutlines()).toHaveLength(2);

      world.removeOutline(outlineId1);

      const remainingOutlines = world.getOutlines();
      expect(remainingOutlines).toHaveLength(1);
      expect(remainingOutlines[0].object).toBe(testObject2);
    });
  });

  describe('updateOutline', () => {
    it('should update outline configuration', () => {
      const outlineId = world.addOutline(testObject1, {
        color: '#ff0000',
        strength: 1.0,
      });

      world.updateOutline(outlineId, {
        color: '#00ff00',
        strength: 3.0,
      });

      const outlines = world.getOutlines();
      expect(outlines[0].config.color).toBe('#00ff00');
      expect(outlines[0].config.strength).toBe(3.0);
    });

    it('should update all objects in a multi-object outline', () => {
      const outlineId = world.addOutline([testObject1, testObject2], {
        color: '#ff0000',
      });

      world.updateOutline(outlineId, { color: '#0000ff' });

      const outlines = world.getOutlines();
      expect(outlines).toHaveLength(2);
      outlines.forEach((outline) => {
        expect(outline.config.color).toBe('#0000ff');
      });
    });

    it('should warn when trying to update non-existent outline', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      world.updateOutline('non-existent-id', { color: '#ff0000' });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Outline with ID non-existent-id not found',
      );

      consoleSpy.mockRestore();
    });
  });

  describe('clearOutlines', () => {
    it('should clear all outlines', () => {
      world.addOutline(testObject1, { color: '#ff0000' });
      world.addOutline(testObject2, { color: '#00ff00' });

      expect(world.getOutlines()).toHaveLength(2);

      world.clearOutlines();

      expect(world.getOutlines()).toHaveLength(0);
    });
  });

  describe('pulse configuration', () => {
    it('should handle boolean pulse values', () => {
      world.addOutline(testObject1, { pulse: true });

      const outlines = world.getOutlines();
      expect(outlines[0].config.pulse).toBe(true);
    });

    it('should handle numeric pulse values', () => {
      world.addOutline(testObject1, { pulse: 2.5 });

      const outlines = world.getOutlines();
      expect(outlines[0].config.pulse).toBe(2.5);
    });

    it('should handle disabled pulse', () => {
      world.addOutline(testObject1, { pulse: false });

      const outlines = world.getOutlines();
      expect(outlines[0].config.pulse).toBe(false);
    });
  });

  describe('enabled/disabled state', () => {
    it('should allow disabling outlines', () => {
      const outlineId = world.addOutline(testObject1, { color: '#ff0000' });

      world.updateOutline(outlineId, { enabled: false });

      const outlines = world.getOutlines();
      expect(outlines[0].config.enabled).toBe(false);
    });

    it('should allow re-enabling outlines', () => {
      const outlineId = world.addOutline(testObject1, {
        color: '#ff0000',
        enabled: false,
      });

      world.updateOutline(outlineId, { enabled: true });

      const outlines = world.getOutlines();
      expect(outlines[0].config.enabled).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle destroyed world gracefully', () => {
      world.destroy();

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const outlineId = world.addOutline(testObject1, { color: '#ff0000' });
      expect(outlineId).toBe('');

      world.removeOutline('any-id');
      world.updateOutline('any-id', { color: '#ff0000' });
      world.clearOutlines();

      const outlines = world.getOutlines();
      expect(outlines).toEqual([]);

      expect(consoleSpy).toHaveBeenCalledTimes(5);

      consoleSpy.mockRestore();
    });
  });
});
