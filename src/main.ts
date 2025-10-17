import { GameEngine } from "@/engine";
import { MazeScene } from "@/scenes/MazeScene";
// import { ResolutionDemoScene } from "@/scenes/ResolutionDemoScene";

/**
 * Main application
 */
class App {
  private engine: GameEngine;
  private infoElement: HTMLElement;

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

    // Create game engine
    this.engine = new GameEngine(canvas);
  }

  /**
   * Initialize and start the application
   */
  async run(): Promise<void> {
    try {
      this.showMessage("Initializing...");

      // Initialize engine
      await this.engine.initialize();

      // Set up resolution demo scene
      const scene = new MazeScene();
      scene.setup(this.engine);

      // Start engine
      this.engine.start();

      // Start info updates
      this.updateInfo();

      this.showMessage("");
      console.log("Application started successfully!");
      console.log("Controls:");
      console.log("- WASD: Move");
      console.log("- Mouse: Look around (click to lock)");
      console.log("- Space: Jump");
    } catch (error) {
      console.error("Failed to initialize:", error);
      this.showError(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Update info display
   */
  private updateInfo(): void {
    const stats = this.engine.getStats();
    const camera = this.engine.getCamera();
    const pos = camera.getPosition();

    this.infoElement.innerHTML = `
      <strong>Marching Cubes Resolution Demo</strong><br/>
      <br/>
      Position: ${pos[0].toFixed(1)}, ${pos[1].toFixed(1)}, ${pos[2].toFixed(
      1
    )}<br/>
      Entities: ${stats.entities} | Vertices: ${stats.vertices} | Triangles: ${
      stats.triangles
    }<br/>
      <br/>
      <strong>Compare sphere smoothness:</strong><br/>
      Left to Right: 6³ → 12³ → 18³ → 24³<br/>
      <br/>
      <strong>Controls:</strong><br/>
      WASD = Move | Mouse = Look<br/>
      Space = Jump | Click = Lock mouse
    `;

    requestAnimationFrame(() => this.updateInfo());
  }

  /**
   * Show message in info panel
   */
  private showMessage(message: string): void {
    this.infoElement.innerHTML = message;
  }

  /**
   * Show error
   */
  private showError(message: string): void {
    const errorDiv = document.getElementById("error");
    if (errorDiv) {
      errorDiv.style.display = "block";
      errorDiv.innerHTML = `
        <h3>Error</h3>
        <p>${message}</p>
        <p>Check console for details.</p>
      `;
    }
  }
}

/**
 * Start the application
 */
async function main() {
  const app = new App();
  await app.run();
}

// Start when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}
