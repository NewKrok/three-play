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
} as any;

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

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should create a world instance with given configuration', () => {
    const worldInstance = createWorld(mockConfig);

    expect(worldInstance).toBeDefined();
    expect(typeof worldInstance.getConfig).toBe('function');
    expect(typeof worldInstance.getScene).toBe('function');
    expect(typeof worldInstance.getCamera).toBe('function');
    expect(typeof worldInstance.getRenderer).toBe('function');
    expect(typeof worldInstance.getComposer).toBe('function');
  });

  it('should log the configuration during creation', () => {
    createWorld(mockConfig);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Creating world with config:',
      mockConfig,
    );
  });

  it('should return the configuration in read-only mode', () => {
    const worldInstance = createWorld(mockConfig);
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

    const worldInstance = createWorld(originalConfig);

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

    const worldInstance = createWorld(customConfig);
    const returnedConfig = worldInstance.getConfig();

    expect(returnedConfig.world.size.x).toBe(1024);
    expect(returnedConfig.world.size.y).toBe(768);
  });

  it('should return WorldInstance type with correct interface', () => {
    const worldInstance: WorldInstance = createWorld(mockConfig);

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
    const worldInstance = createWorld(mockConfig);

    const scene = worldInstance.getScene();
    const camera = worldInstance.getCamera();
    const renderer = worldInstance.getRenderer();
    const composer = worldInstance.getComposer();

    expect(scene).toBeDefined();
    expect(camera).toBeDefined();
    expect(renderer).toBeDefined();
    expect(composer).toBeDefined();

    // Check that getters return the same instances
    expect(worldInstance.getScene()).toBe(scene);
    expect(worldInstance.getCamera()).toBe(camera);
    expect(worldInstance.getRenderer()).toBe(renderer);
    expect(worldInstance.getComposer()).toBe(composer);
  });

  it('should add window resize event listener', () => {
    createWorld(mockConfig);

    expect(window.addEventListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    );
  });

  // New tests for render configuration
  it('should use composer by default when no render config is provided', () => {
    const worldInstance = createWorld(mockConfig);
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

    const worldInstance = createWorld(configWithComposer);
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

    const worldInstance = createWorld(configWithoutComposer);
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

    const worldInstance = createWorld(configWithCustomPasses);
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

    const worldInstance = createWorld(configWithDefaultPasses);
    const composer = worldInstance.getComposer();

    expect(composer).not.toBeNull();
    // Should call addPass multiple times for default passes
    expect(composer.addPass).toHaveBeenCalledTimes(5); // RenderPass, SSAOPass, UnrealBloomPass, ShaderPass, OutputPass
  });
});
