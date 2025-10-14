import { VoxelEngine } from "@/engine";

/**
 * Base scene interface that all scenes must implement
 */
export interface Scene {
  name: string;
  description: string;
  generate(engine: VoxelEngine): void;
  cleanup?(engine: VoxelEngine): void;
}

/**
 * Base scene class with common functionality
 */
export abstract class BaseScene implements Scene {
  abstract name: string;
  abstract description: string;

  /**
   * Generate the scene content
   */
  abstract generate(engine: VoxelEngine): void;

  /**
   * Clean up scene resources (optional)
   */
  cleanup?(engine: VoxelEngine): void;

  /**
   * Helper method to generate terrain
   */
  protected generateTerrain(
    engine: VoxelEngine,
    size: number = 16,
    height: number = 8
  ): void {
    engine.generateTerrain(size, height);
  }

  /**
   * Helper method to generate a sphere
   */
  protected generateSphere(
    engine: VoxelEngine,
    position: { x: number; y: number; z: number },
    radius: number = 2,
    material: number = 1
  ): void {
    engine.generateSphere(position, radius, material);
  }

  /**
   * Helper method to generate a box
   */
  protected generateBox(
    engine: VoxelEngine,
    min: { x: number; y: number; z: number },
    max: { x: number; y: number; z: number },
    material: number = 1
  ): void {
    engine.generateBox(min, max, material);
  }

  /**
   * Helper method to generate random spheres
   */
  protected generateRandomSpheres(
    engine: VoxelEngine,
    count: number = 3,
    minRadius: number = 1,
    maxRadius: number = 3
  ): void {
    for (let i = 0; i < count; i++) {
      const x = Math.random() * 12 + 2;
      const y = Math.random() * 8 + 4;
      const z = Math.random() * 12 + 2;
      const radius = Math.random() * (maxRadius - minRadius) + minRadius;
      const material = Math.floor(Math.random() * 3) + 1;

      this.generateSphere(engine, { x, y, z }, radius, material);
    }
  }

  /**
   * Helper method to generate a simple building
   */
  protected generateBuilding(
    engine: VoxelEngine,
    position: { x: number; y: number; z: number },
    width: number = 4,
    height: number = 6,
    depth: number = 4,
    material: number = 1
  ): void {
    // Base
    this.generateBox(
      engine,
      { x: position.x, y: position.y, z: position.z },
      { x: position.x + width, y: position.y + height, z: position.z + depth },
      material
    );

    // Roof (slightly smaller)
    const roofOffset = 0.5;
    this.generateBox(
      engine,
      {
        x: position.x + roofOffset,
        y: position.y + height,
        z: position.z + roofOffset,
      },
      {
        x: position.x + width - roofOffset,
        y: position.y + height + 2,
        z: position.z + depth - roofOffset,
      },
      material
    );
  }

  /**
   * Helper method to generate a cave system (carves out existing terrain)
   */
  protected generateCave(
    engine: VoxelEngine,
    center: { x: number; y: number; z: number },
    radius: number = 8,
    height: number = 6
  ): void {
    // Carve out cave from existing terrain
    for (let x = center.x - radius; x < center.x + radius; x++) {
      for (let y = center.y - height / 2; y < center.y + height / 2; y++) {
        for (let z = center.z - radius; z < center.z + radius; z++) {
          const distance = Math.sqrt(
            (x - center.x) ** 2 + (y - center.y) ** 2 + (z - center.z) ** 2
          );

          if (distance < radius) {
            engine.setVoxel({ x, y, z }, { density: 0, material: 0 });
          }
        }
      }
    }
  }
}
