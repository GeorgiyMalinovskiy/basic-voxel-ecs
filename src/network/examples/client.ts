/**
 * Client Example - Connect to a multiplayer server
 *
 * This demonstrates how to create a client that connects to a server
 * and participates in a networked game session.
 *
 * Usage:
 * 1. Start a server first (see server.ts example)
 * 2. Run the client: npm run dev
 * 3. Open browser to http://localhost:5173
 */

import { GameEngine } from "@/engine";
import { WebSocketNetwork } from "@/network";
import { NetworkedScene } from "@/scenes/NetworkedScene";

async function startClient() {
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  if (!canvas) {
    throw new Error("Canvas element not found");
  }

  // Create engine
  const engine = new GameEngine(canvas);
  await engine.initialize();

  // Enable networking as client
  const networkManager = new WebSocketNetwork();
  await engine.enableNetworking(
    networkManager,
    {
      isServer: false,
      isHost: false,
      tickRate: 60,
      snapshotRate: 20,
      interpolationDelay: 100,
    },
    "ws://localhost:8080" // Connect to server
  );

  // Load networked scene
  new NetworkedScene(engine, engine.getWorld());

  // Start game loop
  engine.start();

  console.log("Client started - connected to server at ws://localhost:8080");
}

// Start client when page loads
if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    startClient().catch(console.error);
  });
}
