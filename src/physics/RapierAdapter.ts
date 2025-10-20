import RAPIER from "@dimforge/rapier3d-compat";
import { vec3, quat } from "gl-matrix";

import {
  IPhysicsAdapter,
  PhysicsBodyHandle,
  PhysicsBodyDescriptor,
  ColliderDescriptor,
  CollisionEvent,
  CollisionShape,
} from "./IPhysicsAdapter";

/**
 * Rapier physics adapter implementation
 */
export class RapierAdapter implements IPhysicsAdapter {
  private world!: RAPIER.World;
  private eventQueue!: RAPIER.EventQueue;
  private bodyMap = new Map<number, RAPIER.RigidBody>();
  private handleCounter = 0;
  private collisionEvents: CollisionEvent[] = [];

  async initialize(gravity: vec3): Promise<void> {
    await RAPIER.init();
    this.world = new RAPIER.World({
      x: gravity[0],
      y: gravity[1],
      z: gravity[2],
    });
    this.eventQueue = new RAPIER.EventQueue(true);
  }

  step(_deltaTime: number): void {
    this.world.step(this.eventQueue);

    // Collect collision events
    this.collisionEvents = [];

    // Process collision events from the event queue
    this.eventQueue.drainCollisionEvents(
      (handle1: any, handle2: any, started: boolean) => {
        if (!started) return; // Only track collision start events

        const collider1 = this.world.getCollider(handle1);
        const collider2 = this.world.getCollider(handle2);

        if (!collider1 || !collider2) return;

        const body1 = collider1.parent();
        const body2 = collider2.parent();
        if (!body1 || !body2) return;

        // Find handles for these bodies
        let bodyHandle1: number | undefined;
        let bodyHandle2: number | undefined;

        for (const [handle, body] of this.bodyMap.entries()) {
          if (body === body1) bodyHandle1 = handle;
          if (body === body2) bodyHandle2 = handle;
        }

        if (bodyHandle1 === undefined || bodyHandle2 === undefined) return;

        // For simplicity, use body positions as contact point
        const pos1 = body1.translation();
        const pos2 = body2.translation();
        const contactPoint = vec3.fromValues(
          (pos1.x + pos2.x) / 2,
          (pos1.y + pos2.y) / 2,
          (pos1.z + pos2.z) / 2
        );

        // Calculate normal from pos1 to pos2
        const normal = vec3.fromValues(
          pos2.x - pos1.x,
          pos2.y - pos1.y,
          pos2.z - pos1.z
        );
        vec3.normalize(normal, normal);

        this.collisionEvents.push({
          body1: bodyHandle1,
          body2: bodyHandle2,
          contactPoint,
          contactNormal: normal,
        });
      }
    );
  }

  createRigidBody(descriptor: PhysicsBodyDescriptor): PhysicsBodyHandle {
    const handle = this.handleCounter++;

    // Create rigid body descriptor
    const bodyDesc =
      descriptor.mass === 0
        ? RAPIER.RigidBodyDesc.fixed()
        : RAPIER.RigidBodyDesc.dynamic();

    bodyDesc.setTranslation(
      descriptor.position[0],
      descriptor.position[1],
      descriptor.position[2]
    );

    // Set rotation if provided (convert Euler to quaternion)
    if (descriptor.rotation) {
      const q = quat.create();
      quat.fromEuler(
        q,
        descriptor.rotation[0],
        descriptor.rotation[1],
        descriptor.rotation[2]
      );
      bodyDesc.setRotation({ x: q[0], y: q[1], z: q[2], w: q[3] });
    }

    if (descriptor.velocity) {
      bodyDesc.setLinvel(
        descriptor.velocity[0],
        descriptor.velocity[1],
        descriptor.velocity[2]
      );
    }

    if (descriptor.angularVelocity) {
      bodyDesc.setAngvel({
        x: descriptor.angularVelocity[0],
        y: descriptor.angularVelocity[1],
        z: descriptor.angularVelocity[2],
      });
    }

    if (descriptor.linearDamping !== undefined) {
      bodyDesc.setLinearDamping(descriptor.linearDamping);
    }

    if (descriptor.angularDamping !== undefined) {
      bodyDesc.setAngularDamping(descriptor.angularDamping);
    }

    if (descriptor.lockRotations) {
      bodyDesc.lockRotations();
    }

    const rigidBody = this.world.createRigidBody(bodyDesc);
    this.bodyMap.set(handle, rigidBody);

    return handle;
  }

