import { System, Entity } from "@/ecs";
import { Transform, Velocity, RigidBody } from "@/components";
import { NetworkEntity } from "@/components/NetworkEntity";
import { INetworkManager } from "@/network/NetworkManager";
import {
  NetworkMessage,
  MessageType,
  EntitySnapshot,
  WorldSnapshot,
  StateUpdateMessage,
  EntityCreateMessage,
  EntityDestroyMessage,
} from "@/network/types";
import { vec3 } from "gl-matrix";

/**
 * NetworkSystem - handles entity replication and state synchronization
 *
 * Server: Broadcasts entity state to all clients
 * Client: Receives state updates and applies them to entities
 */
export class NetworkSystem extends System {
  private networkManager: INetworkManager;
  private lastSnapshotTime: number = 0;
  private tick: number = 0;
  private networkIdToEntity: Map<string, Entity> = new Map();

  constructor(networkManager: INetworkManager) {
    super();
    this.networkManager = networkManager;

    // Register message handlers
    this.networkManager.onMessage(this.handleMessage.bind(this));
    this.networkManager.onConnect(this.handleClientConnect.bind(this));
    this.networkManager.onDisconnect(this.handleClientDisconnect.bind(this));
  }

  update(deltaTime: number): void {
    this.tick++;

    if (this.networkManager.isServer()) {
      this.updateServer(deltaTime);
    } else {
      this.updateClient(deltaTime);
    }
  }

  /**
   * Server update - send state to clients
   */
  private updateServer(deltaTime: number): void {
    const currentTime = Date.now();

    // Collect entities that need updates
    const updates: EntitySnapshot[] = [];
    const entities = this.world.query(NetworkEntity, Transform);

    for (const entity of entities) {
      const netEntity = this.world.getComponent(entity, NetworkEntity)!;

      // Check if this entity should be updated this frame
      if (!netEntity.shouldUpdate(currentTime) && !netEntity.isDirty) {
        continue;
      }

      const snapshot = this.createEntitySnapshot(entity, netEntity);
      if (snapshot) {
        updates.push(snapshot);
        netEntity.markUpdated(currentTime);
      }
    }

    // Send updates if any
    if (updates.length > 0) {
      const message: StateUpdateMessage = {
        type: MessageType.STATE_UPDATE,
        timestamp: currentTime,
        updates,
      };
      this.networkManager.broadcast(message);
    }
  }

  /**
   * Client update - interpolate received state
   */
  private updateClient(deltaTime: number): void {
    // Client-side prediction and interpolation can be added here
    // For now, we directly apply received states
  }

  /**
   * Create a snapshot of an entity's networked state
   */
  private createEntitySnapshot(
    entity: Entity,
    netEntity: NetworkEntity
  ): EntitySnapshot | null {
    const components: Record<string, any> = {};

    // Transform
    if (netEntity.replicateTransform) {
      const transform = this.world.getComponent(entity, Transform);
      if (transform) {
        components.Transform = {
          position: Array.from(transform.position),
          rotation: Array.from(transform.rotation),
          scale: Array.from(transform.scale),
        };
      }
    }

    // Velocity
    if (netEntity.replicateVelocity) {
      const velocity = this.world.getComponent(entity, Velocity);
      if (velocity) {
        components.Velocity = {
          linear: Array.from(velocity.linear),
        };
      }
    }

    // Physics
    if (netEntity.replicatePhysics) {
      const rigidBody = this.world.getComponent(entity, RigidBody);
      if (rigidBody) {
        components.RigidBody = {
          mass: rigidBody.mass,
          friction: rigidBody.friction,
          restitution: rigidBody.restitution,
          isStatic: rigidBody.isStatic,
        };
      }
    }

    return {
      entityId: entity.id,
      networkId: netEntity.networkId,
      components,
      timestamp: Date.now(),
    };
  }

