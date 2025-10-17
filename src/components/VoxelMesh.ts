import { Component } from "@/ecs";
import { Mesh } from "@/voxel";

/**
 * Component for entities that should be rendered as voxels
 * This allows dynamic entities to have voxel-based appearance
 */
export class VoxelMesh extends Component {
  public mesh: Mesh;
  public dirty: boolean;

  /**
   * Create a voxel mesh component
   * @param mesh - Initial mesh data (vertices and indices)
   * @param dirty - Whether the mesh needs to be uploaded to GPU
   */
  constructor(mesh: Mesh = { vertices: [], indices: [] }, dirty = true) {
    super();
    this.mesh = mesh;
    this.dirty = dirty;
  }

  /**
   * Update the mesh data
   */
  setMesh(mesh: Mesh): void {
    this.mesh = mesh;
    this.dirty = true;
  }

  /**
   * Mark mesh as clean (uploaded to GPU)
   */
  markClean(): void {
    this.dirty = false;
  }
}
