import { Component } from "@/ecs";

/**
 * RigidBody component - physics properties
 */
export class RigidBody extends Component {
  public mass: number;
  public radius: number; // Size for collision shape
  public height: number; // Height for collision shape
  public friction: number;
  public restitution: number;
  public isStatic: boolean;

  constructor(
    mass = 1,
    radius = 1,
    friction = 0.5,
    isStatic = false,
    height = 2
  ) {
    super();
    this.mass = mass;
    this.radius = radius;
    this.height = height;
    this.friction = friction;
    this.restitution = 0.3; // Default restitution
    this.isStatic = isStatic;
  }

  getType(): string {
    return "RigidBody";
  }
}
