import { vec3 } from "gl-matrix";

import {
  VoxelData,
  MeshAlgorithm,
  RigidBody,
  Transform,
  Player,
  Velocity,
  CameraTarget,
} from "@/components";
import { GameEngine } from "@/engine";
import { World } from "@/ecs";
import { Octree } from "@/voxel";
import { Vec3 } from "@/voxel/types";
export class ApiTestScene {
  protected world: World;
  constructor(engine: GameEngine) {
    this.world = engine.getWorld();
  }

  public setup(): void {
    console.log("Setting up api test scene...");

    this.createTerrain();

    // Demonstrate different masses
    this.addBlock({ x: 3, y: 15, z: 5 }, 1, 0.5, 0.3, false); // Light block - no rotation
    this.addBlock({ x: 5, y: 15, z: 5 }, 5, 0.5, 0.3, true); // Medium block - with rotation!
    this.addBlock({ x: 7, y: 15, z: 5 }, 10, 0.5, 0.3, true); // Heavy block - with rotation!

    // Add a bouncy rotating block
    this.addBlock({ x: 4, y: 0, z: 5 }, 2, 0.3, 0.8, true);

    // Create player entity with camera
    const player = this.world.createEntity();

    const octree = new Octree(64, 1);
    octree.setVoxel({ x: 0, y: 0, z: 0 }, { density: 1.0, material: 1 });
    const voxelData = new VoxelData(octree, true, MeshAlgorithm.CUBIC);
    this.world.addComponent(player, voxelData);

    // Add Player component for movement control
    this.world.addComponent(player, new Player(3, 0.002));

    // Add CameraTarget component to make camera follow this entity
    this.world.addComponent(
      player,
      new CameraTarget({
        followDistance: 10, // Distance behind player
        heightOffset: 2, // Height above player
        // lookAtOffset auto-calculated from voxel mesh center
      })
    );

    this.world.addComponent(player, new Transform(vec3.fromValues(5, 1, 5)));
    this.world.addComponent(player, new Velocity(vec3.fromValues(0, 0, 0)));
    this.world.addComponent(player, new RigidBody({ mass: 1, friction: 0.1 }));
  }

  private addBlock(
    position: Vec3,
    mass: number = 1,
    friction: number = 0.5,
    restitution: number = 0.3,
    enableRotation: boolean = false
  ): VoxelData {
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
    // enableRotation allows the block to spin/tumble when colliding
    this.world.addComponent(
      blockEntity,
      new RigidBody({
        mass,
        friction,
        restitution,
        enableRotation,
        angularDamping: 0.3, // Some air resistance to rotation
      })
    );
    voxelData.markDirty();

    return voxelData;
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
}
