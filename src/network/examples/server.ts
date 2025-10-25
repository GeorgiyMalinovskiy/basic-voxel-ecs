/**
 * Server Example - Dedicated server for multiplayer
 *
 * This demonstrates how to create a headless server that runs the game
 * simulation and synchronizes state to connected clients.
 *
 * Note: This is a conceptual example. Running a full server requires:
 * - Node.js environment
 * - Headless physics simulation
 * - Proper event loop management
 *
 * Usage:
 * 1. Build the project: npm run build
 * 2. Run: node dist/examples/server.js
 * 3. Start clients that connect to this server
 */

/**
 * Pseudo-code for server implementation
 *
 * In a real implementation, you would:
 * 1. Create a headless game engine (no renderer)
 * 2. Run physics and game logic
 * 3. Use NetworkSystem to sync state to clients
 * 4. Handle client connections/disconnections
 */

// This is a conceptual example showing the architecture
/*
import { World } from "@/ecs";
import { PhysicsSystem, MeshGenerationSystem, NetworkSystem } from "@/systems";
import { WebSocketNetwork } from "@/network";
import { RapierAdapter } from "@/physics";
import { vec3 } from "gl-matrix";

class HeadlessServer {
  private world: World;
  private physicsSystem: PhysicsSystem;
  private networkSystem: NetworkSystem;
  private isRunning = false;
  private lastTime = 0;

  async start() {
    this.world = new World();
    
    // Setup physics
    const physicsAdapter = new RapierAdapter();
    await physicsAdapter.initialize(vec3.fromValues(0, -9.81, 0));
    this.physicsSystem = new PhysicsSystem(physicsAdapter);
    this.world.addSystem(this.physicsSystem);

    // Setup networking
    const networkManager = new WebSocketNetwork();
    await networkManager.initialize({
      isServer: true,
      isHost: false,
      tickRate: 60,
      snapshotRate: 20,
      interpolationDelay: 0,
    });
    await networkManager.start("0.0.0.0:8080");

    this.networkSystem = new NetworkSystem(networkManager);
    this.world.addSystem(this.networkSystem);

    // Load world/scene
    // ... create terrain, entities, etc.

    // Start game loop
    this.isRunning = true;
    this.lastTime = Date.now();
    this.gameLoop();

    console.log("Headless server started on port 8080");
  }

  private gameLoop() {
    if (!this.isRunning) return;

    const currentTime = Date.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Update all systems
    this.world.update(deltaTime);

    // Schedule next frame (60 FPS target)
    setTimeout(() => this.gameLoop(), 1000 / 60);
  }

  stop() {
    this.isRunning = false;
  }
}

// Start server
const server = new HeadlessServer();
server.start().catch(console.error);
*/

console.log(`
Server Example
==============

This is a conceptual example showing how to structure a dedicated server.

To implement a full server, you would need to:

1. Create a headless version of GameEngine (no WebGPU renderer)
2. Run physics and game logic in a Node.js environment
3. Use WebSocketNetwork to handle client connections
4. Sync entity state using NetworkSystem

For now, you can test networking using client-hosted mode:
- One browser instance acts as both client and server
- Other clients connect to it (requires WebRTC or relay server)

See client.ts for a working client example that connects to a server.
`);
