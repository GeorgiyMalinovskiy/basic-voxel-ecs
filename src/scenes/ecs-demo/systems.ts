import { System, Query } from "../../ecs";
import { VoxelEngine } from "../../engine";
import { vec3 } from "gl-matrix";
import {
  PositionComponent,
  VelocityComponent,
  RotationComponent,
  ScaleComponent,
  VoxelComponent,
  PhysicsComponent,
  LifetimeComponent,
  SpawnerComponent,
  PlayerComponent,
  InputComponent,
} from "./components";

/**
 * Physics system - handles movement and physics
 */
export class PhysicsSystem extends System {
  constructor(private engine: VoxelEngine) {
    super();
    this.setQuery(
      new Query({
        with: [PositionComponent, VelocityComponent, PhysicsComponent],
      })
    );
  }

  update(_deltaTime: number): void {
    const entities = this.getEntities();

    for (const entity of entities) {
      const pos = this.world.getComponent(entity, PositionComponent);
      const vel = this.world.getComponent(entity, VelocityComponent);
      const physics = this.world.getComponent(entity, PhysicsComponent);

      if (!pos || !vel || !physics) continue;

      // Apply gravity
      if (physics.gravity) {
        vel.y -= 9.8 * _deltaTime;
      }

      // Apply friction
      vel.x *= physics.friction;
      vel.z *= physics.friction;

      // Update position
      pos.x += vel.x * _deltaTime;
      pos.y += vel.y * _deltaTime;
      pos.z += vel.z * _deltaTime;

      // Terrain collision detection
      const terrainHeight = this.getTerrainHeight(pos.x, pos.z);
      if (pos.y <= terrainHeight) {
        pos.y = terrainHeight;
        vel.y *= -physics.bounce;
        vel.x *= physics.friction;
        vel.z *= physics.friction;
      }

      // Boundary collision
      const worldSize = this.engine.getWorldSize();
      if (pos.x < 0 || pos.x > worldSize) {
        vel.x *= -physics.bounce;
        pos.x = Math.max(0, Math.min(worldSize, pos.x));
      }
      if (pos.z < 0 || pos.z > worldSize) {
        vel.z *= -physics.bounce;
        pos.z = Math.max(0, Math.min(worldSize, pos.z));
      }
    }
  }

  private getTerrainHeight(x: number, z: number): number {
    // Simple terrain height calculation matching the engine's terrain generation
    const noise =
      Math.sin(x * 0.1) * Math.cos(z * 0.1) * 10 +
      Math.sin(x * 0.05) * Math.cos(z * 0.05) * 20;
    return Math.max(0, 4 + noise); // Base height 4 + noise
  }
}

/**
 * Rotation system - handles entity rotation
 */
export class RotationSystem extends System {
  constructor() {
    super();
    this.setQuery(
      new Query({
        with: [RotationComponent],
      })
    );
  }

  update(_deltaTime: number): void {
    const entities = this.getEntities();

    for (const entity of entities) {
      const rotation = this.world.getComponent(entity, RotationComponent);
      if (!rotation) continue;

      // Rotate entities
      rotation.x += 30 * _deltaTime; // degrees per second
      rotation.y += 45 * _deltaTime;
      rotation.z += 15 * _deltaTime;

      // Keep rotation in 0-360 range
      rotation.x = rotation.x % 360;
      rotation.y = rotation.y % 360;
      rotation.z = rotation.z % 360;
    }
  }
}

/**
 * Lifetime system - handles entity lifetime
 */
export class LifetimeSystem extends System {
  constructor() {
    super();
    this.setQuery(
      new Query({
        with: [LifetimeComponent],
      })
    );
  }

  update(_deltaTime: number): void {
    const entities = this.getEntities();

    for (const entity of entities) {
      const lifetime = this.world.getComponent(entity, LifetimeComponent);
      if (!lifetime) continue;

      lifetime.timeLeft -= _deltaTime;

      if (lifetime.timeLeft <= 0) {
        this.world.destroyEntity(entity);
      }
    }
  }
}

/**
 * Spawner system - spawns new entities
 */
export class SpawnerSystem extends System {
  constructor(private engine: VoxelEngine) {
    super();
    this.setQuery(
      new Query({
        with: [SpawnerComponent, PositionComponent],
      })
    );
  }

