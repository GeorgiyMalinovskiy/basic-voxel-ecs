import type { IPhysicsAdapter, PhysicsWorldConfig } from "./physics-adapter";
import { CannonPhysicsAdapter } from "./cannon-adapter";
import { SimplePhysicsAdapter } from "./simple-adapter";

/**
 * Physics adapter factory
 */
export class PhysicsAdapterFactory {
  /**
   * Create physics adapter based on type
   * @param type Adapter type
   * @param config World configuration
   * @returns Physics adapter instance
   */
  static create(
    type: "cannon" | "rapier" | "ammo" | "simple",
    config?: PhysicsWorldConfig
  ): IPhysicsAdapter {
    switch (type) {
      case "cannon":
        return new CannonPhysicsAdapter(config);
      case "simple":
        return new SimplePhysicsAdapter(config);
      default:
        throw new Error(`Unsupported physics adapter type: ${type}`);
    }
  }
}
