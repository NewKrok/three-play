/**
 * Skybox configuration types for THREE Play
 */

/**
 * Skybox asset configuration
 */
export type SkyboxAssetConfig = {
  /** Asset ID for the right face (positive X) */
  rightAssetId: string;
  /** Asset ID for the left face (negative X) */
  leftAssetId: string;
  /** Asset ID for the top face (positive Y) */
  topAssetId: string;
  /** Asset ID for the bottom face (negative Y) */
  bottomAssetId: string;
  /** Asset ID for the front face (positive Z) */
  frontAssetId: string;
  /** Asset ID for the back face (negative Z) */
  backAssetId: string;
};

/**
 * Skybox configuration for world creation
 */
export type SkyboxConfig = {
  /** Enable or disable skybox */
  enabled: boolean;
  /** Skybox asset configuration */
  assets: SkyboxAssetConfig;
};

/**
 * Internal skybox manager interface
 */
export type SkyboxManager = {
  /** Apply skybox to the scene */
  apply(): void;
  /** Dispose skybox resources */
  dispose(): void;
  /** Update skybox configuration */
  updateConfig(config: Partial<SkyboxConfig>): void;
};