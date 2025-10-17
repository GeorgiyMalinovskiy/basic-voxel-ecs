import { vec3 } from "gl-matrix";
import {
  IPhysicsAdapter,
  PhysicsShape,
  PhysicsBodyOptions,
  PhysicsWorldConfig,
} from "@/physics/physics-adapter";

/**
 * Simple physics adapter - fallback implementation
 * Provides basic physics without external dependencies
 */
export class SimplePhysicsAdapter implements IPhysicsAdapter {
  private bodies: Map<string, SimplePhysicsBody> = new Map();
  private bodyCounter = 0;
  private gravity: vec3;
  private heightFunction?: (x: number, z: number) => number;
  private worldSize = 100;

  constructor(config?: PhysicsWorldConfig) {
    this.gravity = config?.gravity
      ? vec3.clone(config.gravity)
      : vec3.fromValues(0, -9.82, 0);
  }

  initialize(): void {
    // Simple adapter doesn't need initialization
  }

  update(deltaTime: number): void {
    for (const [bodyId, body] of this.bodies) {
      if (body.mass === 0) continue; // Skip static bodies

      // Apply gravity
      vec3.scaleAndAdd(body.velocity, body.velocity, this.gravity, deltaTime);

      // Update position
      vec3.scaleAndAdd(body.position, body.position, body.velocity, deltaTime);

      // Terrain collision
      if (this.heightFunction) {
        const terrainHeight = this.heightFunction(
          body.position[0],
          body.position[2]
        );
        if (body.position[1] <= terrainHeight) {
          body.position[1] = terrainHeight;
          body.velocity[1] *= -body.restitution;
          body.velocity[0] *= body.friction;
          body.velocity[2] *= body.friction;
        }
      }

      // Boundary collision
      if (body.position[0] < 0 || body.position[0] > this.worldSize) {
        body.velocity[0] *= -body.restitution;
        body.position[0] = Math.max(
          0,
          Math.min(this.worldSize, body.position[0])
        );
      }
      if (body.position[2] < 0 || body.position[2] > this.worldSize) {
        body.velocity[2] *= -body.restitution;
        body.position[2] = Math.max(
          0,
          Math.min(this.worldSize, body.position[2])
        );
      }
    }
  }

  createBody(
    position: vec3,
    shape: PhysicsShape,
    mass: number,
    options?: PhysicsBodyOptions
  ): string {
    const bodyId = `body_${this.bodyCounter++}`;

    const body = new SimplePhysicsBody(
      vec3.clone(position),
      shape,
      mass,
      options
    );

    this.bodies.set(bodyId, body);
    return bodyId;
  }

  removeBody(bodyId: string): void {
    this.bodies.delete(bodyId);
  }

  getBodyPosition(bodyId: string): vec3 {
    const body = this.bodies.get(bodyId);
    if (!body) {
      throw new Error(`Body not found: ${bodyId}`);
    }
    return vec3.clone(body.position);
  }

  setBodyPosition(bodyId: string, position: vec3): void {
    const body = this.bodies.get(bodyId);
    if (!body) {
      throw new Error(`Body not found: ${bodyId}`);
    }
    vec3.copy(body.position, position);
  }

  getBodyVelocity(bodyId: string): vec3 {
    const body = this.bodies.get(bodyId);
    if (!body) {
      throw new Error(`Body not found: ${bodyId}`);
    }
    return vec3.clone(body.velocity);
  }

  setBodyVelocity(bodyId: string, velocity: vec3): void {
    const body = this.bodies.get(bodyId);
    if (!body) {
      throw new Error(`Body not found: ${bodyId}`);
    }
    vec3.copy(body.velocity, velocity);
  }

  applyForce(bodyId: string, force: vec3, point?: vec3): void {
    const body = this.bodies.get(bodyId);
    if (!body) {
      throw new Error(`Body not found: ${bodyId}`);
    }

    // Simple force application (ignores point for now)
    vec3.scaleAndAdd(body.velocity, body.velocity, force, 1 / body.mass);
  }

  applyImpulse(bodyId: string, impulse: vec3, point?: vec3): void {
    const body = this.bodies.get(bodyId);
    if (!body) {
      throw new Error(`Body not found: ${bodyId}`);
    }

    // Simple impulse application (ignores point for now)
    vec3.scaleAndAdd(body.velocity, body.velocity, impulse, 1 / body.mass);
  }

  addTerrainCollision(
    heightFunction: (x: number, z: number) => number,
    worldSize: number
  ): void {
    this.heightFunction = heightFunction;
    this.worldSize = worldSize;
  }

  dispose(): void {
    this.bodies.clear();
  }
}

/**
 * Simple physics body implementation
 */
class SimplePhysicsBody {
  position: vec3;
  velocity: vec3;
  mass: number;
  shape: PhysicsShape;
  friction: number;
  restitution: number;
  kinematic: boolean;

  constructor(
    position: vec3,
    shape: PhysicsShape,
    mass: number,
    options?: PhysicsBodyOptions
  ) {
    this.position = position;
    this.velocity = vec3.create();
    this.mass = mass;
    this.shape = shape;
    this.friction = options?.material?.friction ?? 0.3;
    this.restitution = options?.material?.restitution ?? 0.3;
    this.kinematic = options?.kinematic ?? false;
  }
}

