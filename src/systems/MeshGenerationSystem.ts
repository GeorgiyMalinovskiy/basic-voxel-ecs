import { System } from "@/ecs";
import { VoxelData, VoxelMesh, MeshAlgorithm } from "@/components";
import { CubicVoxelMesher, MarchingCubes, VoxelGrid } from "@/voxel";

/**
 * System that generates meshes from VoxelData
 * Supports both cubic (Minecraft-style) and marching cubes (smooth) rendering
 * Runs on entities with VoxelData component, creates/updates VoxelMesh component
 */
export class MeshGenerationSystem extends System {
  private marchingCubes: MarchingCubes;
  private cubicMesher: CubicVoxelMesher;

  constructor(isoLevel = 0.5) {
    super();
    this.marchingCubes = new MarchingCubes(isoLevel);
    this.cubicMesher = new CubicVoxelMesher(isoLevel);
  }

  update(_deltaTime: number): void {
    // Find all entities with VoxelData
    const entities = this.world.query(VoxelData);

    for (const entity of entities) {
      const voxelData = this.world.getComponent(entity, VoxelData)!;

      // Only regenerate mesh if dirty
      if (voxelData.needsRemesh) {
        let mesh;

        if (voxelData.algorithm === MeshAlgorithm.CUBIC) {
          // Cubic mesher uses Octree directly
          mesh = this.cubicMesher.generateMesh(voxelData.octree);
        } else {
          // Marching cubes uses VoxelGrid adapter
          const octreeGrid: VoxelGrid = {
            getSizeX: () => voxelData.octree.getWorldSize(),
            getSizeY: () => voxelData.octree.getWorldSize(),
            getSizeZ: () => voxelData.octree.getWorldSize(),
            getDensity: (x: number, y: number, z: number) =>
              voxelData.octree.getDensity({ x, y, z }),
            getMaterial: (x: number, y: number, z: number) =>
              voxelData.octree.getMaterial({ x, y, z }),
          };
          mesh = this.marchingCubes.generateMesh(octreeGrid);
        }

        // Update or create VoxelMesh component
        let voxelMesh = this.world.getComponent(entity, VoxelMesh);
        if (voxelMesh) {
          voxelMesh.mesh = mesh;
        } else {
          voxelMesh = new VoxelMesh(mesh);
          this.world.addComponent(entity, voxelMesh);
        }

        // Mark as clean
        voxelData.needsRemesh = false;
      }
    }
  }
}
