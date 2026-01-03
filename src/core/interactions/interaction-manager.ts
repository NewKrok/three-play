import * as THREE from 'three';
import type {
  InteractionManagerConfig,
  InteractionManager,
  InteractableConfig,
  Interactable,
} from '../../types/interactions.js';
import type { Unit } from '../../types/units.js';

const DEFAULT_CONFIG: Required<InteractionManagerConfig> = {
  enableCollision: true,
  enableInteraction: true,
  defaultCollisionRadius: 1.0,
  defaultInteractionRadius: 2.0,
};

/**
 * Create an interaction manager for handling world object interactions
 * @param config - Configuration for the interaction manager
 * @returns InteractionManager instance
 *
 * @example
 * ```typescript
 * const interactionManager = createInteractionManager({
 *   enableCollision: true,
 *   enableInteraction: true,
 * });
 *
 * // Add a tree with collision
 * interactionManager.addInteractable({
 *   id: 'tree-1',
 *   position: new THREE.Vector3(10, 0, 5),
 *   collisionRadius: 1.5,
 *   blocksMovement: true,
 * });
 *
 * // Add a crate with interaction
 * interactionManager.addInteractable({
 *   id: 'crate-1',
 *   position: new THREE.Vector3(15, 0, 10),
 *   collisionRadius: 0.5,
 *   interactionRadius: 2.0,
 *   canInteract: true,
 *   onInteract: (unit, interactable) => {
 *     console.log('Opened crate!');
 *     interactable.isActive = false;
 *   },
 * });
 *
 * // In your update loop
 * interactionManager.checkCollisions(allUnits);
 *
 * // When player presses interact key
 * interactionManager.triggerInteraction(playerUnit);
 * ```
 */
export const createInteractionManager = (
  config: InteractionManagerConfig = {},
): InteractionManager => {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const interactables = new Map<string, Interactable>();

  let collisionEnabled = fullConfig.enableCollision;
  let interactionEnabled = fullConfig.enableInteraction;

  /**
   * Add an interactable object
   */
  const addInteractable = (config: InteractableConfig): Interactable => {
    const interactable: Interactable = {
      id: config.id,
      position: config.position.clone(),
      collisionRadius: config.collisionRadius ?? fullConfig.defaultCollisionRadius,
      interactionRadius:
        config.interactionRadius ?? fullConfig.defaultInteractionRadius,
      blocksMovement: config.blocksMovement ?? true,
      canInteract: config.canInteract ?? false,
      isActive: config.isActive ?? true,
      object3D: config.object3D,
      userData: config.userData ?? {},
      onCollision: config.onCollision,
      onInteract: config.onInteract,
    };

    interactables.set(interactable.id, interactable);
    return interactable;
  };

  /**
   * Remove an interactable by ID
   */
  const removeInteractable = (id: string): boolean => {
    return interactables.delete(id);
  };

  /**
   * Get an interactable by ID
   */
  const getInteractable = (id: string): Interactable | undefined => {
    return interactables.get(id);
  };

  /**
   * Get all active interactables
   */
  const getActiveInteractables = (): Interactable[] => {
    return Array.from(interactables.values()).filter((i) => i.isActive);
  };

  /**
   * Get all interactables
   */
  const getAllInteractables = (): Interactable[] => {
    return Array.from(interactables.values());
  };

  /**
   * Check collisions for units
   */
  const checkCollisions = (units: Unit[]): void => {
    if (!collisionEnabled) return;

    const activeInteractables = getActiveInteractables();

    for (const unit of units) {
      for (const interactable of activeInteractables) {
        if (!interactable.blocksMovement) continue;

        const distance = unit.model.position.distanceTo(interactable.position);

        if (distance < interactable.collisionRadius) {
          // Push unit away from interactable
          const away = new THREE.Vector3()
            .subVectors(unit.model.position, interactable.position)
            .normalize();

          const pushDistance = interactable.collisionRadius - distance;
          unit.model.position.addScaledVector(away, pushDistance * 0.2);

          // Call collision callback if provided
          if (interactable.onCollision) {
            interactable.onCollision(unit, interactable);
          }
        }
      }
    }
  };

  /**
   * Check interactions for a unit
   */
  const checkInteractions = (unit: Unit): Interactable[] => {
    if (!interactionEnabled) return [];

    const activeInteractables = getActiveInteractables();
    const nearbyInteractables: Interactable[] = [];

    for (const interactable of activeInteractables) {
      if (!interactable.canInteract) continue;

      const distance = unit.model.position.distanceTo(interactable.position);

      if (distance < interactable.interactionRadius) {
        nearbyInteractables.push(interactable);
      }
    }

    return nearbyInteractables;
  };

  /**
   * Trigger interaction for a unit with nearby interactables
   */
  const triggerInteraction = (unit: Unit): number => {
    if (!interactionEnabled) return 0;

    const nearbyInteractables = checkInteractions(unit);
    let count = 0;

    for (const interactable of nearbyInteractables) {
      if (interactable.onInteract) {
        interactable.onInteract(unit, interactable);
        count++;
      }
    }

    return count;
  };

  /**
   * Clear all interactables
   */
  const clear = (): void => {
    interactables.clear();
  };

  /**
   * Enable or disable collision detection
   */
  const setCollisionEnabled = (enabled: boolean): void => {
    collisionEnabled = enabled;
  };

  /**
   * Enable or disable interaction system
   */
  const setInteractionEnabled = (enabled: boolean): void => {
    interactionEnabled = enabled;
  };

  return {
    addInteractable,
    removeInteractable,
    getInteractable,
    getActiveInteractables,
    getAllInteractables,
    checkCollisions,
    checkInteractions,
    triggerInteraction,
    clear,
    setCollisionEnabled,
    setInteractionEnabled,
  };
};
