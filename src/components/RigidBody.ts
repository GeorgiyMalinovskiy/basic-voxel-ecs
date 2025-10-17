import { Component } from "@/ecs";

/**
 * RigidBody component - physics properties
 */
export class RigidBody extends Component {
  public mass: number;
  public friction: number;
  public restitution: number;
  public isStatic: boolean;

  constructor(mass = 1, friction = 0.5, restitution = 0.3, isStatic = false) {
    super();
    this.mass = mass;
    this.friction = friction;
    this.restitution = restitution;
    this.isStatic = isStatic;
  }

  getType(): string {
    return "RigidBody";
  }
}
