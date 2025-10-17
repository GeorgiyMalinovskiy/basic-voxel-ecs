import { GameEngine } from "@/engine";
import { MazeGenerator } from "@/utils/MazeGenerator";
import {
  Transform,
  Velocity,
  RigidBody,
  Player,
  VoxelMesh,
} from "@/components";
import { VoxelMeshGenerator } from "@/voxel";
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

    // Build maze from voxels
    this.buildMaze(engine, maze);

    // Create player entity
    this.createPlayer(engine);

    console.log("Maze scene ready!");
  }

  /**
   * Build maze geometry from maze data
   */
  private buildMaze(engine: GameEngine, maze: boolean[][]): void {
    const wallHeight = 4;

    for (let z = 0; z < maze.length; z++) {
      for (let x = 0; x < maze[z].length; x++) {
        if (maze[z][x]) {
          // Wall
          for (let y = 0; y < wallHeight; y++) {
            engine.setVoxel(
              { x: x * 2, y, z: z * 2 },
              { density: 1, material: 1 }
            );
          }
        }

        // Floor
        engine.setVoxel(
          { x: x * 2, y: -1, z: z * 2 },
          { density: 1, material: 2 }
        );
      }
    }

    // Add some decorative spheres at dead ends
    for (let z = 2; z < maze.length - 2; z++) {
      for (let x = 2; x < maze[z].length - 2; x++) {
        if (!maze[z][x]) {
          // Count walls around this position
          const wallCount =
            (maze[z - 1][x] ? 1 : 0) +
            (maze[z + 1][x] ? 1 : 0) +
            (maze[z][x - 1] ? 1 : 0) +
            (maze[z][x + 1] ? 1 : 0);

          // Dead end (3 walls)
          if (wallCount === 3 && Math.random() < 0.3) {
            engine.generateSphere(
              { x: x * 2, y: 1, z: z * 2 },
              0.5,
              Math.floor(Math.random() * 3) + 3
            );
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
    const startPos = vec3.fromValues(2, 0, 2);

    // Generate player mesh (blue cube)
    const playerMesh = VoxelMeshGenerator.generatePlayer({
      x: 0.2,
      y: 0.5,
      z: 0.9,
    });

    // Add components
    world.addComponent(player, new Transform(startPos));
    world.addComponent(player, new Velocity(vec3.fromValues(0, 0, 0)));
    world.addComponent(player, new RigidBody(1, 2, 0.3, false));
    world.addComponent(player, new Player(10, 0.002));
    world.addComponent(player, new VoxelMesh(playerMesh));

    console.log("Player created at", startPos);
  }
}
