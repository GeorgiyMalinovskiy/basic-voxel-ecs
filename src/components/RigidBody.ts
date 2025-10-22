import { Component } from "@/ecs";

export interface RigidBodyConfig {
  mass?: number; // 0 = static body
  radius?: number; // Fallback collision size (ignored if VoxelData exists)
  height?: number; // Fallback height for capsule/cylinder shapes
  friction?: number; // 0-1 range
  restitution?: number; // Bounciness 0-1
  isStatic?: boolean; // Static bodies don't move
  enableRotation?: boolean; // Enable angular momentum and rotation (default: false)
  angularDamping?: number; // Resistance to rotation (0-1, default: 0.1)
}

/**
 * RigidBody component - physics properties
 *
 * Note: If entity has VoxelData component, collision shape is auto-calculated
 * from voxel bounds. radius/height are only used as fallback for non-voxel entities.
 */
export class RigidBody extends Component {
  public mass: number;
  public radius: number;
  public height: number;
  public friction: number;
  public restitution: number;
  public isStatic: boolean;
  public enableRotation: boolean;
  public angularDamping: number;

  constructor(config: RigidBodyConfig = {}) {
    super();
    this.mass = config.mass ?? 1;
    this.radius = config.radius ?? 1;
    this.height = config.height ?? 2;
    this.friction = config.friction ?? 0.5;
    this.restitution = config.restitution ?? 0.3;
    this.isStatic = config.isStatic ?? false;
    this.enableRotation = config.enableRotation ?? false;
    this.angularDamping = config.angularDamping ?? 0.1;
  }

  getType(): string {
    return "RigidBody";
  }
}
