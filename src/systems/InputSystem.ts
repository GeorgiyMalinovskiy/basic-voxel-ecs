import { System } from "@/ecs";
import { Transform, Velocity, Player } from "@/components";
import { vec3 } from "gl-matrix";

/**
 * Input system for player control
 */
export class InputSystem extends System {
  private keys = new Set<string>();
  private mouseDelta = { x: 0, y: 0 };
  private yaw = 0;
  private pitch = 0;

  constructor() {
    super();
    this.setupListeners();
  }

  private setupListeners(): void {
    window.addEventListener("keydown", (e) => {
      const key = e.key.toLowerCase();
      this.keys.add(key);
      console.log(
        `Key down: "${key}", keys: ${Array.from(this.keys).join(",")}`
      );
    });

    window.addEventListener("keyup", (e) => {
      const key = e.key.toLowerCase();
      this.keys.delete(key);
      console.log(`Key up: "${key}"`);
    });

    window.addEventListener("mousemove", (e) => {
      if (document.pointerLockElement) {
        this.mouseDelta.x += e.movementX;
        this.mouseDelta.y += e.movementY;
      }
    });

    document.addEventListener("click", () => {
      document.body.requestPointerLock();
    });
  }

  update(deltaTime: number): void {
    const entities = this.world.query(Transform, Velocity, Player);

    for (const entity of entities) {
      const transform = this.world.getComponent(entity, Transform)!;
      const velocity = this.world.getComponent(entity, Velocity)!;
      const player = this.world.getComponent(entity, Player)!;

      // Handle mouse look
      if (this.mouseDelta.x !== 0 || this.mouseDelta.y !== 0) {
        this.yaw -= this.mouseDelta.x * player.lookSpeed;
        this.pitch -= this.mouseDelta.y * player.lookSpeed;
        this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
        this.mouseDelta.x = 0;
        this.mouseDelta.y = 0;
      }

      // Calculate forward and right vectors
      const forward = vec3.fromValues(
        Math.sin(this.yaw),
        0,
        Math.cos(this.yaw)
      );

      const right = vec3.fromValues(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

      // Handle movement
      const moveDir = vec3.create();

      // Debug: log keys every frame if any are pressed
      if (this.keys.size > 0) {
        console.log(`Keys active: ${Array.from(this.keys).join(",")}`);
      }

      if (this.keys.has("w")) {
        vec3.add(moveDir, moveDir, forward);
        console.log("W pressed, forward:", forward);
      }
      if (this.keys.has("s")) {
        vec3.subtract(moveDir, moveDir, forward);
        console.log("S pressed");
      }
      if (this.keys.has("a")) {
        vec3.subtract(moveDir, moveDir, right);
        console.log("A pressed");
      }
      if (this.keys.has("d")) {
        vec3.add(moveDir, moveDir, right);
        console.log("D pressed");
      }

      // Normalize and apply speed
      if (vec3.length(moveDir) > 0) {
        vec3.normalize(moveDir, moveDir);
        vec3.scale(moveDir, moveDir, player.moveSpeed);
        velocity.linear[0] = moveDir[0];
        velocity.linear[2] = moveDir[2];
        console.log(
          `Moving! Keys: ${Array.from(this.keys).join(
            ","
          )}, Velocity: ${velocity.linear[0].toFixed(
            2
          )}, ${velocity.linear[2].toFixed(2)}`
        );
      } else {
        // Decelerate
        velocity.linear[0] *= 0.8;
        velocity.linear[2] *= 0.8;
      }

      // Jump
      if (this.keys.has(" ") && Math.abs(velocity.linear[1]) < 0.1) {
        velocity.linear[1] = 8;
      }
    }
  }

  getYaw(): number {
    return this.yaw;
  }

  getPitch(): number {
    return this.pitch;
  }
}
