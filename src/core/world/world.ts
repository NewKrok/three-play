import type { WorldConfig, WorldInstance } from '../../types/world';

/**
 * Creates a new world instance based on the provided configuration
 * @param config - The world configuration object
 * @returns World instance with methods to interact with the world
 */
const createWorld = (config: WorldConfig): WorldInstance => {
  console.log('Creating world with config:', config);

  // Store the config in closure with deep copy to prevent external modifications
  const worldConfig = JSON.parse(JSON.stringify(config));

  return {
    /**
     * Get the world configuration in read-only mode
     * @returns The world configuration
     */
    getConfig(): Readonly<WorldConfig> {
      return worldConfig;
    },
  };
};

export default createWorld;
