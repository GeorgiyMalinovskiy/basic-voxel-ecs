/**
 * Network message types
 */
export enum MessageType {
  // Connection
  CONNECT = "connect",
  DISCONNECT = "disconnect",

  // Entity lifecycle
  ENTITY_CREATE = "entity_create",
  ENTITY_DESTROY = "entity_destroy",

  // State sync
  STATE_UPDATE = "state_update",
  SNAPSHOT = "snapshot",

  // Input
  INPUT = "input",

  // Custom events
  EVENT = "event",
}

/**
 * Network message base
 */
export interface NetworkMessage {
  type: MessageType;
  timestamp: number;
  clientId?: string;
}

/**
 * Entity state snapshot
 */
export interface EntitySnapshot {
  entityId: number;
  networkId: string;
  components: Record<string, any>;
  timestamp: number;
}

/**
 * World snapshot (full state)
 */
export interface WorldSnapshot extends NetworkMessage {
  type: MessageType.SNAPSHOT;
  entities: EntitySnapshot[];
  tick: number;
}

/**
 * Entity creation message
 */
export interface EntityCreateMessage extends NetworkMessage {
  type: MessageType.ENTITY_CREATE;
  networkId: string;
  ownerId: string;
  components: Record<string, any>;
}

/**
 * Entity destruction message
 */
export interface EntityDestroyMessage extends NetworkMessage {
  type: MessageType.ENTITY_DESTROY;
  networkId: string;
}

/**
 * State update message (delta update)
 */
export interface StateUpdateMessage extends NetworkMessage {
  type: MessageType.STATE_UPDATE;
  updates: EntitySnapshot[];
}

/**
 * Input message
 */
export interface InputMessage extends NetworkMessage {
  type: MessageType.INPUT;
  input: any;
  sequence: number;
}

/**
 * Custom event message
 */
export interface EventMessage extends NetworkMessage {
  type: MessageType.EVENT;
  eventType: string;
  data: any;
}

/**
 * Connection message
 */
export interface ConnectMessage extends NetworkMessage {
  type: MessageType.CONNECT;
  clientId: string;
}

/**
 * Network authority mode
 */
export enum NetworkAuthority {
  SERVER = "server", // Server has authority
  CLIENT = "client", // Client has authority (for their own entities)
  SHARED = "shared", // Both can modify
}

/**
 * Network config
 */
export interface NetworkConfig {
  isServer: boolean;
  isHost: boolean; // Client-hosted server
  tickRate: number; // Server ticks per second
  snapshotRate: number; // Snapshots per second
  interpolationDelay: number; // Client interpolation delay (ms)
}

