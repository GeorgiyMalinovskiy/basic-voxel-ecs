import { World, System, Query } from "@/ecs";
import { VoxelEngine } from "@/engine";
import { BaseScene } from "@/scenes/base-scene";
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
  PhysicsSystem,
  RotationSystem,
  LifetimeSystem,
  SpawnerSystem,
  RenderingSystem,
  PlayerMovementSystem,
  CameraControlSystem,
  InputSystem,
  MazeGenerationSystem,
  CollectibleSystem,
} from "./systems";

/**
 * ECS Marching Cubes Demo Scene
 * Demonstrates ECS architecture with marching cubes rendering and maze generation
 */
export class ECSMarchingCubesDemoScene extends BaseScene {
  name = "ECS Marching Cubes Demo";
  description =
    "ECS architecture with marching cubes rendering and maze generation";

  private world: World;
  private systems: System[] = [];
  private physicsSystem!: PhysicsSystem;
  private cameraSystem!: CameraControlSystem;
  private inputSystem!: InputSystem;

  constructor() {
    super();
    this.world = new World();
  }

  generate(engine: VoxelEngine): void {
    console.log("Generating ECS Marching Cubes Demo Scene...");

    // Initialize systems
    this.physicsSystem = new PhysicsSystem();
    this.cameraSystem = new CameraControlSystem(engine);
    this.inputSystem = new InputSystem(engine);

    this.systems = [
      this.inputSystem,
      this.cameraSystem,
      this.physicsSystem,
      new PlayerMovementSystem(this.physicsSystem, this.cameraSystem),
      new RotationSystem(),
      new LifetimeSystem(),
      new SpawnerSystem(),
      new RenderingSystem(engine),
      new MazeGenerationSystem(engine),
      new CollectibleSystem(),
    ];

    // Add systems to world
    for (const system of this.systems) {
      this.world.addSystem(system);
    }

    // Don't generate terrain - let the maze generation system handle everything

    // Create player
    this.createPlayer();

    // Create camera
    this.createCamera();

    // Create maze
    this.createMaze();

    // Create spawners
    this.createSpawners();

    // Create initial collectibles
    this.createInitialCollectibles();

    // Disable engine input handling
    engine.disableInput();

    // Set up input handling
    this.setupInputHandling(engine);

    // Set initial camera position to player position
    const player = this.world.queryEntities(
      new Query({ with: [PlayerComponent, PositionComponent] })
    )[0];
    if (player) {
      const playerPos = this.world.getComponent(player, PositionComponent);
      if (playerPos) {
        const camera = engine.getCamera();
        camera.setPosition(
          vec3.fromValues(playerPos.x, playerPos.y + 1.5, playerPos.z)
        );
        camera.setTarget(
          vec3.fromValues(playerPos.x, playerPos.y + 1.5, playerPos.z + 1)
        );
      }
    }

    console.log("ECS Marching Cubes Demo Scene generated successfully!");
  }

  cleanup(engine: VoxelEngine): void {
    console.log("Cleaning up ECS Marching Cubes Demo Scene...");

    // Clean up physics
    this.physicsSystem.dispose();

    // Re-enable engine input
    engine.enableInput();

    // Remove input listeners
    this.removeInputHandling();

    console.log("ECS Marching Cubes Demo Scene cleaned up!");
  }

  update(deltaTime: number): void {
    // Update all systems
    for (const system of this.systems) {
      system.update(deltaTime);
    }
  }

  private createPlayer(): void {
    const player = this.world.createEntity();
    this.world.addComponent(player, new PlayerComponent(8.0, 12.0));
    this.world.addComponent(player, new InputComponent());
    this.world.addComponent(player, new PositionComponent(0, 10, 0));
    this.world.addComponent(player, new VelocityComponent(0, 0, 0));
    this.world.addComponent(player, new RotationComponent(0, 0, 0));
    this.world.addComponent(player, new ScaleComponent(1, 2, 1));
    this.world.addComponent(player, new VoxelComponent(1, 2)); // Dirt material
    this.world.addComponent(player, new PhysicsComponent(1, 0.9, 0.1, true));
  }

