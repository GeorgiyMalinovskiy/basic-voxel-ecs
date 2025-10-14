import { World } from "@/ecs";
import { WebGPURenderer } from "@/renderer/webgpu";
import { Camera } from "@/renderer/camera";
import { VoxelRenderer } from "@/renderer/voxel-renderer";
import { Octree, Vec3, Voxel } from "@/voxel/octree";
import { vec3 } from "gl-matrix";

/**
 * Engine configuration options
 */
export interface EngineConfig {
  canvas: HTMLCanvasElement;
  worldSize?: number;
  octreeMaxLevel?: number;
  backgroundColor?: { r: number; g: number; b: number; a: number };
}

/**
 * Main VoxelEngine class - simple API for the 3D voxel engine
 */
export class VoxelEngine {
  private world: World;
  private renderer: WebGPURenderer;
  private camera: Camera;
  private voxelRenderer: VoxelRenderer;
  private octree: Octree;

  private canvas: HTMLCanvasElement;
  private isRunning = false;
  private lastTime = 0;
  private backgroundColor: GPUColor;
  private externalECSUpdate?: (deltaTime: number) => void;

  // Input handling
  private keys = new Set<string>();
  private mousePos = { x: 0, y: 0 };
  private mouseDelta = { x: 0, y: 0 };
  private isMouseLocked = false;
  private disableEngineInput = false;

  constructor(config: EngineConfig) {
    this.canvas = config.canvas;
    this.backgroundColor = config.backgroundColor || {
      r: 0.1,
      g: 0.1,
      b: 0.1,
      a: 1.0,
    };

    // Initialize core systems
    this.world = new World();
    this.renderer = new WebGPURenderer(this.canvas);
    this.octree = new Octree(config.worldSize, config.octreeMaxLevel);

    // Initialize camera
    const aspect = this.canvas.width / this.canvas.height;
    this.camera = new Camera({
      position: vec3.fromValues(25, 25, 25),
      target: vec3.fromValues(8, 8, 8),
      aspect: aspect,
    });

    // Initialize voxel renderer
    this.voxelRenderer = new VoxelRenderer(
      this.renderer,
      this.camera,
      this.octree
    );

    this.setupEventListeners();
  }

  /**
   * Initialize the engine
   */
  async initialize(): Promise<void> {
    console.log("Initializing VoxelEngine...");

    await this.renderer.initialize();
    await this.voxelRenderer.initialize();

    console.log("VoxelEngine initialized successfully");
  }

  /**
   * Start the engine
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastTime = performance.now();
    this.gameLoop();

    console.log("VoxelEngine started");
  }

  /**
   * Stop the engine
   */
  stop(): void {
    this.isRunning = false;
    console.log("VoxelEngine stopped");
  }

  /**
   * Main game loop
   */
  private gameLoop(): void {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = currentTime;

    // Update systems
    this.update(deltaTime);

    // Render
    this.render();

    // Continue loop
    requestAnimationFrame(() => this.gameLoop());
  }

  /**
   * Update all systems
   */
  private update(deltaTime: number): void {
    // Handle input
    this.handleInput(deltaTime);

    // Update ECS world
    this.world.update(deltaTime);

    // Update external ECS scene if provided
    if (this.externalECSUpdate) {
      this.externalECSUpdate(deltaTime);
    }

    // Update voxel renderer
    this.voxelRenderer.update();
  }

  /**
   * Render the scene
   */
  private render(): void {
    this.voxelRenderer.render();
  }

  /**
   * Handle input
   */
  private handleInput(deltaTime: number): void {
    if (this.disableEngineInput) return;
    const moveSpeed = 50 * deltaTime; // units per second
    const lookSpeed = 2 * deltaTime; // radians per second

    // Camera movement
    const cameraPos = this.camera.getPosition();
    const cameraTarget = this.camera.getTarget();

    // Calculate forward and right vectors
    const forward = vec3.create();
    const right = vec3.create();
    const up = vec3.fromValues(0, 1, 0);

    vec3.subtract(forward, cameraTarget, cameraPos);
    vec3.normalize(forward, forward);
    vec3.cross(right, forward, up);
    vec3.normalize(right, right);

    // Movement
    let moved = false;
    if (this.keys.has("w") || this.keys.has("W")) {
      const offset = vec3.scale(vec3.create(), forward, moveSpeed);
      this.camera.translate(offset);
      moved = true;
    }
    if (this.keys.has("s") || this.keys.has("S")) {
      const offset = vec3.scale(vec3.create(), forward, -moveSpeed);
      this.camera.translate(offset);
      moved = true;
    }
    if (this.keys.has("a") || this.keys.has("A")) {
      const offset = vec3.scale(vec3.create(), right, -moveSpeed);
      this.camera.translate(offset);
      moved = true;
    }
    if (this.keys.has("d") || this.keys.has("D")) {
      const offset = vec3.scale(vec3.create(), right, moveSpeed);
      this.camera.translate(offset);
      moved = true;
    }
    if (this.keys.has(" ")) {
      // Space for up
      this.camera.translate(vec3.fromValues(0, moveSpeed, 0));
      moved = true;
    }
    if (this.keys.has("Shift")) {
      // Shift for down
      this.camera.translate(vec3.fromValues(0, -moveSpeed, 0));
      moved = true;
    }

    // Mouse look (only when mouse is locked)
    if (
      this.isMouseLocked &&
      (this.mouseDelta.x !== 0 || this.mouseDelta.y !== 0)
    ) {
      this.camera.orbit(
        this.mouseDelta.x * lookSpeed,
        -this.mouseDelta.y * lookSpeed
      );
      this.mouseDelta.x = 0;
      this.mouseDelta.y = 0;
    }
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Keyboard events
    window.addEventListener("keydown", (e) => {
      this.keys.add(e.key);

      // Toggle mouse lock
      if (e.key === "c" || e.key === "C") {
        this.toggleMouseLock();
      }
    });

    window.addEventListener("keyup", (e) => {
      this.keys.delete(e.key);
    });

    // Mouse events
    this.canvas.addEventListener("click", () => {
      if (!this.isMouseLocked) {
        this.canvas.requestPointerLock();
      }
    });

    document.addEventListener("pointerlockchange", () => {
      this.isMouseLocked = document.pointerLockElement === this.canvas;
    });

    document.addEventListener("mousemove", (e) => {
      if (this.isMouseLocked) {
        this.mouseDelta.x += e.movementX * 0.002;
        this.mouseDelta.y += e.movementY * 0.002;
      }
    });

    // Window resize
    window.addEventListener("resize", () => {
      this.resize();
    });
  }

