import { GameEngine } from "@/engine";
import {
  Transform,
  Velocity,
  RigidBody,
  Player,
  VoxelData,
  MeshAlgorithm,
} from "@/components";
import { Octree } from "@/voxel";
import { vec3 } from "gl-matrix";
import { PHYSICS } from "@/constants";

/**
 * Demo scene showing how voxel resolution affects marching cubes smoothness
 * Creates multiple spheres at different resolutions for comparison
 */
export class ResolutionDemoScene {
  /**
   * Initialize the resolution demo scene
   */
  setup(engine: GameEngine): void {
    console.log("Setting up resolution demo scene...");

    const world = engine.getWorld();

    // Create ground plane
    this.createGround(world);

    // Create spheres at different resolutions for comparison
    const spacing = 15;
    const resolutions = [
      { size: 6, label: "6x6x6 - Blocky" },
      { size: 12, label: "12x12x12 - Smooth" },
      { size: 18, label: "18x18x18 - Smoother" },
      { size: 24, label: "24x24x24 - Very Smooth" },
    ];

    resolutions.forEach((config, index) => {
      const xPos = index * spacing;
      this.createSphere(
        world,
        vec3.fromValues(xPos, 0, 0),
        config.size,
        config.label
      );
      console.log(`Created ${config.label} at x=${xPos}`);
    });

    // Create player with camera control
    this.createPlayer(engine);

    console.log("Resolution demo scene ready!");
    console.log("Use WASD to move, mouse to look around");
    console.log("Compare the smoothness of different resolution spheres");
  }

  /**
   * Create a ground plane
   */
  private createGround(world: import("@/ecs").World): void {
    const groundEntity = world.createEntity();
    const octree = new Octree(64, 6);

    // Create a flat ground with some thickness
    for (let x = -10; x < 70; x++) {
      for (let z = -20; z < 20; z++) {
        octree.setVoxel({ x, y: -1, z }, { density: 1.0, material: 2 });
        octree.setVoxel({ x, y: -2, z }, { density: 1.0, material: 2 });
        octree.setVoxel({ x, y: -3, z }, { density: 1.0, material: 2 });
      }
    }

    const voxelData = new VoxelData(octree, true, MeshAlgorithm.CUBIC);
    world.addComponent(groundEntity, voxelData);
  }

  /**
   * Create a sphere at given resolution
   */
  private createSphere(
    world: import("@/ecs").World,
    position: vec3,
    resolution: number,
    label: string
  ): void {
    const entity = world.createEntity();

    // Create octree at specified resolution
    const octree = new Octree(resolution, Math.ceil(Math.log2(resolution)));

    // Calculate sphere parameters based on resolution
    // Keep radius proportional to resolution for fair comparison
    const center = resolution / 2;
    const radius = (resolution / 2) * 0.7; // 70% of half-size

    // Generate sphere with smooth density gradient
    for (let x = 0; x < resolution; x++) {
      for (let y = 0; y < resolution; y++) {
        for (let z = 0; z < resolution; z++) {
          const dx = x - center;
          const dy = y - center;
          const dz = z - center;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (distance <= radius + 1) {
            const normalizedDist = distance / radius;
            // Smooth gradient for better marching cubes
            const density = Math.max(0, 1.0 - Math.pow(normalizedDist, 1.5));

            if (density > 0.05) {
              octree.setVoxel({ x, y, z }, { density, material: 5 });
            }
          }
        }
      }
    }

    // Add components
    // Offset position to account for octree local space
    const offsetPosition = vec3.fromValues(
      position[0] - center,
      position[1] - center,
      position[2] - center
    );

    world.addComponent(entity, new Transform(offsetPosition));
    world.addComponent(
      entity,
      new VoxelData(octree, true, MeshAlgorithm.MARCHING_CUBES)
    );

    console.log(
      `${label}: octree=${resolution}³, radius=${radius.toFixed(1)}, voxels=${
        resolution * resolution * resolution
      }`
    );
  }

  /**
   * Create player entity with camera control
   */
  private createPlayer(engine: GameEngine): void {
    const world = engine.getWorld();
    const player = world.createEntity();

    // Position player to view all spheres
    const startPos = vec3.fromValues(20, 10, 25);

    // Simple marker (invisible player for camera control)
    world.addComponent(player, new Transform(startPos));
    world.addComponent(player, new Velocity(vec3.fromValues(0, 0, 0)));
    world.addComponent(
      player,
      new RigidBody(1, 2, PHYSICS.DEFAULT_FRICTION, false)
    );
    world.addComponent(player, new Player(15, 0.002)); // Faster movement for demo

    console.log("Player created at", startPos);
  }
}
