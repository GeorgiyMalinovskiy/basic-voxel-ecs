import { System, Query, World, Entity } from "@/ecs";
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
  CameraComponent,
  InputComponent,
  MazeComponent,
  CollectibleComponent,
} from "./components";
import {
  PhysicsAdapterFactory,
  IPhysicsAdapter,
  PhysicsBodyOptions,
  PhysicsShape,
} from "../../physics";
import { VoxelEngine } from "../../engine";

/**
 * Physics system for ECS entities
 */
export class PhysicsSystem extends System {
  private physicsAdapter: IPhysicsAdapter;
  private entityToBodyId = new Map<Entity, string>();
  private bodyIdToEntity = new Map<string, Entity>();

  constructor() {
    super();
    this.setQuery(
      new Query({
        with: [PositionComponent, VelocityComponent, PhysicsComponent],
      })
    );

    // Initialize physics adapter
    this.physicsAdapter = PhysicsAdapterFactory.create("cannon", {
      gravity: vec3.fromValues(0, -9.82, 0),
      solverIterations: 20,
      contactMaterial: {
        friction: 0.3,
        restitution: 0.3,
      },
    });

    this.physicsAdapter.initialize();
    this.setupTerrainCollision();
  }

  private setupTerrainCollision(): void {
    // Add a simple floor plane
    this.physicsAdapter.addTerrainCollision((x: number, z: number) => {
      // Simple height function for maze floor
      return 0; // Flat floor at Y=0
    }, 30);
  }

  update(deltaTime: number): void {
    // Create physics bodies for entities that don't have them
    for (const entity of this.getEntities()) {
      const position = this.world.getComponent(entity, PositionComponent);
      const physics = this.world.getComponent(entity, PhysicsComponent);

      // Only create physics body if entity has required components
      if (position && physics) {
        const bodyId = this.entityToBodyId.get(entity);
        if (!bodyId) {
          this.createPhysicsBody(entity);
        }
      }
    }

    // Update physics simulation
    this.physicsAdapter.update(deltaTime);

    // Sync ECS components from physics bodies
    for (const entity of this.getEntities()) {
      const bodyId = this.entityToBodyId.get(entity);
      if (bodyId) {
        try {
          const position = this.physicsAdapter.getBodyPosition(bodyId);
          const velocity = this.physicsAdapter.getBodyVelocity(bodyId);

          const posComp = this.world.getComponent(entity, PositionComponent);
          const velComp = this.world.getComponent(entity, VelocityComponent);

          if (posComp) {
            posComp.x = position[0];
            posComp.y = position[1];
            posComp.z = position[2];
          }

          if (velComp) {
            velComp.x = velocity[0];
            velComp.y = velocity[1];
            velComp.z = velocity[2];
          }
        } catch (error) {
          // Body not found, remove from tracking and recreate
          console.warn(
            `Physics body not found for entity ${entity}, recreating...`
          );
          this.entityToBodyId.delete(entity);
          this.bodyIdToEntity.delete(bodyId);
          this.createPhysicsBody(entity);
        }
      }
    }
  }

  createPhysicsBody(entity: Entity): void {
    const position = this.world.getComponent(entity, PositionComponent);
    const physics = this.world.getComponent(entity, PhysicsComponent);
    const voxel = this.world.getComponent(entity, VoxelComponent);
    const scale = this.world.getComponent(entity, ScaleComponent);

    if (!position || !physics) return;

    const pos = vec3.fromValues(position.x, position.y, position.z);

    // Determine shape and dimensions
    let shape = PhysicsShape.BOX;
    let dimensions = vec3.fromValues(1, 1, 1);

    if (voxel) {
      dimensions = vec3.fromValues(
        voxel.size * (scale?.x || 1),
        voxel.size * (scale?.y || 1),
        voxel.size * (scale?.z || 1)
      );
    }

    const options: PhysicsBodyOptions = {
      material: {
        friction: physics.friction,
        restitution: physics.bounce,
      },
      dimensions: dimensions,
      allowSleep: true,
    };

    const bodyId = this.physicsAdapter.createBody(
      pos,
      shape,
      physics.mass,
      options
    );
    this.entityToBodyId.set(entity, bodyId);
    this.bodyIdToEntity.set(bodyId, entity);
  }

