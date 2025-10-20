import { vec3 } from "gl-matrix";

import { VoxelData, MeshAlgorithm, RigidBody, Transform } from "@/components";
import { GameEngine } from "@/engine";
import { World } from "@/ecs";
import { Octree } from "@/voxel";
import { Vec3 } from "@/voxel/types";
export class ApiTestScene {
  protected world: World;
  constructor(private engine: GameEngine) {
    this.world = engine.getWorld();
  }

  public setup(): void {
    console.log("Setting up api test scene...");

    this.setupCamera();
    this.createTerrain();

    // Demonstrate different masses
    this.addBlock({ x: 3, y: 15, z: 5 }, 1); // Light block
    this.addBlock({ x: 5, y: 15, z: 5 }, 5); // Medium block
    this.addBlock({ x: 7, y: 15, z: 5 }, 10); // Heavy block

    // Add a bouncy block with high restitution
    this.addBlock({ x: 4, y: 20, z: 5 }, 2, 0.3, 0.8);
  }

  private addBlock(
    position: Vec3,
    mass: number = 1,
    friction: number = 0.5,
    restitution: number = 0.3
  ): void {
    const octree = new Octree(64, 1);
    // Create 1x1x1 voxel block at origin of octree
    octree.setVoxel({ x: 0, y: 0, z: 0 }, { density: 1.0, material: 1 });
    const voxelData = new VoxelData(octree, true, MeshAlgorithm.CUBIC);

    const blockEntity = this.world.createEntity();
    this.world.addComponent(blockEntity, voxelData);
    this.world.addComponent(
      blockEntity,
      new Transform(vec3.fromValues(position.x, position.y, position.z))
    );
    // RigidBody with VoxelData - collision auto-calculated from voxels
    // Mass affects inertia and collision response
    // Restitution controls bounciness (0 = no bounce, 1 = perfect bounce)
    this.world.addComponent(
      blockEntity,
      new RigidBody({ mass, friction, restitution })
    );
    voxelData.markDirty();
  }

  private createTerrain(): void {
    const octree = new Octree(64, 1);
    const voxelData = new VoxelData(octree, true, MeshAlgorithm.CUBIC);

    const terrainEntity = this.world.createEntity();
    this.world.addComponent(terrainEntity, voxelData);

    // Transform at origin - PhysicsSystem will auto-calculate collision box
    // from voxel data (10x1x10 voxels) and center it properly
    this.world.addComponent(
      terrainEntity,
      new Transform(vec3.fromValues(0, 0, 0))
    );

    // RigidBody - physics system will auto-calculate size from voxel data
    this.world.addComponent(terrainEntity, new RigidBody({ isStatic: true }));

    // Create 10x1x10 flat terrain
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
