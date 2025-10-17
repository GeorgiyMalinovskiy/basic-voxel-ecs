import { World } from "@/ecs";
import { Camera, WebGPURenderer } from "@/renderer";
import { Mesh } from "@/voxel";
import { PhysicsSystem, InputSystem, MeshGenerationSystem } from "@/systems";
import { Transform, Player, VoxelMesh } from "@/components";
import { vec3 } from "gl-matrix";
import { CAMERA, PLAYER_MESH, MESH_GEN } from "@/constants";

/**
 * Main game engine - FULLY ECS-based voxel game engine
 * Everything is an entity with components
 */
export class GameEngine {
  private canvas: HTMLCanvasElement;
  private world: World;
  private renderer: WebGPURenderer;
  private camera: Camera;

  private physicsSystem: PhysicsSystem;
  private inputSystem: InputSystem;
  private meshGenSystem: MeshGenerationSystem;

  private isRunning = false;
  private lastTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.world = new World();
    this.renderer = new WebGPURenderer(canvas);
    this.camera = new Camera();

    // Create systems
    this.physicsSystem = new PhysicsSystem();
    this.inputSystem = new InputSystem();
    this.meshGenSystem = new MeshGenerationSystem(MESH_GEN.ISO_LEVEL);

    // Add systems to world (order matters!)
    this.world.addSystem(this.inputSystem);
    this.world.addSystem(this.physicsSystem);
    this.world.addSystem(this.meshGenSystem); // Generate meshes after physics

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
    // Update ECS (all systems including mesh generation)
    this.world.update(deltaTime);

    // Update camera to follow player
    this.updateCameraFollowPlayer();
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
          -Math.sin(yaw) * Math.cos(pitch) * CAMERA.FOLLOW_DISTANCE,
          Math.sin(pitch) * CAMERA.FOLLOW_DISTANCE +
            CAMERA.FOLLOW_HEIGHT_OFFSET,
          -Math.cos(yaw) * Math.cos(pitch) * CAMERA.FOLLOW_DISTANCE
        );

        const cameraPos = vec3.create();
        vec3.add(cameraPos, transform.position, offset);

        // Calculate world position of player's visual center
        // World position = Transform position + Local mesh center
        const targetPos = vec3.create();
        vec3.copy(targetPos, transform.position);
        targetPos[0] += PLAYER_MESH.LOCAL_CENTER.x;
        targetPos[1] += PLAYER_MESH.LOCAL_CENTER.y;
        targetPos[2] += PLAYER_MESH.LOCAL_CENTER.z;

        this.camera.setPosition(cameraPos);
        this.camera.setTarget(targetPos);
      }
    }
  }

  /**
   * Render the scene - combine all VoxelMesh entities
   */
  private render(): void {
    const combinedMesh: Mesh = {
      vertices: [],
      indices: [],
    };

    // Get all entities with meshes (terrain + dynamic objects)
    const entities = this.world.query(VoxelMesh);
    for (const entity of entities) {
      const voxelMesh = this.world.getComponent(entity, VoxelMesh)!;
      const transform = this.world.getComponent(entity, Transform);

      if (voxelMesh.mesh.vertices.length > 0) {
        const baseIndexOffset = combinedMesh.vertices.length;

        // Transform and add vertices (if has Transform, otherwise at origin)
        const offset = transform
          ? transform.position
          : vec3.fromValues(0, 0, 0);

        for (const v of voxelMesh.mesh.vertices) {
          combinedMesh.vertices.push({
            position: {
              x: v.position.x + offset[0],
              y: v.position.y + offset[1],
              z: v.position.z + offset[2],
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
    if (combinedMesh.vertices.length > 0) {
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
   * Get rendering stats
   */
  getStats(): { entities: number; vertices: number; triangles: number } {
    let totalVertices = 0;
    let totalTriangles = 0;

    const entities = this.world.query(VoxelMesh);
    for (const entity of entities) {
      const voxelMesh = this.world.getComponent(entity, VoxelMesh)!;
      totalVertices += voxelMesh.mesh.vertices.length;
      totalTriangles += Math.floor(voxelMesh.mesh.indices.length / 3);
    }

    return {
      entities: this.world.getAllEntities().length,
      vertices: totalVertices,
      triangles: totalTriangles,
    };
  }
}
