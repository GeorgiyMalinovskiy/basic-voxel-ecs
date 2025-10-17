import { Component } from "@/ecs";

/**
 * Player component - marks entity as player-controlled
 */
export class Player extends Component {
  public moveSpeed: number;
  public lookSpeed: number;

  constructor(moveSpeed = 5, lookSpeed = 0.002) {
    super();
    this.moveSpeed = moveSpeed;
    this.lookSpeed = lookSpeed;
  }

  getType(): string {
    return "Player";
  }
}