  /**
   * Apply a snapshot to an entity
   */
  private applyEntitySnapshot(snapshot: EntitySnapshot): void {
    // Find or create entity
    let entity = this.networkIdToEntity.get(snapshot.networkId);

    if (!entity) {
      // Entity doesn't exist locally, skip for now
      // It should be created via ENTITY_CREATE message
      return;
    }

    // Apply Transform
    if (snapshot.components.Transform) {
      const transform = this.world.getComponent(entity, Transform);
      if (transform) {
        const data = snapshot.components.Transform;
        vec3.set(
          transform.position,
          data.position[0],
          data.position[1],
          data.position[2]
        );
        vec3.set(
          transform.rotation,
          data.rotation[0],
          data.rotation[1],
          data.rotation[2]
        );
        vec3.set(transform.scale, data.scale[0], data.scale[1], data.scale[2]);
      }
    }

    // Apply Velocity
    if (snapshot.components.Velocity) {
      const velocity = this.world.getComponent(entity, Velocity);
      if (velocity) {
        const data = snapshot.components.Velocity;
        vec3.set(
          velocity.linear,
          data.linear[0],
          data.linear[1],
          data.linear[2]
        );
      }
    }

    // Apply RigidBody
    if (snapshot.components.RigidBody) {
      const rigidBody = this.world.getComponent(entity, RigidBody);
      if (rigidBody) {
        const data = snapshot.components.RigidBody;
        rigidBody.mass = data.mass;
        rigidBody.friction = data.friction;
        rigidBody.restitution = data.restitution;
        rigidBody.isStatic = data.isStatic;
      }
    }
  }

  /**
   * Handle incoming network messages
   */
  private handleMessage(message: NetworkMessage, senderId: string): void {
    switch (message.type) {
      case MessageType.STATE_UPDATE:
        this.handleStateUpdate(message as StateUpdateMessage);
        break;

      case MessageType.ENTITY_CREATE:
        this.handleEntityCreate(message as EntityCreateMessage);
        break;

      case MessageType.ENTITY_DESTROY:
        this.handleEntityDestroy(message as EntityDestroyMessage);
        break;

      case MessageType.SNAPSHOT:
        this.handleSnapshot(message as WorldSnapshot);
        break;
    }
  }

  /**
   * Handle state update message
   */
  private handleStateUpdate(message: StateUpdateMessage): void {
    for (const snapshot of message.updates) {
      this.applyEntitySnapshot(snapshot);
    }
  }

  /**
   * Handle entity creation message
   */
  private handleEntityCreate(message: EntityCreateMessage): void {
    // TODO: Create entity with components from message
    console.log(`Entity created: ${message.networkId}`);
  }

  /**
   * Handle entity destruction message
   */
  private handleEntityDestroy(message: EntityDestroyMessage): void {
    const entity = this.networkIdToEntity.get(message.networkId);
    if (entity) {
      this.world.destroyEntity(entity);
      this.networkIdToEntity.delete(message.networkId);
      console.log(`Entity destroyed: ${message.networkId}`);
    }
  }

  /**
   * Handle full world snapshot
   */
  private handleSnapshot(message: WorldSnapshot): void {
    console.log(
      `Received world snapshot with ${message.entities.length} entities`
    );
    for (const snapshot of message.entities) {
      this.applyEntitySnapshot(snapshot);
    }
  }

  /**
   * Handle client connection
   */
  private handleClientConnect(clientId: string): void {
    if (this.networkManager.isServer()) {
      console.log(`Client connected: ${clientId}`);
      // Send full world snapshot to new client
      this.sendWorldSnapshot(clientId);
    }
  }

  /**
   * Handle client disconnection
   */
  private handleClientDisconnect(clientId: string): void {
    console.log(`Client disconnected: ${clientId}`);
    // Clean up client-owned entities
  }

  /**
   * Send full world snapshot to a client (server only)
   */
  private sendWorldSnapshot(clientId: string): void {
    const entities = this.world.query(NetworkEntity, Transform);
    const snapshots: EntitySnapshot[] = [];

    for (const entity of entities) {
      const netEntity = this.world.getComponent(entity, NetworkEntity)!;
      const snapshot = this.createEntitySnapshot(entity, netEntity);
      if (snapshot) {
        snapshots.push(snapshot);
      }
    }

    const message: WorldSnapshot = {
      type: MessageType.SNAPSHOT,
      timestamp: Date.now(),
      entities: snapshots,
      tick: this.tick,
    };

    this.networkManager.sendToClient(clientId, message);
  }

  /**
   * Register an entity for networking
   */
  public registerEntity(entity: Entity, networkId: string): void {
    this.networkIdToEntity.set(networkId, entity);
  }

  /**
   * Unregister an entity from networking
   */
  public unregisterEntity(networkId: string): void {
    this.networkIdToEntity.delete(networkId);
  }
}

