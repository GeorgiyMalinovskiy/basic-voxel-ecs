# Voxel ECS Engine

A modern 3D voxel engine built with TypeScript, WebGPU, and ECS architecture. Features efficient octree-based voxel storage and marching cubes mesh generation.

## Features

- **Entity Component System (ECS)** - Flexible and performant architecture
- **WebGPU Rendering** - Modern graphics API for high performance
- **Octree Voxel Storage** - Efficient sparse voxel data structure
- **Marching Cubes** - Smooth mesh generation from voxel data
- **Simple API** - Easy-to-use interface for creating voxel worlds
- **Interactive Demo** - Full-featured example scene

## Quick Start

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Start development server:**

   ```bash
   npm run dev
   ```

3. **Open in browser:**
   Navigate to `http://localhost:5173` (or the port shown in terminal)

## Usage

### Basic Setup

```typescript
import { VoxelEngine } from "./src/engine";

// Initialize engine
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const engine = new VoxelEngine({
  canvas,
  worldSize: 128,
  octreeMaxLevel: 6,
});

// Initialize and start
await engine.initialize();
engine.start();
```

### Creating Voxels

```typescript
// Set individual voxels
engine.setVoxel({ x: 10, y: 10, z: 10 }, { density: 1, material: 1 });

// Generate shapes
engine.generateSphere({ x: 32, y: 32, z: 32 }, 8, 1);
engine.generateBox({ x: 10, y: 10, z: 10 }, { x: 20, y: 20, z: 20 }, 2);

// Generate terrain
engine.generateTerrain(64, 20);
```

### Using the ECS System

```typescript
import { World, Entity, Component, System, Query } from "./src/ecs";

// Create custom component
class Position extends Component {
  static readonly ComponentType = "Position";

  constructor(public x: number, public y: number, public z: number) {
    super();
  }

  getType(): string {
    return Position.ComponentType;
  }

  clone(): Position {
    return new Position(this.x, this.y, this.z);
  }
}

// Create custom system
class MovementSystem extends System {
  constructor() {
    super();
    this.setQuery(new Query({ with: [Position] }));
  }

  update(deltaTime: number): void {
    const entities = this.getEntities();
    for (const entity of entities) {
      const pos = this.world.getComponent(entity, Position)!;
      pos.y += 10 * deltaTime; // Move up
    }
  }
}

// Use with engine
const world = engine.getWorld();
world.addSystem(new MovementSystem());

const entity = world.createEntity();
world.addComponent(entity, new Position(0, 0, 0));
```

## Controls

- **WASD** - Move camera
- **Space/Shift** - Move up/down
- **Mouse** - Look around (click canvas to lock mouse)
- **C** - Toggle camera lock
- **S** - Generate random sphere
- **G** - Regenerate terrain
- **R** - Change resolution
- **L** - Toggle debug logs
- **ESC** - Exit mouse lock

## API Reference

### VoxelEngine

Main engine class providing a simple API for voxel world creation.

#### Methods

- `initialize()` - Initialize WebGPU and rendering systems
- `start()` / `stop()` - Control engine execution
- `setVoxel(position, voxel)` - Set a single voxel
- `getVoxel(position)` - Get a voxel at position
- `clearVoxels()` - Clear all voxels
- `generateSphere(center, radius, material)` - Generate spherical voxels
- `generateBox(min, max, material)` - Generate box of voxels
- `generateTerrain(size, height)` - Generate terrain with simple noise
- `getCamera()` - Get camera instance
- `getWorld()` - Get ECS world
- `getStats()` - Get rendering statistics

### ECS Components

- `Entity` - Unique identifier for game objects
- `Component` - Base class for data components
- `System` - Base class for logic systems
- `World` - Manages entities, components, and systems
- `Query` - Filter entities by component requirements

### Voxel System

- `Octree` - Efficient voxel storage and querying
- `MarchingCubes` - Mesh generation from voxel data
- `Voxel` - Individual voxel with density and material

### Rendering

- `WebGPURenderer` - Core WebGPU rendering functionality
- `Camera` - 3D camera with orbit controls
- `VoxelRenderer` - Specialized renderer for voxel meshes

## Architecture

The engine is built with a modular architecture:

```
src/
├── ecs/          # Entity Component System
├── renderer/     # WebGPU rendering pipeline
├── voxel/        # Octree and marching cubes
├── engine.ts     # Main engine API
└── main.ts       # Demo scene
```

## Requirements

- Modern browser with WebGPU support (Chrome 113+, Edge 113+)
- TypeScript 5.0+
- Node.js 18+

## Building

```bash
# Development
npm run dev

# Production build
npm run build

# Preview build
npm run preview

# Build WASM (if using Rust physics)
npm run build:wasm
```

## License

MIT License - see LICENSE file for details.
