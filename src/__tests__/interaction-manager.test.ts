import * as THREE from 'three';
import { createInteractionManager } from '../core/interactions/interaction-manager.js';
import type {
  InteractionManagerConfig,
  InteractableConfig,
  Interactable,
} from '../types/interactions.js';
import type { Unit } from '../types/units.js';

// Mock unit creator helper
const createMockUnit = (
  id: string,
  position: THREE.Vector3,
): Partial<Unit> => ({
  id,
  model: {
    position: position.clone(),
  } as THREE.Group,
});

describe('InteractionManager', () => {
  let interactionManager: ReturnType<typeof createInteractionManager>;

  beforeEach(() => {
    interactionManager = createInteractionManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should create with default configuration', () => {
      expect(interactionManager).toBeDefined();
      expect(interactionManager.addInteractable).toBeDefined();
      expect(interactionManager.checkCollisions).toBeDefined();
      expect(interactionManager.triggerInteraction).toBeDefined();
    });

    it('should create with custom configuration', () => {
      const config: InteractionManagerConfig = {
        enableCollision: false,
        enableInteraction: false,
        defaultCollisionRadius: 2.0,
        defaultInteractionRadius: 4.0,
      };

      const manager = createInteractionManager(config);
      expect(manager).toBeDefined();
    });
  });

  describe('Interactable Management', () => {
    it('should add an interactable', () => {
      const config: InteractableConfig = {
        id: 'tree-1',
        position: new THREE.Vector3(10, 0, 5),
        collisionRadius: 1.5,
        blocksMovement: true,
      };

      const interactable = interactionManager.addInteractable(config);

      expect(interactable).toBeDefined();
      expect(interactable.id).toBe('tree-1');
      expect(interactable.position.x).toBe(10);
      expect(interactable.position.y).toBe(0);
      expect(interactable.position.z).toBe(5);
      expect(interactable.collisionRadius).toBe(1.5);
      expect(interactable.blocksMovement).toBe(true);
      expect(interactable.isActive).toBe(true);
    });

    it('should add interactable with defaults', () => {
      const config: InteractableConfig = {
        id: 'item-1',
        position: new THREE.Vector3(0, 0, 0),
      };

      const interactable = interactionManager.addInteractable(config);

      expect(interactable.collisionRadius).toBe(1.0);
      expect(interactable.interactionRadius).toBe(2.0);
      expect(interactable.blocksMovement).toBe(true);
      expect(interactable.canInteract).toBe(false);
      expect(interactable.isActive).toBe(true);
    });

    it('should clone position to prevent external mutation', () => {
      const position = new THREE.Vector3(5, 0, 5);
      const config: InteractableConfig = {
        id: 'obj-1',
        position,
      };

      const interactable = interactionManager.addInteractable(config);

      // Mutate original position
      position.x = 100;

      // Interactable position should be unchanged
      expect(interactable.position.x).toBe(5);
    });

    it('should get interactable by ID', () => {
      const config: InteractableConfig = {
        id: 'chest-1',
        position: new THREE.Vector3(0, 0, 0),
      };

      interactionManager.addInteractable(config);
      const retrieved = interactionManager.getInteractable('chest-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('chest-1');
    });

    it('should return undefined for non-existent ID', () => {
      const retrieved = interactionManager.getInteractable('non-existent');
      expect(retrieved).toBeUndefined();
    });

    it('should remove interactable', () => {
      const config: InteractableConfig = {
        id: 'rock-1',
        position: new THREE.Vector3(0, 0, 0),
      };

      interactionManager.addInteractable(config);
      const removed = interactionManager.removeInteractable('rock-1');

      expect(removed).toBe(true);
      expect(interactionManager.getInteractable('rock-1')).toBeUndefined();
    });

    it('should return false when removing non-existent interactable', () => {
      const removed = interactionManager.removeInteractable('non-existent');
      expect(removed).toBe(false);
    });

    it('should get all interactables', () => {
      interactionManager.addInteractable({
        id: 'obj-1',
        position: new THREE.Vector3(0, 0, 0),
      });
      interactionManager.addInteractable({
        id: 'obj-2',
        position: new THREE.Vector3(5, 0, 5),
        isActive: false,
      });

      const all = interactionManager.getAllInteractables();
      expect(all).toHaveLength(2);
    });

    it('should get only active interactables', () => {
      interactionManager.addInteractable({
        id: 'obj-1',
        position: new THREE.Vector3(0, 0, 0),
        isActive: true,
      });
      interactionManager.addInteractable({
        id: 'obj-2',
        position: new THREE.Vector3(5, 0, 5),
        isActive: false,
      });

      const active = interactionManager.getActiveInteractables();
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe('obj-1');
    });

    it('should clear all interactables', () => {
      interactionManager.addInteractable({
        id: 'obj-1',
        position: new THREE.Vector3(0, 0, 0),
      });
      interactionManager.addInteractable({
        id: 'obj-2',
        position: new THREE.Vector3(5, 0, 5),
      });

      interactionManager.clear();

      expect(interactionManager.getAllInteractables()).toHaveLength(0);
    });
  });

  describe('Collision Detection', () => {
    it('should detect collision and push unit away', () => {
      const interactable = interactionManager.addInteractable({
        id: 'wall-1',
        position: new THREE.Vector3(10, 0, 10),
        collisionRadius: 2.0,
        blocksMovement: true,
      });

      const unit = createMockUnit('unit-1', new THREE.Vector3(10, 0, 10.5));
      interactionManager.checkCollisions([unit as Unit]);

      // Unit should be pushed away from interactable
      expect(unit.model!.position.z).toBeGreaterThan(10.5);
    });

    it('should not push unit outside collision radius', () => {
      interactionManager.addInteractable({
        id: 'wall-1',
        position: new THREE.Vector3(10, 0, 10),
        collisionRadius: 2.0,
        blocksMovement: true,
      });

      const originalPos = new THREE.Vector3(15, 0, 15);
      const unit = createMockUnit('unit-1', originalPos.clone());
      interactionManager.checkCollisions([unit as Unit]);

      // Unit should stay in place (outside collision radius)
      expect(unit.model!.position.x).toBe(15);
      expect(unit.model!.position.z).toBe(15);
    });

    it('should skip non-blocking interactables', () => {
      interactionManager.addInteractable({
        id: 'item-1',
        position: new THREE.Vector3(10, 0, 10),
        collisionRadius: 2.0,
        blocksMovement: false,
      });

      const originalPos = new THREE.Vector3(10, 0, 10);
      const unit = createMockUnit('unit-1', originalPos.clone());
      interactionManager.checkCollisions([unit as Unit]);

      // Unit should not be pushed (non-blocking)
      expect(unit.model!.position.x).toBe(10);
      expect(unit.model!.position.z).toBe(10);
    });

    it('should skip inactive interactables', () => {
      interactionManager.addInteractable({
        id: 'wall-1',
        position: new THREE.Vector3(10, 0, 10),
        collisionRadius: 2.0,
        blocksMovement: true,
        isActive: false,
      });

      const originalPos = new THREE.Vector3(10, 0, 10);
      const unit = createMockUnit('unit-1', originalPos.clone());
      interactionManager.checkCollisions([unit as Unit]);

      // Unit should not be pushed (inactive)
      expect(unit.model!.position.x).toBe(10);
      expect(unit.model!.position.z).toBe(10);
    });

    it('should call onCollision callback', () => {
      const onCollision = jest.fn();

      interactionManager.addInteractable({
        id: 'wall-1',
        position: new THREE.Vector3(10, 0, 10),
        collisionRadius: 2.0,
        blocksMovement: true,
        onCollision,
      });

      const unit = createMockUnit('unit-1', new THREE.Vector3(10, 0, 10.5));
      interactionManager.checkCollisions([unit as Unit]);

      expect(onCollision).toHaveBeenCalledTimes(1);
      expect(onCollision).toHaveBeenCalledWith(unit, expect.any(Object));
    });

    it('should handle multiple units', () => {
      interactionManager.addInteractable({
        id: 'wall-1',
        position: new THREE.Vector3(10, 0, 10),
        collisionRadius: 2.0,
        blocksMovement: true,
      });

      const unit1 = createMockUnit('unit-1', new THREE.Vector3(10, 0, 10.5));
      const unit2 = createMockUnit('unit-2', new THREE.Vector3(10.5, 0, 10));

      interactionManager.checkCollisions([unit1 as Unit, unit2 as Unit]);

      // Both units should be pushed
      expect(unit1.model!.position.z).toBeGreaterThan(10.5);
      expect(unit2.model!.position.x).toBeGreaterThan(10.5);
    });

    it('should respect collision enabled flag', () => {
      interactionManager.addInteractable({
        id: 'wall-1',
        position: new THREE.Vector3(10, 0, 10),
        collisionRadius: 2.0,
        blocksMovement: true,
      });

      interactionManager.setCollisionEnabled(false);

      const originalPos = new THREE.Vector3(10, 0, 10);
      const unit = createMockUnit('unit-1', originalPos.clone());
      interactionManager.checkCollisions([unit as Unit]);

      // Unit should not be pushed (collision disabled)
      expect(unit.model!.position.x).toBe(10);
      expect(unit.model!.position.z).toBe(10);
    });
  });

  describe('Interaction Detection', () => {
    it('should detect nearby interactables', () => {
      interactionManager.addInteractable({
        id: 'chest-1',
        position: new THREE.Vector3(10, 0, 10),
        interactionRadius: 3.0,
        canInteract: true,
      });

      const unit = createMockUnit('unit-1', new THREE.Vector3(11, 0, 11));
      const nearby = interactionManager.checkInteractions(unit as Unit);

      expect(nearby).toHaveLength(1);
      expect(nearby[0].id).toBe('chest-1');
    });

    it('should not detect distant interactables', () => {
      interactionManager.addInteractable({
        id: 'chest-1',
        position: new THREE.Vector3(10, 0, 10),
        interactionRadius: 3.0,
        canInteract: true,
      });

      const unit = createMockUnit('unit-1', new THREE.Vector3(20, 0, 20));
      const nearby = interactionManager.checkInteractions(unit as Unit);

      expect(nearby).toHaveLength(0);
    });

    it('should skip non-interactable objects', () => {
      interactionManager.addInteractable({
        id: 'tree-1',
        position: new THREE.Vector3(10, 0, 10),
        interactionRadius: 3.0,
        canInteract: false,
      });

      const unit = createMockUnit('unit-1', new THREE.Vector3(11, 0, 11));
      const nearby = interactionManager.checkInteractions(unit as Unit);

      expect(nearby).toHaveLength(0);
    });

    it('should skip inactive interactables', () => {
      interactionManager.addInteractable({
        id: 'chest-1',
        position: new THREE.Vector3(10, 0, 10),
        interactionRadius: 3.0,
        canInteract: true,
        isActive: false,
      });

      const unit = createMockUnit('unit-1', new THREE.Vector3(11, 0, 11));
      const nearby = interactionManager.checkInteractions(unit as Unit);

      expect(nearby).toHaveLength(0);
    });

    it('should respect interaction enabled flag', () => {
      interactionManager.addInteractable({
        id: 'chest-1',
        position: new THREE.Vector3(10, 0, 10),
        interactionRadius: 3.0,
        canInteract: true,
      });

      interactionManager.setInteractionEnabled(false);

      const unit = createMockUnit('unit-1', new THREE.Vector3(11, 0, 11));
      const nearby = interactionManager.checkInteractions(unit as Unit);

      expect(nearby).toHaveLength(0);
    });
  });

  describe('Trigger Interaction', () => {
    it('should trigger interaction callback', () => {
      const onInteract = jest.fn();

      interactionManager.addInteractable({
        id: 'chest-1',
        position: new THREE.Vector3(10, 0, 10),
        interactionRadius: 3.0,
        canInteract: true,
        onInteract,
      });

      const unit = createMockUnit('unit-1', new THREE.Vector3(11, 0, 11));
      const count = interactionManager.triggerInteraction(unit as Unit);

      expect(count).toBe(1);
      expect(onInteract).toHaveBeenCalledTimes(1);
      expect(onInteract).toHaveBeenCalledWith(unit, expect.any(Object));
    });

    it('should trigger multiple interactions', () => {
      const onInteract1 = jest.fn();
      const onInteract2 = jest.fn();

      interactionManager.addInteractable({
        id: 'chest-1',
        position: new THREE.Vector3(10, 0, 10),
        interactionRadius: 5.0,
        canInteract: true,
        onInteract: onInteract1,
      });

      interactionManager.addInteractable({
        id: 'chest-2',
        position: new THREE.Vector3(12, 0, 12),
        interactionRadius: 5.0,
        canInteract: true,
        onInteract: onInteract2,
      });

      const unit = createMockUnit('unit-1', new THREE.Vector3(11, 0, 11));
      const count = interactionManager.triggerInteraction(unit as Unit);

      expect(count).toBe(2);
      expect(onInteract1).toHaveBeenCalledTimes(1);
      expect(onInteract2).toHaveBeenCalledTimes(1);
    });

    it('should not trigger without callback', () => {
      interactionManager.addInteractable({
        id: 'chest-1',
        position: new THREE.Vector3(10, 0, 10),
        interactionRadius: 3.0,
        canInteract: true,
        // No onInteract callback
      });

      const unit = createMockUnit('unit-1', new THREE.Vector3(11, 0, 11));
      const count = interactionManager.triggerInteraction(unit as Unit);

      expect(count).toBe(0);
    });

    it('should return 0 when no nearby interactables', () => {
      interactionManager.addInteractable({
        id: 'chest-1',
        position: new THREE.Vector3(10, 0, 10),
        interactionRadius: 3.0,
        canInteract: true,
        onInteract: jest.fn(),
      });

      const unit = createMockUnit('unit-1', new THREE.Vector3(50, 0, 50));
      const count = interactionManager.triggerInteraction(unit as Unit);

      expect(count).toBe(0);
    });

    it('should respect interaction enabled flag', () => {
      const onInteract = jest.fn();

      interactionManager.addInteractable({
        id: 'chest-1',
        position: new THREE.Vector3(10, 0, 10),
        interactionRadius: 3.0,
        canInteract: true,
        onInteract,
      });

      interactionManager.setInteractionEnabled(false);

      const unit = createMockUnit('unit-1', new THREE.Vector3(11, 0, 11));
      const count = interactionManager.triggerInteraction(unit as Unit);

      expect(count).toBe(0);
      expect(onInteract).not.toHaveBeenCalled();
    });
  });

  describe('User Data', () => {
    it('should store custom user data', () => {
      const userData = {
        type: 'chest',
        contents: ['sword', 'potion'],
        isOpen: false,
      };

      const interactable = interactionManager.addInteractable({
        id: 'chest-1',
        position: new THREE.Vector3(10, 0, 10),
        userData,
      });

      expect(interactable.userData).toEqual(userData);
      expect(interactable.userData.type).toBe('chest');
      expect(interactable.userData.contents).toHaveLength(2);
    });

    it('should allow userData modification through interaction', () => {
      const interactable = interactionManager.addInteractable({
        id: 'chest-1',
        position: new THREE.Vector3(10, 0, 10),
        canInteract: true,
        interactionRadius: 3.0,
        userData: { isOpen: false },
        onInteract: (_, interactable) => {
          interactable.userData.isOpen = true;
        },
      });

      const unit = createMockUnit('unit-1', new THREE.Vector3(11, 0, 11));
      interactionManager.triggerInteraction(unit as Unit);

      expect(interactable.userData.isOpen).toBe(true);
    });
  });

  describe('Object3D Reference', () => {
    it('should store Three.js object reference', () => {
      const object3D = new THREE.Mesh();

      const interactable = interactionManager.addInteractable({
        id: 'obj-1',
        position: new THREE.Vector3(10, 0, 10),
        object3D,
      });

      expect(interactable.object3D).toBe(object3D);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle collectible item pattern', () => {
      const onInteract = jest.fn((_, interactable) => {
        interactable.isActive = false;
      });

      const interactable = interactionManager.addInteractable({
        id: 'apple-1',
        position: new THREE.Vector3(10, 0, 10),
        collisionRadius: 0.5,
        interactionRadius: 2.0,
        canInteract: true,
        blocksMovement: false,
        onInteract,
      });

      const unit = createMockUnit('unit-1', new THREE.Vector3(10.5, 0, 10));

      // First interaction should work
      let count = interactionManager.triggerInteraction(unit as Unit);
      expect(count).toBe(1);
      expect(interactable.isActive).toBe(false);

      // Second interaction should not work (inactive)
      count = interactionManager.triggerInteraction(unit as Unit);
      expect(count).toBe(0);
      expect(onInteract).toHaveBeenCalledTimes(1);
    });

    it('should handle door pattern', () => {
      const interactable = interactionManager.addInteractable({
        id: 'door-1',
        position: new THREE.Vector3(10, 0, 10),
        collisionRadius: 1.0,
        interactionRadius: 2.0,
        canInteract: true,
        blocksMovement: true,
        userData: { isOpen: false },
        onInteract: (_, interactable) => {
          interactable.userData.isOpen = !interactable.userData.isOpen;
          interactable.blocksMovement = !interactable.userData.isOpen;
        },
      });

      const unit = createMockUnit('unit-1', new THREE.Vector3(11, 0, 11));

      // Open door
      interactionManager.triggerInteraction(unit as Unit);
      expect(interactable.userData.isOpen).toBe(true);
      expect(interactable.blocksMovement).toBe(false);

      // Close door
      interactionManager.triggerInteraction(unit as Unit);
      expect(interactable.userData.isOpen).toBe(false);
      expect(interactable.blocksMovement).toBe(true);
    });

    it('should handle trigger zone pattern', () => {
      const onCollision = jest.fn((_, interactable) => {
        if (!interactable.userData.triggered) {
          interactable.userData.triggered = true;
        }
      });

      const interactable = interactionManager.addInteractable({
        id: 'checkpoint-1',
        position: new THREE.Vector3(10, 0, 10),
        collisionRadius: 3.0,
        blocksMovement: true, // Must block movement for collision callback to trigger
        userData: { triggered: false },
        onCollision,
      });

      const unit = createMockUnit('unit-1', new THREE.Vector3(10.5, 0, 10));

      // First collision should trigger
      interactionManager.checkCollisions([unit as Unit]);
      expect(interactable.userData.triggered).toBe(true);

      // Subsequent collisions should be handled by callback logic
      interactionManager.checkCollisions([unit as Unit]);
      expect(onCollision).toHaveBeenCalledTimes(2);
    });
  });
});
