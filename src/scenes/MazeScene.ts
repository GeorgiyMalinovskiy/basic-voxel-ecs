import { GameEngine } from "@/engine";
import { MazeGenerator } from "@/utils/MazeGenerator";
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
import { PLAYER_MESH, PHYSICS } from "@/constants";

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

    // Calculate player Transform position
    // Player mesh is in local octree space with center at PLAYER_MESH.LOCAL_CENTER
    // To place player's visual center at desired world position (4, 3.5, 4):
    // Transform = Desired World Position - Local Center
    const desiredWorldPos = { x: 4, y: 3.5, z: 4 };
    const startPos = vec3.fromValues(
      desiredWorldPos.x - PLAYER_MESH.LOCAL_CENTER.x,
      desiredWorldPos.y - PLAYER_MESH.LOCAL_CENTER.y,
      desiredWorldPos.z - PLAYER_MESH.LOCAL_CENTER.z
    );

    // Create player voxel data (smooth marching cubes sphere)
    this.createPlayerVoxelData(world, player);

    // Add components
    world.addComponent(player, new Transform(startPos));
    world.addComponent(player, new Velocity(vec3.fromValues(0, 0, 0)));
    world.addComponent(
      player,
      new RigidBody(1, 2, PHYSICS.DEFAULT_FRICTION, false)
    );
    world.addComponent(player, new Player(10, 0.002));

    console.log(
      `Player created at Transform: (${startPos[0]}, ${startPos[1]}, ${startPos[2]}), World center: (${desiredWorldPos.x}, ${desiredWorldPos.y}, ${desiredWorldPos.z})`
    );
  }

  /**
   * Create voxel data for player using marching cubes
   * Creates a smooth sphere using the PLAYER_MESH constants
   */
  private createPlayerVoxelData(
    world: import("@/ecs").World,
    entity: import("@/ecs").Entity
  ): void {
    // Create octree at configured resolution
    const octree = new Octree(PLAYER_MESH.OCTREE_SIZE, PLAYER_MESH.MAX_LEVEL);

    // Generate smooth sphere in local octree space
    for (let x = 0; x < PLAYER_MESH.OCTREE_SIZE; x++) {
      for (let y = 0; y < PLAYER_MESH.OCTREE_SIZE; y++) {
        for (let z = 0; z < PLAYER_MESH.OCTREE_SIZE; z++) {
          const dx = x - PLAYER_MESH.LOCAL_CENTER.x;
          const dy = y - PLAYER_MESH.LOCAL_CENTER.y;
          const dz = z - PLAYER_MESH.LOCAL_CENTER.z;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

          // Create smooth density falloff for organic marching cubes shape
          if (distance <= PLAYER_MESH.RADIUS + 1) {
            const normalizedDist = distance / PLAYER_MESH.RADIUS;
            // Smooth step function for better marching cubes interpolation
            const density = Math.max(0, 1.0 - Math.pow(normalizedDist, 1.5));

            if (density > 0.05) {
              octree.setVoxel(
                { x, y, z },
                { density, material: PLAYER_MESH.MATERIAL }
              );
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
