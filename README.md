# Voxel ECS Game Engine

A modern, fully Entity Component System (ECS) based voxel game engine built with TypeScript, WebGPU, and marching cubes. Create Minecraft-style games with smooth organic voxel shapes, powered by cutting-edge web technologies.

## 🚀 Features

- **Pure ECS Architecture** - Everything is an entity with components, including terrain
- **Dual Meshing Algorithms**
  - **Cubic Voxel Mesher** - Minecraft-style blocks with face culling
  - **Marching Cubes** - Smooth, organic surfaces for caves, characters, and natural formations
- **WebGPU Rendering** - Modern graphics API for high-performance rendering
- **Sparse Voxel Octree** - Efficient memory usage for large voxel worlds
- **Advanced Physics** - Rapier3D integration with collision detection, angular momentum, mass-based dynamics
- **Multiplayer Networking** - WebSocket-based entity replication with server-authoritative physics
- **Player Controller** - WASD movement, mouse look, jumping, and third-person camera
- **Procedural Generation** - Maze generation with recursive backtracking
- **TypeScript** - Full type safety and modern development experience

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Core Concepts](#core-concepts)
4. [Coordinate Systems Explained](#coordinate-systems-explained)
5. [ECS Components](#ecs-components)
6. [Systems](#systems)
7. [Voxel Meshing](#voxel-meshing)
8. [Creating Scenes](#creating-scenes)
9. [Networking Layer](#-networking-layer)
10. [API Reference](#api-reference)
11. [Configuration](#configuration)
12. [Performance](#performance)
13. [Examples](#examples)

---

## 🎯 Quick Start

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open your browser to `http://localhost:5173` (WebGPU required - Chrome/Edge 113+)

### Build

```bash
npm run build
```

### Controls

- **WASD** - Move player
- **Mouse** - Look around (click to lock cursor)
- **Space** - Jump
- **ESC** - Release cursor

---

## 🏗️ Architecture Overview

### Pure ECS Design

This engine follows a **strict Entity Component System** pattern:

```
Entity (ID)
  ↓
Components (Data)
  ↓
Systems (Logic)
```

**Everything is an entity**, including:

- Player character
- Terrain chunks
- Dynamic voxel objects
- Decorative elements

### Directory Structure

```
src/
├── ecs/                    # Core ECS implementation
│   ├── Entity.ts          # Entity ID management
│   ├── Component.ts       # Base component class
│   ├── System.ts          # Base system class
│   └── World.ts           # Entity/Component/System manager
│
├── components/            # Game-specific components
│   ├── Transform.ts       # Position, rotation, scale
│   ├── Velocity.ts        # Linear and angular velocity
│   ├── RigidBody.ts       # Physics properties
│   ├── Player.ts          # Player marker + input params
│   ├── VoxelData.ts       # Octree + mesh algorithm
│   └── VoxelMesh.ts       # Generated mesh data
│
├── systems/               # Game logic systems
│   ├── InputSystem.ts     # Keyboard/mouse input
│   ├── PhysicsSystem.ts   # Gravity, velocity, collision
│   └── MeshGenerationSystem.ts  # VoxelData → VoxelMesh
│
├── voxel/                 # Voxel data structures
│   ├── Octree.ts          # Sparse voxel storage
│   ├── MarchingCubes.ts   # Smooth mesh generation
│   ├── CubicVoxelMesher.ts # Blocky mesh generation
│   └── types.ts           # Voxel, Vec3, AABB types
│
├── renderer/              # WebGPU rendering
│   ├── WebGPURenderer.ts  # Main renderer
│   ├── Camera.ts          # View/projection matrices
│   └── shaders.ts         # WGSL shaders
│
├── scenes/                # Game scenes
│
├── engine/                # Engine wrapper
│   └── GameEngine.ts      # Main game loop + coordination
│
├── utils/                 # Utilities
│   └── MazeGenerator.ts   # Recursive backtracking maze
│
├── constants.ts           # Global configuration
└── main.ts               # Application entry point
```

---

## 💡 Core Concepts

### 1. Entity Component System (ECS)

#### Entity

A unique ID representing a game object:

```typescript
const entity = world.createEntity();
// Entity is just a number: 1, 2, 3, etc.
```

#### Component

Pure data containers:

```typescript
// Transform component - position in world
world.addComponent(entity, new Transform(vec3.fromValues(0, 0, 0)));

// VoxelData component - octree with density field
const octree = new Octree(64, 6);
world.addComponent(
  entity,
  new VoxelData(octree, true, MeshAlgorithm.MARCHING_CUBES)
);
```

#### System

Logic that operates on components:

```typescript
class PhysicsSystem extends System {
  update(deltaTime: number) {
    // Query all entities with Transform + Velocity
    const entities = this.world.query(Transform, Velocity);

    for (const entity of entities) {
      const transform = this.world.getComponent(entity, Transform);
      const velocity = this.world.getComponent(entity, Velocity);

      // Apply physics logic
      transform.position[1] += velocity.linear[1] * deltaTime;
    }
  }
}
```

### 2. Voxel Representation

#### Voxel Structure

```typescript
interface Voxel {
  density: number; // 0-1, for marching cubes (0.5 = iso-surface)
  material: number; // Material ID (1=stone, 2=dirt, 3=grass, etc.)
}
```

#### Sparse Voxel Octree

Memory-efficient storage that only stores non-empty voxels:

```typescript
const octree = new Octree(
  64, // World size (64x64x64)
  6 // Max subdivision levels (2^6 = 64)
);

// Set voxels
octree.setVoxel({ x: 10, y: 5, z: 10 }, { density: 1.0, material: 1 });

// Query voxels
const voxel = octree.getVoxel({ x: 10, y: 5, z: 10 });
```

**Memory savings:**

- Full grid: 64³ = 262,144 voxels
- Sparse octree: Only stores filled voxels (~1-10% typically)

### 3. Mesh Generation

Two algorithms for different visual styles:

#### Cubic Voxel Mesher (Minecraft-style)

```typescript
const voxelData = new VoxelData(
  octree,
  true, // needs remesh
  MeshAlgorithm.CUBIC // Blocky style
);
```

**Characteristics:**

- Perfect cubes
- Face culling (hidden faces not rendered)
- Sharp edges
- Great for buildings, blocks, structures

#### Marching Cubes (Organic)

```typescript
const voxelData = new VoxelData(
  octree,
  true,
  MeshAlgorithm.MARCHING_CUBES // Smooth style
);
```

**Characteristics:**

- Smooth, interpolated surfaces
- Uses density field (iso-level = 0.5)
- Natural, organic shapes
- Great for terrain, characters, caves

**Resolution matters:** Higher voxel density = smoother marching cubes surface

---

## 🌐 Coordinate Systems Explained

Understanding coordinate spaces is crucial for positioning entities correctly.

### The Problem

When you create a voxel mesh (like a player sphere), it exists in **local octree space**:

```
Octree: 12×12×12
Sphere center at local position: (6, 3.5, 6)
```

But you want to place this entity at a **world position**:

```
Desired world position: (4, 3.5, 4)
```

### The Solution: Transform Component

The `Transform` component provides the **offset** between local and world space:

```
World Position = Transform Position + Local Position
```

**Rearranging:**

```
Transform Position = World Position - Local Position
```

### Practical Example: Player Positioning

```typescript
// 1. Define player mesh in LOCAL space
const PLAYER_MESH = {
  OCTREE_SIZE: 12, // 12×12×12 octree
  LOCAL_CENTER: { x: 6, y: 3.5, z: 6 }, // Center of sphere in octree
  RADIUS: 3.5,
};

// 2. Choose desired WORLD position
const desiredWorldPos = { x: 4, y: 3.5, z: 4 };

// 3. Calculate Transform offset
const transformPos = vec3.fromValues(
  desiredWorldPos.x - PLAYER_MESH.LOCAL_CENTER.x, // 4 - 6 = -2
  desiredWorldPos.y - PLAYER_MESH.LOCAL_CENTER.y, // 3.5 - 3.5 = 0
  desiredWorldPos.z - PLAYER_MESH.LOCAL_CENTER.z // 4 - 6 = -2
);
// Result: Transform at (-2, 0, -2)

// 4. Create entity with Transform
world.addComponent(player, new Transform(transformPos));
```

### Verification

```typescript
// Local mesh vertex at (6, 3.5, 6)
const localVertex = { x: 6, y: 3.5, z: 6 };

// Transform position
const transformPos = { x: -2, y: 0, z: -2 };

// World position (rendered position)
const worldPos = {
  x: localVertex.x + transformPos.x, // 6 + (-2) = 4 ✓
  y: localVertex.y + transformPos.y, // 3.5 + 0 = 3.5 ✓
  z: localVertex.z + transformPos.z, // 6 + (-2) = 4 ✓
};
// Player's visual center appears at world (4, 3.5, 4) ✓
```

### Renderer Implementation

The renderer applies this transformation when combining meshes:

```typescript
// In GameEngine.render()
for (const entity of entities) {
  const voxelMesh = world.getComponent(entity, VoxelMesh);
  const transform = world.getComponent(entity, Transform);

  // Transform each vertex to world space
  for (const vertex of voxelMesh.mesh.vertices) {
    const worldVertex = {
      x: vertex.position.x + transform.position[0],
      y: vertex.position.y + transform.position[1],
      z: vertex.position.z + transform.position[2],
    };
    combinedMesh.vertices.push(worldVertex);
  }
}
```

### Camera Targeting

The camera must also account for this offset:

```typescript
// Look at player's visual center in world space
const targetPos = vec3.create();
vec3.copy(targetPos, transform.position); // Start with Transform
targetPos[0] += PLAYER_MESH.LOCAL_CENTER.x; // Add local offset
targetPos[1] += PLAYER_MESH.LOCAL_CENTER.y;
targetPos[2] += PLAYER_MESH.LOCAL_CENTER.z;
// Now camera looks at the actual visual center
```

### Key Takeaways

1. **Local Space** - Coordinates within an entity's mesh/octree (0 to size)
2. **World Space** - Absolute coordinates in the game world
3. **Transform** - The bridge between local and world space
4. **Formula**: `World = Transform + Local` or `Transform = World - Local`
5. **Why**: Allows reusing the same mesh (local) at different world positions (transform)

---

## 📦 ECS Components

### Transform

Position, rotation, and scale in world space.

```typescript
import { Transform } from "@/components";
import { vec3 } from "gl-matrix";

const transform = new Transform(
  vec3.fromValues(0, 0, 0), // position
  vec3.fromValues(0, 0, 0), // rotation (euler angles)
  vec3.fromValues(1, 1, 1) // scale
);

// Access/modify
transform.position[0] += 10; // Move 10 units on X axis
```

### Velocity

Linear and angular velocity for physics.

```typescript
import { Velocity } from "@/components";
import { vec3 } from "gl-matrix";

const velocity = new Velocity(
  vec3.fromValues(0, 0, 0), // linear velocity
  vec3.fromValues(0, 0, 0) // angular velocity
);
```

### RigidBody

Physics properties.

```typescript
import { RigidBody } from "@/components";

// Basic dynamic body
const body = new RigidBody({ mass: 1.0, friction: 0.3 });

// Body with angular momentum (can rotate/tumble)
const rotatingBody = new RigidBody({
  mass: 2.0,
  friction: 0.5,
  restitution: 0.4,
  enableRotation: true, // Enable rotation physics!
  angularDamping: 0.1, // Air resistance to rotation
});

// Static body (terrain, walls)
const terrain = new RigidBody({
  mass: 0, // or isStatic: true
  friction: 0.8,
  isStatic: true,
});

// Trigger zone (no VoxelData - specify size)
const trigger = new RigidBody({
  radius: 2.0, // Collision box size
  friction: 0.3,
  isStatic: true,
});
```

### Player

Player-specific settings.

```typescript
import { Player } from "@/components";

const player = new Player(
  10.0, // moveSpeed
  0.002 // lookSpeed (mouse sensitivity)
);
```

### CameraTarget

Makes the camera follow and look at an entity. Attach to any entity to make it the camera target.

```typescript
import { CameraTarget } from "@/components";

// Auto-follow with custom distance
const cameraTarget = new CameraTarget({
  followDistance: 10, // Distance behind target (default: 10)
  heightOffset: 2, // Height above target (default: 2)
  lookAtOffset: vec3.fromValues(0, 1, 0), // Where to look (default: auto from mesh)
  smooth: 0.1, // Camera smoothing (0-1, default: 0.1)
});

// Attach to player
world.addComponent(playerEntity, cameraTarget);

// Attach to any other entity (vehicle, projectile, etc.)
world.addComponent(
  vehicleEntity,
  new CameraTarget({
    followDistance: 20,
    heightOffset: 5,
  })
);
```

**Note**: Camera follows entities with `CameraTarget` component. Falls back to `Player` component for backward compatibility. If entity has `VoxelData`, lookAtOffset is auto-calculated from mesh center.

### VoxelData

Octree with voxel density data and mesh algorithm choice.

```typescript
import { VoxelData, MeshAlgorithm } from "@/components";
import { Octree } from "@/voxel";

const octree = new Octree(64, 6);
// ... populate octree ...

const voxelData = new VoxelData(
  octree,
  true, // needsRemesh
  MeshAlgorithm.MARCHING_CUBES // or CUBIC
);

// Mark dirty when voxels change
voxelData.markDirty();
```

### VoxelMesh

Generated mesh data (created by `MeshGenerationSystem`).

```typescript
import { VoxelMesh } from "@/components";

// Usually auto-created by MeshGenerationSystem
const voxelMesh = new VoxelMesh(mesh, true);
```

---

## ⚙️ Systems

### InputSystem

Handles keyboard and mouse input, updates player velocity.

```typescript
// Automatically added by GameEngine
// Listens to: WASD, Space, Mouse movement
// Updates: Velocity component on Player entities
```

**Key bindings:**

- `W` - Forward
- `S` - Backward
- `A` - Strafe left
- `D` - Strafe right
- `Space` - Jump
- `Mouse` - Look around (requires pointer lock)

### PhysicsSystem

Applies gravity, velocity, and basic collision.

```typescript
// Applies to entities with: Transform + Velocity + RigidBody
// - Gravity: -9.8 m/s²
// - Ground collision at Y = 1
// - Friction
```

### MeshGenerationSystem

Converts `VoxelData` to `VoxelMesh` using the specified algorithm.

```typescript
// Runs on entities with VoxelData component
// Creates/updates VoxelMesh component
// Respects MeshAlgorithm setting (CUBIC or MARCHING_CUBES)
```

---

## 🎨 Voxel Meshing

### Cubic Voxel Mesher

**Use case:** Minecraft-style blocks, buildings, structures

**Algorithm:**

1. Iterate through octree voxels
2. For each solid voxel, check neighbors
3. Generate cube faces only where no neighbor (face culling)
4. Create vertices and indices

**Example:**

```typescript
import { VoxelData, MeshAlgorithm } from "@/components";
import { Octree } from "@/voxel";

const octree = new Octree(32, 5);

// Create a cube
for (let x = 10; x < 20; x++) {
  for (let y = 0; y < 5; y++) {
    for (let z = 10; z < 20; z++) {
      octree.setVoxel({ x, y, z }, { density: 1.0, material: 1 });
    }
  }
}

const voxelData = new VoxelData(octree, true, MeshAlgorithm.CUBIC);
world.addComponent(entity, voxelData);
```

### Marching Cubes

**Use case:** Organic shapes, terrain, characters, caves

**Algorithm:**

1. For each cube in the density field
2. Sample density at 8 corners
3. Determine cube configuration (which corners are inside iso-surface)
4. Look up triangles from `triTable` (256 cases)
5. Interpolate vertices along edges
6. Generate smooth surface

**Resolution impact:**

- **6×6×6** - Blocky/diamond shapes (~200 triangles)
- **12×12×12** - Smooth spheres (~800 triangles) ← **Recommended for characters**
- **18×18×18** - Very smooth (~2,300 triangles)
- **24×24×24** - Near-perfect (~5,000 triangles)

**Example:**

```typescript
import { VoxelData, MeshAlgorithm } from "@/components";
import { Octree } from "@/voxel";

const octree = new Octree(12, 5);

// Create a smooth sphere
const center = { x: 6, y: 6, z: 6 };
const radius = 4;

for (let x = 0; x < 12; x++) {
  for (let y = 0; y < 12; y++) {
    for (let z = 0; z < 12; z++) {
      const dx = x - center.x;
      const dy = y - center.y;
      const dz = z - center.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Smooth density falloff
      const density = Math.max(0, 1.0 - Math.pow(distance / radius, 1.5));

      if (density > 0.05) {
        octree.setVoxel({ x, y, z }, { density, material: 5 });
      }
    }
  }
}

const voxelData = new VoxelData(octree, true, MeshAlgorithm.MARCHING_CUBES);
world.addComponent(entity, voxelData);
```

**Iso-level:** The density value (default 0.5) where the surface is extracted. Values above = inside, below = outside.

### Material Colors

Materials are mapped to colors in the meshing algorithms:

```typescript
Material IDs:
0: White (default)
1: Gray (stone)
2: Brown (dirt)
3: Green (grass)
4: Red
5: Blue
```

Define your own in `MarchingCubes.ts` or `CubicVoxelMesher.ts`:

```typescript
private getMaterialColor(material: number): Vec3 {
  switch (material) {
    case 1: return { x: 0.6, y: 0.6, z: 0.6 }; // Stone
    case 2: return { x: 0.5, y: 0.4, z: 0.3 }; // Dirt
    // ... add more
  }
}
```

---

## 🎬 Creating Scenes

Scenes are classes that set up entities and components.

### Basic Scene Structure

```typescript
import { GameEngine } from "@/engine";
import { Transform, VoxelData, MeshAlgorithm } from "@/components";
import { Octree } from "@/voxel";
import { vec3 } from "gl-matrix";

export class MyScene {
  setup(engine: GameEngine): void {
    const world = engine.getWorld();

    // Create terrain entity
    const terrain = world.createEntity();
    const octree = new Octree(64, 6);

    // Populate octree with voxels
    // ... (see examples below)

    const voxelData = new VoxelData(octree, true, MeshAlgorithm.CUBIC);
    world.addComponent(terrain, voxelData);

    // Optionally add Transform if terrain should be offset
    // world.addComponent(terrain, new Transform(vec3.fromValues(0, 0, 0)));
  }
}
```

### Loading a Scene

```typescript
// In main.ts
import { MyScene } from "@/scenes/MyScene";

const scene = new MyScene();
scene.setup(engine);
```

---

## 📚 Examples

### Example 1: Simple Cube (Cubic Mesher)

```typescript
const world = engine.getWorld();
const entity = world.createEntity();

const octree = new Octree(16, 4);

// Fill 5×5×5 cube
for (let x = 5; x < 10; x++) {
  for (let y = 0; y < 5; y++) {
    for (let z = 5; z < 10; z++) {
      octree.setVoxel({ x, y, z }, { density: 1.0, material: 1 });
    }
  }
}

const voxelData = new VoxelData(octree, true, MeshAlgorithm.CUBIC);
world.addComponent(entity, voxelData);
```

### Example 2: Smooth Sphere (Marching Cubes)

```typescript
const world = engine.getWorld();
const entity = world.createEntity();

const octree = new Octree(16, 4);

const center = { x: 8, y: 8, z: 8 };
const radius = 5;

for (let x = 0; x < 16; x++) {
  for (let y = 0; y < 16; y++) {
    for (let z = 0; z < 16; z++) {
      const dx = x - center.x;
      const dy = y - center.y;
      const dz = z - center.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance <= radius + 1) {
        const density = Math.max(0, 1.0 - distance / radius);
        octree.setVoxel({ x, y, z }, { density, material: 3 });
      }
    }
  }
}

const voxelData = new VoxelData(octree, true, MeshAlgorithm.MARCHING_CUBES);
world.addComponent(entity, voxelData);
```

### Example 3: Flat Terrain Floor

```typescript
const world = engine.getWorld();
const terrain = world.createEntity();

const octree = new Octree(64, 6);

// Create ground plane
for (let x = 0; x < 64; x++) {
  for (let z = 0; z < 64; z++) {
    octree.setVoxel({ x, y: 0, z }, { density: 1.0, material: 3 }); // Grass
    octree.setVoxel({ x, y: -1, z }, { density: 1.0, material: 2 }); // Dirt
  }
}

const voxelData = new VoxelData(octree, true, MeshAlgorithm.CUBIC);
world.addComponent(terrain, voxelData);
```

### Example 4: Dynamic Voxel Entity (Player)

```typescript
import { PLAYER_MESH } from "@/constants";

const world = engine.getWorld();
const player = world.createEntity();

// Create player mesh
const octree = new Octree(PLAYER_MESH.OCTREE_SIZE, PLAYER_MESH.MAX_LEVEL);

for (let x = 0; x < PLAYER_MESH.OCTREE_SIZE; x++) {
  for (let y = 0; y < PLAYER_MESH.OCTREE_SIZE; y++) {
    for (let z = 0; z < PLAYER_MESH.OCTREE_SIZE; z++) {
      const dx = x - PLAYER_MESH.LOCAL_CENTER.x;
      const dy = y - PLAYER_MESH.LOCAL_CENTER.y;
      const dz = z - PLAYER_MESH.LOCAL_CENTER.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance <= PLAYER_MESH.RADIUS + 1) {
        const density = Math.max(
          0,
          1.0 - Math.pow(distance / PLAYER_MESH.RADIUS, 1.5)
        );
        if (density > 0.05) {
          octree.setVoxel(
            { x, y, z },
            { density, material: PLAYER_MESH.MATERIAL }
          );
        }
      }
    }
  }
}

// Calculate transform to place player at world position (10, 0, 10)
const desiredWorld = { x: 10, y: 3.5, z: 10 };
const transformPos = vec3.fromValues(
  desiredWorld.x - PLAYER_MESH.LOCAL_CENTER.x,
  desiredWorld.y - PLAYER_MESH.LOCAL_CENTER.y,
  desiredWorld.z - PLAYER_MESH.LOCAL_CENTER.z
);

// Add components
const voxelData = new VoxelData(octree, true, MeshAlgorithm.MARCHING_CUBES);
world.addComponent(player, voxelData);
world.addComponent(player, new Transform(transformPos));
world.addComponent(player, new Velocity(vec3.create()));
world.addComponent(
  player,
  new RigidBody({ mass: 1, radius: 2, friction: 0.3 })
);
world.addComponent(player, new Player(10, 0.002));
```

### Example 5: Modifying Voxels at Runtime

```typescript
// Get the entity's VoxelData component
const voxelData = world.getComponent(terrainEntity, VoxelData);

if (voxelData) {
  const octree = voxelData.octree;

  // Remove a voxel (set density to 0)
  octree.setVoxel({ x: 10, y: 5, z: 10 }, { density: 0, material: 0 });

  // Add a voxel
  octree.setVoxel({ x: 11, y: 5, z: 10 }, { density: 1.0, material: 4 });

  // Mark for remeshing
  voxelData.markDirty();
}

// On next frame, MeshGenerationSystem will regenerate the mesh
```

---

## ⚙️ Configuration

All configurable constants are in `src/constants.ts`:

### Player Mesh

```typescript
export const PLAYER_MESH = {
  OCTREE_SIZE: 12, // Size of player's octree
  MAX_LEVEL: 5, // Subdivision levels
  LOCAL_CENTER: { x: 6, y: 3.5, z: 6 }, // Center in local space
  RADIUS: 3.5, // Sphere radius
  MATERIAL: 5, // Material ID
};
```

### Physics Adapter System

The physics adapter system provides an abstraction layer between the game engine and physics libraries, allowing you to swap physics engines without changing game code.

#### Architecture

**1. IPhysicsAdapter Interface** (`src/physics/IPhysicsAdapter.ts`)

Defines the contract that all physics adapters must implement:

- **Initialization**: `initialize(gravity)` - Set up physics world
- **Simulation**: `step(deltaTime)` - Advance physics simulation
- **Body Management**: Create, remove, and manipulate rigid bodies
- **Collision Detection**: Get collision events between bodies
- **Forces & Impulses**: Apply forces, impulses, and torques

**2. RapierAdapter** (`src/physics/RapierAdapter.ts`)

Current implementation using Rapier3D physics engine:

- High-performance Rust-based physics (WASM)
- ~3.7k GitHub stars
- Full collision detection support
- Supports all standard collision shapes (box, sphere, capsule, cylinder)

**3. PhysicsSystem** (`src/systems/PhysicsSystem.ts`)

ECS system that integrates physics with game entities:

1. **Auto-creation**: Automatically creates physics bodies for entities with `Transform` + `RigidBody` components
2. **Synchronization**: Syncs positions and velocities between ECS and physics world
3. **Collision Handling**: Processes collision events from the adapter

#### Components

**PhysicsBody Component**

Links an ECS entity to a physics body in the adapter:

```typescript
class PhysicsBody {
  handle: PhysicsBodyHandle; // Opaque reference to physics body
  mass: number;
  friction: number;
  restitution: number;
  lockRotations: boolean;
}
```

**RigidBody Component (Enhanced)**

Physical properties for entities:

```typescript
class RigidBody {
  mass: number; // 0 = static body
  radius: number; // Collision shape size
  height: number; // For capsule/cylinder shapes
  friction: number;
  restitution: number; // Bounciness (0-1)
  isStatic: boolean;
}
```

#### Usage Example

```typescript
// Light block (falls and is easily pushed)
const lightBlock = world.createEntity();
world.addComponent(
  lightBlock,
  new VoxelData(octree, true, MeshAlgorithm.CUBIC)
);
world.addComponent(lightBlock, new Transform(vec3.fromValues(5, 10, 5)));
world.addComponent(lightBlock, new RigidBody({ mass: 1, friction: 0.5 }));

// Heavy block (harder to move in collisions)
const heavyBlock = world.createEntity();
world.addComponent(
  heavyBlock,
  new VoxelData(octree2, true, MeshAlgorithm.CUBIC)
);
world.addComponent(heavyBlock, new Transform(vec3.fromValues(6, 10, 5)));
world.addComponent(heavyBlock, new RigidBody({ mass: 10, friction: 0.5 }));

// Bouncy block (elastic collisions)
const bouncyBlock = world.createEntity();
world.addComponent(
  bouncyBlock,
  new VoxelData(octree3, true, MeshAlgorithm.CUBIC)
);
world.addComponent(bouncyBlock, new Transform(vec3.fromValues(7, 10, 5)));
world.addComponent(
  bouncyBlock,
  new RigidBody({
    mass: 2,
    friction: 0.3,
    restitution: 0.8, // 0 = no bounce, 1 = perfect bounce
  })
);
```

#### How Mass Affects Physics

- **All objects fall at the same rate** due to gravity (like real physics)
- **Mass affects collision response**: Heavy objects push light objects more
- **F = ma**: When applying forces, heavier objects accelerate slower
- **Inertia**: Heavier objects resist changes in motion more

#### Angular Momentum Example

```typescript
// Create a tumbling block that rotates when it falls and collides
const tumblingBlock = world.createEntity();
world.addComponent(
  tumblingBlock,
  new VoxelData(octree, true, MeshAlgorithm.CUBIC)
);
world.addComponent(tumblingBlock, new Transform(vec3.fromValues(5, 20, 5)));
world.addComponent(
  tumblingBlock,
  new RigidBody({
    mass: 2,
    friction: 0.3,
    restitution: 0.5,
    enableRotation: true, // ✨ Enable rotation!
    angularDamping: 0.2, // Slow down rotation over time
  })
);

// Without enableRotation, blocks stay upright
// With enableRotation, blocks tumble and spin realistically!
```

#### Swapping Physics Engines

To switch from Rapier to another physics engine:

1. Create a new adapter implementing `IPhysicsAdapter`:

```typescript
export class CannonAdapter implements IPhysicsAdapter {
  // Implement all interface methods
  async initialize(gravity: vec3) { ... }
  step(deltaTime: number) { ... }
  // ... etc
}
```

2. Update `GameEngine.ts`:

```typescript
// Replace this:
this.physicsAdapter = new RapierAdapter();

// With:
this.physicsAdapter = new CannonAdapter();
```

3. No other code changes needed! The `PhysicsSystem` works with any adapter.

#### Features

**✅ Implemented**

- **Rigid body dynamics** with proper mass simulation
- **Gravity simulation** affecting all dynamic bodies
- **Collision detection** with contact points and normals
- **Collision shapes**: Box, sphere, capsule, cylinder
- **Mass-based physics**: Heavier objects have more inertia in collisions
- **Force and impulse application** (F = ma correctly applied)
- **Torque** for angular forces (rotation)
- **Angular momentum**: Objects can rotate and tumble realistically
  - Toggle via `enableRotation` property
  - Full 3D rotation during collisions
  - Configurable angular damping
  - Rendered with proper rotation transforms
- **Static and dynamic bodies**
- **Friction** for realistic surface interaction (0-1 range)
- **Restitution** (bounciness) for elastic collisions (0-1 range)
- **Sleep/wake system** for performance optimization
- **Position and velocity synchronization** between ECS and physics world
- **Auto-calculated collision boxes** from voxel data

**🔄 Future Enhancements**

- Constraints and joints (hinges, sliders, etc.)
- Soft body dynamics
- Compound collision shapes
- Collision filtering/layers
- Ray casting
- Character controller
- Physics debug rendering

#### Performance

- Physics runs at fixed timestep in `PhysicsSystem.update()`
- Rapier uses WASM for near-native performance
- Automatic body sleeping for inactive objects
- Efficient collision detection using broad phase + narrow phase

#### Dependencies

- `@dimforge/rapier3d-compat` - Rapier physics engine
- `gl-matrix` - Math library for vectors/quaternions

#### References

- [Rapier3D Documentation](https://rapier.rs/docs/)
- [GitHub Repository](https://github.com/dimforge/rapier)

---

## 🌐 Networking Layer

The networking layer enables multiplayer functionality with proper entity replication, state synchronization, and support for both dedicated servers and client-hosted instances.

### Architecture

The networking system follows a **client-server** model with **server-authoritative** physics:

```
┌─────────────┐           ┌─────────────┐
│   Client    │◄─────────►│   Server    │
│  (Players)  │  WebSocket │  (Physics)  │
└─────────────┘           └─────────────┘
      ▲                          │
      │                          │
      │     State Updates        │
      └──────────────────────────┘
```

**Key Components:**

1. **INetworkManager** - Abstract network transport layer
2. **WebSocketNetwork** - WebSocket implementation (client/server)
3. **NetworkSystem** - ECS system for entity replication
4. **NetworkEntity** - Component marking entities as networked

### Core Concepts

#### Network Authority

Entities can have different authority models:

- **SERVER**: Server has full control (default for game objects)
- **CLIENT**: Client has control (player input, local entities)
- **SHARED**: Both can modify (future use)

#### Entity Replication

Entities with the `NetworkEntity` component are automatically replicated:

- **Transform** - Position, rotation, scale
- **Velocity** - Linear velocity
- **RigidBody** - Physics properties (optional)

#### Message Protocol

Communication uses a simple message-based protocol:

- `CONNECT` / `DISCONNECT` - Client lifecycle
- `ENTITY_CREATE` / `ENTITY_DESTROY` - Entity lifecycle
- `STATE_UPDATE` - Delta updates for changed entities
- `SNAPSHOT` - Full world state (for new clients)
- `INPUT` - Client input commands
- `EVENT` - Custom game events

### Components

#### NetworkEntity Component

Marks an entity as networked and configures replication:

```typescript
class NetworkEntity {
  networkId: string; // Unique network ID
  ownerId: string; // Owner client ID
  authority: NetworkAuthority; // Who controls this entity
  replicateTransform: boolean; // Sync position/rotation
  replicateVelocity: boolean; // Sync velocity
  replicatePhysics: boolean; // Sync physics properties
  updateRate: number; // Updates per second (0 = every frame)
}
```

**Example:**

```typescript
// Server-controlled falling block (replicated to all clients)
const block = world.createEntity();
world.addComponent(block, new Transform(vec3.fromValues(5, 10, 5)));
world.addComponent(block, new RigidBody({ mass: 2, friction: 0.5 }));
world.addComponent(
  block,
  new NetworkEntity({
    networkId: "block_1",
    authority: NetworkAuthority.SERVER,
    replicateTransform: true,
    replicateVelocity: true,
    updateRate: 20, // 20 updates per second
  })
);

// Client-controlled player (client has authority, server validates)
const player = world.createEntity();
world.addComponent(player, new Transform(vec3.fromValues(0, 5, 0)));
world.addComponent(player, new Player());
world.addComponent(
  player,
  new NetworkEntity({
    authority: NetworkAuthority.CLIENT,
    replicateTransform: true,
    updateRate: 30, // Higher rate for responsive player movement
  })
);
```

### Setting Up Networking

#### As a Client

Connect to an existing server:

```typescript
import { GameEngine } from "@/engine";
import { WebSocketNetwork } from "@/network";
import { NetworkedScene } from "@/scenes/NetworkedScene";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const engine = new GameEngine(canvas);
await engine.initialize();

// Enable networking as client
const networkManager = new WebSocketNetwork();
await engine.enableNetworking(
  networkManager,
  {
    isServer: false,
    isHost: false,
    tickRate: 60, // Client simulation rate
    snapshotRate: 20, // How often to expect updates
    interpolationDelay: 100, // Smoothing delay (ms)
  },
  "ws://localhost:8080" // Server address
);

// Load networked scene
new NetworkedScene(engine, engine.getWorld());
engine.start();
```

#### As a Server (Node.js)

Run a dedicated server:

```typescript
// Note: Requires headless physics simulation
// This is conceptual - see src/examples/server.ts for details

import { World } from "@/ecs";
import { PhysicsSystem, NetworkSystem } from "@/systems";
import { WebSocketNetwork } from "@/network";
import { RapierAdapter } from "@/physics";

// Create world and systems
const world = new World();

// Setup physics
const physicsAdapter = new RapierAdapter();
await physicsAdapter.initialize(vec3.fromValues(0, -9.81, 0));
const physicsSystem = new PhysicsSystem(physicsAdapter);
world.addSystem(physicsSystem);

// Setup networking
const networkManager = new WebSocketNetwork();
await networkManager.initialize({
  isServer: true,
  isHost: false,
  tickRate: 60,
  snapshotRate: 20,
  interpolationDelay: 0,
});
await networkManager.start("0.0.0.0:8080");

const networkSystem = new NetworkSystem(networkManager);
world.addSystem(networkSystem);

// Run game loop
setInterval(() => world.update(1 / 60), 1000 / 60);
```

#### As a Client-Host (Peer-to-Peer)

One client acts as both server and client:

```typescript
const engine = new GameEngine(canvas);
await engine.initialize();

const networkManager = new WebSocketNetwork();
await engine.enableNetworking(
  networkManager,
  {
    isServer: true, // Act as server
    isHost: true, // But also a client
    tickRate: 60,
    snapshotRate: 20,
    interpolationDelay: 0,
  },
  "localhost:8080"
);

// This client runs physics simulation
// Other clients connect and receive state updates
```

### NetworkSystem

The `NetworkSystem` handles all networking logic:

**Server Responsibilities:**

- Broadcast entity state updates to all clients
- Send full world snapshots to newly connected clients
- Process client input (future)
- Handle collision events

**Client Responsibilities:**

- Apply received state updates to local entities
- Interpolate between updates for smooth movement
- Send input to server (future)
- Predict local player movement (future)

**Update Rates:**

```typescript
// Efficient networking with different update rates
const terrain = new NetworkEntity({
  updateRate: 0, // Never updates (static)
});

const block = new NetworkEntity({
  updateRate: 10, // 10 updates/sec (slow-moving objects)
});

const player = new NetworkEntity({
  updateRate: 30, // 30 updates/sec (fast, responsive)
});
```

### Networked Scene Example

See `src/scenes/NetworkedScene.ts` for a complete example:

- Static terrain (no updates needed)
- Falling blocks with physics (server-controlled)
- Player entity (client-controlled)
- Camera following

### Network Configuration

```typescript
interface NetworkConfig {
  isServer: boolean; // Run as server
  isHost: boolean; // Client-hosted server
  tickRate: number; // Simulation ticks/sec
  snapshotRate: number; // State updates/sec
  interpolationDelay: number; // Client smoothing (ms)
}
```

**Typical Values:**

| Mode   | tickRate | snapshotRate | interpolationDelay |
| ------ | -------- | ------------ | ------------------ |
| Server | 60       | 20           | 0                  |
| Client | 60       | 20           | 100                |
| Host   | 60       | 20           | 50                 |

### Message Types

The system uses a typed message protocol:

```typescript
enum MessageType {
  CONNECT = "connect",
  DISCONNECT = "disconnect",
  ENTITY_CREATE = "entity_create",
  ENTITY_DESTROY = "entity_destroy",
  STATE_UPDATE = "state_update",
  SNAPSHOT = "snapshot",
  INPUT = "input",
  EVENT = "event",
}
```

### Swapping Network Transport

The networking layer is transport-agnostic. You can swap WebSockets for WebRTC or any other protocol:

1. Implement `INetworkManager`:

```typescript
export class WebRTCNetwork implements INetworkManager {
  async initialize(config: NetworkConfig) { ... }
  async start(address?: string) { ... }
  sendToClient(clientId: string, message: NetworkMessage) { ... }
  broadcast(message: NetworkMessage) { ... }
  // ... etc
}
```

2. Use it in your game:

```typescript
const networkManager = new WebRTCNetwork();
await engine.enableNetworking(networkManager, config);
```

### Features

**✅ Implemented**

- **WebSocket transport** for client-server communication
- **Entity replication** with configurable properties
- **Server-authoritative physics** simulation
- **State synchronization** with delta updates
- **Full world snapshots** for new clients
- **Configurable update rates** per entity
- **Network authority models** (server/client/shared)
- **Message protocol** with typed messages
- **Connection management** (connect/disconnect events)

**🔄 Future Enhancements**

- Client-side prediction for responsive movement
- Server reconciliation for correcting predictions
- Interpolation/extrapolation for smooth rendering
- Input buffering and replay
- WebRTC peer-to-peer transport
- NAT traversal for browser-hosted servers
- Bandwidth optimization (delta compression)
- Lag compensation
- Area of interest (only replicate nearby entities)
- Network statistics and debugging tools

### Performance

**Bandwidth Optimization:**

- Only replicate entities that have changed (`isDirty` flag)
- Configurable update rates reduce unnecessary updates
- Delta updates instead of full snapshots
- Static entities never send updates

**Typical Bandwidth:**

| Scenario                    | Entities | Bandwidth (per client) |
| --------------------------- | -------- | ---------------------- |
| 10 players + terrain        | 11       | ~5-10 KB/s             |
| 100 dynamic objects         | 100      | ~20-30 KB/s            |
| Large world (1000 entities) | 1000     | ~50-100 KB/s           |

### Dependencies

- `ws` - WebSocket server library (Node.js only)
- `@types/ws` - TypeScript types for ws

### References

- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [ws Library](https://github.com/websockets/ws)
- [Source Multiplayer Networking](https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking)

### Camera

```typescript
export const CAMERA = {
  FOV: Math.PI / 4, // 45 degrees
  NEAR: 0.1, // Near clipping plane
  FAR: 1000, // Far clipping plane
  FOLLOW_DISTANCE: 10, // Distance behind player
  FOLLOW_HEIGHT_OFFSET: 5, // Height above player
};
```

### Mesh Generation

```typescript
export const MESH_GEN = {
  ISO_LEVEL: 0.5, // Marching cubes iso-surface level
  INITIAL_VERTEX_CAPACITY: 1000,
  INITIAL_INDEX_CAPACITY: 3000,
};
```

---

## 🚀 Performance

### Optimization Tips

1. **Use Cubic for static geometry** - Faster meshing, fewer triangles with face culling
2. **Use Marching Cubes for organic shapes** - Smoother but more triangles
3. **Adjust octree resolution** - Higher = smoother but more memory
4. **Batch static terrain** - Combine multiple chunks into single entities
5. **Mark dirty only when needed** - Avoid unnecessary remeshing

### Typical Performance

| Scene           | Entities | Vertices | Triangles | FPS (60Hz target) |
| --------------- | -------- | -------- | --------- | ----------------- |
| Empty           | 0        | 0        | 0         | 60                |
| Maze (31×31)    | 2        | ~35,000  | ~11,000   | 60                |
| Player (12³ MC) | +1       | +2,400   | +800      | 60                |
| Resolution Demo | 5        | ~50,000  | ~16,000   | 60                |

**Bottlenecks:**

- Mesh generation (CPU) - Runs in `MeshGenerationSystem` only when dirty
- WebGPU rendering (GPU) - Usually very fast with modern GPUs

### Memory Usage

- Empty octree node: ~100 bytes
- Voxel entry: ~16 bytes (position key + density + material)
- Vertex: 36 bytes (position + normal + color)
- Index: 4 bytes

**Example:** 12×12×12 player octree with ~500 filled voxels:

- Octree: ~8 KB
- Generated mesh: ~90 KB (2,400 vertices)

---

## 🎓 API Reference

### GameEngine

Main entry point.

```typescript
const engine = new GameEngine(canvas);

// Initialize WebGPU
await engine.initialize();

// Start game loop
engine.start();

// Stop game loop
engine.stop();

// Get ECS world
const world = engine.getWorld();

// Get camera
const camera = engine.getCamera();

// Get stats
const stats = engine.getStats();
// { entities: number, vertices: number, triangles: number }
```

### World

ECS manager.

```typescript
const world = engine.getWorld();

// Create entity
const entity = world.createEntity();

// Add component
world.addComponent(entity, new Transform());

// Get component
const transform = world.getComponent(entity, Transform);

// Remove component
world.removeComponent(entity, Transform);

// Query entities
const entities = world.query(Transform, Velocity);

// Add system
world.addSystem(new MySystem());

// Update all systems
world.update(deltaTime);

// Get all entities
const allEntities = world.getAllEntities();
```

### Octree

Sparse voxel storage.

```typescript
const octree = new Octree(64, 6);

// Set voxel
octree.setVoxel({ x: 10, y: 5, z: 10 }, { density: 1.0, material: 1 });

// Get voxel
const voxel = octree.getVoxel({ x: 10, y: 5, z: 10 });

// Get density (returns 0 if empty)
const density = octree.getDensity({ x: 10, y: 5, z: 10 });

// Get material (returns 0 if empty)
const material = octree.getMaterial({ x: 10, y: 5, z: 10 });

// Get all voxels
const allVoxels = octree.getAllVoxels(); // Map<string, Voxel>

// Clear octree
octree.clear();

// Get world size
const size = octree.getWorldSize(); // 64
```

### VoxelData Component

```typescript
import { VoxelData, MeshAlgorithm } from "@/components";

const voxelData = new VoxelData(octree, true, MeshAlgorithm.MARCHING_CUBES);

// Mark for remeshing
voxelData.markDirty();

// Change algorithm
voxelData.setAlgorithm(MeshAlgorithm.CUBIC);
```

---

## 🔧 Extending the Engine

### Creating Custom Components

```typescript
import { Component } from "@/ecs";

export class Health extends Component {
  constructor(public current: number, public max: number) {
    super();
  }

  getType(): string {
    return "Health";
  }

  takeDamage(amount: number): void {
    this.current = Math.max(0, this.current - amount);
  }
}
```

### Creating Custom Systems

```typescript
import { System } from "@/ecs";
import { Health } from "@/components";

export class HealthSystem extends System {
  update(deltaTime: number): void {
    const entities = this.world.query(Health);

    for (const entity of entities) {
      const health = this.world.getComponent(entity, Health)!;

      // Example: Remove dead entities
      if (health.current <= 0) {
        this.world.removeEntity(entity);
      }
    }
  }
}
```

Add to engine:

```typescript
// In GameEngine constructor or scene setup
const healthSystem = new HealthSystem();
world.addSystem(healthSystem);
```

---

## 🌐 Browser Support

**Required:** WebGPU support

| Browser | Version         | Status                |
| ------- | --------------- | --------------------- |
| Chrome  | 113+            | ✅ Supported          |
| Edge    | 113+            | ✅ Supported          |
| Firefox | 🚧 Experimental | ⚠️ Enable flag        |
| Safari  | 🚧 Experimental | ⚠️ Technology Preview |

**Check support:**

```javascript
if (!navigator.gpu) {
  console.error("WebGPU not supported");
}
```

---

## 📄 License

MIT License - see LICENSE file

---

## 🙏 Acknowledgments

- **Paul Bourke** - Marching Cubes lookup tables
- **Three.js** - WebGL/WebGPU inspiration
- **gl-matrix** - Fast matrix/vector math
- **Vite** - Fast build tooling

---

## 🤝 Contributing

This is a learning/demo project. Feel free to fork and experiment!

---

## 📞 Support

For questions or issues, please check:

1. This README
2. Code comments (heavily documented)
3. Example scenes in `src/scenes/`

---

**Built with ❤️ using TypeScript, WebGPU, and ECS architecture**
