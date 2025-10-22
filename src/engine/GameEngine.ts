import { vec3, mat4, quat } from "gl-matrix";

import { World } from "@/ecs";
import { Camera, WebGPURenderer } from "@/renderer";
import { Mesh } from "@/voxel";
import { PhysicsSystem, InputSystem, MeshGenerationSystem } from "@/systems";
import {
  Transform,
  Player,
  VoxelMesh,
  VoxelData,
  CameraTarget,
} from "@/components";
import { RapierAdapter } from "@/physics";
import { CAMERA, PLAYER_MESH, MESH_GEN, PHYSICS } from "@/constants";

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
  private physicsAdapter: RapierAdapter;

  private isRunning = false;
  private lastTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.world = new World();
    this.renderer = new WebGPURenderer(canvas);
    this.camera = new Camera();

    // Create physics adapter
    this.physicsAdapter = new RapierAdapter();

    // Create systems
    this.physicsSystem = new PhysicsSystem(this.physicsAdapter);
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
    // Initialize physics adapter with gravity
    await this.physicsAdapter.initialize(
      vec3.fromValues(0, PHYSICS.GRAVITY, 0)
    );

    // Initialize renderer
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
    this.updateCamera();
  }

  /**
   * Update camera to follow target entity
   * Prioritizes CameraTarget component, falls back to Player component for backward compatibility
   */
  private updateCamera(): void {
    // First check for entities with CameraTarget component
    let targets = this.world.query(Transform, CameraTarget);
    let useCameraTarget = true;

    // Fallback to Player component for backward compatibility
    if (targets.length === 0) {
      targets = this.world.query(Transform, Player);
      useCameraTarget = false;
    }

    if (targets.length === 0) return;

    const target = targets[0];
    const transform = this.world.getComponent(target, Transform);
    if (!transform) return;

    // Get camera settings
    let followDistance: number;
    let heightOffset: number;
    let lookAtOffset: vec3;

    if (useCameraTarget) {
      const cameraTarget = this.world.getComponent(target, CameraTarget)!;
      followDistance = cameraTarget.followDistance;
      heightOffset = cameraTarget.heightOffset;
      lookAtOffset = cameraTarget.lookAtOffset;
    } else {
      // Use defaults for Player entities
      followDistance = CAMERA.FOLLOW_DISTANCE;
      heightOffset = CAMERA.FOLLOW_HEIGHT_OFFSET;
      lookAtOffset = vec3.fromValues(0, 0, 0);
    }

    // Third-person camera
    const yaw = this.inputSystem.getYaw();
    const pitch = this.inputSystem.getPitch();

    const offset = vec3.fromValues(
      -Math.sin(yaw) * Math.cos(pitch) * followDistance,
      Math.sin(pitch) * followDistance + heightOffset,
      -Math.cos(yaw) * Math.cos(pitch) * followDistance
    );

    const cameraPos = vec3.create();
    vec3.add(cameraPos, transform.position, offset);

    // Calculate look-at position
    const targetPos = vec3.create();
    vec3.copy(targetPos, transform.position);

    // Add custom lookAtOffset if specified
    if (
      lookAtOffset[0] !== 0 ||
      lookAtOffset[1] !== 0 ||
      lookAtOffset[2] !== 0
    ) {
      vec3.add(targetPos, targetPos, lookAtOffset);
    } else {
      // Auto-calculate from voxel mesh center
      const voxelData = this.world.getComponent(target, VoxelData);
      if (voxelData) {
        const meshCenter = this.calculateMeshCenter(voxelData);
        vec3.add(targetPos, targetPos, meshCenter);
      } else if (!useCameraTarget) {
        // Legacy fallback for Player without voxel data
        targetPos[0] += PLAYER_MESH.LOCAL_CENTER.x;
        targetPos[1] += PLAYER_MESH.LOCAL_CENTER.y;
        targetPos[2] += PLAYER_MESH.LOCAL_CENTER.z;
      }
    }

    this.camera.setPosition(cameraPos);
    this.camera.setTarget(targetPos);
  }

  /**
   * Calculate mesh center from voxel data
   */
  private calculateMeshCenter(voxelData: VoxelData): vec3 {
    const octree = voxelData.octree;
    const worldSize = octree.getWorldSize();
    let minX = worldSize,
      minY = worldSize,
      minZ = worldSize;
    let maxX = 0,
      maxY = 0,
      maxZ = 0;
    let hasVoxels = false;

    for (let x = 0; x < worldSize; x++) {
      for (let y = 0; y < worldSize; y++) {
        for (let z = 0; z < worldSize; z++) {
          if (octree.getDensity({ x, y, z }) > 0.5) {
            hasVoxels = true;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            minZ = Math.min(minZ, z);
            maxX = Math.max(maxX, x + 1);
            maxY = Math.max(maxY, y + 1);
            maxZ = Math.max(maxZ, z + 1);
          }
        }
      }
    }

    if (hasVoxels) {
      return vec3.fromValues(
        (minX + maxX) / 2,
        (minY + maxY) / 2,
        (minZ + maxZ) / 2
      );
    }

    return vec3.fromValues(0, 0, 0);
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

        // Build transformation matrix
        const transformMatrix = mat4.create();

        if (transform) {
          // Position
          mat4.translate(transformMatrix, transformMatrix, transform.position);

          // Rotation (Euler angles to quaternion to matrix)
          if (
            transform.rotation[0] !== 0 ||
            transform.rotation[1] !== 0 ||
            transform.rotation[2] !== 0
          ) {
            const rotQuat = quat.create();
            quat.fromEuler(
              rotQuat,
              transform.rotation[0] * (180 / Math.PI), // Convert radians to degrees for fromEuler
              transform.rotation[1] * (180 / Math.PI),
              transform.rotation[2] * (180 / Math.PI)
            );
            const rotMatrix = mat4.create();
            mat4.fromQuat(rotMatrix, rotQuat);
            mat4.multiply(transformMatrix, transformMatrix, rotMatrix);
          }

          // Scale (if needed in future)
          // mat4.scale(transformMatrix, transformMatrix, transform.scale);
        }

        for (const v of voxelMesh.mesh.vertices) {
          // Transform vertex position
          const pos = vec3.fromValues(v.position.x, v.position.y, v.position.z);
          vec3.transformMat4(pos, pos, transformMatrix);

          // Transform normal (for lighting - use rotation only)
          const normal = vec3.fromValues(v.normal.x, v.normal.y, v.normal.z);
          if (
            transform &&
            (transform.rotation[0] !== 0 ||
              transform.rotation[1] !== 0 ||
              transform.rotation[2] !== 0)
          ) {
            const rotQuat = quat.create();
            quat.fromEuler(
              rotQuat,
              transform.rotation[0] * (180 / Math.PI),
              transform.rotation[1] * (180 / Math.PI),
              transform.rotation[2] * (180 / Math.PI)
            );
            vec3.transformQuat(normal, normal, rotQuat);
          }

          combinedMesh.vertices.push({
            position: {
              x: pos[0],
              y: pos[1],
              z: pos[2],
            },
            normal: {
              x: normal[0],
              y: normal[1],
              z: normal[2],
            },
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
