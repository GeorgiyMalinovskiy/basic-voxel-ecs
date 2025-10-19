import { VoxelData, MeshAlgorithm, Transform } from "@/components";
import { GameEngine } from "@/engine";
import { World } from "@/ecs";
import { Octree } from "@/voxel";
import { vec3 } from "gl-matrix";

export class ApiTestScene {
  protected world: World;
  constructor(private engine: GameEngine) {
    this.world = engine.getWorld();
  }

  public setup(): void {
    console.log("Setting up api test scene...");
    this.createTerrain();
    this.setupCamera();
  }

  private createTerrain(): void {
    const octree = new Octree(64, 1);
    const voxelData = new VoxelData(octree, true, MeshAlgorithm.CUBIC);

    const terrainEntity = this.world.createEntity();
    this.world.addComponent(terrainEntity, voxelData);
    this.world.addComponent(terrainEntity, new Transform([0, 0, 0]));

    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 1; y++) {
        for (let z = 0; z < 10; z++) {
          octree.setVoxel({ x, y, z }, { density: 1.0, material: 2 });
        }
      }
    }

    voxelData.markDirty();
  }

  private setupCamera(): void {
    const camera = this.engine.getCamera();

    // Position camera to look at the center of your mesh (5, 5, 1)
    const meshCenter = vec3.fromValues(0, 0, 0);
    const cameraPosition = vec3.fromValues(15, 5, 15); // Back and up from the mesh

    camera.setPosition(cameraPosition);
    camera.setTarget(meshCenter);
  }
}
