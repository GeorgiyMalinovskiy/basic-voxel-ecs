import { Component } from "@/ecs";
import { PhysicsBodyHandle } from "@/physics";

/**
 * Component that links an entity to a physics body in the physics adapter
 */
export class PhysicsBody extends Component {
  public handle: PhysicsBodyHandle;
  public mass: number;
  public friction: number;
  public restitution: number;
  public lockRotations: boolean;

  constructor(
    handle: PhysicsBodyHandle,
    mass = 1,
    friction = 0.5,
    restitution = 0.3,
    lockRotations = false
  ) {
    super();
    this.handle = handle;
    this.mass = mass;
    this.friction = friction;
    this.restitution = restitution;
    this.lockRotations = lockRotations;
  }

  getType(): string {
    return "PhysicsBody";
  }
}
