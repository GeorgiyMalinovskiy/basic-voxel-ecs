import { System } from "@/ecs";
import { Transform, Velocity, RigidBody } from "@/components";

/**
 * Simple physics system - applies velocity and gravity
 */
export class PhysicsSystem extends System {
  private gravity = -9.8;

  update(deltaTime: number): void {
    const entities = this.world.query(Transform, Velocity, RigidBody);

    for (const entity of entities) {
      const transform = this.world.getComponent(entity, Transform)!;
      const velocity = this.world.getComponent(entity, Velocity)!;
      const rigidBody = this.world.getComponent(entity, RigidBody)!;

      if (rigidBody.isStatic) continue;

      // Apply gravity
      velocity.linear[1] += this.gravity * deltaTime;

      // Apply velocity to position
      transform.position[0] += velocity.linear[0] * deltaTime;
      transform.position[1] += velocity.linear[1] * deltaTime;
      transform.position[2] += velocity.linear[2] * deltaTime;

      // Simple ground collision
      if (transform.position[1] < 1) {
        transform.position[1] = 1;
        velocity.linear[1] = 0;
      }

      // Apply friction
      velocity.linear[0] *= 1 - rigidBody.friction * deltaTime;
      velocity.linear[2] *= 1 - rigidBody.friction * deltaTime;
    }
  }
}