  /**
   * Toggle mouse lock
   */
  private toggleMouseLock(): void {
    if (this.isMouseLocked) {
      document.exitPointerLock();
    } else {
      this.canvas.requestPointerLock();
    }
  }

  /**
   * Resize the engine
   */
  resize(): void {
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;

    const aspect = this.canvas.width / this.canvas.height;
    this.camera.setAspect(aspect);
    this.renderer.resize(this.canvas.width, this.canvas.height);
  }

  // Public API methods

  /**
   * Set a voxel at the given position
   */
  setVoxel(position: Vec3, voxel: Voxel): void {
    this.octree.setVoxel(position, voxel);
    this.voxelRenderer.markMeshDirty();
  }

  /**
   * Get a voxel at the given position
   */
  getVoxel(position: Vec3): Voxel | null {
    return this.octree.getVoxel(position);
  }

  /**
   * Clear all voxels
   */
  clearVoxels(): void {
    this.octree.clear();
    this.voxelRenderer.markMeshDirty();
  }

  /**
   * Set the ISO level for marching cubes
   */
  setIsoLevel(level: number): void {
    this.voxelRenderer.setIsoLevel(level);
  }

  /**
   * Get the camera
   */
  getCamera(): Camera {
    return this.camera;
  }

  /**
   * Get the ECS world
   */
  getWorld(): World {
    return this.world;
  }

  /**
   * Get the octree
   */
  getOctree(): Octree {
    return this.octree;
  }

  /**
   * Get rendering statistics
   */
  getStats(): { entities: number; vertices: number; triangles: number } {
    const voxelStats = this.voxelRenderer.getStats();
    return {
      entities: this.world.getEntityCount(),
      vertices: voxelStats.vertices,
      triangles: voxelStats.triangles,
    };
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
            this.octree.setVoxel({ x, y, z }, { density, material });
          }
        }
      }
    }
    this.markMeshDirty();
  }

  /**
   * Generate a box of voxels
   */
  generateBox(min: Vec3, max: Vec3, material = 1): void {
    for (let x = min.x; x <= max.x; x++) {
      for (let y = min.y; y <= max.y; y++) {
        for (let z = min.z; z <= max.z; z++) {
          this.octree.setVoxel({ x, y, z }, { density: 1, material });
        }
      }
    }
    this.markMeshDirty();
  }

  /**
   * Generate terrain using a simple noise function
   */
  generateTerrain(size: number, height: number): void {
    for (let x = 0; x < size; x++) {
      for (let z = 0; z < size; z++) {
        // Simple noise-like function
        const noise =
          Math.sin(x * 0.1) * Math.cos(z * 0.1) * 10 +
          Math.sin(x * 0.05) * Math.cos(z * 0.05) * 20;
        const terrainHeight = height + noise;

        for (let y = 0; y <= terrainHeight; y++) {
          let material = 1; // Stone
          if (y > terrainHeight - 3) material = 2; // Dirt
          if (y === Math.floor(terrainHeight)) material = 3; // Grass

          this.octree.setVoxel({ x, y, z }, { density: 1, material });
        }
      }
    }
    this.markMeshDirty();
  }

  /**
   * Get the world size from the octree
   */
  getWorldSize(): number {
    return this.octree.getWorldSize();
  }

  /**
   * Get the canvas element
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Disable engine input handling (for ECS input systems)
   */
  disableInput(): void {
    this.disableEngineInput = true;
  }

  /**
   * Enable engine input handling
   */
  enableInput(): void {
    this.disableEngineInput = false;
  }

  /**
   * Set external ECS update function
   */
  setExternalECSUpdate(updateFn: (deltaTime: number) => void): void {
    this.externalECSUpdate = updateFn;
  }

  /**
   * Clear external ECS update function
   */
  clearExternalECSUpdate(): void {
    this.externalECSUpdate = undefined;
  }

  /**
   * Mark mesh as dirty (needs regeneration)
   */
  markMeshDirty(): void {
    this.voxelRenderer.markMeshDirty();
  }
}
