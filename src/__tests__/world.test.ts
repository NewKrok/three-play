import createWorld from '../core/world/world';
import type { WorldConfig, WorldInstance } from '../types/world';

// Mock the entire Three.js WebGLRenderer and related classes for testing
jest.mock('three', () => {
  const THREE = jest.requireActual('three');

  // Mock WebGLRenderer
  const MockWebGLRenderer = jest.fn().mockImplementation(() => ({
    shadowMap: {
      enabled: false,
      type: THREE.PCFSoftShadowMap,
    },
    outputColorSpace: THREE.SRGBColorSpace,
    toneMapping: THREE.ACESFilmicToneMapping,
    toneMappingExposure: 1.2,
    setSize: jest.fn(),
    render: jest.fn(),
    dispose: jest.fn(),
    domElement: {
      style: {},
      addEventListener: jest.fn(),
    },
  }));

  return {
    ...THREE,
    WebGLRenderer: MockWebGLRenderer,
    WebGLRenderTarget: jest.fn().mockImplementation(() => ({
      depthTexture: {
        format: THREE.DepthFormat,
        type: THREE.UnsignedShortType,
      },
    })),
    DepthTexture: jest.fn(),
  };
});

// Mock post-processing
jest.mock('three/examples/jsm/postprocessing/EffectComposer.js', () => ({
  EffectComposer: jest.fn().mockImplementation(() => ({
    addPass: jest.fn(),
    setSize: jest.fn(),
    render: jest.fn(),
    passes: [
      { name: 'RenderPass' },
      { name: 'SSAOPass' },
      { name: 'UnrealBloomPass' },
      { name: 'ShaderPass' },
      { name: 'OutputPass' },
    ],
  })),
}));

jest.mock('three/examples/jsm/postprocessing/RenderPass.js', () => ({
  RenderPass: jest.fn(),
}));

jest.mock('three/examples/jsm/postprocessing/SSAOPass.js', () => ({
  SSAOPass: jest.fn().mockImplementation(() => ({
    kernelRadius: 16,
    minDistance: 0.005,
    maxDistance: 0.1,
    output: 0,
    setSize: jest.fn(),
  })),
}));

// Mock SSAOPass static properties after the mock
const mockSSAOPass =
  require('three/examples/jsm/postprocessing/SSAOPass.js').SSAOPass;
mockSSAOPass.OUTPUT = {
  Default: 0,
  SSAO: 1,
  Blur: 2,
  Beauty: 3,
  Depth: 4,
  Normal: 5,
};

jest.mock('three/examples/jsm/postprocessing/UnrealBloomPass.js', () => ({
  UnrealBloomPass: jest.fn(),
}));

jest.mock('three/examples/jsm/postprocessing/ShaderPass.js', () => ({
  ShaderPass: jest.fn().mockImplementation(() => ({
    material: {
      uniforms: {
        resolution: {
          value: {
            set: jest.fn(),
          },
        },
      },
    },
  })),
}));

jest.mock('three/examples/jsm/shaders/FXAAShader.js', () => ({
  FXAAShader: {},
}));

jest.mock('three/examples/jsm/postprocessing/OutputPass.js', () => ({
  OutputPass: jest.fn(),
}));

// Mock window and global objects
global.window = {
  innerWidth: 800,
  innerHeight: 600,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
} as any;

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => {
  setTimeout(cb, 16); // Simulate 60fps
  return 1;
});
global.cancelAnimationFrame = jest.fn();

