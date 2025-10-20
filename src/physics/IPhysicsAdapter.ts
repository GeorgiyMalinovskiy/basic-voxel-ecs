import { vec3 } from "gl-matrix";

/**
 * Physics body handle - opaque reference to a physics body in the adapter
 */
export type PhysicsBodyHandle = number | string | object;

/**
 * Physics body descriptor
 */
export interface PhysicsBodyDescriptor {
  position: vec3;
  rotation?: vec3; // Euler angles
  velocity?: vec3;
  angularVelocity?: vec3;
  mass?: number; // 0 = static body
  friction?: number;
  restitution?: number; // Bounciness (0-1)
  linearDamping?: number;
  angularDamping?: number;
  lockRotations?: boolean; // Prevent rotation
}

/**
 * Collision shape types
 */
export enum CollisionShape {
  BOX = "box",
  SPHERE = "sphere",
  CAPSULE = "capsule",
  CYLINDER = "cylinder",
}

/**
 * Collision shape descriptor
 */
export interface ColliderDescriptor {
  shape: CollisionShape;
  halfExtents?: vec3; // For box
  radius?: number; // For sphere, capsule, cylinder
  height?: number; // For capsule, cylinder
  offset?: vec3; // Offset from body center
  mass?: number; // Mass of the collider (affects rigid body's total mass)
  friction?: number; // Friction coefficient (0-1)
  restitution?: number; // Bounciness (0-1)
}

/**
 * Collision event
 */
export interface CollisionEvent {
  body1: PhysicsBodyHandle;
  body2: PhysicsBodyHandle;
  contactPoint: vec3;
  contactNormal: vec3;
}

/**
 * Physics adapter interface - abstracts physics library implementation
 * Allows swapping physics engines (Rapier, Cannon, etc.) without changing game code
 */
export interface IPhysicsAdapter {
  /**
   * Initialize the physics world
   */
  initialize(gravity: vec3): Promise<void>;

  /**
   * Step the physics simulation
   */
  step(deltaTime: number): void;

  /**
   * Create a rigid body
   */
  createRigidBody(descriptor: PhysicsBodyDescriptor): PhysicsBodyHandle;

  /**
   * Add a collider to a rigid body
   */
  addCollider(
    bodyHandle: PhysicsBodyHandle,
    descriptor: ColliderDescriptor
  ): void;

  /**
   * Remove a rigid body
   */
  removeRigidBody(handle: PhysicsBodyHandle): void;

  /**
   * Get body position
   */
  getPosition(handle: PhysicsBodyHandle): vec3;

  /**
   * Set body position
   */
  setPosition(handle: PhysicsBodyHandle, position: vec3): void;

  /**
   * Get body rotation (Euler angles)
   */
  getRotation(handle: PhysicsBodyHandle): vec3;

  /**
   * Set body rotation (Euler angles)
   */
  setRotation(handle: PhysicsBodyHandle, rotation: vec3): void;

  /**
   * Get body linear velocity
   */
  getLinearVelocity(handle: PhysicsBodyHandle): vec3;

  /**
   * Set body linear velocity
   */
  setLinearVelocity(handle: PhysicsBodyHandle, velocity: vec3): void;

  /**
   * Get body angular velocity
   */
  getAngularVelocity(handle: PhysicsBodyHandle): vec3;

  /**
   * Set body angular velocity
   */
  setAngularVelocity(handle: PhysicsBodyHandle, velocity: vec3): void;

  /**
   * Apply force to body
   */
  applyForce(handle: PhysicsBodyHandle, force: vec3, point?: vec3): void;

  /**
   * Apply impulse to body
   */
  applyImpulse(handle: PhysicsBodyHandle, impulse: vec3, point?: vec3): void;

  /**
   * Apply torque to body
   */
  applyTorque(handle: PhysicsBodyHandle, torque: vec3): void;

  /**
   * Get collision events from last step
   */
  getCollisionEvents(): CollisionEvent[];

  /**
   * Check if body is sleeping (at rest)
   */
  isSleeping(handle: PhysicsBodyHandle): boolean;

  /**
   * Wake up a sleeping body
   */
  wakeUp(handle: PhysicsBodyHandle): void;

  /**
   * Get body mass
   */
  getMass(handle: PhysicsBodyHandle): number;

  /**
   * Set gravity
   */
  setGravity(gravity: vec3): void;

  /**
   * Cleanup and dispose
   */
  dispose(): void;
}
