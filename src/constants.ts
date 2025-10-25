/**
 * Engine-wide constants
 */

/**
 * Player mesh configuration
 * Used for marching cubes player entity
 */
export const PLAYER_MESH = {
  /** Size of the octree containing the player mesh */
  OCTREE_SIZE: 12,
  /** Maximum octree subdivision level */
  MAX_LEVEL: 5,
  /** Local space center of the player sphere */
  LOCAL_CENTER: { x: 6, y: 3.5, z: 6 },
  /** Radius of the player sphere */
  RADIUS: 3.5,
  /** Material ID for player */
  MATERIAL: 5,
} as const;

/**
 * Physics constants
 */
export const PHYSICS = {
  GRAVITY: -9.8,
  GROUND_LEVEL: 1,
  DEFAULT_FRICTION: 0.8,
} as const;

/**
 * Camera constants
 */
export const CAMERA = {
  FOV: Math.PI / 4,
  NEAR: 0.1,
  FAR: 1000,
  FOLLOW_DISTANCE: 10,
  FOLLOW_HEIGHT_OFFSET: 5,
  ORTHO_SIZE: 20, // Half-width/height for orthographic projection
} as const;

/**
 * Mesh generation constants
 */
export const MESH_GEN = {
  /** Iso-level for marching cubes (density threshold) */
  ISO_LEVEL: 0.5,
  /** Initial buffer capacities */
  INITIAL_VERTEX_CAPACITY: 1000,
  INITIAL_INDEX_CAPACITY: 3000,
} as const;