  applyForce(entity: Entity, force: vec3): void {
    const bodyId = this.entityToBodyId.get(entity);
    if (bodyId) {
      this.physicsAdapter.applyForce(bodyId, force);
    }
  }

  applyImpulse(entity: Entity, impulse: vec3): void {
    const bodyId = this.entityToBodyId.get(entity);
    if (bodyId) {
      this.physicsAdapter.applyImpulse(bodyId, impulse);
    }
  }

  setVelocity(entity: Entity, velocity: vec3): void {
    const bodyId = this.entityToBodyId.get(entity);
    if (bodyId) {
      this.physicsAdapter.setBodyVelocity(bodyId, velocity);
    }
  }

  dispose(): void {
    this.physicsAdapter.dispose();
  }
}

/**
 * Rotation system for ECS entities
 */
export class RotationSystem extends System {
  constructor() {
    super();
    this.setQuery(
      new Query({
        with: [RotationComponent, VelocityComponent],
      })
    );
  }

  update(deltaTime: number): void {
    for (const entity of this.getEntities()) {
      const rotation = this.world.getComponent(entity, RotationComponent);
      const velocity = this.world.getComponent(entity, VelocityComponent);

      if (rotation && velocity) {
        // Simple rotation based on velocity
        rotation.x += velocity.x * deltaTime * 0.1;
        rotation.y += velocity.y * deltaTime * 0.1;
        rotation.z += velocity.z * deltaTime * 0.1;
      }
    }
  }
}

/**
 * Lifetime system for ECS entities
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

  update(deltaTime: number): void {
    const entitiesToRemove: Entity[] = [];

    for (const entity of this.getEntities()) {
      const lifetime = this.world.getComponent(entity, LifetimeComponent);
      if (lifetime) {
        lifetime.timeLeft -= deltaTime;
        if (lifetime.timeLeft <= 0) {
          entitiesToRemove.push(entity);
        }
      }
    }

    // Remove expired entities
    for (const entity of entitiesToRemove) {
      this.world.destroyEntity(entity);
    }
  }
}

/**
 * Spawner system for ECS entities
 */
export class SpawnerSystem extends System {
  constructor() {
    super();
    this.setQuery(
      new Query({
        with: [SpawnerComponent, PositionComponent],
      })
    );
  }

  update(deltaTime: number): void {
    for (const entity of this.getEntities()) {
      const spawner = this.world.getComponent(entity, SpawnerComponent);
      const position = this.world.getComponent(entity, PositionComponent);

      if (spawner && position) {
        spawner.lastSpawn += deltaTime;

        if (spawner.lastSpawn >= spawner.spawnRate) {
          // Count existing entities with lifetime
          const existingCount = this.world.queryEntities(
            new Query({ with: [LifetimeComponent] })
          ).length;

          if (existingCount < spawner.maxEntities) {
            this.spawnCollectible(position.x, position.y, position.z);
            spawner.lastSpawn = 0;
          }
        }
      }
    }
  }

  private spawnCollectible(x: number, y: number, z: number): void {
    const collectible = this.world.createEntity();
    this.world.addComponent(collectible, new PositionComponent(x, y, z));
    this.world.addComponent(collectible, new ScaleComponent(0.5, 0.5, 0.5));
    this.world.addComponent(collectible, new VoxelComponent(1, 4)); // Gold material
    this.world.addComponent(
      collectible,
      new PhysicsComponent(0.5, 0.8, 0.2, true)
    );
    this.world.addComponent(collectible, new LifetimeComponent(30.0));
    this.world.addComponent(collectible, new CollectibleComponent(1, false));
  }
}

/**
 * Rendering system for ECS entities
 */
export class RenderingSystem extends System {
  private engine: VoxelEngine;
  private terrainGenerated = false;
  private lastEntityCount = 0;

