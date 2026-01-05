import * as THREE from 'three';
import type {
  MinimapConfig,
  MinimapManager,
  MinimapState,
} from '../../types/minimap.js';
import type { Unit } from '../../types/units.js';
import type { Interactable } from '../../types/interactions.js';

/**
 * Default minimap configuration
 */
const DEFAULT_CONFIG: Required<MinimapConfig> = {
  enabled: true,
  size: 200,
  position: 'top-right',
  zoom: 0.1,
  borderWidth: 2,
  borderColor: '#ffffff',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  terrainColor: '#4a4a4a',
  waterColor: '#2563eb',
  playerColor: '#22c55e',
  enemyColor: '#ef4444',
  npcColor: '#fbbf24',
  cameraFovColor: 'rgba(255, 255, 255, 0.2)',
  interactableColor: '#a855f7',
  opacity: 0.9,
  borderRadius: 8,
  unitDotSize: 4,
  interactableDotSize: 3,
  updateFrequency: 100,
  showCameraFov: true,
  showTerrain: true,
  showUnits: true,
  showInteractables: true,
  customStyles: {},
};

/**
 * Creates a minimap manager instance
 * @param config - Minimap configuration
 * @param worldSize - Size of the game world
 * @returns Minimap manager instance
 */
export const createMinimapManager = (
  config: MinimapConfig = {},
  worldSize: { x: number; y: number },
): MinimapManager => {
  // Merge config with defaults
  const mergedConfig: Required<MinimapConfig> = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  // Create canvas element
  const canvas = document.createElement('canvas');
  canvas.width = mergedConfig.size;
  canvas.height = mergedConfig.size;
  canvas.style.width = `${mergedConfig.size}px`;
  canvas.style.height = `${mergedConfig.size}px`;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to get 2D context from canvas');
  }

  // Create container
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.zIndex = '1000';
  container.style.opacity = mergedConfig.opacity.toString();
  container.style.borderRadius = `${mergedConfig.borderRadius}px`;
  container.style.border = `${mergedConfig.borderWidth}px solid ${mergedConfig.borderColor}`;
  container.style.backgroundColor = mergedConfig.backgroundColor;
  container.style.overflow = 'hidden';
  container.style.pointerEvents = 'none';

  // Apply custom styles
  Object.assign(container.style, mergedConfig.customStyles);

  // Set position
  const margin = 16;
  switch (mergedConfig.position) {
    case 'top-left':
      container.style.top = `${margin}px`;
      container.style.left = `${margin}px`;
      break;
    case 'top-right':
      container.style.top = `${margin}px`;
      container.style.right = `${margin}px`;
      break;
    case 'bottom-left':
      container.style.bottom = `${margin}px`;
      container.style.left = `${margin}px`;
      break;
    case 'bottom-right':
      container.style.bottom = `${margin}px`;
      container.style.right = `${margin}px`;
      break;
  }

  // Append canvas to container
  container.appendChild(canvas);

  // Add to DOM if enabled
  if (mergedConfig.enabled) {
    document.body.appendChild(container);
  }

  // Create state
  const state: MinimapState = {
    canvas,
    context,
    container,
    isVisible: mergedConfig.enabled,
    lastUpdateTime: 0,
  };

  // Helper: Convert world position to minimap coordinates
  const worldToMinimap = (
    worldX: number,
    worldZ: number,
  ): { x: number; y: number } => {
    // World center is at (worldSize.x/2, worldSize.y/2)
    const centerX = worldSize.x / 2;
    const centerZ = worldSize.y / 2;

    // Position relative to world center
    const relX = worldX - centerX;
    const relZ = worldZ - centerZ;

    // Scale: zoom * pixels per world unit
    // Higher zoom = more zoomed in (shows less of the world)
    const worldDimension = Math.max(worldSize.x, worldSize.y);
    const scale = (mergedConfig.size / worldDimension) * mergedConfig.zoom;

    return {
      x: mergedConfig.size / 2 + relX * scale,
      y: mergedConfig.size / 2 + relZ * scale,
    };
  };

  // Helper: Clear canvas
  const clearCanvas = (): void => {
    context.clearRect(0, 0, mergedConfig.size, mergedConfig.size);
  };

  // Helper: Draw terrain
  const drawTerrain = (): void => {
    if (!mergedConfig.showTerrain) return;

    // Draw cached terrain if available
    if (state.terrainImageData) {
      context.putImageData(state.terrainImageData, 0, 0);
    } else {
      // Draw simple background
      context.fillStyle = mergedConfig.terrainColor;
      context.fillRect(0, 0, mergedConfig.size, mergedConfig.size);
    }
  };

  // Helper: Draw camera FOV (Warcraft 3 style - rectangle showing visible area)
  const drawCameraFov = (camera: THREE.Camera): void => {
    if (!mergedConfig.showCameraFov) return;
    if (!(camera instanceof THREE.PerspectiveCamera)) return;

    // Get camera direction
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    // Calculate visible world area based on camera settings
    const cameraHeight = camera.position.y;
    const fovRadians = (camera.fov * Math.PI) / 180;
    const aspect = camera.aspect;

    // Calculate visible world dimensions at ground level
    const visibleHeight = 2 * Math.tan(fovRadians / 2) * cameraHeight;
    const visibleWidth = visibleHeight * aspect;

    // Calculate the center point where camera is looking (ground intersection)
    const lookAtDistance = cameraHeight / Math.abs(direction.y);
    const lookAtX = camera.position.x + direction.x * lookAtDistance;
    const lookAtZ = camera.position.z + direction.z * lookAtDistance;

    // Use look-at point as center, not camera position
    const centerPos = worldToMinimap(lookAtX, lookAtZ);

    // Convert to minimap pixels
    const worldDimension = Math.max(worldSize.x, worldSize.y);
    const scale = (mergedConfig.size / worldDimension) * mergedConfig.zoom;
    const rectWidth = visibleWidth * scale;
    const rectHeight = visibleHeight * scale;

    // Draw rectangle
    context.save();
    context.translate(centerPos.x, centerPos.y);

    // Rotate to match camera direction
    const angle = Math.atan2(direction.x, direction.z);
    context.rotate(-angle);

    // Draw filled rectangle for visible area
    context.fillStyle = mergedConfig.cameraFovColor;
    context.fillRect(
      -rectWidth / 2,
      -rectHeight / 2,
      rectWidth,
      rectHeight
    );

    // Draw border for better visibility
    context.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    context.lineWidth = 1;
    context.strokeRect(
      -rectWidth / 2,
      -rectHeight / 2,
      rectWidth,
      rectHeight
    );

    context.restore();
  };

  // Helper: Draw units
  const drawUnits = (units: Unit[]): void => {
    if (!mergedConfig.showUnits) return;

    for (const unit of units) {
      const pos = worldToMinimap(unit.model.position.x, unit.model.position.z);

      // Determine color based on unit type
      let color = mergedConfig.npcColor;
      if (unit.definition.type === 'player') {
        color = mergedConfig.playerColor;
      } else if (unit.definition.type === 'enemy') {
        color = mergedConfig.enemyColor;
      }

      // Draw unit dot
      context.beginPath();
      context.arc(pos.x, pos.y, mergedConfig.unitDotSize, 0, Math.PI * 2);
      context.fillStyle = color;
      context.fill();

      // Draw direction indicator
      const direction = new THREE.Vector3();
      unit.model.getWorldDirection(direction);

      // Map 3D direction to 2D minimap directly
      // Game: X+ is forward, Z+ is right
      // Minimap: X+ is right, Y- is up
      // Therefore: minimap X = game Z, minimap Y = -game X
      const lineLength = mergedConfig.unitDotSize + 2;
      const endX = pos.x + direction.z * lineLength;
      const endY = pos.y - direction.x * lineLength;

      context.beginPath();
      context.moveTo(pos.x, pos.y);
      context.lineTo(endX, endY);
      context.strokeStyle = color;
      context.lineWidth = 1;
      context.stroke();
    }
  };

  // Helper: Draw interactables
  const drawInteractables = (interactables: Interactable[]): void => {
    if (!mergedConfig.showInteractables) return;

    for (const interactable of interactables) {
      if (!interactable.isActive) continue;

      const pos = worldToMinimap(interactable.position.x, interactable.position.z);

      // Draw interactable dot
      context.beginPath();
      context.arc(
        pos.x,
        pos.y,
        mergedConfig.interactableDotSize,
        0,
        Math.PI * 2,
      );
      context.fillStyle = mergedConfig.interactableColor;
      context.fill();

      // Draw outline if it blocks movement
      if (interactable.blocksMovement) {
        context.strokeStyle = mergedConfig.interactableColor;
        context.lineWidth = 1;
        context.stroke();
      }
    }
  };

  // Main update function
  const update = (
    camera: THREE.Camera,
    units: Unit[],
    interactables: Interactable[],
    currentTime: number,
  ): void => {
    if (!state.isVisible) return;

    // Throttle updates based on update frequency
    if (currentTime - state.lastUpdateTime < mergedConfig.updateFrequency) {
      return;
    }

    state.lastUpdateTime = currentTime;

    // Clear and redraw
    clearCanvas();
    drawTerrain();
    drawCameraFov(camera);
    drawUnits(units);
    drawInteractables(interactables);
  };

  // Show minimap
  const show = (): void => {
    if (!state.isVisible) {
      state.isVisible = true;
      if (!document.body.contains(container)) {
        document.body.appendChild(container);
      }
      container.style.display = 'block';
    }
  };

  // Hide minimap
  const hide = (): void => {
    if (state.isVisible) {
      state.isVisible = false;
      container.style.display = 'none';
    }
  };

  // Toggle visibility
  const toggle = (): void => {
    if (state.isVisible) {
      hide();
    } else {
      show();
    }
  };

  // Check visibility
  const isVisible = (): boolean => state.isVisible;

  // Update configuration
  const updateConfig = (newConfig: Partial<MinimapConfig>): void => {
    Object.assign(mergedConfig, newConfig);

    // Update container styles if needed
    if (newConfig.opacity !== undefined) {
      container.style.opacity = newConfig.opacity.toString();
    }
    if (newConfig.borderWidth !== undefined || newConfig.borderColor !== undefined) {
      container.style.border = `${mergedConfig.borderWidth}px solid ${mergedConfig.borderColor}`;
    }
    if (newConfig.backgroundColor !== undefined) {
      container.style.backgroundColor = newConfig.backgroundColor;
    }
    if (newConfig.borderRadius !== undefined) {
      container.style.borderRadius = `${mergedConfig.borderRadius}px`;
    }
    if (newConfig.customStyles) {
      Object.assign(container.style, newConfig.customStyles);
    }

    // Clear cached terrain if colors changed
    if (
      newConfig.terrainColor !== undefined ||
      newConfig.waterColor !== undefined
    ) {
      state.terrainImageData = undefined;
    }
  };

  // Get current config
  const getConfig = (): Readonly<Required<MinimapConfig>> => {
    return { ...mergedConfig };
  };

  // Set terrain data
  const setTerrainData = (
    heightData: number[][],
    terrainWorldSize: { x: number; y: number },
  ): void => {
    if (!mergedConfig.showTerrain) return;

    // Create image data from heightmap
    const imageData = context.createImageData(mergedConfig.size, mergedConfig.size);
    const data = imageData.data;

    const scaleX = heightData.length / mergedConfig.size;
    const scaleY = heightData[0].length / mergedConfig.size;

    for (let y = 0; y < mergedConfig.size; y++) {
      for (let x = 0; x < mergedConfig.size; x++) {
        const heightX = Math.floor(x * scaleX);
        const heightY = Math.floor(y * scaleY);
        const height = heightData[heightX]?.[heightY] ?? 0;

        // Convert terrain color to RGB
        const terrainColor = mergedConfig.terrainColor;
        const r = parseInt(terrainColor.slice(1, 3), 16);
        const g = parseInt(terrainColor.slice(3, 5), 16);
        const b = parseInt(terrainColor.slice(5, 7), 16);

        // Adjust brightness based on height
        const brightness = 0.5 + height * 0.5;

        const index = (y * mergedConfig.size + x) * 4;
        data[index] = r * brightness;
        data[index + 1] = g * brightness;
        data[index + 2] = b * brightness;
        data[index + 3] = 255;
      }
    }

    state.terrainImageData = imageData;
  };

  // Dispose
  const dispose = (): void => {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
    state.terrainImageData = undefined;
  };

  return {
    update,
    show,
    hide,
    toggle,
    isVisible,
    updateConfig,
    getConfig,
    setTerrainData,
    dispose,
  };
};
