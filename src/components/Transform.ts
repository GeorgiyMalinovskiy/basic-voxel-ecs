import { Component } from "@/ecs";
import { vec3 } from "gl-matrix";

/**
 * Transform component - position, rotation, scale
 */
export class Transform extends Component {
  public position: vec3;
  public rotation: vec3;
  public scale: vec3;

  constructor(
    position: vec3 = vec3.fromValues(0, 0, 0),
    rotation: vec3 = vec3.fromValues(0, 0, 0),
    scale: vec3 = vec3.fromValues(1, 1, 1)
  ) {
    super();
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
  }

  getType(): string {
    return "Transform";
  }
}