  constructor(engine: VoxelEngine) {
    super();
    this.engine = engine;
    this.setQuery(
      new Query({
        with: [PositionComponent, VoxelComponent],
      })
    );
  }

  update(_deltaTime: number): void {
    const entities = this.getEntities();
    const currentEntityCount = entities.length;

    // Only regenerate if entity count changed and maze is already generated
    if (this.terrainGenerated && currentEntityCount !== this.lastEntityCount) {
      // Clear previous entity voxels
      this.engine.clearVoxels();

      // Generate voxels for entities
      for (const entity of entities) {
        const position = this.world.getComponent(entity, PositionComponent);
        const voxel = this.world.getComponent(entity, VoxelComponent);
        const scale = this.world.getComponent(entity, ScaleComponent);

        if (position && voxel) {
          const size = voxel.size * (scale?.x || 1);
          const material = voxel.material;

          // Generate voxel at entity position
          this.engine.generateBox(
            { x: position.x, y: position.y, z: position.z },
            {
              x: position.x + size,
              y: position.y + size,
              z: position.z + size,
            },
            material
          );
        }
      }

      this.lastEntityCount = currentEntityCount;
    } else if (!this.terrainGenerated) {
      // Mark as generated once maze system has run
      this.terrainGenerated = true;
    }
  }
}

/**
 * Player movement system for ECS entities
 */
export class PlayerMovementSystem extends System {
  private physicsSystem: PhysicsSystem;
  private cameraSystem: CameraControlSystem;

  constructor(physicsSystem: PhysicsSystem, cameraSystem: CameraControlSystem) {
    super();
    this.physicsSystem = physicsSystem;
    this.cameraSystem = cameraSystem;
    this.setQuery(
      new Query({
        with: [PlayerComponent, InputComponent, PositionComponent],
      })
    );
  }

  update(deltaTime: number): void {
    for (const entity of this.getEntities()) {
      const player = this.world.getComponent(entity, PlayerComponent);
      const input = this.world.getComponent(entity, InputComponent);
      const position = this.world.getComponent(entity, PositionComponent);

      if (player && input && position) {
        // Get camera forward and right vectors
        const camera = this.cameraSystem.getCameraEntity();
        if (camera) {
          const cameraPos = this.world.getComponent(camera, PositionComponent);
          const cameraRot = this.world.getComponent(camera, RotationComponent);

          if (cameraPos && cameraRot) {
            // Calculate movement vectors based on camera orientation
            const forward = vec3.fromValues(
              Math.sin(cameraRot.y),
              0,
              Math.cos(cameraRot.y)
            );
            const right = vec3.fromValues(
              Math.cos(cameraRot.y),
              0,
              -Math.sin(cameraRot.y)
            );

            // Calculate movement force
            const moveForce = vec3.create();
            if (input.forward) vec3.add(moveForce, moveForce, forward);
            if (input.backward) vec3.sub(moveForce, moveForce, forward);
            if (input.right) vec3.add(moveForce, moveForce, right);
            if (input.left) vec3.sub(moveForce, moveForce, right);

            // Apply movement force
            if (vec3.length(moveForce) > 0) {
              vec3.normalize(moveForce, moveForce);
              vec3.scale(moveForce, moveForce, player.speed * 10);
              this.physicsSystem.applyForce(entity, moveForce);
            }

            // Handle jumping
            if (input.jump) {
              const jumpImpulse = vec3.fromValues(0, player.jumpForce * 5, 0);
              this.physicsSystem.applyImpulse(entity, jumpImpulse);
              input.jump = false; // Reset jump input
            }

            // Apply velocity damping for smoother movement
            const velocity = this.world.getComponent(entity, VelocityComponent);
            if (velocity) {
              velocity.x *= 0.9; // Horizontal damping
              velocity.z *= 0.9; // Horizontal damping
              this.physicsSystem.setVelocity(
                entity,
                vec3.fromValues(velocity.x, velocity.y, velocity.z)
              );
            }
          }
        }
      }
    }
  }
}