  addCollider(
    bodyHandle: PhysicsBodyHandle,
    descriptor: ColliderDescriptor
  ): void {
    const body = this.bodyMap.get(bodyHandle as number);
    if (!body) throw new Error(`Body handle ${bodyHandle} not found`);

    let colliderDesc: RAPIER.ColliderDesc;

    switch (descriptor.shape) {
      case CollisionShape.BOX:
        if (!descriptor.halfExtents)
          throw new Error("Box shape requires halfExtents");
        colliderDesc = RAPIER.ColliderDesc.cuboid(
          descriptor.halfExtents[0],
          descriptor.halfExtents[1],
          descriptor.halfExtents[2]
        );
        break;

      case CollisionShape.SPHERE:
        if (!descriptor.radius) throw new Error("Sphere shape requires radius");
        colliderDesc = RAPIER.ColliderDesc.ball(descriptor.radius);
        break;

      case CollisionShape.CAPSULE:
        if (!descriptor.radius || !descriptor.height)
          throw new Error("Capsule shape requires radius and height");
        colliderDesc = RAPIER.ColliderDesc.capsule(
          descriptor.height / 2,
          descriptor.radius
        );
        break;

      case CollisionShape.CYLINDER:
        if (!descriptor.radius || !descriptor.height)
          throw new Error("Cylinder shape requires radius and height");
        colliderDesc = RAPIER.ColliderDesc.cylinder(
          descriptor.height / 2,
          descriptor.radius
        );
        break;

      default:
        throw new Error(`Unknown collision shape: ${descriptor.shape}`);
    }

    // Set offset if provided
    if (descriptor.offset) {
      colliderDesc.setTranslation(
        descriptor.offset[0],
        descriptor.offset[1],
        descriptor.offset[2]
      );
    }

    // Set mass properties (mass is set on collider, not rigid body)
    if (descriptor.mass !== undefined) {
      colliderDesc.setMass(descriptor.mass);
    }

    // Set restitution (bounciness)
    if (descriptor.restitution !== undefined) {
      colliderDesc.setRestitution(descriptor.restitution);
    }

    // Set friction
    if (descriptor.friction !== undefined) {
      colliderDesc.setFriction(descriptor.friction);
    }

    this.world.createCollider(colliderDesc, body);
  }

  removeRigidBody(handle: PhysicsBodyHandle): void {
    const body = this.bodyMap.get(handle as number);
    if (!body) return;

    this.world.removeRigidBody(body);
    this.bodyMap.delete(handle as number);
  }

  getPosition(handle: PhysicsBodyHandle): vec3 {
    const body = this.bodyMap.get(handle as number);
    if (!body) throw new Error(`Body handle ${handle} not found`);

    const pos = body.translation();
    return vec3.fromValues(pos.x, pos.y, pos.z);
  }

  setPosition(handle: PhysicsBodyHandle, position: vec3): void {
    const body = this.bodyMap.get(handle as number);
    if (!body) throw new Error(`Body handle ${handle} not found`);

    body.setTranslation(
      { x: position[0], y: position[1], z: position[2] },
      true
    );
  }

  getRotation(handle: PhysicsBodyHandle): vec3 {
    const body = this.bodyMap.get(handle as number);
    if (!body) throw new Error(`Body handle ${handle} not found`);

    const rot = body.rotation();
    const q = quat.fromValues(rot.x, rot.y, rot.z, rot.w);
    const euler = vec3.create();

    // Convert quaternion to Euler angles
    const sinr_cosp = 2 * (q[3] * q[0] + q[1] * q[2]);
    const cosr_cosp = 1 - 2 * (q[0] * q[0] + q[1] * q[1]);
    euler[0] = Math.atan2(sinr_cosp, cosr_cosp);

    const sinp = 2 * (q[3] * q[1] - q[2] * q[0]);
    euler[1] =
      Math.abs(sinp) >= 1 ? (Math.sign(sinp) * Math.PI) / 2 : Math.asin(sinp);

    const siny_cosp = 2 * (q[3] * q[2] + q[0] * q[1]);
    const cosy_cosp = 1 - 2 * (q[1] * q[1] + q[2] * q[2]);
    euler[2] = Math.atan2(siny_cosp, cosy_cosp);

    return euler;
  }

