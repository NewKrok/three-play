// Game configuration constants
export const WORLD_WIDTH = 512;
export const WORLD_HEIGHT = 512;
export const HEIGHT_MAP_RESOLUTION = 256;
export const ELEVATION_RATIO = 30;
export const WATER_LEVEL = 7.8;

// Movement constants
export const WALK_SPEED = 5;
export const RUN_SPEED = 10;
export const ROLL_SPEED = 5;
export const FAST_ROLL_SPEED = 10;
export const WATER_SPEED_MULTIPLIER = 0.4;
export const WATER_SPEED_LEVEL = 7.8;
export const ENEMY_SPEED = 5;

// Camera constants
export const DISTANCE_FROM_CAMERA = 16;

// Object generation constants
export const ROCK_COUNT = 1000;
export const TREE_COUNT = 1000;
export const CRATE_COUNT = 100;
export const ENEMY_COUNT = 20;

// Collision constants
export const TREE_COLLISION_RADIUS = 1.5;
export const CRATE_COLLISION_RADIUS = 1.2;
export const CRATE_INTERACTION_RADIUS = 3.0;
export const APPLE_HIT_RADIUS = 1;

// Apple constants
export const MIN_APPLES_PER_TREE = 2;
export const MAX_APPLES_PER_TREE = 6;
export const APPLE_PUSH_FORCE = 25;

// Player stats constants
export const MAX_STAMINA = 100.0;
export const STAMINA_RECOVERY = 1;
export const STAMINA_DRAIN = 2;
export const MAX_HEALTH = 100.0;

// Time constants
export const DAY_LENGTH = 1200;

// Combat constants
export const LIGHT_ATTACK_KNOCKBACK = 20;
export const LIGHT_ATTACK_ACTION_DELAY = 500;
export const STAMINA_FOR_LIGHT_ATTACK = 1;
export const LIGHT_ATTACK_COOLDOWN = 900;
export const LIGHT_ATTACK_EFFECT_AREA = 3;
export const LIGHT_ATTACK_STUN_DURATION = 1000;

export const HEAVY_ATTACK_KNOCKBACK = 40;
export const HEAVY_ATTACK_ACTION_DELAY = 1500;
export const STAMINA_FOR_HEAVY_ATTACK = 4;
export const HEAVY_ATTACK_COOLDOWN = 3000;
export const HEAVY_ATTACK_EFFECT_AREA = 8;
export const HEAVY_ATTACK_STUN_DURATION = 3000;

// Misc constants
export const startingPosition = { x: 88, y: 0, z: 132 };