/**
 * Camera control system for ECS entities
 */
export class CameraControlSystem extends System {
  private cameraEntity: Entity | null = null;
  private engine: VoxelEngine;

  constructor(engine: VoxelEngine) {
    super();
    this.engine = engine;
    this.setQuery(
      new Query({
        with: [CameraComponent, PositionComponent, RotationComponent],
      })
    );
  }

  update(deltaTime: number): void {
    // Find player entity to follow
    const players = this.world.queryEntities(
      new Query({
        with: [PlayerComponent, PositionComponent, RotationComponent],
      })
    );

    if (players.length > 0) {
      const player = players[0];
      const playerPos = this.world.getComponent(player, PositionComponent);
      const playerRot = this.world.getComponent(player, RotationComponent);

      if (playerPos && playerRot) {
        // Update engine camera to follow player
        const engineCamera = this.engine.getCamera();
        engineCamera.setPosition(
          vec3.fromValues(playerPos.x, playerPos.y + 1.5, playerPos.z)
        ); // Eye height
        engineCamera.setTarget(
          vec3.fromValues(
            playerPos.x + Math.sin(playerRot.y) * Math.cos(playerRot.x),
            playerPos.y + 1.5 + Math.sin(playerRot.x),
            playerPos.z + Math.cos(playerRot.y) * Math.cos(playerRot.x)
          )
        );
        this.cameraEntity = player;
      }
    }
  }

  getCameraEntity(): Entity | null {
    return this.cameraEntity;
  }

  updateCameraRotation(entity: Entity, deltaX: number, deltaY: number): void {
    const rotation = this.world.getComponent(entity, RotationComponent);
    if (rotation) {
      rotation.y += deltaX * 0.002;
      rotation.x += deltaY * 0.002;
      rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotation.x));
    }
  }
}

/**
 * Input system for ECS entities
 */
export class InputSystem extends System {
  private engine: VoxelEngine;

  constructor(engine: VoxelEngine) {
    super();
    this.engine = engine;
    this.setQuery(
      new Query({
        with: [InputComponent],
      })
    );
  }

  update(_deltaTime: number): void {
    // This system would typically capture input from the engine
    // For now, it's a placeholder that could be expanded
  }

  handleKeyDown(key: string): void {
    for (const entity of this.getEntities()) {
      const input = this.world.getComponent(entity, InputComponent);
      if (input) {
        switch (key.toLowerCase()) {
          case "w":
            input.forward = true;
            break;
          case "s":
            input.backward = true;
            break;
          case "a":
            input.left = true;
            break;
          case "d":
            input.right = true;
            break;
          case " ":
            input.jump = true;
            break;
        }
      }
    }
  }

  handleKeyUp(key: string): void {
    for (const entity of this.getEntities()) {
      const input = this.world.getComponent(entity, InputComponent);
      if (input) {
        switch (key.toLowerCase()) {
          case "w":
            input.forward = false;
            break;
          case "s":
            input.backward = false;
            break;
          case "a":
            input.left = false;
            break;
          case "d":
            input.right = false;
            break;
        }
      }
    }
  }

  handleMouseMove(deltaX: number, deltaY: number): void {
    for (const entity of this.getEntities()) {
      const input = this.world.getComponent(entity, InputComponent);
      if (input) {
        input.mouseDeltaX = deltaX;
        input.mouseDeltaY = deltaY;
      }
    }
  }
}

/**
 * Maze generation system for ECS entities
 */
export class MazeGenerationSystem extends System {
  private engine: VoxelEngine;
  private mazeGenerated = false;

  constructor(engine: VoxelEngine) {
    super();
    this.engine = engine;
    this.setQuery(
      new Query({
        with: [MazeComponent, PositionComponent],
      })
    );
  }

  update(_deltaTime: number): void {
    if (!this.mazeGenerated) {
      for (const entity of this.getEntities()) {
        const maze = this.world.getComponent(entity, MazeComponent);
        const position = this.world.getComponent(entity, PositionComponent);

        if (maze && position) {
          this.generateMaze(maze, position);
          this.mazeGenerated = true;
          break; // Only generate once
        }
      }
    }
  }

