import * as CANNON from "cannon-es";
import { vec3 } from "gl-matrix";
import {
  IPhysicsAdapter,
  PhysicsShape,
  PhysicsBodyOptions,
  PhysicsWorldConfig,
} from "@/physics/physics-adapter";

/**
 * Cannon.js physics adapter implementation
 */
export class CannonPhysicsAdapter implements IPhysicsAdapter {
  private world: CANNON.World;
  private bodies: Map<string, CANNON.Body> = new Map();
  private materials: Map<string, CANNON.Material> = new Map();
  private bodyCounter = 0;
  private terrainBody?: CANNON.Body;
  private heightFunction?: (x: number, z: number) => number;

  constructor(config?: PhysicsWorldConfig) {
    this.world = new CANNON.World({
      gravity: config?.gravity
        ? new CANNON.Vec3(
            config.gravity[0],
            config.gravity[1],
            config.gravity[2]
          )
        : new CANNON.Vec3(0, -9.82, 0),
      broadphase: new CANNON.NaiveBroadphase(),
      solver: new CANNON.GSSolver(),
    });

    // Configure solver
    if (config?.solverIterations) {
      (this.world.solver as any).iterations = config.solverIterations;
    }

    // Create default contact material
    const defaultMaterial = new CANNON.Material("default");
    const defaultContactMaterial = new CANNON.ContactMaterial(
      defaultMaterial,
      defaultMaterial,
      {
        friction: config?.contactMaterial?.friction ?? 0.3,
        restitution: config?.contactMaterial?.restitution ?? 0.3,
      }
    );
    this.world.addContactMaterial(defaultContactMaterial);
    this.materials.set("default", defaultMaterial);
  }

  initialize(): void {
    // Cannon world is already initialized in constructor
  }

  update(deltaTime: number): void {
    this.world.step(deltaTime);
  }

  createBody(
    position: vec3,
    shape: PhysicsShape,
    mass: number,
    options?: PhysicsBodyOptions
  ): string {
    const bodyId = `body_${this.bodyCounter++}`;

    // Create shape
    let cannonShape: CANNON.Shape;
    const dimensions = options?.dimensions || vec3.fromValues(1, 1, 1);

    switch (shape) {
      case PhysicsShape.BOX:
        cannonShape = new CANNON.Box(
          new CANNON.Vec3(
            dimensions[0] / 2,
            dimensions[1] / 2,
            dimensions[2] / 2
          )
        );
        break;
      case PhysicsShape.SPHERE:
        cannonShape = new CANNON.Sphere(dimensions[0] / 2);
        break;
      case PhysicsShape.CYLINDER:
        cannonShape = new CANNON.Cylinder(
          dimensions[0] / 2,
          dimensions[0] / 2,
          dimensions[1],
          8
        );
        break;
      case PhysicsShape.PLANE:
        cannonShape = new CANNON.Plane();
        break;
      default:
        throw new Error(`Unsupported shape: ${shape}`);
    }

    // Create material
    const material = new CANNON.Material(bodyId);
    if (options?.material) {
      material.friction = options.material.friction ?? 0.3;
      material.restitution = options.material.restitution ?? 0.3;
    }
    this.materials.set(bodyId, material);

    // Add collision margin for better collision detection
    (cannonShape as any).margin = 0.05;

    // Create body
    const body = new CANNON.Body({
      mass: mass,
      shape: cannonShape,
      material: material,
      position: new CANNON.Vec3(position[0], position[1], position[2]),
      allowSleep: options?.allowSleep ?? true,
      type: options?.kinematic ? CANNON.Body.KINEMATIC : CANNON.Body.DYNAMIC,
    });

    // Set rotation if provided
    if (options?.rotation) {
      body.quaternion.setFromEuler(
        options.rotation[0],
        options.rotation[1],
        options.rotation[2]
      );
    }

    this.world.addBody(body);
    this.bodies.set(bodyId, body);

    return bodyId;
  }

  removeBody(bodyId: string): void {
    const body = this.bodies.get(bodyId);
    if (body) {
      this.world.removeBody(body);
      this.bodies.delete(bodyId);
      this.materials.delete(bodyId);
    }
  }

