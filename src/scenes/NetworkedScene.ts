import { World } from "@/ecs";
import { GameEngine } from "@/engine";
import {
  Transform,
  Velocity,
  VoxelData,
  RigidBody,
  NetworkEntity,
  Player,
  CameraTarget,
} from "@/components";
import { Octree } from "@/voxel";
import { MeshAlgorithm } from "@/components/VoxelData";
import { vec3 } from "gl-matrix";
import { NetworkAuthority } from "@/network";

/**
 * NetworkedScene - demonstrates multiplayer functionality
 *
 * This scene can run as either:
 * - Server: Host the game world and synchronize to all clients
 * - Client: Connect to a server and receive world updates
 * - Client-Host: Both server and client in one (for testing)
 */
export class NetworkedScene {
  private world: World;

  constructor(engine: GameEngine, world: World) {
    this.world = world;

    // Setup the scene
    this.createTerrain();
    this.spawnNetworkedBlocks();

    // Only create local player if this is a client or client-host
    if (!engine.isNetworkServer || engine.isNetworkClientHost) {
      this.createLocalPlayer();
    }

    console.log("NetworkedScene initialized");
  }

  /**
   * Create terrain (replicated to all clients)
   */
  private createTerrain(): void {
    const terrainEntity = this.world.createEntity();

    // Create flat terrain
    const terrainOctree = new Octree(6);
    const halfSize = 32;

    for (let x = -halfSize; x < halfSize; x++) {
      for (let z = -halfSize; z < halfSize; z++) {
        for (let y = 0; y < 2; y++) {
          terrainOctree.setVoxel({ x, y, z }, { density: 1.0, material: 2 });
        }
      }
    }

    this.world.addComponent(
      terrainEntity,
      new VoxelData(terrainOctree, true, MeshAlgorithm.CUBIC)
    );

    this.world.addComponent(
      terrainEntity,
      new Transform(vec3.fromValues(0, 0, 0))
    );

    this.world.addComponent(
      terrainEntity,
      new RigidBody({ mass: 0, friction: 0.8, isStatic: true })
    );

    // Mark as networked (static terrain)
    this.world.addComponent(
      terrainEntity,
      new NetworkEntity({
        networkId: "terrain",
        authority: NetworkAuthority.SERVER,
        replicateTransform: false, // Static, doesn't move
        replicateVelocity: false,
        updateRate: 0, // Never needs updates
      })
    );

    console.log("Terrain created");
  }

  /**
   * Spawn networked falling blocks
   */
  private spawnNetworkedBlocks(): void {
    // Create several blocks that will be synchronized across network
    const blockPositions = [
      { x: 5, y: 15, z: 5 },
      { x: 8, y: 18, z: 8 },
      { x: -5, y: 20, z: 5 },
      { x: 5, y: 22, z: -5 },
    ];

    blockPositions.forEach((pos, index) => {
      const blockEntity = this.world.createEntity();

      // Create small voxel cube
      const blockOctree = new Octree(2);
      for (let x = 0; x < 2; x++) {
        for (let y = 0; y < 2; y++) {
          for (let z = 0; z < 2; z++) {
            blockOctree.setVoxel({ x, y, z }, { density: 1.0, material: 2 });
          }
        }
      }

      this.world.addComponent(
        blockEntity,
        new VoxelData(blockOctree, true, MeshAlgorithm.CUBIC)
      );

      this.world.addComponent(
        blockEntity,
        new Transform(vec3.fromValues(pos.x, pos.y, pos.z))
      );

      this.world.addComponent(blockEntity, new Velocity());

      this.world.addComponent(
        blockEntity,
        new RigidBody({
          mass: 2,
          friction: 0.5,
          restitution: 0.3,
          enableRotation: true,
          angularDamping: 0.2,
        })
      );

      // Mark as networked (dynamic object)
      this.world.addComponent(
        blockEntity,
        new NetworkEntity({
          networkId: `block_${index}`,
          authority: NetworkAuthority.SERVER,
          replicateTransform: true,
          replicateVelocity: true,
          replicatePhysics: true,
          updateRate: 20, // 20 updates per second
        })
      );
    });

    console.log(`Spawned ${blockPositions.length} networked blocks`);
  }

  /**
   * Create local player (client-owned)
   */
  private createLocalPlayer(): void {
    const playerEntity = this.world.createEntity();

    // Create player voxel mesh (simple humanoid)
    const playerOctree = new Octree(3);

    // Body
    for (let x = 0; x < 2; x++) {
      for (let y = 2; y < 5; y++) {
        for (let z = 0; z < 1; z++) {
          playerOctree.setVoxel({ x, y, z }, { density: 1.0, material: 2 });
        }
      }
    }

    // Head
    for (let x = 0; x < 2; x++) {
      for (let y = 5; y < 7; y++) {
        for (let z = 0; z < 1; z++) {
          playerOctree.setVoxel({ x, y, z }, { density: 1.0, material: 2 });
        }
      }
    }

    this.world.addComponent(
      playerEntity,
      new VoxelData(playerOctree, true, MeshAlgorithm.CUBIC)
    );

    this.world.addComponent(
      playerEntity,
      new Transform(vec3.fromValues(0, 10, 0))
    );

    this.world.addComponent(playerEntity, new Velocity());

    this.world.addComponent(
      playerEntity,
      new RigidBody({
        mass: 1,
        friction: 0.6,
        restitution: 0.0,
        enableRotation: false,
      })
    );

    this.world.addComponent(playerEntity, new Player());

    this.world.addComponent(
      playerEntity,
      new CameraTarget({
        followDistance: 15,
        heightOffset: 8,
        smooth: 0.1,
      })
    );

    // Mark as networked (client-owned)
    this.world.addComponent(
      playerEntity,
      new NetworkEntity({
        authority: NetworkAuthority.CLIENT, // Client has authority
        replicateTransform: true,
        replicateVelocity: true,
        replicatePhysics: false,
        updateRate: 30, // Higher update rate for player
      })
    );

    console.log("Local player created");
  }
}
