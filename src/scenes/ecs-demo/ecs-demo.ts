import { BaseScene } from "../base-scene";
import { VoxelEngine } from "../../engine";
import { World } from "../../ecs";
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
} from "./systems";

/**
 * ECS Demo Scene - demonstrates Entity Component System usage
 */
export class ECSDemoScene extends BaseScene {
  name = "ECS Demo";
  description = "Entity Component System with physics, spawning, and rendering";

  private world!: World;
  private systems: any[] = [];

  generate(engine: VoxelEngine): void {
    console.log("Generating ECS demo scene...");

    // Initialize ECS world
    this.world = new World();

    // Create systems
    this.systems = [
      new PhysicsSystem(engine),
      new RotationSystem(),
      new LifetimeSystem(),
      new SpawnerSystem(engine),
      new RenderingSystem(engine),
      new InputSystem(engine),
      new PlayerMovementSystem(engine),
      new CameraControlSystem(engine),
    ];

    // Add systems to world
    for (const system of this.systems) {
      this.world.addSystem(system);
    }

    // Create player entity
    this.createPlayer();

    // Create camera entity
    this.createCamera();

    // Create spawner entities
    this.createSpawners();

    // Generate initial terrain
    engine.generateTerrain(20, 4);

    // Create some initial entities
    this.createInitialEntities();

    // Set the world on the engine for systems to use
    (engine as any).world = this.world;

    // Disable engine input handling since we're using ECS input system
    engine.disableInput();

    console.log("ECS demo scene generated");
  }

  cleanup(engine: VoxelEngine): void {
    // Clean up ECS world
    if (this.world) {
      // Systems will be cleaned up automatically
      this.world = null as any;
    }
    (engine as any).world = null;

    // Re-enable engine input handling
    engine.enableInput();
  }

  private createPlayer(): void {
    const player = this.world.createEntity();
    this.world.addComponent(player, new PlayerComponent(100));
    this.world.addComponent(player, new PositionComponent(10, 5, 10));
    this.world.addComponent(player, new VelocityComponent(0, 0, 0));
    this.world.addComponent(player, new VoxelComponent("box", 1, 1));
    this.world.addComponent(player, new ScaleComponent(1, 2, 1));
    this.world.addComponent(player, new PhysicsComponent(2, 0.8, 0.2, true));
    this.world.addComponent(player, new InputComponent());
  }

  private createCamera(): void {
    const camera = this.world.createEntity();
    this.world.addComponent(camera, new CameraComponent(75, 0.1, 1000));
    this.world.addComponent(camera, new PositionComponent(15, 8, 15));
  }

  private createSpawners(): void {
    // Sphere spawner
    const sphereSpawner = this.world.createEntity();
    this.world.addComponent(sphereSpawner, new PositionComponent(5, 2, 5));
    this.world.addComponent(
      sphereSpawner,
      new SpawnerComponent("sphere", 0.5, 0, 8)
    );

    // Box spawner
    const boxSpawner = this.world.createEntity();
    this.world.addComponent(boxSpawner, new PositionComponent(15, 2, 15));
    this.world.addComponent(boxSpawner, new SpawnerComponent("box", 0.3, 0, 6));
  }

  private createInitialEntities(): void {
    // Create some initial spheres
    for (let i = 0; i < 3; i++) {
      const entity = this.world.createEntity();
      this.world.addComponent(
        entity,
        new PositionComponent(
          Math.random() * 10 + 5,
          Math.random() * 5 + 8,
          Math.random() * 10 + 5
        )
      );
      this.world.addComponent(
        entity,
        new VelocityComponent(
          (Math.random() - 0.5) * 5,
          Math.random() * 3,
          (Math.random() - 0.5) * 5
        )
      );
      this.world.addComponent(entity, new RotationComponent());
      this.world.addComponent(entity, new ScaleComponent(0.8, 0.8, 0.8));
      this.world.addComponent(
        entity,
        new VoxelComponent("sphere", Math.floor(Math.random() * 3) + 1, 1)
      );
      this.world.addComponent(entity, new PhysicsComponent(1, 0.9, 0.6, true));
      this.world.addComponent(entity, new LifetimeComponent(20));
    }

    // Create some initial boxes
    for (let i = 0; i < 2; i++) {
      const entity = this.world.createEntity();
      this.world.addComponent(
        entity,
        new PositionComponent(
          Math.random() * 10 + 10,
          Math.random() * 3 + 6,
          Math.random() * 10 + 10
        )
      );
      this.world.addComponent(
        entity,
        new VelocityComponent(
          (Math.random() - 0.5) * 3,
          Math.random() * 2,
          (Math.random() - 0.5) * 3
        )
      );
      this.world.addComponent(entity, new RotationComponent());
      this.world.addComponent(entity, new ScaleComponent(1.2, 1.2, 1.2));
      this.world.addComponent(
        entity,
        new VoxelComponent("box", Math.floor(Math.random() * 3) + 1, 1)
      );
      this.world.addComponent(
        entity,
        new PhysicsComponent(1.5, 0.8, 0.4, true)
      );
      this.world.addComponent(entity, new LifetimeComponent(25));
    }
  }

  /**
   * Get the ECS world for external access
   */
  getWorld(): World {
    return this.world;
  }

  /**
   * Get all systems
   */
  getSystems(): any[] {
    return this.systems;
  }
}
