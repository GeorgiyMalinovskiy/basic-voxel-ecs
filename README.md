# Voxel ECS Game Engine

A simple, clean Entity-Component-System (ECS) based game engine for voxel games with WebGPU rendering.

## Features

- ✨ **Clean ECS Architecture** - Entity, Component, System pattern
- 🎮 **Simple API** - Easy to use engine interface
- 🧊 **Sparse Voxel Octree** - Efficient voxel storage
- 🎨 **WebGPU Rendering** - Modern graphics API
- ⚙️ **Built-in Physics** - Simple physics system with gravity
- 🎯 **Player Controller** - FPS-style movement and mouse look
- 🌐 **Maze Demo** - Random maze generation example

## Quick Start

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Then open http://localhost:5173 in a WebGPU-compatible browser (Chrome 113+, Edge 113+).

### Build

```bash
npm run build
```

## Usage

### Creating a Simple Scene

```typescript
import { GameEngine } from "@/engine";
import { Transform, Player, Velocity, RigidBody } from "@/components";
import { vec3 } from "gl-matrix";

// Initialize engine
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const engine = new GameEngine(canvas);
await engine.initialize();

// Add some voxels
engine.generateBox(
  { x: 0, y: 0, z: 0 },
  { x: 10, y: 1, z: 10 },
  1 // material
);

// Create a player entity
const world = engine.getWorld();
const player = world.createEntity();
world.addComponent(player, new Transform(vec3.fromValues(5, 2, 5)));
world.addComponent(player, new Velocity());
world.addComponent(player, new RigidBody());
world.addComponent(player, new Player());

// Start the engine
engine.start();
```

### Adding Custom Components

```typescript
import { Component } from "@/ecs";

class Health extends Component {
  constructor(public current: number, public max: number) {
    super();
  }

  getType(): string {
    return "Health";
  }
}

// Use it
world.addComponent(entity, new Health(100, 100));
```

### Creating Custom Systems

```typescript
import { System } from "@/ecs";
import { Transform, Health } from "@/components";

class HealthRegenSystem extends System {
  update(deltaTime: number): void {
    const entities = this.world.query(Transform, Health);

    for (const entity of entities) {
      const health = this.world.getComponent(entity, Health)!;
      if (health.current < health.max) {
        health.current += 10 * deltaTime; // Regen 10 HP per second
      }
    }
  }
}

// Add to engine
world.addSystem(new HealthRegenSystem());
```

## Architecture

```
src/
├── ecs/              # Core ECS system
│   ├── Entity.ts     # Entity identifier
│   ├── Component.ts  # Component base class
│   ├── System.ts     # System base class
│   └── World.ts      # World manager
├── components/       # Built-in components
│   ├── Transform.ts  # Position, rotation, scale
│   ├── Velocity.ts   # Linear and angular velocity
│   ├── RigidBody.ts  # Physics properties
│   └── Player.ts     # Player marker
├── systems/          # Built-in systems
│   ├── PhysicsSystem.ts  # Physics simulation
│   └── InputSystem.ts    # Player input
├── voxel/            # Voxel system
│   ├── Octree.ts     # Sparse voxel storage
│   └── MarchingCubes.ts  # Mesh generation
├── renderer/         # Rendering system
│   ├── Camera.ts     # Camera
│   └── WebGPURenderer.ts # WebGPU renderer
├── engine/           # Main engine
│   └── GameEngine.ts # Engine API
└── scenes/           # Example scenes
    └── MazeScene.ts  # Maze demo
```

## Controls

- **WASD** - Move
- **Mouse** - Look around (click to lock)
- **Space** - Jump
- **ESC** - Release mouse

## API Reference

### GameEngine

```typescript
class GameEngine {
  // Core
  initialize(): Promise<void>;
  start(): void;
  stop(): void;

  // Access
  getWorld(): World;
  getCamera(): Camera;
  getOctree(): Octree;

  // Voxels
  setVoxel(position: Vec3, voxel: Voxel): void;
  getVoxel(position: Vec3): Voxel | null;
  clearVoxels(): void;

  // Generators
  generateSphere(center: Vec3, radius: number, material: number): void;
  generateBox(min: Vec3, max: Vec3, material: number): void;

  // Stats
  getStats(): { entities: number; vertices: number; triangles: number };
}
```

### World (ECS)

```typescript
class World {
  createEntity(): Entity;
  destroyEntity(entity: Entity): void;
  addComponent<T>(entity: Entity, component: T): void;
  getComponent<T>(
    entity: Entity,
    componentClass: ComponentClass<T>
  ): T | undefined;
  query(...componentClasses: ComponentClass[]): Entity[];
  addSystem(system: System): void;
  update(deltaTime: number): void;
}
```

## Browser Support

Requires a browser with WebGPU support:

- Chrome/Edge 113+
- Safari Technology Preview (experimental)

## License

MIT

## Future Enhancements

- [ ] WASM for performance-critical calculations
- [ ] True marching cubes implementation
- [ ] Advanced physics with collision detection
- [ ] Networked multiplayer support
- [ ] More example scenes
- [ ] Procedural terrain generation
- [ ] Texture atlas support
- [ ] Sound system
- [ ] Particle effects

## Contributing

Feel free to open issues or submit pull requests!