  update(_deltaTime: number): void {
    const entities = this.getEntities();
    const currentTime = Date.now() / 1000;

    for (const entity of entities) {
      const spawner = this.world.getComponent(entity, SpawnerComponent);
      const pos = this.world.getComponent(entity, PositionComponent);

      if (!spawner || !pos) continue;

      // Count existing entities of this type
      const existingEntities = this.world.queryEntities(
        new Query({ with: [VoxelComponent] })
      );

      if (existingEntities.length >= spawner.maxEntities) continue;

      // Check if it's time to spawn
      if (currentTime - spawner.lastSpawn >= 1 / spawner.spawnRate) {
        this.spawnEntity(spawner.spawnType, pos);
        spawner.lastSpawn = currentTime;
      }
    }
  }

  private spawnEntity(
    type: "sphere" | "box",
    spawnPos: PositionComponent
  ): void {
    const entity = this.world.createEntity();

    // Add position with some randomness
    this.world.addComponent(
      entity,
      new PositionComponent(
        spawnPos.x + (Math.random() - 0.5) * 4,
        spawnPos.y + 5,
        spawnPos.z + (Math.random() - 0.5) * 4
      )
    );

    // Add velocity
    this.world.addComponent(
      entity,
      new VelocityComponent(
        (Math.random() - 0.5) * 10,
        Math.random() * 5 + 2,
        (Math.random() - 0.5) * 10
      )
    );

    // Add rotation
    this.world.addComponent(entity, new RotationComponent());

    // Add scale
    const scale = Math.random() * 0.5 + 0.5;
    this.world.addComponent(entity, new ScaleComponent(scale, scale, scale));

    // Add voxel component
    this.world.addComponent(
      entity,
      new VoxelComponent(type, Math.floor(Math.random() * 3) + 1, scale)
    );

    // Add physics
    this.world.addComponent(entity, new PhysicsComponent(1, 0.9, 0.5, true));

    // Add lifetime
    this.world.addComponent(entity, new LifetimeComponent(15));
  }
}

/**
 * Rendering system - updates voxel renderer with ECS data
 */
export class RenderingSystem extends System {
  constructor(private engine: VoxelEngine) {
    super();
    this.setQuery(
      new Query({
        with: [PositionComponent, VoxelComponent, ScaleComponent],
      })
    );
  }

  update(_deltaTime: number): void {
    // This system is currently not needed since terrain is generated in the scene
    // and entity voxels are handled by the engine's rendering pipeline
    // Could be used for custom rendering logic in the future
  }
}

/**
 * Player movement system - handles player input and movement
 */
export class PlayerMovementSystem extends System {
  constructor(private engine: VoxelEngine) {
    super();
    this.setQuery(
      new Query({
        with: [
          PlayerComponent,
          PositionComponent,
          VelocityComponent,
          InputComponent,
        ],
      })
    );
  }

  update(_deltaTime: number): void {
    const entities = this.getEntities();

    for (const entity of entities) {
      const pos = this.world.getComponent(entity, PositionComponent);
      const vel = this.world.getComponent(entity, VelocityComponent);
      const input = this.world.getComponent(entity, InputComponent);

      if (!pos || !vel || !input) continue;

      const moveSpeed = 50 * _deltaTime;
      const jumpForce = 15;

      // Get camera direction for relative movement
      const camera = this.engine.getCamera();
      const cameraPos = camera.getPosition();
      const cameraTarget = camera.getTarget();

      // Calculate camera forward and right vectors
      const forward = vec3.create();
      const right = vec3.create();
      const up = vec3.fromValues(0, 1, 0);

      vec3.subtract(forward, cameraTarget, cameraPos);
      forward[1] = 0; // Remove Y component for horizontal movement
      vec3.normalize(forward, forward);

      vec3.cross(right, forward, up);
      vec3.normalize(right, right);

      // Handle movement input relative to camera direction
      if (input.moveForward) {
        vel.x += forward[0] * moveSpeed;
        vel.z += forward[2] * moveSpeed;
      }
      if (input.moveBackward) {
        vel.x -= forward[0] * moveSpeed;
        vel.z -= forward[2] * moveSpeed;
      }
      if (input.moveLeft) {
        vel.x -= right[0] * moveSpeed;
        vel.z -= right[2] * moveSpeed;
      }
      if (input.moveRight) {
        vel.x += right[0] * moveSpeed;
        vel.z += right[2] * moveSpeed;
      }

      // Handle jump input
      const terrainHeight = this.getTerrainHeight(pos.x, pos.z);
      if (input.jump && pos.y <= terrainHeight + 0.1) {
        // Only jump when on ground
        vel.y = jumpForce;
      }

      // Reset input flags
      input.moveForward = false;
      input.moveBackward = false;
      input.moveLeft = false;
      input.moveRight = false;
      input.jump = false;
    }
  }

