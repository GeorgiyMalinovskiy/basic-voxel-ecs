import { NetworkMessage, NetworkConfig } from "./types";

/**
 * Network manager interface - abstracts client/server networking
 */
export interface INetworkManager {
  /**
   * Initialize the network manager
   */
  initialize(config: NetworkConfig): Promise<void>;

  /**
   * Start the network manager (server listens, client connects)
   */
  start(address?: string): Promise<void>;

  /**
   * Stop the network manager
   */
  stop(): void;

  /**
   * Send a message to a specific client (server only)
   */
  sendToClient(clientId: string, message: NetworkMessage): void;

  /**
   * Send a message to all clients (server only)
   */
  broadcast(message: NetworkMessage, excludeClientId?: string): void;

  /**
   * Send a message to the server (client only)
   */
  sendToServer(message: NetworkMessage): void;

  /**
   * Register a message handler
   */
  onMessage(
    callback: (message: NetworkMessage, senderId: string) => void
  ): void;

  /**
   * Register a connection handler
   */
  onConnect(callback: (clientId: string) => void): void;

  /**
   * Register a disconnection handler
   */
  onDisconnect(callback: (clientId: string) => void): void;

  /**
   * Get the local client ID
   */
  getClientId(): string;

  /**
   * Get connected client IDs (server only)
   */
  getConnectedClients(): string[];

  /**
   * Check if connected
   */
  isConnected(): boolean;

  /**
   * Check if this is a server
   */
  isServer(): boolean;
}

/**
 * Abstract base class for network managers
 */
export abstract class NetworkManager implements INetworkManager {
  protected config!: NetworkConfig;
  protected clientId: string = "";
  protected connected: boolean = false;
  protected messageHandlers: Array<
    (message: NetworkMessage, senderId: string) => void
  > = [];
  protected connectHandlers: Array<(clientId: string) => void> = [];
  protected disconnectHandlers: Array<(clientId: string) => void> = [];

  abstract initialize(config: NetworkConfig): Promise<void>;
  abstract start(address?: string): Promise<void>;
  abstract stop(): void;
  abstract sendToClient(clientId: string, message: NetworkMessage): void;
  abstract broadcast(message: NetworkMessage, excludeClientId?: string): void;
  abstract sendToServer(message: NetworkMessage): void;
  abstract getConnectedClients(): string[];

  onMessage(
    callback: (message: NetworkMessage, senderId: string) => void
  ): void {
    this.messageHandlers.push(callback);
  }

  onConnect(callback: (clientId: string) => void): void {
    this.connectHandlers.push(callback);
  }

  onDisconnect(callback: (clientId: string) => void): void {
    this.disconnectHandlers.push(callback);
  }

  getClientId(): string {
    return this.clientId;
  }

  isConnected(): boolean {
    return this.connected;
  }

  isServer(): boolean {
    return this.config?.isServer ?? false;
  }

  protected handleMessage(message: NetworkMessage, senderId: string): void {
    for (const handler of this.messageHandlers) {
      handler(message, senderId);
    }
  }

  protected handleConnect(clientId: string): void {
    for (const handler of this.connectHandlers) {
      handler(clientId);
    }
  }

  protected handleDisconnect(clientId: string): void {
    for (const handler of this.disconnectHandlers) {
      handler(clientId);
    }
  }
}

