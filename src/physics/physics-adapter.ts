import { vec3 } from "gl-matrix";

/**
 * Physics adapter interface for interchangeable physics engines
 */
export interface IPhysicsAdapter {
  /**
   * Initialize the physics world
   */
  initialize(): void;

  /**
   * Update physics simulation
   * @param deltaTime Time step in seconds
   */
  update(deltaTime: number): void;

  /**
   * Create a rigid body
   * @param position Initial position
   * @param shape Body shape type
   * @param mass Body mass (0 = static)
   * @param options Additional options
   * @returns Body ID for tracking
   */
  createBody(
    position: vec3,
    shape: PhysicsShape,
    mass: number,
    options?: PhysicsBodyOptions
  ): string;

  /**
   * Remove a rigid body
   * @param bodyId Body ID to remove
   */
  removeBody(bodyId: string): void;

  /**
   * Get body position
   * @param bodyId Body ID
   * @returns Current position
   */
  getBodyPosition(bodyId: string): vec3;

  /**
   * Set body position
   * @param bodyId Body ID
   * @param position New position
   */
  setBodyPosition(bodyId: string, position: vec3): void;

  /**
   * Get body velocity
   * @param bodyId Body ID
   * @returns Current velocity
   */
  getBodyVelocity(bodyId: string): vec3;

  /**
   * Set body velocity
   * @param bodyId Body ID
   * @param velocity New velocity
   */
  setBodyVelocity(bodyId: string, velocity: vec3): void;

  /**
   * Apply force to body
   * @param bodyId Body ID
   * @param force Force vector
   * @param point Application point (optional)
   */
  applyForce(bodyId: string, force: vec3, point?: vec3): void;

  /**
   * Apply impulse to body
   * @param bodyId Body ID
   * @param impulse Impulse vector
   * @param point Application point (optional)
   */
  applyImpulse(bodyId: string, impulse: vec3, point?: vec3): void;

  /**
   * Add terrain collision
   * @param heightFunction Function that returns terrain height at (x, z)
   * @param worldSize World size for terrain bounds
   */
  addTerrainCollision(
    heightFunction: (x: number, z: number) => number,
    worldSize: number
  ): void;

  /**
   * Cleanup resources
   */
  dispose(): void;
}

/**
 * Physics body shapes
 */
export enum PhysicsShape {
  BOX = "box",
  SPHERE = "sphere",
  CYLINDER = "cylinder",
  PLANE = "plane",
  HEIGHTFIELD = "heightfield",
}

/**
 * Physics body options
 */
export interface PhysicsBodyOptions {
  /** Body material properties */
  material?: {
    friction?: number;
    restitution?: number;
    density?: number;
  };
  /** Body dimensions (for box, sphere radius, etc.) */
  dimensions?: vec3;
  /** Whether body can sleep */
  allowSleep?: boolean;
  /** Initial rotation */
  rotation?: vec3;
  /** Whether body is kinematic (controlled manually) */
  kinematic?: boolean;
}

/**
 * Physics world configuration
 */
export interface PhysicsWorldConfig {
  /** Gravity vector */
  gravity?: vec3;
  /** Broadphase algorithm */
  broadphase?: "naive" | "sap";
  /** Solver iterations */
  solverIterations?: number;
  /** Contact material */
  contactMaterial?: {
    friction?: number;
    restitution?: number;
  };
}
