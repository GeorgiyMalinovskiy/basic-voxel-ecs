import { vec3 } from "gl-matrix";

import {
  VoxelData,
  MeshAlgorithm,
  RigidBody,
  Transform,
  Velocity,
} from "@/components";
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
    this.addBlock({ x: 5, y: 10, z: 5 }); // Higher up so they fall
    this.addBlock({ x: 6, y: 15, z: 5 }); // Even higher
  }

  private addBlock(position: Vec3): void {
    const octree = new Octree(64, 1);
    octree.setVoxel({ x: 0, y: 0, z: 0 }, { density: 1.0, material: 1 });
    const voxelData = new VoxelData(octree, true, MeshAlgorithm.CUBIC);

    const blockEntity = this.world.createEntity();
    this.world.addComponent(blockEntity, voxelData);
    this.world.addComponent(
      blockEntity,
      new Transform(vec3.fromValues(position.x, position.y, position.z))
    );
    this.world.addComponent(
      blockEntity,
      new Velocity(vec3.fromValues(0, 0, 0))
    );
    // RigidBody(mass, radius, friction, isStatic, height)
    this.world.addComponent(blockEntity, new RigidBody(1, 0.5, 0.5, false, 1));
    voxelData.markDirty();
  }

  private createTerrain(): void {
    const octree = new Octree(64, 1);
    const voxelData = new VoxelData(octree, true, MeshAlgorithm.CUBIC);

    const terrainEntity = this.world.createEntity();
    this.world.addComponent(terrainEntity, voxelData);
    this.world.addComponent(
      terrainEntity,
      new Transform(vec3.fromValues(0, 0, 0))
    );
    // RigidBody(mass, radius, friction, isStatic, height) - static terrain
    this.world.addComponent(terrainEntity, new RigidBody(0, 5, 0.5, true, 1));

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