  private createCamera(): void {
    const camera = this.world.createEntity();
    this.world.addComponent(camera, new CameraComponent(75, 0.1, 1000));
    this.world.addComponent(camera, new PositionComponent(0, 12, 0));
    this.world.addComponent(camera, new RotationComponent(0, 0, 0));
  }

  private createMaze(): void {
    const maze = this.world.createEntity();
    this.world.addComponent(maze, new MazeComponent(20, 20, 4, 1));
    this.world.addComponent(maze, new PositionComponent(0, 0, 0));
  }

  private createSpawners(): void {
    // Create spawners at various locations
    const spawnerPositions = [
      { x: 5, y: 8, z: 5 },
      { x: -5, y: 8, z: 5 },
      { x: 5, y: 8, z: -5 },
      { x: -5, y: 8, z: -5 },
    ];

    for (const pos of spawnerPositions) {
      const spawner = this.world.createEntity();
      this.world.addComponent(spawner, new SpawnerComponent(3.0, 0, 5));
      this.world.addComponent(
        spawner,
        new PositionComponent(pos.x, pos.y, pos.z)
      );
    }
  }

  private createInitialCollectibles(): void {
    // Create some initial collectibles scattered around
    const collectiblePositions = [
      { x: 2, y: 6, z: 2 },
      { x: -2, y: 6, z: 2 },
      { x: 2, y: 6, z: -2 },
      { x: -2, y: 6, z: -2 },
      { x: 0, y: 6, z: 4 },
      { x: 4, y: 6, z: 0 },
      { x: 0, y: 6, z: -4 },
      { x: -4, y: 6, z: 0 },
    ];

    for (const pos of collectiblePositions) {
      const collectible = this.world.createEntity();
      this.world.addComponent(
        collectible,
        new PositionComponent(pos.x, pos.y, pos.z)
      );
      this.world.addComponent(collectible, new ScaleComponent(0.5, 0.5, 0.5));
      this.world.addComponent(collectible, new VoxelComponent(1, 4)); // Gold material
      this.world.addComponent(
        collectible,
        new PhysicsComponent(0.5, 0.8, 0.2, true)
      );
      this.world.addComponent(collectible, new LifetimeComponent(60.0));
      this.world.addComponent(collectible, new CollectibleComponent(1, false));
    }
  }

  private setupInputHandling(engine: VoxelEngine): void {
    // Keyboard input
    const handleKeyDown = (e: KeyboardEvent) => {
      this.inputSystem.handleKeyDown(e.key);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      this.inputSystem.handleKeyUp(e.key);
    };

    // Mouse input
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.movementX || 0;
      const deltaY = e.movementY || 0;
      this.inputSystem.handleMouseMove(deltaX, deltaY);

      // Update camera rotation
      const player = this.world.queryEntities(
        new Query({ with: [PlayerComponent, RotationComponent] })
      )[0];
      if (player) {
        this.cameraSystem.updateCameraRotation(player, deltaX, deltaY);
      }
    };

    // Mouse click for pointer lock
    const handleMouseClick = (e: MouseEvent) => {
      if (e.button === 0) {
        // Left click
        const canvas = document.querySelector("canvas");
        if (canvas && document.pointerLockElement !== canvas) {
          canvas.requestPointerLock();
        }
      }
    };

    // Add event listeners
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("click", handleMouseClick);

    // Store references for cleanup
    (this as any).handleKeyDown = handleKeyDown;
    (this as any).handleKeyUp = handleKeyUp;
    (this as any).handleMouseMove = handleMouseMove;
    (this as any).handleMouseClick = handleMouseClick;
  }

  private removeInputHandling(): void {
    // Remove event listeners
    if ((this as any).handleKeyDown) {
      document.removeEventListener("keydown", (this as any).handleKeyDown);
    }
    if ((this as any).handleKeyUp) {
      document.removeEventListener("keyup", (this as any).handleKeyUp);
    }
    if ((this as any).handleMouseMove) {
      document.removeEventListener("mousemove", (this as any).handleMouseMove);
    }
    if ((this as any).handleMouseClick) {
      document.removeEventListener("click", (this as any).handleMouseClick);
    }
  }

  getWorld(): World {
    return this.world;
  }

  getSystems(): System[] {
    return this.systems;
  }
}
