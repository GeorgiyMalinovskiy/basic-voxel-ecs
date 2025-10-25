import { Component } from "@/ecs";
import { NetworkAuthority } from "@/network/types";

export interface NetworkEntityConfig {
  networkId?: string; // Unique network ID (auto-generated if not provided)
  ownerId?: string; // Client ID that owns this entity
  authority?: NetworkAuthority; // Who has authority over this entity
  replicateTransform?: boolean; // Replicate Transform component
  replicateVelocity?: boolean; // Replicate Velocity component
  replicatePhysics?: boolean; // Replicate physics state
  updateRate?: number; // Updates per second (0 = every tick)
}

/**
 * NetworkEntity component - marks an entity as networked and replicable
 *
 * Entities with this component will be synchronized across the network.
 * The server has authority by default, but clients can own specific entities.
 */
export class NetworkEntity extends Component {
  public networkId: string;
  public ownerId: string;
  public authority: NetworkAuthority;
  public replicateTransform: boolean;
  public replicateVelocity: boolean;
  public replicatePhysics: boolean;
  public updateRate: number;

  // Internal state
  public lastUpdateTime: number = 0;
  public isDirty: boolean = false;

  constructor(config: NetworkEntityConfig = {}) {
    super();
    this.networkId = config.networkId ?? this.generateNetworkId();
    this.ownerId = config.ownerId ?? "server";
    this.authority = config.authority ?? NetworkAuthority.SERVER;
    this.replicateTransform = config.replicateTransform ?? true;
    this.replicateVelocity = config.replicateVelocity ?? true;
    this.replicatePhysics = config.replicatePhysics ?? false;
    this.updateRate = config.updateRate ?? 20; // 20 updates per second by default
  }

  private generateNetworkId(): string {
    return `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getType(): string {
    return "NetworkEntity";
  }

  /**
   * Check if this entity should be updated this frame
   */
  shouldUpdate(currentTime: number): boolean {
    if (this.updateRate === 0) return true; // Update every frame
    const updateInterval = 1000 / this.updateRate;
    return currentTime - this.lastUpdateTime >= updateInterval;
  }

  /**
   * Mark as updated
   */
  markUpdated(currentTime: number): void {
    this.lastUpdateTime = currentTime;
    this.isDirty = false;
  }

  /**
   * Mark as dirty (needs update)
   */
  markDirty(): void {
    this.isDirty = true;
  }
}

