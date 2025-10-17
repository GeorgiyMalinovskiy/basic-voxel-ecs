import { GameEngine } from "@/engine";
import { MazeGenerator } from "@/utils/MazeGenerator";
import {
  Transform,
  Velocity,
  RigidBody,
  Player,
  VoxelMesh,
  VoxelData,
  MeshAlgorithm,
} from "@/components";
import { VoxelMeshGenerator, Octree } from "@/voxel";
import { vec3 } from "gl-matrix";

/**
 * Maze demo scene with player
 */
export class MazeScene {
  private mazeWidth = 31; // Odd numbers work best
  private mazeHeight = 31;

  /**
   * Initialize the maze scene
   */
  setup(engine: GameEngine): void {
    console.log("Setting up maze scene...");

    // Generate maze
    const mazeGen = new MazeGenerator(this.mazeWidth, this.mazeHeight);
    const maze = mazeGen.generate();

    // Create terrain entity and build maze
    this.buildMaze(engine, maze);

    // Create player entity
    this.createPlayer(engine);

    console.log("Maze scene ready!");
  }

  /**
   * Build maze geometry from maze data with thick walls for marching cubes
   * Creates terrain as a regular ECS entity - just like any other entity!
   */
  private buildMaze(engine: GameEngine, maze: boolean[][]): void {
    const wallHeight = 2;
    const wallThickness = 1; // Thicker walls for more solid appearance

    // Create terrain entity - just a regular entity with VoxelData component!
    const world = engine.getWorld();
    const terrainEntity = world.createEntity();
    const octree = new Octree(64, 6);
    // Use smooth marching cubes for organic cave-like appearance
    const voxelData = new VoxelData(octree, true, MeshAlgorithm.MARCHING_CUBES);
    world.addComponent(terrainEntity, voxelData);

    // First, create a solid floor across the entire maze
    for (let x = -2; x < maze[0].length * 2 + 2; x++) {
      for (let z = -2; z < maze.length * 2 + 2; z++) {
        octree.setVoxel({ x, y: -1, z }, { density: 1.0, material: 2 });
        octree.setVoxel({ x, y: -2, z }, { density: 1.0, material: 2 });
      }
    }

    // Build walls with much higher density and less falloff
    for (let z = 0; z < maze.length; z++) {
      for (let x = 0; x < maze[z].length; x++) {
        if (maze[z][x]) {
          // Create solid walls with slight organic variation
          for (let y = 0; y < wallHeight; y++) {
            for (let dx = -wallThickness; dx <= wallThickness; dx++) {
              for (let dz = -wallThickness; dz <= wallThickness; dz++) {
                // Distance from center of wall
                const dist = Math.sqrt(dx * dx + dz * dz);
                // Very subtle noise for slight organic feel
                const noise =
                  Math.sin(x * 0.3 + dx * 0.5) *
                  Math.cos(z * 0.3 + dz * 0.5) *
                  0.15;
                // Much higher base density with gentle falloff
                const density = Math.max(
                  0.3,
                  1.0 - dist / (wallThickness + 3) + noise
                );

                // Set voxel with high density for solid appearance
                octree.setVoxel(
                  { x: x * 2 + dx, y, z: z * 2 + dz },
                  { density: Math.min(1.0, density), material: 1 }
                );
              }
            }
          }
        }
      }
    }

    // Add decorative pillars and spheres to showcase marching cubes
    for (let z = 2; z < maze.length - 2; z++) {
      for (let x = 2; x < maze[z].length - 2; x++) {
        if (!maze[z][x]) {
          // Count walls around this position
          const wallCount =
            (maze[z - 1][x] ? 1 : 0) +
            (maze[z + 1][x] ? 1 : 0) +
            (maze[z][x - 1] ? 1 : 0) +
            (maze[z][x + 1] ? 1 : 0);

          // Dead end (3 walls) - add sphere to show marching cubes smoothing
          if (wallCount === 3 && Math.random() < 0.4) {
            this.generateSphere(
              octree,
              { x: x * 2, y: 1.5, z: z * 2 },
              1.5,
              Math.floor(Math.random() * 3) + 3
            );
          }
          // Intersections (2 walls) - occasional pillar
          else if (wallCount === 2 && Math.random() < 0.1) {
            this.generateSphere(octree, { x: x * 2, y: 1, z: z * 2 }, 1.2, 4);
          }
        }
      }
    }

    // Mark terrain as needing mesh generation
    voxelData.markDirty();
  }

