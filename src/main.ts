import { VoxelEngine } from "./engine";
import { ALL_SCENES, Scene, ECSDemoScene } from "./scenes";

/**
 * Demo scene setup with scene selector
 */
class Demo {
  private engine: VoxelEngine;
  private infoElement: HTMLElement;
  private isGenerating = false;
  private currentSceneIndex = 0;
  private currentScene: Scene;
  private ecsScene: ECSDemoScene | null = null;

  constructor() {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    const info = document.getElementById("info") as HTMLElement;

    if (!canvas) {
      throw new Error("Canvas element not found");
    }

    this.infoElement = info;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Initialize engine
    this.engine = new VoxelEngine({
      canvas,
      worldSize: 128,
      octreeMaxLevel: 6,
      backgroundColor: { r: 0.2, g: 0.3, b: 0.4, a: 1.0 },
    });

    // Initialize current scene
    this.currentScene = ALL_SCENES[this.currentSceneIndex];

    this.setupEventListeners();
  }

  /**
   * Initialize and start the demo
   */
  async initialize(): Promise<void> {
    try {
      console.log("Initializing demo...");
      await this.engine.initialize();

      // Generate initial scene
      this.loadScene(this.currentSceneIndex);

      // Start the engine
      this.engine.start();

      // Start info update loop
      this.updateInfo();

      console.log("Demo started successfully!");
      console.log("Controls:");
      console.log("- WASD: Move camera");
      console.log("- Space/Shift: Move up/down");
      console.log("- Mouse: Look around (click to lock)");
      console.log("- C: Toggle camera lock");
      console.log("- Q: Generate sphere");
      console.log("- R: Change resolution");
      console.log("- G: Regenerate terrain");
      console.log("- L: Toggle logs");
    } catch (error) {
      console.error("Failed to initialize demo:", error);

      if (error instanceof Error && error.message.includes("WebGPU")) {
        this.showError(
          "WebGPU is not supported in this browser. Please use a modern browser with WebGPU support."
        );
      } else {
        this.showError(
          "Failed to initialize the engine. Please check the console for details."
        );
      }
    }
  }

  /**
   * Load a scene by index
   */
  private loadScene(index: number): void {
    if (index < 0 || index >= ALL_SCENES.length) {
      console.error(`Invalid scene index: ${index}`);
      return;
    }

    this.currentSceneIndex = index;
    this.currentScene = ALL_SCENES[index];

    console.log(`Loading scene: ${this.currentScene.name}`);
    console.log(`Description: ${this.currentScene.description}`);

    // Clear existing voxels
    this.engine.clearVoxels();

    // Generate the new scene
    this.currentScene.generate(this.engine);

    // Store reference to ECS scene for cleanup
    if (this.currentScene instanceof ECSDemoScene) {
      this.ecsScene = this.currentScene;
    } else {
      this.ecsScene = null;
    }

    console.log(`Scene loaded: ${this.currentScene.name}`);
  }

  /**
   * Switch to next scene
   */
  private nextScene(): void {
    const nextIndex = (this.currentSceneIndex + 1) % ALL_SCENES.length;
    this.loadScene(nextIndex);
  }

  /**
   * Switch to previous scene
   */
  private previousScene(): void {
    const prevIndex =
      this.currentSceneIndex === 0
        ? ALL_SCENES.length - 1
        : this.currentSceneIndex - 1;
    this.loadScene(prevIndex);
  }

