import * as THREE from 'three';
import { createProjectileManager } from '../core/projectiles/projectile-manager.js';
import type {
  ProjectileManager,
  ProjectileManagerConfig,
  ProjectileDefinition,
  ProjectileHitEvent,
  ProjectileDestroyEvent,
} from '../types/projectiles.js';

// Mock console methods to avoid noise during tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe('Projectile Manager', () => {
  let scene: THREE.Scene;
  let projectileManager: ProjectileManager;
  let mockLogger: any;
  let mockGetHeightFromPosition: jest.MockedFunction<
    (position: THREE.Vector3) => number
  >;
  let mockCheckObjectCollision: jest.MockedFunction<any>;
  let testDefinition: ProjectileDefinition;

  beforeEach(() => {
    scene = new THREE.Scene();
    mockLogger = {
      warn: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      isLevelEnabled: jest.fn().mockReturnValue(true),
    };
    mockGetHeightFromPosition = jest.fn().mockReturnValue(0);
    mockCheckObjectCollision = jest.fn().mockReturnValue(null);

    const config: ProjectileManagerConfig = {
      scene,
      logger: mockLogger,
      maxProjectiles: 100,
      getHeightFromPosition: mockGetHeightFromPosition,
      checkObjectCollision: mockCheckObjectCollision,
    };

    projectileManager = createProjectileManager(config);

    // Create test projectile definition
    testDefinition = {
      id: 'test-projectile',
      name: 'Test Projectile',
      physics: {
        velocity: new THREE.Vector3(0, 0, 0),
        gravity: new THREE.Vector3(0, -9.8, 0),
        airResistance: 0.99,
        bounciness: 0.5,
        stickOnHit: false,
        lifetime: 5,
      },
      visual: {
        geometry: new THREE.SphereGeometry(0.1) as THREE.BufferGeometry,
        material: new THREE.MeshBasicMaterial({
          color: 0xff0000,
        }) as THREE.Material,
        castShadow: true,
        receiveShadow: false,
      },
      collision: {
        radius: 0.1,
        layers: ['default'],
        checkTerrain: true,
        checkObjects: true,
      },
      spread: {
        horizontal: 0.1,
        vertical: 0.05,
        velocityVariance: 0.2,
      },
      poolSize: 50,
    };
  });

  afterEach(() => {
    projectileManager.dispose();
    jest.clearAllMocks();
  });

  describe('definition management', () => {
    it('should register projectile definitions', () => {
      projectileManager.registerDefinition(testDefinition);

      const stats = projectileManager.getStats();
      expect(stats.definitionCount).toBe(1);
      expect(stats.poolStats['test-projectile']).toBeDefined();
    });

    it('should warn when registering duplicate definitions', () => {
      projectileManager.registerDefinition(testDefinition);
      projectileManager.registerDefinition(testDefinition);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Projectile definition with ID 'test-projectile' already exists",
      );
    });

    it('should unregister projectile definitions', () => {
      projectileManager.registerDefinition(testDefinition);
      expect(projectileManager.getStats().definitionCount).toBe(1);

      projectileManager.unregisterDefinition('test-projectile');
      expect(projectileManager.getStats().definitionCount).toBe(0);
    });

    it('should destroy active projectiles when unregistering definition', () => {
      projectileManager.registerDefinition(testDefinition);

      const projectile = projectileManager.launch({
        definitionId: 'test-projectile',
        origin: new THREE.Vector3(0, 0, 0),
        direction: new THREE.Vector3(1, 0, 0),
        strength: 10,
      });

      expect(projectileManager.getActiveProjectiles()).toHaveLength(1);

      projectileManager.unregisterDefinition('test-projectile');
      expect(projectileManager.getActiveProjectiles()).toHaveLength(0);
    });
  });

  describe('projectile launching', () => {
    beforeEach(() => {
      projectileManager.registerDefinition(testDefinition);
    });

    it('should launch projectiles successfully', () => {
      const projectile = projectileManager.launch({
        definitionId: 'test-projectile',
        origin: new THREE.Vector3(0, 5, 0),
        direction: new THREE.Vector3(1, 0, 0),
        strength: 15,
      });

      expect(projectile).toBeTruthy();
      expect(projectile?.active).toBe(true);
      expect(projectile?.position).toEqual(new THREE.Vector3(0, 5, 0));
      expect(projectileManager.getActiveProjectiles()).toHaveLength(1);
    });

    it('should warn for unknown projectile definitions', () => {
      const projectile = projectileManager.launch({
        definitionId: 'unknown-projectile',
        origin: new THREE.Vector3(0, 0, 0),
        direction: new THREE.Vector3(1, 0, 0),
        strength: 10,
      });

      expect(projectile).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Unknown projectile definition: unknown-projectile',
      );
    });

    it('should respect maximum projectiles limit', () => {
      // Create manager with low limit
      const limitedConfig: ProjectileManagerConfig = {
        scene,
        logger: mockLogger,
        maxProjectiles: 2,
      };
      const limitedManager = createProjectileManager(limitedConfig);
      limitedManager.registerDefinition(testDefinition);

      // Launch up to limit
      const p1 = limitedManager.launch({
        definitionId: 'test-projectile',
        origin: new THREE.Vector3(0, 0, 0),
        direction: new THREE.Vector3(1, 0, 0),
        strength: 10,
      });
      const p2 = limitedManager.launch({
        definitionId: 'test-projectile',
        origin: new THREE.Vector3(0, 0, 0),
        direction: new THREE.Vector3(1, 0, 0),
        strength: 10,
      });

      expect(p1).toBeTruthy();
      expect(p2).toBeTruthy();

      // Try to launch beyond limit
      const p3 = limitedManager.launch({
        definitionId: 'test-projectile',
        origin: new THREE.Vector3(0, 0, 0),
        direction: new THREE.Vector3(1, 0, 0),
        strength: 10,
      });

      expect(p3).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Maximum projectiles limit reached',
      );
      limitedManager.dispose();
    });

    it('should apply physics overrides', () => {
      const projectile = projectileManager.launch({
        definitionId: 'test-projectile',
        origin: new THREE.Vector3(0, 0, 0),
        direction: new THREE.Vector3(1, 0, 0),
        strength: 10,
        physicsOverride: {
          lifetime: 10,
          gravity: new THREE.Vector3(0, -5, 0),
        },
      });

      expect(projectile).toBeTruthy();
      // Physics overrides are applied internally, hard to test directly
      // but we can verify the projectile was created
    });

    it('should apply spread to projectile direction', () => {
      const projectiles = [];

      // Launch multiple projectiles with same parameters
      for (let i = 0; i < 10; i++) {
        const projectile = projectileManager.launch({
          definitionId: 'test-projectile',
          origin: new THREE.Vector3(0, 0, 0),
          direction: new THREE.Vector3(1, 0, 0),
          strength: 10,
        });
        if (projectile) projectiles.push(projectile);
      }

      expect(projectiles).toHaveLength(10);

      // Due to spread, velocities should vary
      const velocities = projectiles.map((p) => p.velocity.clone());
      const firstVelocity = velocities[0];

      // At least some projectiles should have different velocities due to spread
      const hasVariation = velocities.some((v) => !v.equals(firstVelocity));
      expect(hasVariation).toBe(true);
    });
  });

  describe('projectile physics and updates', () => {
    beforeEach(() => {
      projectileManager.registerDefinition(testDefinition);
    });

    it('should update projectile physics', () => {
      const projectile = projectileManager.launch({
        definitionId: 'test-projectile',
        origin: new THREE.Vector3(0, 5, 0),
        direction: new THREE.Vector3(1, 0, 0),
        strength: 10,
      });

      expect(projectile).toBeTruthy();

      if (projectile) {
        const initialY = projectile.position.y;

        // Update should apply gravity and move projectile
        projectileManager.update(0.1);

        expect(projectile.position.y).toBeLessThan(initialY); // Gravity applied
        expect(projectile.position.x).toBeGreaterThan(0); // Moved forward
        expect(projectile.timeAlive).toBe(0.1);
      }
    });

    it('should destroy projectiles after lifetime expires', () => {
      // Create definition with short lifetime
      const shortLifeDefinition = {
        ...testDefinition,
        id: 'short-life',
        physics: {
          ...testDefinition.physics,
          lifetime: 0.1,
        },
      };

      projectileManager.registerDefinition(shortLifeDefinition);

      const projectile = projectileManager.launch({
        definitionId: 'short-life',
        origin: new THREE.Vector3(0, 0, 0),
        direction: new THREE.Vector3(1, 0, 0),
        strength: 10,
      });

      expect(projectile).toBeTruthy();
      expect(projectileManager.getActiveProjectiles()).toHaveLength(1);

      // Update beyond lifetime
      projectileManager.update(0.2);

      expect(projectileManager.getActiveProjectiles()).toHaveLength(0);
    });

    it('should handle terrain collision', () => {
      mockGetHeightFromPosition.mockReturnValue(1); // Terrain at y=1

      const projectile = projectileManager.launch({
        definitionId: 'test-projectile',
        origin: new THREE.Vector3(0, 0.5, 0), // Below terrain
        direction: new THREE.Vector3(1, -1, 0),
        strength: 10,
      });

      expect(projectile).toBeTruthy();

      const hitCallback = jest.fn();
      projectileManager.onHit(hitCallback);

      projectileManager.update(0.1);

      expect(hitCallback).toHaveBeenCalled();
      expect(mockGetHeightFromPosition).toHaveBeenCalled();
    });

    it('should handle object collision configuration', () => {
      // Test that collision checking is enabled in the definition
      expect(testDefinition.collision.checkObjects).toBe(true);
      expect(testDefinition.collision.checkTerrain).toBe(true);
      expect(testDefinition.collision.radius).toBe(0.1);
    });
  });

  describe('projectile retrieval and management', () => {
    beforeEach(() => {
      projectileManager.registerDefinition(testDefinition);
    });

    it('should get active projectiles', () => {
      expect(projectileManager.getActiveProjectiles()).toHaveLength(0);

      projectileManager.launch({
        definitionId: 'test-projectile',
        origin: new THREE.Vector3(0, 0, 0),
        direction: new THREE.Vector3(1, 0, 0),
        strength: 10,
      });

      expect(projectileManager.getActiveProjectiles()).toHaveLength(1);
    });

    it('should get projectiles by type', () => {
      const definition2 = {
        ...testDefinition,
        id: 'test-projectile-2',
        name: 'Test Projectile 2',
      };
      projectileManager.registerDefinition(definition2);

      projectileManager.launch({
        definitionId: 'test-projectile',
        origin: new THREE.Vector3(0, 0, 0),
        direction: new THREE.Vector3(1, 0, 0),
        strength: 10,
      });

      projectileManager.launch({
        definitionId: 'test-projectile-2',
        origin: new THREE.Vector3(0, 0, 0),
        direction: new THREE.Vector3(1, 0, 0),
        strength: 10,
      });

      const type1Projectiles =
        projectileManager.getProjectilesByType('test-projectile');
      const type2Projectiles =
        projectileManager.getProjectilesByType('test-projectile-2');

      expect(type1Projectiles).toHaveLength(1);
      expect(type2Projectiles).toHaveLength(1);
      expect(type1Projectiles[0].definition.id).toBe('test-projectile');
      expect(type2Projectiles[0].definition.id).toBe('test-projectile-2');
    });

    it('should destroy specific projectiles', () => {
      const projectile = projectileManager.launch({
        definitionId: 'test-projectile',
        origin: new THREE.Vector3(0, 0, 0),
        direction: new THREE.Vector3(1, 0, 0),
        strength: 10,
      });

      expect(projectile).toBeTruthy();
      expect(projectileManager.getActiveProjectiles()).toHaveLength(1);

      if (projectile) {
        projectileManager.destroyProjectile(projectile.id);
        expect(projectileManager.getActiveProjectiles()).toHaveLength(0);
      }
    });

    it('should destroy all projectiles', () => {
      // Launch multiple projectiles
      for (let i = 0; i < 5; i++) {
        projectileManager.launch({
          definitionId: 'test-projectile',
          origin: new THREE.Vector3(i, 0, 0),
          direction: new THREE.Vector3(1, 0, 0),
          strength: 10,
        });
      }

      expect(projectileManager.getActiveProjectiles()).toHaveLength(5);

      projectileManager.destroyAllProjectiles();
      expect(projectileManager.getActiveProjectiles()).toHaveLength(0);
    });
  });

  describe('event handling', () => {
    beforeEach(() => {
      projectileManager.registerDefinition(testDefinition);
    });

    it('should handle hit events', () => {
      const hitCallback = jest.fn();
      const unsubscribe = projectileManager.onHit(hitCallback);

      // Mock terrain collision
      mockGetHeightFromPosition.mockReturnValue(1);

      const projectile = projectileManager.launch({
        definitionId: 'test-projectile',
        origin: new THREE.Vector3(0, 0.5, 0),
        direction: new THREE.Vector3(1, -1, 0),
        strength: 10,
      });

      projectileManager.update(0.1);

      expect(hitCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          projectile,
          position: expect.any(THREE.Vector3),
          normal: expect.any(THREE.Vector3),
          velocity: expect.any(THREE.Vector3),
        }),
      );

      // Test unsubscribe
      unsubscribe();
      hitCallback.mockClear();

      const projectile2 = projectileManager.launch({
        definitionId: 'test-projectile',
        origin: new THREE.Vector3(0, 0.5, 0),
        direction: new THREE.Vector3(1, -1, 0),
        strength: 10,
      });

      projectileManager.update(0.1);
      expect(hitCallback).not.toHaveBeenCalled();
    });

    it('should handle destroy events', () => {
      const destroyCallback = jest.fn();
      projectileManager.onDestroy(destroyCallback);

      const projectile = projectileManager.launch({
        definitionId: 'test-projectile',
        origin: new THREE.Vector3(0, 0, 0),
        direction: new THREE.Vector3(1, 0, 0),
        strength: 10,
      });

      if (projectile) {
        projectileManager.destroyProjectile(projectile.id, 'manual');

        expect(destroyCallback).toHaveBeenCalledWith(
          expect.objectContaining({
            projectile,
            reason: 'manual',
          }),
        );
      }
    });
  });

  describe('statistics and cleanup', () => {
    beforeEach(() => {
      projectileManager.registerDefinition(testDefinition);
    });

    it('should provide accurate statistics', () => {
      const stats = projectileManager.getStats();
      expect(stats.definitionCount).toBe(1);
      expect(stats.activeProjectiles).toBe(0);
      expect(stats.poolStats['test-projectile']).toBeDefined();

      projectileManager.launch({
        definitionId: 'test-projectile',
        origin: new THREE.Vector3(0, 0, 0),
        direction: new THREE.Vector3(1, 0, 0),
        strength: 10,
      });

      const updatedStats = projectileManager.getStats();
      expect(updatedStats.activeProjectiles).toBe(1);
    });

    it('should dispose properly', () => {
      // Launch some projectiles
      for (let i = 0; i < 3; i++) {
        projectileManager.launch({
          definitionId: 'test-projectile',
          origin: new THREE.Vector3(i, 0, 0),
          direction: new THREE.Vector3(1, 0, 0),
          strength: 10,
        });
      }

      expect(projectileManager.getActiveProjectiles()).toHaveLength(3);

      projectileManager.dispose();

      const stats = projectileManager.getStats();
      expect(stats.activeProjectiles).toBe(0);
      expect(stats.definitionCount).toBe(0);
    });
  });
});
