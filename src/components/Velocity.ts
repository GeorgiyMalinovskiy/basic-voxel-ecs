import { Component } from "@/ecs";
import { vec3 } from "gl-matrix";

/**
 * Velocity component - for physics
 */
export class Velocity extends Component {
  public linear: vec3;
  public angular: vec3;

  constructor(
    linear: vec3 = vec3.fromValues(0, 0, 0),
    angular: vec3 = vec3.fromValues(0, 0, 0)
  ) {
    super();
    this.linear = linear;
    this.angular = angular;
  }

  getType(): string {
    return "Velocity";
  }
}