  /**
   * Set up additional event listeners for demo controls
   */
  private setupEventListeners(): void {
    let currentResolution = 1;
    let showLogs = false;

    window.addEventListener("keydown", (e) => {
      if (this.isGenerating) return;

      // Only handle specific demo keys, let engine handle movement keys
      switch (e.key.toLowerCase()) {
        case "q":
          // Generate random sphere
          this.generateRandomSphere();
          break;

        case "r":
          // Change resolution
          currentResolution = currentResolution === 1 ? 2 : 1;
          console.log(`Changed resolution to ${currentResolution}`);
          break;

        case "g":
          // Regenerate current scene
          this.loadScene(this.currentSceneIndex);
          break;

        case "l":
          // Toggle logs
          showLogs = !showLogs;
          console.log(`Logs ${showLogs ? "enabled" : "disabled"}`);
          break;

        case "n":
          // Next scene
          this.nextScene();
          break;

        case "p":
          // Previous scene
          this.previousScene();
          break;

        case "escape":
          // Exit pointer lock
          if (document.pointerLockElement) {
            document.exitPointerLock();
          }
          break;
      }

      // Don't prevent default for movement keys - let engine handle them
    });

    // Handle window resize - engine already handles this, but we can add demo-specific logic here if needed
    // window.addEventListener("resize", () => {
    //   this.engine.resize();
    // });
  }

  /**
   * Generate a random sphere
   */
  private generateRandomSphere(): void {
    const x = Math.random() * 12 + 2;
    const y = Math.random() * 5 + 8;
    const z = Math.random() * 12 + 2;
    const radius = Math.random() * 2 + 1;
    const material = Math.floor(Math.random() * 3) + 1;

    console.log(
      `Generating sphere at (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(
        1
      )}) with radius ${radius.toFixed(1)}`
    );
    this.engine.generateSphere({ x, y, z }, radius, material);
  }

  /**
   * Regenerate terrain
   */
  private regenerateTerrain(): void {
    if (this.isGenerating) return;

    this.isGenerating = true;
    console.log("Regenerating terrain...");

    // Clear existing voxels
    this.engine.clearVoxels();

    // Generate new terrain with different parameters
    setTimeout(() => {
      this.engine.generateTerrain(16, 6 + Math.random() * 6);

      // Add some random features
      for (let i = 0; i < 2; i++) {
        this.generateRandomSphere();
      }

      this.isGenerating = false;
      console.log("Terrain regenerated");
    }, 100);
  }

  /**
   * Update info display
   */
  private updateInfo(): void {
    if (!this.infoElement) return;

    const stats = this.engine.getStats();
    const camera = this.engine.getCamera();
    const position = camera.getPosition();

    // Get ECS stats if available
    let ecsStats = "";
    if (this.ecsScene) {
      const world = this.ecsScene.getWorld();
      const systems = this.ecsScene.getSystems();
      ecsStats = `<br/>ECS: ${world.getEntityCount()} entities | ${
        systems.length
      } systems`;
    }

    this.infoElement.innerHTML = `
      <strong>${this.currentScene.name}</strong><br/>
      ${this.currentScene.description}<br/>
      <br/>
      Position: ${position[0].toFixed(1)}, ${position[1].toFixed(
      1
    )}, ${position[2].toFixed(1)}<br/>
      Entities: ${stats.entities} | Vertices: ${stats.vertices} | Triangles: ${
      stats.triangles
    }${ecsStats}<br/>
      Scene: ${this.currentSceneIndex + 1}/${ALL_SCENES.length}<br/>
      <br/>
      <strong>Controls:</strong><br/>
      WASD + Mouse = Move/Look | Space/Shift = Up/Down<br/>
      C = Camera lock | Q = Add sphere | G = Regenerate scene<br/>
      N = Next scene | P = Previous scene | L = Logs
    `;

    // Update every 100ms
    setTimeout(() => this.updateInfo(), 100);
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    document.body.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 0, 0, 0.1);
        border: 2px solid red;
        padding: 20px;
        border-radius: 10px;
        color: white;
        font-family: monospace;
        text-align: center;
        max-width: 500px;
      ">
        <h3>Error</h3>
        <p>${message}</p>
        <p>Please check the browser console for more details.</p>
      </div>
    `;
  }
}

/**
 * Initialize and start the demo
 */
async function main() {
  const demo = new Demo();
  await demo.initialize();
}

// Start the demo when the page loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}
