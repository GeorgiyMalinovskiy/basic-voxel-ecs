import { Component } from "@/ecs";
import { Octree } from "@/voxel";

/**
 * Mesh generation algorithm type
 */
export enum MeshAlgorithm {
  /**
   * Blocky Minecraft-style voxels with face culling
   */
  CUBIC = "cubic",

  /**
   * Smooth organic shapes using marching cubes
   */
  MARCHING_CUBES = "marching_cubes",
}

/**
 * Component that holds voxel density data for an entity
 * Can be used for terrain chunks, dynamic voxel structures, etc.
 */
export class VoxelData extends Component {
  public octree: Octree;
  public needsRemesh: boolean;
  public algorithm: MeshAlgorithm;

  /**
   * Create voxel data component
   * @param octree - Octree holding voxel density data
   * @param needsRemesh - Whether the mesh needs to be regenerated
   * @param algorithm - Which mesh generation algorithm to use
   */
  constructor(
    octree: Octree,
    needsRemesh = true,
    algorithm = MeshAlgorithm.MARCHING_CUBES
  ) {
    super();
    this.octree = octree;
    this.needsRemesh = needsRemesh;
    this.algorithm = algorithm;
  }

  getType(): string {
    return "VoxelData";
  }

  /**
   * Mark that voxels have changed and mesh needs regeneration
   */
  markDirty(): void {
    this.needsRemesh = true;
  }

  /**
   * Set the mesh generation algorithm
   */
  setAlgorithm(algorithm: MeshAlgorithm): void {
    if (this.algorithm !== algorithm) {
      this.algorithm = algorithm;
      this.markDirty();
    }
  }
}