  getBodyPosition(bodyId: string): vec3 {
    const body = this.bodies.get(bodyId);
    if (!body) {
      throw new Error(`Body not found: ${bodyId}`);
    }
    return vec3.fromValues(body.position.x, body.position.y, body.position.z);
  }

  setBodyPosition(bodyId: string, position: vec3): void {
    const body = this.bodies.get(bodyId);
    if (!body) {
      throw new Error(`Body not found: ${bodyId}`);
    }
    body.position.set(position[0], position[1], position[2]);
  }

  getBodyVelocity(bodyId: string): vec3 {
    const body = this.bodies.get(bodyId);
    if (!body) {
      throw new Error(`Body not found: ${bodyId}`);
    }
    return vec3.fromValues(body.velocity.x, body.velocity.y, body.velocity.z);
  }

  setBodyVelocity(bodyId: string, velocity: vec3): void {
    const body = this.bodies.get(bodyId);
    if (!body) {
      throw new Error(`Body not found: ${bodyId}`);
    }
    body.velocity.set(velocity[0], velocity[1], velocity[2]);
  }

  applyForce(bodyId: string, force: vec3, point?: vec3): void {
    const body = this.bodies.get(bodyId);
    if (!body) {
      throw new Error(`Body not found: ${bodyId}`);
    }

    const cannonForce = new CANNON.Vec3(force[0], force[1], force[2]);
    if (point) {
      const cannonPoint = new CANNON.Vec3(point[0], point[1], point[2]);
      body.applyForce(cannonForce, cannonPoint);
    } else {
      body.applyForce(cannonForce);
    }
  }

  applyImpulse(bodyId: string, impulse: vec3, point?: vec3): void {
    const body = this.bodies.get(bodyId);
    if (!body) {
      throw new Error(`Body not found: ${bodyId}`);
    }

    const cannonImpulse = new CANNON.Vec3(impulse[0], impulse[1], impulse[2]);
    if (point) {
      const cannonPoint = new CANNON.Vec3(point[0], point[1], point[2]);
      body.applyImpulse(cannonImpulse, cannonPoint);
    } else {
      body.applyImpulse(cannonImpulse);
    }
  }

  addTerrainCollision(
    heightFunction: (x: number, z: number) => number,
    _worldSize: number
  ): void {
    this.heightFunction = heightFunction;

    // Remove existing terrain body
    if (this.terrainBody) {
      this.world.removeBody(this.terrainBody);
    }

    // Add floor plane to prevent falling below Y=0
    const floorShape = new CANNON.Plane();
    const floorBody = new CANNON.Body({
      mass: 0, // Static body
      shape: floorShape,
      position: new CANNON.Vec3(0, -0.1, 0), // Slightly below Y=0
    });
    floorBody.quaternion.setFromAxisAngle(
      new CANNON.Vec3(1, 0, 0),
      -Math.PI / 2
    ); // Rotate to be horizontal
    this.world.addBody(floorBody);

    // Create heightfield for terrain
    // Focus on the actual terrain area (20x20) with high resolution
    const terrainSize = 20; // Match the terrain generation size
    const samples = 64; // High resolution for 20x20 area
    const scale = terrainSize / samples;
    const heights: number[][] = [];

    for (let i = 0; i < samples; i++) {
      heights[i] = [];
      for (let j = 0; j < samples; j++) {
        const x = (i - samples / 2) * scale;
        const z = (j - samples / 2) * scale;
        heights[i][j] = heightFunction(x, z);
      }
    }

    const heightfieldShape = new CANNON.Heightfield(heights, {
      elementSize: scale,
    });

    // Add collision margin for better collision detection
    (heightfieldShape as any).margin = 0.1;

    this.terrainBody = new CANNON.Body({
      mass: 0, // Static body
      shape: heightfieldShape,
      position: new CANNON.Vec3(0, 0, 0), // Centered at origin
    });

    this.world.addBody(this.terrainBody);
  }

  dispose(): void {
    // Remove all bodies
    for (const [, body] of this.bodies) {
      this.world.removeBody(body);
    }
    this.bodies.clear();
    this.materials.clear();

    // Dispose world
    this.world.bodies = [];
    this.world.contacts = [];
    (this.world.narrowphase as any).contactEquations = [];
  }
}