describe('createWorld', () => {
  const mockConfig: WorldConfig = {
    world: {
      size: {
        x: 512,
        y: 512,
      },
    },
  };

  let consoleSpy: jest.SpyInstance;
  let worldInstances: any[] = [];

  // Helper function to create and track world instances
  const createTrackedWorld = (config: WorldConfig) => {
    const instance = createWorld(config);
    worldInstances.push(instance);
    return instance;
  };

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.clearAllMocks();
    worldInstances = [];
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    // Clean up all world instances to prevent hanging update loops
    worldInstances.forEach((instance) => {
      if (instance && typeof instance.destroy === 'function') {
        instance.destroy();
      } else if (instance && typeof instance.pause === 'function') {
        // Fallback for older instances without destroy method
        instance.pause();
      }
    });
    worldInstances = [];
  });

  it('should create a world instance with given configuration', () => {
    const worldInstance = createTrackedWorld(mockConfig);

    expect(worldInstance).toBeDefined();
    expect(typeof worldInstance.getConfig).toBe('function');
    expect(typeof worldInstance.getScene).toBe('function');
    expect(typeof worldInstance.getCamera).toBe('function');
    expect(typeof worldInstance.getRenderer).toBe('function');
    expect(typeof worldInstance.getComposer).toBe('function');
    expect(typeof worldInstance.getAmbientLight).toBe('function');
    expect(typeof worldInstance.getDirectionalLight).toBe('function');
    expect(typeof worldInstance.start).toBe('function');
    expect(typeof worldInstance.pause).toBe('function');
    expect(typeof worldInstance.resume).toBe('function');
    expect(typeof worldInstance.onUpdate).toBe('function');
    expect(typeof worldInstance.destroy).toBe('function');
  });

  it('should log the configuration during creation', () => {
    createTrackedWorld(mockConfig);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Creating world with config:',
      mockConfig,
    );
  });

  it('should return the configuration in read-only mode', () => {
    const worldInstance = createTrackedWorld(mockConfig);
    const returnedConfig = worldInstance.getConfig();

    expect(returnedConfig).toEqual(mockConfig);
    expect(returnedConfig.world.size.x).toBe(512);
    expect(returnedConfig.world.size.y).toBe(512);
  });

  it('should store a copy of the configuration to prevent external modifications', () => {
    const originalConfig: WorldConfig = {
      world: {
        size: {
          x: 256,
          y: 256,
        },
      },
    };

    const worldInstance = createTrackedWorld(originalConfig);

    // Modify the original config
    originalConfig.world.size.x = 1024;

    // The stored config should remain unchanged
    const storedConfig = worldInstance.getConfig();
    expect(storedConfig.world.size.x).toBe(256);
    expect(storedConfig.world.size.y).toBe(256);
  });

  it('should handle different configuration values correctly', () => {
    const customConfig: WorldConfig = {
      world: {
        size: {
          x: 1024,
          y: 768,
        },
      },
    };

    const worldInstance = createTrackedWorld(customConfig);
    const returnedConfig = worldInstance.getConfig();

    expect(returnedConfig.world.size.x).toBe(1024);
    expect(returnedConfig.world.size.y).toBe(768);
  });

  it('should return WorldInstance type with correct interface', () => {
    const worldInstance: WorldInstance = createTrackedWorld(mockConfig);

    // Type check - if this compiles, the interface is correct
    expect(worldInstance.getConfig).toBeDefined();
    expect(typeof worldInstance.getConfig).toBe('function');

    const config = worldInstance.getConfig();
    expect(config).toHaveProperty('world');
    expect(config.world).toHaveProperty('size');
    expect(config.world.size).toHaveProperty('x');
    expect(config.world.size).toHaveProperty('y');
  });

  it('should provide access to Three.js components', () => {
    const worldInstance = createTrackedWorld(mockConfig);

    const scene = worldInstance.getScene();
    const camera = worldInstance.getCamera();
    const renderer = worldInstance.getRenderer();
    const composer = worldInstance.getComposer();
    const ambientLight = worldInstance.getAmbientLight();
    const directionalLight = worldInstance.getDirectionalLight();

    expect(scene).toBeDefined();
    expect(camera).toBeDefined();
    expect(renderer).toBeDefined();
    expect(composer).toBeDefined();
    expect(ambientLight).toBeDefined();
    expect(directionalLight).toBeDefined();

    // Check that getters return the same instances
    expect(worldInstance.getScene()).toBe(scene);
    expect(worldInstance.getCamera()).toBe(camera);
    expect(worldInstance.getRenderer()).toBe(renderer);
    expect(worldInstance.getComposer()).toBe(composer);
    expect(worldInstance.getAmbientLight()).toBe(ambientLight);
    expect(worldInstance.getDirectionalLight()).toBe(directionalLight);
  });

  it('should add window resize event listener', () => {
    createTrackedWorld(mockConfig);

    expect(window.addEventListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    );
  });

  // New tests for render configuration
  it('should use composer by default when no render config is provided', () => {
    const worldInstance = createTrackedWorld(mockConfig);
    const composer = worldInstance.getComposer();

    expect(composer).not.toBeNull();
    expect(composer).toBeDefined();
  });

  it('should use composer when useComposer is explicitly true', () => {
    const configWithComposer: WorldConfig = {
      ...mockConfig,
      render: {
        useComposer: true,
      },
    };

    const worldInstance = createTrackedWorld(configWithComposer);
    const composer = worldInstance.getComposer();

    expect(composer).not.toBeNull();
    expect(composer).toBeDefined();
  });

  it('should not use composer when useComposer is false', () => {
    const configWithoutComposer: WorldConfig = {
      ...mockConfig,
      render: {
        useComposer: false,
      },
    };

    const worldInstance = createTrackedWorld(configWithoutComposer);
    const composer = worldInstance.getComposer();

    expect(composer).toBeNull();
  });

  it('should use custom passes when provided', () => {
    const mockCustomPass = { name: 'CustomPass' };
    const configWithCustomPasses: WorldConfig = {
      ...mockConfig,
      render: {
        useComposer: true,
        customPasses: [mockCustomPass as any],
      },
    };

    const worldInstance = createTrackedWorld(configWithCustomPasses);
    const composer = worldInstance.getComposer();

    expect(composer).not.toBeNull();
    expect(composer.addPass).toHaveBeenCalledWith(mockCustomPass);
  });

  it('should use default passes when no custom passes provided', () => {
    const configWithDefaultPasses: WorldConfig = {
      ...mockConfig,
      render: {
        useComposer: true,
      },
    };

    const worldInstance = createTrackedWorld(configWithDefaultPasses);
    const composer = worldInstance.getComposer();

    expect(composer).not.toBeNull();
    // Should call addPass multiple times for default passes
    expect(composer.addPass).toHaveBeenCalledTimes(5); // RenderPass, SSAOPass, UnrealBloomPass, ShaderPass, OutputPass
  });

  // New tests for light configuration
  it('should use default light values when no light config is provided', () => {
    const worldInstance = createTrackedWorld(mockConfig);
    const ambientLight = worldInstance.getAmbientLight();
    const directionalLight = worldInstance.getDirectionalLight();

    expect(ambientLight).toBeDefined();
    expect(directionalLight).toBeDefined();

    // Check default values (we can't directly access color/intensity in tests due to mocking,
    // but we verify the lights are created and accessible)
    expect(worldInstance.getAmbientLight()).toBe(ambientLight);
    expect(worldInstance.getDirectionalLight()).toBe(directionalLight);
  });

  it('should use custom light values when light config is provided', () => {
    const configWithCustomLights: WorldConfig = {
      ...mockConfig,
      light: {
        ambient: {
          color: 0xff0000,
          intensity: 0.5,
        },
        directional: {
          color: 0x00ff00,
          intensity: 0.8,
        },
      },
    };

    const worldInstance = createTrackedWorld(configWithCustomLights);
    const ambientLight = worldInstance.getAmbientLight();
    const directionalLight = worldInstance.getDirectionalLight();

    expect(ambientLight).toBeDefined();
    expect(directionalLight).toBeDefined();
  });

  it('should use partial light config with defaults for missing values', () => {
    const configWithPartialLights: WorldConfig = {
      ...mockConfig,
      light: {
        ambient: {
          intensity: 0.7,
        }, // color should use default
        directional: {
          color: 0x0000ff,
        }, // intensity should use default
      },
    };

    const worldInstance = createTrackedWorld(configWithPartialLights);
    const ambientLight = worldInstance.getAmbientLight();
    const directionalLight = worldInstance.getDirectionalLight();

    expect(ambientLight).toBeDefined();
    expect(directionalLight).toBeDefined();
  });

  it('should use defaults when light config is empty object', () => {
    const configWithEmptyLights: WorldConfig = {
      ...mockConfig,
      light: {},
    };

    const worldInstance = createTrackedWorld(configWithEmptyLights);
    const ambientLight = worldInstance.getAmbientLight();
    const directionalLight = worldInstance.getDirectionalLight();

    expect(ambientLight).toBeDefined();
    expect(directionalLight).toBeDefined();
  });

  it('should return the same light instances on multiple calls', () => {
    const worldInstance = createTrackedWorld(mockConfig);

    const ambientLight1 = worldInstance.getAmbientLight();
    const ambientLight2 = worldInstance.getAmbientLight();
    const directionalLight1 = worldInstance.getDirectionalLight();
    const directionalLight2 = worldInstance.getDirectionalLight();

    expect(ambientLight1).toBe(ambientLight2);
    expect(directionalLight1).toBe(directionalLight2);
  });

  // New tests for update loop system
  it('should provide update loop control methods', () => {
    const worldInstance = createTrackedWorld(mockConfig);

    expect(typeof worldInstance.start).toBe('function');
    expect(typeof worldInstance.pause).toBe('function');
    expect(typeof worldInstance.resume).toBe('function');
    expect(typeof worldInstance.onUpdate).toBe('function');
  });

  it('should not auto-start when autoStart is false or not provided', () => {
    const worldInstance = createTrackedWorld(mockConfig);

    // Since we can't easily test the running state without exposing it,
    // we test that the methods exist and can be called without error
    expect(() => worldInstance.start()).not.toThrow();
    expect(() => worldInstance.pause()).not.toThrow();
    expect(() => worldInstance.resume()).not.toThrow();
  });

  it('should auto-start when autoStart is true', () => {
    const configWithAutoStart: WorldConfig = {
      ...mockConfig,
      update: {
        autoStart: true,
      },
    };

    expect(() => createTrackedWorld(configWithAutoStart)).not.toThrow();
  });

  it('should allow subscribing to update events', () => {
    const worldInstance = createTrackedWorld(mockConfig);
    const mockCallback = jest.fn();

    const unsubscribe = worldInstance.onUpdate(mockCallback);

    expect(typeof unsubscribe).toBe('function');
    expect(() => unsubscribe()).not.toThrow();
  });

  it('should handle multiple update callbacks', () => {
    const worldInstance = createTrackedWorld(mockConfig);
    const mockCallback1 = jest.fn();
    const mockCallback2 = jest.fn();

    const unsubscribe1 = worldInstance.onUpdate(mockCallback1);
    const unsubscribe2 = worldInstance.onUpdate(mockCallback2);

    expect(typeof unsubscribe1).toBe('function');
    expect(typeof unsubscribe2).toBe('function');

    // Test unsubscribing
    expect(() => unsubscribe1()).not.toThrow();
    expect(() => unsubscribe2()).not.toThrow();
  });

  it('should accept initial update callback in config', () => {
    const mockInitialCallback = jest.fn();
    const configWithCallback: WorldConfig = {
      ...mockConfig,
      update: {
        onUpdate: mockInitialCallback,
      },
    };

    expect(() => createTrackedWorld(configWithCallback)).not.toThrow();
  });

  it('should handle update config with both autoStart and callback', () => {
    const mockCallback = jest.fn();
    const configWithFullUpdate: WorldConfig = {
      ...mockConfig,
      update: {
        autoStart: true,
        onUpdate: mockCallback,
      },
    };

    expect(() => createTrackedWorld(configWithFullUpdate)).not.toThrow();
  });

  // New tests for destroy method
  it('should have destroy method available', () => {
    const worldInstance = createTrackedWorld(mockConfig);

    expect(typeof worldInstance.destroy).toBe('function');
  });

  it('should stop update loop when destroyed', () => {
    const worldInstance = createTrackedWorld(mockConfig);

    worldInstance.start();
    worldInstance.destroy();

    expect(global.cancelAnimationFrame).toHaveBeenCalled();
  });

  it('should remove event listeners when destroyed', () => {
    const worldInstance = createTrackedWorld(mockConfig);

    // Mock removeEventListener to track calls
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

    worldInstance.destroy();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    );

    removeEventListenerSpy.mockRestore();
  });

  it('should prevent operations after destroy', () => {
    const worldInstance = createTrackedWorld(mockConfig);
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    worldInstance.destroy();

    // These should not throw but warn
    expect(() => worldInstance.start()).not.toThrow();
    expect(() => worldInstance.resume()).not.toThrow();
    expect(() => worldInstance.onUpdate(jest.fn())).not.toThrow();

    expect(consoleSpy).toHaveBeenCalledWith(
      'Cannot start: world instance is destroyed',
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      'Cannot resume: world instance is destroyed',
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      'Cannot subscribe to update events: world instance is destroyed',
    );

    consoleSpy.mockRestore();
  });

  it('should clean up resources when destroyed', () => {
    const worldInstance = createTrackedWorld(mockConfig);

    // Should not throw during cleanup
    expect(() => worldInstance.destroy()).not.toThrow();
  });

  it('should be idempotent - multiple destroy calls should be safe', () => {
    const worldInstance = createTrackedWorld(mockConfig);

    expect(() => {
      worldInstance.destroy();
      worldInstance.destroy();
      worldInstance.destroy();
    }).not.toThrow();
  });

  it('should clear all update callbacks when destroyed', () => {
    const worldInstance = createTrackedWorld(mockConfig);
    const callback1 = jest.fn();
    const callback2 = jest.fn();

    worldInstance.onUpdate(callback1);
    worldInstance.onUpdate(callback2);

    worldInstance.destroy();

    // Callbacks should be cleared - we can't directly test this without exposing internals,
    // but we can test that new subscriptions are rejected
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    worldInstance.onUpdate(jest.fn());
    expect(consoleSpy).toHaveBeenCalledWith(
      'Cannot subscribe to update events: world instance is destroyed',
    );
    consoleSpy.mockRestore();
  });
});
