import { System, Entity } from "@/ecs";
import { Transform, Velocity, RigidBody, PhysicsBody } from "@/components";
import { IPhysicsAdapter, CollisionShape } from "@/physics";
import { vec3 } from "gl-matrix";

/**
 * Advanced physics system using physics adapter
 * Supports collision detection, angular motion, and realistic physics
 */
export class PhysicsSystem extends System {
  private physicsAdapter: IPhysicsAdapter;

  constructor(physicsAdapter: IPhysicsAdapter) {
    super();
    this.physicsAdapter = physicsAdapter;
  }

  update(deltaTime: number): void {
    // Step 1: Create physics bodies for new entities
    this.createPhysicsBodies();

    // Step 2: Sync ECS velocity to physics world (for player/input control)
    this.syncVelocitiesToPhysics();

    // Step 3: Step physics simulation
    this.physicsAdapter.step(deltaTime);

    // Step 4: Sync physics world back to ECS
    this.syncPhysicsToECS();

    // Step 5: Handle collision events
    this.handleCollisions();
  }

  /**
   * Create physics bodies for entities that have Transform + RigidBody but not PhysicsBody yet
   */
  private createPhysicsBodies(): void {
    const entities = this.world.query(Transform, RigidBody);

    for (const entity of entities) {
      // Skip if already has physics body
      if (this.world.getComponent(entity, PhysicsBody)) continue;

      const transform = this.world.getComponent(entity, Transform)!;
      const rigidBody = this.world.getComponent(entity, RigidBody)!;
      const velocity = this.world.getComponent(entity, Velocity);

      // Create physics body
      const handle = this.physicsAdapter.createRigidBody({
        position: transform.position,
        velocity: velocity?.linear,
        mass: rigidBody.isStatic ? 0 : rigidBody.mass,
        friction: rigidBody.friction,
        restitution: 0.3,
        lockRotations: true, // Lock rotations for now (can be made configurable)
      });

      // Add collider (box shape based on radius)
      const size = rigidBody.radius;
      this.physicsAdapter.addCollider(handle, {
        shape: CollisionShape.BOX,
        halfExtents: vec3.fromValues(size, size, size),
      });

      // Add PhysicsBody component to track the handle
      this.world.addComponent(
        entity,
        new PhysicsBody(handle, rigidBody.mass, rigidBody.friction)
      );
    }
  }

  /**
   * Sync velocities from ECS to physics (for player input control)
   */
  private syncVelocitiesToPhysics(): void {
    const entities = this.world.query(PhysicsBody, Velocity);

    for (const entity of entities) {
      const physicsBody = this.world.getComponent(entity, PhysicsBody)!;
      const velocity = this.world.getComponent(entity, Velocity)!;

      // Only sync horizontal velocity (let physics handle gravity/Y)
      const currentVel = this.physicsAdapter.getLinearVelocity(
        physicsBody.handle
      );
      this.physicsAdapter.setLinearVelocity(
        physicsBody.handle,
        vec3.fromValues(velocity.linear[0], currentVel[1], velocity.linear[2])
      );
    }
  }

  /**
   * Sync physics world state back to ECS components
   */
  private syncPhysicsToECS(): void {
    const entities = this.world.query(PhysicsBody, Transform);

    for (const entity of entities) {
      const physicsBody = this.world.getComponent(entity, PhysicsBody)!;
      const transform = this.world.getComponent(entity, Transform)!;
      const velocity = this.world.getComponent(entity, Velocity);

      // Update transform from physics
      const position = this.physicsAdapter.getPosition(physicsBody.handle);
      vec3.copy(transform.position, position);

      // Update velocity if component exists
      if (velocity) {
        const vel = this.physicsAdapter.getLinearVelocity(physicsBody.handle);
        vec3.copy(velocity.linear, vel);
      }
    }
  }

  /**
   * Handle collision events
   */
  private handleCollisions(): void {
    const collisionEvents = this.physicsAdapter.getCollisionEvents();

    for (const event of collisionEvents) {
      // Find entities by physics handle
      const entity1 = this.findEntityByHandle(event.body1);
      const entity2 = this.findEntityByHandle(event.body2);

      if (entity1 && entity2) {
        // Collision detected between entity1 and entity2
        // Can be extended with collision callbacks/events
        // console.log(`Collision between ${entity1} and ${entity2}`);
      }
    }
  }

  /**
   * Find entity by physics body handle
   */
  private findEntityByHandle(handle: any): Entity | null {
    const entities = this.world.query(PhysicsBody);

    for (const entity of entities) {
      const physicsBody = this.world.getComponent(entity, PhysicsBody)!;
      if (physicsBody.handle === handle) {
        return entity;
      }
    }

    return null;
  }
}
