import { World } from "@/ecs/world";
import { System } from "@/ecs/system";
import { VoxelEngine } from "@/engine";
import { BaseScene } from "@/scenes/base-scene";

export class DemoScene extends BaseScene {
  name = "ECS Demo";
  description = "Entity Component System with physics, spawning, and rendering";
  private world!: World;
  private systems: System[] = [];

  generate(engine: VoxelEngine): void {}

  cleanup(engine: VoxelEngine): void {}

  private createPlayer(): void {}

  private createCamera(): void {}

  /**
   * Get the ECS world for external access
   */
  getWorld(): World {
    return this.world;
  }

  /**
   * Get all systems
   */
  getSystems(): System[] {
    return this.systems;
  }

  /**
   * Update the ECS scene
   */
  update(deltaTime: number): void {
    // Update all systems
    for (const system of this.systems) {
      system.update(deltaTime);
    }
  }
}