  private getTerrainHeight(x: number, z: number): number {
    // Simple terrain height calculation matching the engine's terrain generation
    const noise =
      Math.sin(x * 0.1) * Math.cos(z * 0.1) * 10 +
      Math.sin(x * 0.05) * Math.cos(z * 0.05) * 20;
    return Math.max(0, 4 + noise); // Base height 4 + noise
  }
}

/**
 * Input system - handles keyboard and mouse input for player
 */
export class InputSystem extends System {
  private keys = new Set<string>();
  private mousePos = { x: 0, y: 0 };
  private mouseDelta = { x: 0, y: 0 };
  private isMouseLocked = false;

  constructor(private engine: VoxelEngine) {
    super();
    this.setQuery(
      new Query({
        with: [PlayerComponent, InputComponent],
      })
    );
    this.setupInputHandlers();
  }

  private setupInputHandlers(): void {
    // Keyboard input
    window.addEventListener("keydown", (e) => {
      this.keys.add(e.key.toLowerCase());
    });

    window.addEventListener("keyup", (e) => {
      this.keys.delete(e.key.toLowerCase());
    });

    // Mouse input
    window.addEventListener("mousemove", (e) => {
      if (this.isMouseLocked) {
        this.mouseDelta.x = e.movementX;
        this.mouseDelta.y = e.movementY;
      }
      this.mousePos.x = e.clientX;
      this.mousePos.y = e.clientY;
    });

    // Pointer lock
    window.addEventListener("click", () => {
      if (!this.isMouseLocked) {
        this.engine.getCanvas().requestPointerLock();
      }
    });

    document.addEventListener("pointerlockchange", () => {
      this.isMouseLocked =
        document.pointerLockElement === this.engine.getCanvas();
    });
  }

  update(_deltaTime: number): void {
    const entities = this.getEntities();

    for (const entity of entities) {
      const input = this.world.getComponent(entity, InputComponent);
      if (!input) continue;

      // Update movement flags
      input.moveForward = this.keys.has("w");
      input.moveBackward = this.keys.has("s");
      input.moveLeft = this.keys.has("a");
      input.moveRight = this.keys.has("d");
      input.jump = this.keys.has(" "); // Spacebar

      // Update mouse data
      input.mouseX = this.mousePos.x;
      input.mouseY = this.mousePos.y;
      input.mouseDeltaX = this.mouseDelta.x;
      input.mouseDeltaY = this.mouseDelta.y;

      // Reset mouse delta
      this.mouseDelta.x = 0;
      this.mouseDelta.y = 0;
    }
  }
}

/**
 * Camera control system - handles camera following player
 */
export class CameraControlSystem extends System {
  constructor(private engine: VoxelEngine) {
    super();
    this.setQuery(
      new Query({
        with: [PlayerComponent, PositionComponent, InputComponent],
      })
    );
  }

  update(_deltaTime: number): void {
    const entities = this.getEntities();

    for (const entity of entities) {
      const pos = this.world.getComponent(entity, PositionComponent);
      const input = this.world.getComponent(entity, InputComponent);

      if (!pos || !input) continue;

      const camera = this.engine.getCamera();

      // Handle mouse look first
      if (input.mouseDeltaX !== 0 || input.mouseDeltaY !== 0) {
        const lookSpeed = 2 * _deltaTime;
        camera.orbit(
          input.mouseDeltaX * lookSpeed,
          -input.mouseDeltaY * lookSpeed
        );

        // Reset mouse delta
        input.mouseDeltaX = 0;
        input.mouseDeltaY = 0;
      }

      // Update camera to follow player with first-person style
      const cameraPos = camera.getPosition();
      const cameraTarget = camera.getTarget();

      // Calculate forward direction from camera
      const forward = vec3.create();
      vec3.subtract(forward, cameraTarget, cameraPos);
      vec3.normalize(forward, forward);

      // Position camera at player's eye level
      const eyeHeight = 1.8; // Player eye height
      const desiredCameraPos = {
        x: pos.x,
        y: pos.y + eyeHeight,
        z: pos.z,
      };

      // Update camera position smoothly
      const lerpFactor = 0.1;
      cameraPos[0] += (desiredCameraPos.x - cameraPos[0]) * lerpFactor;
      cameraPos[1] += (desiredCameraPos.y - cameraPos[1]) * lerpFactor;
      cameraPos[2] += (desiredCameraPos.z - cameraPos[2]) * lerpFactor;

      // Update camera target to maintain look direction
      cameraTarget[0] = cameraPos[0] + forward[0];
      cameraTarget[1] = cameraPos[1] + forward[1];
      cameraTarget[2] = cameraPos[2] + forward[2];

      camera.setPosition(cameraPos);
      camera.setTarget(cameraTarget);
    }
  }
}