  /**
   * Helper: Generate a sphere in an octree
   */
  private generateSphere(
    octree: any,
    center: { x: number; y: number; z: number },
    radius: number,
    material: number
  ): void {
    for (let x = center.x - radius; x <= center.x + radius; x++) {
      for (let y = center.y - radius; y <= center.y + radius; y++) {
        for (let z = center.z - radius; z <= center.z + radius; z++) {
          const distance = Math.sqrt(
            (x - center.x) ** 2 + (y - center.y) ** 2 + (z - center.z) ** 2
          );
          if (distance <= radius) {
            const density = Math.max(0, 1 - distance / radius);
            octree.setVoxel({ x, y, z }, { density, material });
          }
        }
      }
    }
  }

  /**
   * Create player entity
   */
  private createPlayer(engine: GameEngine): void {
    const world = engine.getWorld();
    const player = world.createEntity();

    // Start position (center of start area, on the floor)
    // The octree mesh is in local space (0-12), with sphere center at (6, 3.5, 6)
    // World = Local + Transform, so Transform = World - Local
    // We want the sphere center at world (4, 3.5, 4)
    // Transform = (4, 0, 4) - (6, 0, 6) = (-2, 0, -2)
    const startPos = vec3.fromValues(-2, 0, -2); // Sphere center will be at world (4, 3.5, 4)

    // Option 1: Pre-generated mesh (simple cube - current approach)
    // const playerMesh = VoxelMeshGenerator.generatePlayer({
    //   x: 0.2,
    //   y: 0.5,
    //   z: 0.9,
    // });
    // world.addComponent(player, new VoxelMesh(playerMesh));

    // Option 2: Use marching cubes for smooth organic player
    this.createPlayerVoxelData(world, player);

    // Add components
    world.addComponent(player, new Transform(startPos));
    world.addComponent(player, new Velocity(vec3.fromValues(0, 0, 0)));
    world.addComponent(player, new RigidBody(1, 2, 0.3, false));
    world.addComponent(player, new Player(10, 0.002));

    console.log("Player created at", startPos);
  }

  /**
   * Create voxel data for player using marching cubes
   */
  private createPlayerVoxelData(
    world: import("@/ecs").World,
    entity: import("@/ecs").Entity
  ): void {
    // Create a higher resolution octree for smooth marching cubes (12x12x12)
    // Higher resolution = smoother sphere
    const octree = new Octree(12, 5);

    // Create a smooth sphere/blob for the player character
    // Center the sphere in the octree space
    const centerX = 6;
    const centerY = 3.5; // Center height, sphere will extend from 0 to 7
    const centerZ = 6;
    const radius = 3.5; // Radius to make a nice smooth sphere

    // Higher resolution sampling for smoother gradients
    for (let x = 0; x < 12; x++) {
      for (let y = 0; y < 12; y++) {
        for (let z = 0; z < 12; z++) {
          const dx = x - centerX;
          const dy = y - centerY;
          const dz = z - centerZ;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

          // Create smooth density falloff for organic marching cubes shape
          if (distance <= radius + 1) {
            // Smooth gradient from center to edge
            const normalizedDist = distance / radius;
            // Smooth step function for better marching cubes interpolation
            const density = Math.max(0, 1.0 - Math.pow(normalizedDist, 1.5));

            if (density > 0.05) {
              octree.setVoxel({ x, y, z }, { density, material: 5 }); // Blue material
            }
          }
        }
      }
    }

    // Add VoxelData component with MARCHING_CUBES algorithm
    const voxelData = new VoxelData(octree, true, MeshAlgorithm.MARCHING_CUBES);
    world.addComponent(entity, voxelData);
  }
}
