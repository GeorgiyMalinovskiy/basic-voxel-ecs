import { System, Query, Entity } from "../../ecs";
import { VoxelEngine } from "../../engine";
import { vec3 } from "gl-matrix";
import type { IPhysicsAdapter, PhysicsBodyOptions } from "../../physics";
import { PhysicsAdapterFactory, PhysicsShape } from "../../physics";
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
 * Physics system - handles movement and physics using adapter pattern
 */
export class PhysicsSystem extends System {
  private physicsAdapter: IPhysicsAdapter;
  private entityBodies: Map<string, string> = new Map(); // entityId -> bodyId

  constructor(private engine: VoxelEngine) {
    super();
    this.setQuery(
      new Query({
        with: [PositionComponent, VelocityComponent, PhysicsComponent],
      })
    );

    // Initialize physics adapter (can be easily switched)
    this.physicsAdapter = PhysicsAdapterFactory.create("cannon", {
      gravity: vec3.fromValues(0, -9.82, 0),
      solverIterations: 20, // Increased for better collision detection
      contactMaterial: {
        friction: 0.3,
        restitution: 0.3,
      },
    });

    this.physicsAdapter.initialize();
    this.setupTerrainCollision();
  }

  update(_deltaTime: number): void {
    // Update physics simulation
    this.physicsAdapter.update(_deltaTime);

    // Sync physics bodies with ECS components
    const entities = this.getEntities();

    for (const entity of entities) {
      const pos = this.world.getComponent(entity, PositionComponent);
      const vel = this.world.getComponent(entity, VelocityComponent);
      const physics = this.world.getComponent(entity, PhysicsComponent);

      if (!pos || !vel || !physics) continue;

      const entityId = entity.id.toString();
      let bodyId = this.entityBodies.get(entityId);

      // Create physics body if it doesn't exist
      if (!bodyId) {
        const newBodyId = this.createPhysicsBody(entity, pos, physics);
        if (newBodyId) {
          bodyId = newBodyId;
          this.entityBodies.set(entityId, bodyId);
        }
      }

      if (bodyId) {
        // Update ECS components from physics body
        const bodyPos = this.physicsAdapter.getBodyPosition(bodyId);
        const bodyVel = this.physicsAdapter.getBodyVelocity(bodyId);

        pos.x = bodyPos[0];
        pos.y = bodyPos[1];
        pos.z = bodyPos[2];

        vel.x = bodyVel[0];
        vel.y = bodyVel[1];
        vel.z = bodyVel[2];
      }
    }
  }

  private createPhysicsBody(
    entity: Entity,
    pos: PositionComponent,
    physics: PhysicsComponent
  ): string | null {
    try {
      // Determine body shape based on entity type or physics component
      const shape = PhysicsShape.BOX;
      const mass = physics.mass || 1;

      // Check if entity has voxel component to determine shape
      const voxel = this.world.getComponent(entity, VoxelComponent);
      const scale = this.world.getComponent(entity, ScaleComponent);
      if (voxel) {
        // Use voxel size and scale for body dimensions
        const dimensions = vec3.fromValues(
          voxel.size * (scale?.x || 1),
          voxel.size * (scale?.y || 1),
          voxel.size * (scale?.z || 1)
        );

        const options: PhysicsBodyOptions = {
          material: {
            friction: physics.friction,
            restitution: physics.bounce,
          },
          dimensions: dimensions,
          allowSleep: true,
        };

        return this.physicsAdapter.createBody(
          vec3.fromValues(pos.x, pos.y, pos.z),
          shape,
          mass,
          options
        );
      }

      // Default body for entities without voxel component
      const options: PhysicsBodyOptions = {
        material: {
          friction: physics.friction,
          restitution: physics.bounce,
        },
        dimensions: vec3.fromValues(1, 1, 1),
        allowSleep: true,
      };

      return this.physicsAdapter.createBody(
        vec3.fromValues(pos.x, pos.y, pos.z),
        shape,
        mass,
        options
      );
    } catch (error) {
      console.warn("Failed to create physics body:", error);
      return null;
    }
  }

  private setupTerrainCollision(): void {
    const worldSize = this.engine.getWorldSize();
    this.physicsAdapter.addTerrainCollision(
      (x: number, z: number) => this.getTerrainHeight(x, z),
      worldSize
    );
  }

  private getTerrainHeight(x: number, z: number): number {
    // Simple terrain height calculation matching the engine's terrain generation
    const noise =
      Math.sin(x * 0.1) * Math.cos(z * 0.1) * 10 +
      Math.sin(x * 0.05) * Math.cos(z * 0.05) * 20;
    return Math.max(0, 4 + noise); // Base height 4 + noise
  }

  /**
   * Apply force to an entity
   */
  applyForce(entityId: string, force: vec3, point?: vec3): void {
    const bodyId = this.entityBodies.get(entityId);
    if (bodyId) {
      this.physicsAdapter.applyForce(bodyId, force, point);
    }
  }

  /**
   * Apply impulse to an entity
   */
  applyImpulse(entityId: string, impulse: vec3, point?: vec3): void {
    const bodyId = this.entityBodies.get(entityId);
    if (bodyId) {
      this.physicsAdapter.applyImpulse(bodyId, impulse, point);
    }
  }

  /**
   * Set entity velocity directly
   */
  setVelocity(entityId: string, velocity: vec3): void {
    const bodyId = this.entityBodies.get(entityId);
    if (bodyId) {
      this.physicsAdapter.setBodyVelocity(bodyId, velocity);
    }
  }

  /**
   * Cleanup physics resources
   */
  dispose(): void {
    this.physicsAdapter.dispose();
    this.entityBodies.clear();
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
  constructor(
    private engine: VoxelEngine,
    private physicsSystem: PhysicsSystem
  ) {
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

      const moveSpeed = 20 * _deltaTime; // Reduced movement speed
      const jumpForce = 8; // Reduced jump force

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

      const entityId = entity.id.toString();

      // Handle movement input relative to camera direction using physics forces
      if (input.moveForward) {
        const force = vec3.fromValues(
          forward[0] * moveSpeed * 50, // Reduced force multiplier
          0,
          forward[2] * moveSpeed * 50
        );
        this.physicsSystem.applyForce(entityId, force);
      }
      if (input.moveBackward) {
        const force = vec3.fromValues(
          -forward[0] * moveSpeed * 50,
          0,
          -forward[2] * moveSpeed * 50
        );
        this.physicsSystem.applyForce(entityId, force);
      }
      if (input.moveLeft) {
        const force = vec3.fromValues(
          -right[0] * moveSpeed * 50,
          0,
          -right[2] * moveSpeed * 50
        );
        this.physicsSystem.applyForce(entityId, force);
      }
      if (input.moveRight) {
        const force = vec3.fromValues(
          right[0] * moveSpeed * 50,
          0,
          right[2] * moveSpeed * 50
        );
        this.physicsSystem.applyForce(entityId, force);
      }

      // Handle jump input using physics impulse
      const terrainHeight = this.getTerrainHeight(pos.x, pos.z);
      if (input.jump && pos.y <= terrainHeight + 0.1) {
        // Only jump when on ground
        const impulse = vec3.fromValues(0, jumpForce * 5, 0); // Reduced impulse multiplier
        this.physicsSystem.applyImpulse(entityId, impulse);
      }

      // Apply velocity damping for smoother movement
      const dampingForce = vec3.fromValues(
        -vel.x * 5, // Horizontal damping
        0, // No vertical damping (let gravity handle it)
        -vel.z * 5
      );
      this.physicsSystem.applyForce(entityId, dampingForce);

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
