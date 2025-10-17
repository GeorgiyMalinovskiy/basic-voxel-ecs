import { World } from "./World";

/**
 * System - pure logic, operates on components
 */
export abstract class System {
  protected world!: World;

  onAddedToWorld(world: World): void {
    this.world = world;
  }

  abstract update(deltaTime: number): void;
}
