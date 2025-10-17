import { System } from "@/ecs";
import { Transform, Velocity, RigidBody } from "@/components";
import { PHYSICS } from "@/constants";

/**
 * Simple physics system - applies velocity, gravity, and collision
 */
export class PhysicsSystem extends System {
  update(deltaTime: number): void {
    const entities = this.world.query(Transform, Velocity, RigidBody);

    for (const entity of entities) {
      const transform = this.world.getComponent(entity, Transform)!;
      const velocity = this.world.getComponent(entity, Velocity)!;
      const rigidBody = this.world.getComponent(entity, RigidBody)!;

      if (rigidBody.isStatic) continue;

      // Apply gravity
      velocity.linear[1] += PHYSICS.GRAVITY * deltaTime;

      // Apply velocity to position
      transform.position[0] += velocity.linear[0] * deltaTime;
      transform.position[1] += velocity.linear[1] * deltaTime;
      transform.position[2] += velocity.linear[2] * deltaTime;

      // Simple ground collision
      if (transform.position[1] < PHYSICS.GROUND_LEVEL) {
        transform.position[1] = PHYSICS.GROUND_LEVEL;
        velocity.linear[1] = 0;
      }

      // Apply friction
      const frictionFactor = 1 - rigidBody.friction * deltaTime;
      velocity.linear[0] *= frictionFactor;
      velocity.linear[2] *= frictionFactor;
    }
  }
}
