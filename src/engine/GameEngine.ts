import { World } from "@/ecs";
import { Camera, WebGPURenderer } from "@/renderer";
import { Octree, MarchingCubes, Mesh, Vec3, Voxel } from "@/voxel";
import { PhysicsSystem, InputSystem } from "@/systems";
import { Transform, Player, VoxelMesh } from "@/components";
import { vec3 } from "gl-matrix";

/**
 * Main game engine - simple API for creating voxel games
 */
export class GameEngine {
  private canvas: HTMLCanvasElement;
  private world: World;
  private renderer: WebGPURenderer;
  private camera: Camera;
  private octree: Octree;
  private marchingCubes: MarchingCubes;

  private physicsSystem: PhysicsSystem;
  private inputSystem: InputSystem;

  private isRunning = false;
  private lastTime = 0;
  private meshDirty = true;
  private currentMesh: Mesh | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.world = new World();
    this.renderer = new WebGPURenderer(canvas);
    this.camera = new Camera();
    this.octree = new Octree(64, 6);
    this.marchingCubes = new MarchingCubes(0.5);

    // Create systems
    this.physicsSystem = new PhysicsSystem();
    this.inputSystem = new InputSystem();

    // Add systems to world
    this.world.addSystem(this.inputSystem);
    this.world.addSystem(this.physicsSystem);

    // Set up resize
    window.addEventListener("resize", () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.camera.setAspect(this.canvas.width / this.canvas.height);
      this.renderer.resize(this.canvas.width, this.canvas.height);
    });
  }

  /**
   * Initialize the engine
   */
  async initialize(): Promise<void> {
    await this.renderer.initialize();
    console.log("Game engine initialized");
  }

  /**
   * Start the game loop
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  /**
   * Stop the game loop
   */
  stop(): void {
    this.isRunning = false;
  }

  /**
   * Main game loop
   */
  private gameLoop(): void {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    // Update
    this.update(deltaTime);

    // Render
    this.render();

    requestAnimationFrame(() => this.gameLoop());
  }

  /**
   * Update game state
   */
  private update(deltaTime: number): void {
    // Update ECS
    this.world.update(deltaTime);

    // Update camera to follow player
    this.updateCameraFollowPlayer();

    // Regenerate mesh if dirty
    if (this.meshDirty) {
      this.currentMesh = this.marchingCubes.generateMesh(this.octree);
      this.renderer.updateMesh(this.currentMesh);
      this.meshDirty = false;
    }
  }

  /**
   * Update camera to follow player
   */
  private updateCameraFollowPlayer(): void {
    const players = this.world.query(Transform, Player);
    if (players.length > 0) {
      const transform = this.world.getComponent(players[0], Transform);
      if (transform) {
        // Third-person camera
        const yaw = this.inputSystem.getYaw();
        const pitch = this.inputSystem.getPitch();

        const offset = vec3.fromValues(
          -Math.sin(yaw) * Math.cos(pitch) * 10,
          Math.sin(pitch) * 10 + 5,
          -Math.cos(yaw) * Math.cos(pitch) * 10
        );

        const cameraPos = vec3.create();
        vec3.add(cameraPos, transform.position, offset);

        // Look at player's head height
        const targetPos = vec3.create();
        vec3.copy(targetPos, transform.position);
        targetPos[1] += 2;

        this.camera.setPosition(cameraPos);
        this.camera.setTarget(targetPos);
      }
    }
  }

  /**
   * Render the scene
   */
  private render(): void {
    // Start with terrain mesh
    if (this.currentMesh) {
      const combinedMesh: Mesh = {
        vertices: [...this.currentMesh.vertices],
        indices: [...this.currentMesh.indices],
      };

      // Add voxel entities
      const entities = this.world.query(Transform, VoxelMesh);
      for (const entity of entities) {
        const transform = this.world.getComponent(entity, Transform)!;
        const voxelMesh = this.world.getComponent(entity, VoxelMesh)!;

        if (voxelMesh.mesh.vertices.length > 0) {
          const baseIndexOffset = combinedMesh.vertices.length;

          // Transform and add vertices
          for (const v of voxelMesh.mesh.vertices) {
            combinedMesh.vertices.push({
              position: {
                x: v.position.x + transform.position[0],
                y: v.position.y + transform.position[1],
                z: v.position.z + transform.position[2],
              },
              normal: v.normal,
              color: v.color,
            });
          }

          // Add indices with offset
          for (const idx of voxelMesh.mesh.indices) {
            combinedMesh.indices.push(idx + baseIndexOffset);
          }
        }
      }

      // Upload combined mesh and render
      this.renderer.updateMesh(combinedMesh);
    }

    this.renderer.render(this.camera);
  }

  // Public API

  /**
   * Get the ECS world
   */
  getWorld(): World {
    return this.world;
  }

  /**
   * Get the camera
   */
  getCamera(): Camera {
    return this.camera;
  }

  /**
   * Get the octree
   */
  getOctree(): Octree {
    return this.octree;
  }

  /**
   * Set a voxel
   */
  setVoxel(position: Vec3, voxel: Voxel): void {
    this.octree.setVoxel(position, voxel);
    this.meshDirty = true;
  }

  /**
   * Get a voxel
   */
  getVoxel(position: Vec3): Voxel | null {
    return this.octree.getVoxel(position);
  }

  /**
   * Clear all voxels
   */
  clearVoxels(): void {
    this.octree.clear();
    this.meshDirty = true;
  }

  /**
   * Generate a sphere of voxels
   */
  generateSphere(center: Vec3, radius: number, material = 1): void {
    for (let x = center.x - radius; x <= center.x + radius; x++) {
      for (let y = center.y - radius; y <= center.y + radius; y++) {
        for (let z = center.z - radius; z <= center.z + radius; z++) {
          const distance = Math.sqrt(
            (x - center.x) ** 2 + (y - center.y) ** 2 + (z - center.z) ** 2
          );
          if (distance <= radius) {
            const density = Math.max(0, 1 - distance / radius);
            this.setVoxel({ x, y, z }, { density, material });
          }
        }
      }
    }
  }

  /**
   * Generate a box of voxels
   */
  generateBox(min: Vec3, max: Vec3, material = 1): void {
    for (let x = min.x; x <= max.x; x++) {
      for (let y = min.y; y <= max.y; y++) {
        for (let z = min.z; z <= max.z; z++) {
          this.setVoxel({ x, y, z }, { density: 1, material });
        }
      }
    }
  }

  /**
   * Get rendering stats
   */
  getStats(): { entities: number; vertices: number; triangles: number } {
    return {
      entities: this.world.getAllEntities().length,
      vertices: this.currentMesh?.vertices.length || 0,
      triangles: this.currentMesh
        ? Math.floor(this.currentMesh.indices.length / 3)
        : 0,
    };
  }
}
