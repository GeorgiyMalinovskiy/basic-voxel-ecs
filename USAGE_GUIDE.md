# Voxel ECS Engine - Usage Guide

## Getting Started

### 1. Installation

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

Open http://localhost:5173 in Chrome/Edge 113+ (WebGPU required).

---

## Core Concepts

### Entity-Component-System (ECS)

The engine uses ECS architecture for game logic:

- **Entity**: Just an ID (represents a "thing" in your game)
- **Component**: Pure data (Transform, Velocity, Health, etc.)
- **System**: Pure logic (processes entities with specific components)

### Example Flow

```typescript
// 1. Create entity
const enemy = world.createEntity();

// 2. Add components (data)
world.addComponent(enemy, new Transform(vec3.fromValues(10, 0, 10)));
world.addComponent(enemy, new Health(50, 50));

// 3. System processes it (logic)
class DamageSystem extends System {
  update(deltaTime: number): void {
    const entities = this.world.query(Transform, Health);
    // Process entities...
  }
}
```

---

## Building Your First Scene

### Step 1: Create the Engine

```typescript
import { GameEngine } from "@/engine";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const engine = new GameEngine(canvas);
await engine.initialize();
```

### Step 2: Add Voxels

```typescript
// Add ground
engine.generateBox(
  { x: 0, y: -1, z: 0 },
  { x: 32, y: -1, z: 32 },
  2 // material: dirt
);

// Add walls
for (let x = 0; x < 32; x++) {
  engine.setVoxel({ x, y: 0, z: 0 }, { density: 1, material: 1 });
  engine.setVoxel({ x, y: 0, z: 31 }, { density: 1, material: 1 });
}

// Add decorations
engine.generateSphere({ x: 16, y: 2, z: 16 }, 2, 3);
```

### Step 3: Create Player

```typescript
import { Transform, Velocity, RigidBody, Player } from "@/components";
import { vec3 } from "gl-matrix";

const world = engine.getWorld();
const player = world.createEntity();

world.addComponent(player, new Transform(vec3.fromValues(16, 2, 16)));
world.addComponent(player, new Velocity(vec3.fromValues(0, 0, 0)));
world.addComponent(player, new RigidBody(1, 2, 0.3, false));
world.addComponent(player, new Player(10, 0.002)); // moveSpeed, lookSpeed
```

### Step 4: Start Engine

```typescript
engine.start();
```

---

## Creating Custom Components

Components are just data containers:

```typescript
import { Component } from "@/ecs";

export class Health extends Component {
  constructor(public current: number, public max: number) {
    super();
  }

  getType(): string {
    return "Health";
  }
}

export class Weapon extends Component {
  constructor(
    public damage: number,
    public fireRate: number,
    public ammo: number
  ) {
    super();
  }

  getType(): string {
    return "Weapon";
  }
}
```

Usage:

```typescript
world.addComponent(entity, new Health(100, 100));
world.addComponent(entity, new Weapon(25, 0.5, 30));
```

---

## Creating Custom Systems

Systems contain game logic:

```typescript
import { System } from "@/ecs";
import { Health, Weapon } from "./components";

export class CombatSystem extends System {
  private fireTimer = 0;

  update(deltaTime: number): void {
    this.fireTimer += deltaTime;

    // Query entities with both Health and Weapon
    const combatants = this.world.query(Health, Weapon);

    for (const entity of combatants) {
      const health = this.world.getComponent(entity, Health)!;
      const weapon = this.world.getComponent(entity, Weapon)!;

      // Fire weapon
      if (this.fireTimer >= 1 / weapon.fireRate && weapon.ammo > 0) {
        this.fire(weapon);
        this.fireTimer = 0;
      }

      // Check death
      if (health.current <= 0) {
        this.world.destroyEntity(entity);
      }
    }
  }

  private fire(weapon: Weapon): void {
    weapon.ammo--;
    console.log(`Fired! ${weapon.ammo} ammo remaining`);
  }
}
```

Add to engine:

```typescript
world.addSystem(new CombatSystem());
```

---

## Voxel Materials

The engine supports different materials:

```typescript
// Material IDs
1 = Stone (gray)
2 = Dirt (brown)
3 = Grass (green)
4 = Red
5 = Blue
default = White
```

Set materials when creating voxels:

```typescript
engine.setVoxel({ x: 5, y: 0, z: 5 }, { density: 1, material: 3 }); // Grass
```

---

## Working with the Camera

The engine automatically follows the player in third-person view. You can access the camera:

