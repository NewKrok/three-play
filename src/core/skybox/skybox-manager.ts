import * as THREE from 'three';
import type { LoadedAssets } from '../../types/assets.js';
import type { SkyboxConfig, SkyboxManager } from '../../types/skybox.js';
import type { Logger } from '../utils/logger.js';

/**
 * Creates a skybox manager instance
 * @param config - Skybox configuration
 * @param scene - Three.js scene
 * @param assets - Loaded assets
 * @param logger - Logger instance
 * @returns Skybox manager instance
 */
export const createSkyboxManager = (
  config: SkyboxConfig,
  scene: THREE.Scene,
  assets: LoadedAssets,
  logger: Logger,
): SkyboxManager => {
  let currentConfig = { ...config };
  let skyboxCubeTexture: THREE.CubeTexture | null = null;

  /**
   * Creates skybox cube texture from loaded assets
   */
  const createSkyboxTexture = (): THREE.CubeTexture | null => {
    if (!currentConfig.enabled || !assets.textures) {
      return null;
    }

    const { assets: assetConfig } = currentConfig;

    const skyboxTextures = [
      assets.textures[assetConfig.rightAssetId], // positive X
      assets.textures[assetConfig.leftAssetId], // negative X
      assets.textures[assetConfig.bottomAssetId], // positive Y (swap top/bottom for correct orientation)
      assets.textures[assetConfig.topAssetId], // negative Y (swap top/bottom for correct orientation)
      assets.textures[assetConfig.frontAssetId], // positive Z
      assets.textures[assetConfig.backAssetId], // negative Z
    ];

    // Check if all required textures are loaded
    const missingTextures = skyboxTextures.filter((texture) => !texture);
    if (missingTextures.length > 0) {
      logger.warn(
        'Some skybox textures are missing, skybox will not be applied',
      );
      return null;
    }

    // Create cube texture from the loaded textures
    const cubeTexture = new THREE.CubeTexture();
    cubeTexture.image = skyboxTextures.map((texture) => texture.image);
    cubeTexture.needsUpdate = true;
    cubeTexture.colorSpace = THREE.SRGBColorSpace;

    return cubeTexture;
  };

  /**
   * Apply skybox to the scene
   */
  const apply = (): void => {
    if (!currentConfig.enabled) {
      logger.debug('Skybox is disabled, skipping application');
      return;
    }

    skyboxCubeTexture = createSkyboxTexture();

    if (skyboxCubeTexture) {
      scene.background = skyboxCubeTexture;
      logger.info('Skybox applied to scene with corrected orientation');
    } else {
      logger.warn('Failed to create skybox texture');
    }
  };

  /**
   * Dispose skybox resources
   */
  const dispose = (): void => {
    if (skyboxCubeTexture) {
      skyboxCubeTexture.dispose();
      skyboxCubeTexture = null;
    }

    // Remove skybox from scene
    scene.background = null;

    logger.debug('Skybox resources disposed');
  };

  /**
   * Update skybox configuration
   */
  const updateConfig = (newConfig: Partial<SkyboxConfig>): void => {
    currentConfig = { ...currentConfig, ...newConfig };

    // Re-apply skybox with new configuration
    dispose();
    apply();

    logger.debug('Skybox configuration updated');
  };

  return {
    apply,
    dispose,
    updateConfig,
  };
};