  private generateMaze(maze: MazeComponent, position: PositionComponent): void {
    // Simple maze generation using recursive backtracking
    const width = maze.width;
    const height = maze.height;
    const wallHeight = maze.wallHeight;
    const wallThickness = maze.wallThickness;

    // Create maze grid
    const grid: boolean[][] = [];
    for (let x = 0; x < width; x++) {
      grid[x] = [];
      for (let z = 0; z < height; z++) {
        grid[x][z] = true; // Start with all walls
      }
    }

    // Generate maze using recursive backtracking
    this.generateMazeRecursive(grid, 1, 1, width - 2, height - 2);

    // Build voxel walls and floor
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < height; z++) {
        if (grid[x][z]) {
          // Create wall
          this.engine.generateBox(
            {
              x: position.x + x - width / 2,
              y: position.y,
              z: position.z + z - height / 2,
            },
            {
              x: position.x + x - width / 2 + wallThickness,
              y: position.y + wallHeight,
              z: position.z + z - height / 2 + wallThickness,
            },
            1 // Stone material
          );
        } else {
          // Create floor for open spaces
          this.engine.generateBox(
            {
              x: position.x + x - width / 2,
              y: position.y - 1,
              z: position.z + z - height / 2,
            },
            {
              x: position.x + x - width / 2 + 1,
              y: position.y,
              z: position.z + z - height / 2 + 1,
            },
            2 // Dirt material
          );
        }
      }
    }
  }

  private generateMazeRecursive(
    grid: boolean[][],
    startX: number,
    startZ: number,
    endX: number,
    endZ: number
  ): void {
    if (startX >= endX || startZ >= endZ) return;

    // Mark current cell as path
    grid[startX][startZ] = false;

    // Define directions (up, right, down, left)
    const directions = [
      [0, -2], // up
      [2, 0], // right
      [0, 2], // down
      [-2, 0], // left
    ];

    // Shuffle directions
    for (let i = directions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [directions[i], directions[j]] = [directions[j], directions[i]];
    }

    // Try each direction
    for (const [dx, dz] of directions) {
      const newX = startX + dx;
      const newZ = startZ + dz;

      if (
        newX > 0 &&
        newX < grid.length - 1 &&
        newZ > 0 &&
        newZ < grid[0].length - 1
      ) {
        if (grid[newX][newZ]) {
          // Mark the cell between current and new as path
          grid[startX + dx / 2][startZ + dz / 2] = false;
          // Recursively generate from new cell
          this.generateMazeRecursive(grid, newX, newZ, endX, endZ);
        }
      }
    }
  }
}

/**
 * Collectible system for ECS entities
 */
export class CollectibleSystem extends System {
  constructor() {
    super();
    this.setQuery(
      new Query({
        with: [CollectibleComponent, PositionComponent],
      })
    );
  }

  update(_deltaTime: number): void {
    // Check for player-collectible collisions
    const players = this.world.queryEntities(
      new Query({ with: [PlayerComponent, PositionComponent] })
    );

    for (const player of players) {
      const playerPos = this.world.getComponent(player, PositionComponent);
      if (!playerPos) continue;

      for (const collectible of this.getEntities()) {
        const collectibleComp = this.world.getComponent(
          collectible,
          CollectibleComponent
        );
        const collectiblePos = this.world.getComponent(
          collectible,
          PositionComponent
        );

        if (collectibleComp && collectiblePos && !collectibleComp.collected) {
          // Check distance
          const distance = Math.sqrt(
            Math.pow(playerPos.x - collectiblePos.x, 2) +
              Math.pow(playerPos.y - collectiblePos.y, 2) +
              Math.pow(playerPos.z - collectiblePos.z, 2)
          );

          if (distance < 2.0) {
            // Collect the item
            collectibleComp.collected = true;
            this.world.destroyEntity(collectible);
            console.log("Collected item! Score:", collectibleComp.value);
          }
        }
      }
    }
  }
}