```typescript
const camera = engine.getCamera();

// Get position
const pos = camera.getPosition();
console.log(pos);

// Manually set (will be overridden if player exists)
camera.setPosition(vec3.fromValues(0, 10, 20));
camera.lookAt(vec3.fromValues(0, 0, 0));
```

---

## Querying Entities

Find entities with specific components:

```typescript
// Find all entities with Transform
const entities = world.query(Transform);

// Find entities with multiple components
const players = world.query(Transform, Player, Health);

// Process them
for (const entity of players) {
  const transform = world.getComponent(entity, Transform)!;
  const health = world.getComponent(entity, Health)!;

  console.log(`Player at ${transform.position}, HP: ${health.current}`);
}
```

---

## Advanced: Procedural Generation

Create interesting structures:

```typescript
// Tower
function generateTower(engine: GameEngine, x: number, z: number) {
  const height = 10;
  const radius = 3;

  // Base
  for (let y = 0; y < height; y++) {
    engine.generateSphere({ x, y, z }, radius, 1);
  }

  // Top
  engine.generateSphere({ x, y: height, z }, radius + 1, 4);
}

// Use it
generateTower(engine, 20, 20);
```

---

## Performance Tips

1. **Use Sparse Voxels**: The octree only stores solid voxels
2. **Batch Voxel Updates**: Set multiple voxels before starting engine
3. **Limit Entity Count**: Query only what you need
4. **Use Simple Physics**: Built-in physics is basic but fast

---

## Debug Info

Get rendering statistics:

```typescript
const stats = engine.getStats();
console.log(`
  Entities: ${stats.entities}
  Vertices: ${stats.vertices}
  Triangles: ${stats.triangles}
`);
```

---

## Common Patterns

### Spawning Enemies

```typescript
function spawnEnemy(world: World, position: vec3) {
  const enemy = world.createEntity();
  world.addComponent(enemy, new Transform(position));
  world.addComponent(enemy, new Velocity());
  world.addComponent(enemy, new Health(50, 50));
  world.addComponent(enemy, new Enemy()); // Custom component
  return enemy;
}
```

### Collectible Items

```typescript
class Item extends Component {
  constructor(public type: string, public value: number) {
    super();
  }
  getType(): string {
    return "Item";
  }
}

class CollisionSystem extends System {
  update(deltaTime: number): void {
    const players = this.world.query(Transform, Player);
    const items = this.world.query(Transform, Item);

    for (const player of players) {
      const playerPos = this.world.getComponent(player, Transform)!.position;

      for (const item of items) {
        const itemPos = this.world.getComponent(item, Transform)!.position;
        const distance = vec3.distance(playerPos, itemPos);

        if (distance < 1) {
          // Collect item
          const itemData = this.world.getComponent(item, Item)!;
          console.log(`Collected ${itemData.type}!`);
          this.world.destroyEntity(item);
        }
      }
    }
  }
}
```

### Simple AI

```typescript
class AISystem extends System {
  update(deltaTime: number): void {
    const enemies = this.world.query(Transform, Velocity, Enemy);
    const players = this.world.query(Transform, Player);

    if (players.length === 0) return;
    const playerPos = this.world.getComponent(players[0], Transform)!.position;

    for (const enemy of enemies) {
      const transform = this.world.getComponent(enemy, Transform)!;
      const velocity = this.world.getComponent(enemy, Velocity)!;

      // Move towards player
      const direction = vec3.create();
      vec3.subtract(direction, playerPos, transform.position);
      vec3.normalize(direction, direction);
      vec3.scale(direction, direction, 3); // speed

      velocity.linear[0] = direction[0];
      velocity.linear[2] = direction[2];
    }
  }
}
```

---

## Next Steps

1. Check out `src/scenes/MazeScene.ts` for a complete example
2. Experiment with different voxel materials
3. Create custom components and systems
4. Build your own game!

---

## Troubleshooting

**Black screen?**

- Check browser console for errors
- Ensure WebGPU is supported (Chrome/Edge 113+)
- Check that canvas element exists

**No movement?**

- Click to lock mouse pointer
- Check that Player component is added
- Ensure InputSystem is registered

**Low FPS?**

- Too many voxels? Use smaller world size
- Too many entities? Optimize queries
- Complex maze? Reduce maze size

**Voxels not appearing?**

- Check that mesh is being generated
- Verify voxel density > 0.5
- Ensure camera can see the voxels

---

## Resources

- [WebGPU Fundamentals](https://webgpufundamentals.org/)
- [ECS Pattern](https://github.com/SanderMertens/ecs-faq)
- [gl-matrix Docs](https://glmatrix.net/)

Happy game development! 🎮