  setRotation(handle: PhysicsBodyHandle, rotation: vec3): void {
    const body = this.bodyMap.get(handle as number);
    if (!body) throw new Error(`Body handle ${handle} not found`);

    const q = quat.create();
    quat.fromEuler(q, rotation[0], rotation[1], rotation[2]);
    body.setRotation({ x: q[0], y: q[1], z: q[2], w: q[3] }, true);
  }

  getLinearVelocity(handle: PhysicsBodyHandle): vec3 {
    const body = this.bodyMap.get(handle as number);
    if (!body) throw new Error(`Body handle ${handle} not found`);

    const vel = body.linvel();
    return vec3.fromValues(vel.x, vel.y, vel.z);
  }

  setLinearVelocity(handle: PhysicsBodyHandle, velocity: vec3): void {
    const body = this.bodyMap.get(handle as number);
    if (!body) throw new Error(`Body handle ${handle} not found`);

    body.setLinvel({ x: velocity[0], y: velocity[1], z: velocity[2] }, true);
  }

  getAngularVelocity(handle: PhysicsBodyHandle): vec3 {
    const body = this.bodyMap.get(handle as number);
    if (!body) throw new Error(`Body handle ${handle} not found`);

    const vel = body.angvel();
    return vec3.fromValues(vel.x, vel.y, vel.z);
  }

  setAngularVelocity(handle: PhysicsBodyHandle, velocity: vec3): void {
    const body = this.bodyMap.get(handle as number);
    if (!body) throw new Error(`Body handle ${handle} not found`);

    body.setAngvel({ x: velocity[0], y: velocity[1], z: velocity[2] }, true);
  }

  applyForce(handle: PhysicsBodyHandle, force: vec3, point?: vec3): void {
    const body = this.bodyMap.get(handle as number);
    if (!body) throw new Error(`Body handle ${handle} not found`);

    if (point) {
      body.addForceAtPoint(
        { x: force[0], y: force[1], z: force[2] },
        { x: point[0], y: point[1], z: point[2] },
        true
      );
    } else {
      body.addForce({ x: force[0], y: force[1], z: force[2] }, true);
    }
  }

  applyImpulse(handle: PhysicsBodyHandle, impulse: vec3, point?: vec3): void {
    const body = this.bodyMap.get(handle as number);
    if (!body) throw new Error(`Body handle ${handle} not found`);

    if (point) {
      body.applyImpulseAtPoint(
        { x: impulse[0], y: impulse[1], z: impulse[2] },
        { x: point[0], y: point[1], z: point[2] },
        true
      );
    } else {
      body.applyImpulse({ x: impulse[0], y: impulse[1], z: impulse[2] }, true);
    }
  }

  applyTorque(handle: PhysicsBodyHandle, torque: vec3): void {
    const body = this.bodyMap.get(handle as number);
    if (!body) throw new Error(`Body handle ${handle} not found`);

    body.addTorque({ x: torque[0], y: torque[1], z: torque[2] }, true);
  }

  getCollisionEvents(): CollisionEvent[] {
    return [...this.collisionEvents];
  }

  isSleeping(handle: PhysicsBodyHandle): boolean {
    const body = this.bodyMap.get(handle as number);
    if (!body) throw new Error(`Body handle ${handle} not found`);

    return body.isSleeping();
  }

  wakeUp(handle: PhysicsBodyHandle): void {
    const body = this.bodyMap.get(handle as number);
    if (!body) throw new Error(`Body handle ${handle} not found`);

    body.wakeUp();
  }

  getMass(handle: PhysicsBodyHandle): number {
    const body = this.bodyMap.get(handle as number);
    if (!body) throw new Error(`Body handle ${handle} not found`);

    return body.mass();
  }

  setGravity(gravity: vec3): void {
    this.world.gravity = { x: gravity[0], y: gravity[1], z: gravity[2] };
  }

  dispose(): void {
    this.world.free();
    this.bodyMap.clear();
  }
}
