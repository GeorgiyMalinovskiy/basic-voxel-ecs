import { NetworkManager } from "./NetworkManager";
import {
  NetworkMessage,
  NetworkConfig,
  ConnectMessage,
  MessageType,
} from "./types";

/**
 * WebSocket-based network manager
 * Works for both client and server (using ws library for Node.js server)
 */
export class WebSocketNetwork extends NetworkManager {
  private ws: WebSocket | null = null;
  private clients: Map<string, WebSocket> = new Map();
  private wsServer: any = null; // WebSocket.Server for Node.js

  async initialize(config: NetworkConfig): Promise<void> {
    this.config = config;
    this.clientId = this.generateClientId();
    console.log(
      `Network initialized as ${config.isServer ? "server" : "client"}, ID: ${
        this.clientId
      }`
    );
  }

  async start(address?: string): Promise<void> {
    if (this.config.isServer) {
      await this.startServer(address);
    } else {
      await this.startClient(address);
    }
  }

  /**
   * Start as server (requires Node.js environment with 'ws' package)
   */
  private async startServer(address?: string): Promise<void> {
    if (typeof window !== "undefined") {
      // Browser environment - can't be a server without special setup
      if (this.config.isHost) {
        console.warn("Client-hosted server not yet implemented for browser");
        // Future: Could use peer-to-peer WebRTC or relay server
      }
      throw new Error("Cannot start server in browser environment");
    }

    // Node.js environment
    try {
      const { WebSocketServer } = await import("ws");
      const port = address ? parseInt(address.split(":")[1]) : 8080;

      this.wsServer = new WebSocketServer({ port });

      this.wsServer.on("connection", (ws: any, req: any) => {
        const clientId = this.generateClientId();
        this.clients.set(clientId, ws);

        console.log(`Client connected: ${clientId}`);

        // Send connect message to client
        const connectMsg: ConnectMessage = {
          type: MessageType.CONNECT,
          timestamp: Date.now(),
          clientId,
        };
        ws.send(JSON.stringify(connectMsg));

        this.handleConnect(clientId);

        ws.on("message", (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString()) as NetworkMessage;
            message.clientId = clientId;
            this.handleMessage(message, clientId);
          } catch (error) {
            console.error("Failed to parse message:", error);
          }
        });

        ws.on("close", () => {
          console.log(`Client disconnected: ${clientId}`);
          this.clients.delete(clientId);
          this.handleDisconnect(clientId);
        });
      });

      this.connected = true;
      console.log(`Server started on port ${port}`);
    } catch (error) {
      console.error("Failed to start server:", error);
      throw error;
    }
  }

  /**
   * Start as client
   */
  private async startClient(address?: string): Promise<void> {
    const url = address || "ws://localhost:8080";

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log(`Connected to server at ${url}`);
        this.connected = true;
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as NetworkMessage;

          // Handle connect message to get our client ID
          if (message.type === MessageType.CONNECT) {
            this.clientId = (message as ConnectMessage).clientId;
            console.log(`Received client ID: ${this.clientId}`);
          }

          this.handleMessage(message, "server");
        } catch (error) {
          console.error("Failed to parse message:", error);
        }
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        reject(error);
      };

      this.ws.onclose = () => {
        console.log("Disconnected from server");
        this.connected = false;
        this.handleDisconnect("server");
      };
    });
  }

  stop(): void {
    if (this.config.isServer && this.wsServer) {
      // Close all client connections
      for (const [clientId, ws] of this.clients.entries()) {
        ws.close();
      }
      this.clients.clear();

      // Close server
      this.wsServer.close();
      this.wsServer = null;
    } else if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connected = false;
    console.log("Network stopped");
  }

  sendToClient(clientId: string, message: NetworkMessage): void {
    if (!this.config.isServer) {
      console.warn("sendToClient called on client");
      return;
    }

    const client = this.clients.get(clientId);
    if (client && client.readyState === 1) {
      // OPEN
      try {
        client.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Failed to send to client ${clientId}:`, error);
      }
    }
  }

  broadcast(message: NetworkMessage, excludeClientId?: string): void {
    if (!this.config.isServer) {
      console.warn("broadcast called on client");
      return;
    }

    for (const [clientId, ws] of this.clients.entries()) {
      if (excludeClientId && clientId === excludeClientId) continue;

      if (ws.readyState === 1) {
        // OPEN
        try {
          ws.send(JSON.stringify(message));
        } catch (error) {
          console.error(`Failed to broadcast to client ${clientId}:`, error);
        }
      }
    }
  }

  sendToServer(message: NetworkMessage): void {
    if (this.config.isServer) {
      console.warn("sendToServer called on server");
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error("Failed to send to server:", error);
      }
    }
  }

  getConnectedClients(): string[] {
    return Array.from(this.clients.keys());
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

