import { Component } from "@/ecs";
import { vec3 } from "gl-matrix";

export interface CameraTargetConfig {
  followDistance?: number; // Distance behind target
  heightOffset?: number; // Height above target
  lookAtOffset?: vec3; // Offset for where camera looks (relative to entity)
  smooth?: number; // Camera smoothing factor (0-1, higher = smoother)
}

/**
 * CameraTarget component - marks an entity as a camera target
 * The camera will follow and look at entities with this component
 */
export class CameraTarget extends Component {
  public followDistance: number;
  public heightOffset: number;
  public lookAtOffset: vec3;
  public smooth: number;

  constructor(config: CameraTargetConfig = {}) {
    super();
    this.followDistance = config.followDistance ?? 10;
    this.heightOffset = config.heightOffset ?? 2;
    this.lookAtOffset = config.lookAtOffset ?? vec3.fromValues(0, 0, 0);
    this.smooth = config.smooth ?? 0.1;
  }

  getType(): string {
    return "CameraTarget";
  }
}
