/**
 * Configuration type for world creation
 */
export type WorldConfig = {
  world: {
    size: {
      x: number;
      y: number;
    };
  };
};

/**
 * World instance interface
 */
export type WorldInstance = {
  getConfig(): Readonly<WorldConfig>;
};
