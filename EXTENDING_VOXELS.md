# Extending Voxels with Custom Properties

## Current State

```typescript
// src/voxel/types.ts - CURRENT
export interface Voxel {
  density: number;
  material: number;
}
```

## Extended Version with Properties

### Step 1: Extend the Voxel Interface

```typescript
// src/voxel/types.ts - EXTENDED
export interface Voxel {
  density: number;
  material: number;
  properties?: VoxelProperties; // Optional for backward compatibility
}

export interface VoxelProperties {
  // Physical properties
  temperature?: number;   // Kelvin
  pressure?: number;      // Pascal
  health?: number;        // 0-100
  hardness?: number;      // 0-10
  
  // Gas/fluid properties
  gasType?: number;       // 0=none, 1=air, 2=steam, etc.
  flowRate?: number;      // m/s
  viscosity?: number;     // Pa·s
  
  // Electrical/magnetic
  charge?: number;        // Coulombs
  conductivity?: number;  // S/m
  
  // Metadata
  metadata?: Record<string, any>; // For anything else!
}
```

### Step 2: Usage Examples

```typescript
// Create a hot, pressurized voxel
engine.setVoxel({ x: 10, y: 5, z: 10 }, {
  density: 1.0,
  material: 1,
  properties: {
    temperature: 373,  // 100°C (boiling water)
    pressure: 200000,  // 2 atmospheres
    health: 100,
    hardness: 7
  }
});

// Create a gas cell
engine.setVoxel({ x: 11, y: 5, z: 10 }, {
  density: 0.1,      // Low density for gas
  material: 6,
  properties: {
    gasType: 2,      // Steam
    temperature: 373,
    pressure: 101325,
    flowRate: 0.5
  }
});

// Retrieve and modify properties
const voxel = engine.getVoxel({ x: 10, y: 5, z: 10 });
if (voxel?.properties) {
  voxel.properties.health -= 10; // Damage it
  if (voxel.properties.health <= 0) {
    // Destroy voxel
    engine.setVoxel({ x: 10, y: 5, z: 10 }, { density: 0, material: 0 });
  }
}
```

### Step 3: Create Property Systems

```typescript
// src/systems/VoxelPropertySystem.ts
import { System } from "@/ecs";
import { Octree } from "@/voxel";

export class TemperatureDiffusionSystem extends System {
  constructor(private octree: Octree, private worldSize: number) {
    super();
  }
  
  update(deltaTime: number): void {
    // Heat diffusion between voxels
    for (let x = 0; x < this.worldSize; x++) {
      for (let y = 0; y < this.worldSize; y++) {
        for (let z = 0; z < this.worldSize; z++) {
          const voxel = this.octree.getVoxel({ x, y, z });
          if (!voxel?.properties?.temperature) continue;
          
          // Get neighbors
          const neighbors = [
            this.octree.getVoxel({ x: x + 1, y, z }),
            this.octree.getVoxel({ x: x - 1, y, z }),
            this.octree.getVoxel({ x, y: y + 1, z }),
            this.octree.getVoxel({ x, y: y - 1, z }),
            this.octree.getVoxel({ x, y, z: z + 1 }),
            this.octree.getVoxel({ x, y, z: z - 1 }),
          ].filter(n => n?.properties?.temperature);
          
          if (neighbors.length === 0) continue;
          
          // Calculate average neighbor temperature
          const avgTemp = neighbors.reduce(
            (sum, n) => sum + (n!.properties!.temperature || 0),
            0
          ) / neighbors.length;
          
          // Heat diffusion (simple)
          const diffusionRate = 0.1 * deltaTime;
          const tempDiff = avgTemp - voxel.properties.temperature;
          voxel.properties.temperature += tempDiff * diffusionRate;
        }
      }
    }
  }
}

export class PressureDiffusionSystem extends System {
  constructor(private octree: Octree, private worldSize: number) {
    super();
  }
  
  update(deltaTime: number): void {
    // Similar to temperature, but for pressure
    // Gas flows from high to low pressure
    
    for (let x = 0; x < this.worldSize; x++) {
      for (let y = 0; y < this.worldSize; y++) {
        for (let z = 0; z < this.worldSize; z++) {
          const voxel = this.octree.getVoxel({ x, y, z });
          if (!voxel?.properties?.pressure) continue;
          if (voxel.density > 0.5) continue; // Only gas/empty space
          
          // Check neighbors
          const neighbors = this.getNeighbors(x, y, z);
          
          for (const { pos, neighbor } of neighbors) {
            if (!neighbor?.properties?.pressure) continue;
            if (neighbor.density > 0.5) continue; // Can't flow into solid
            
            // Pressure equalization
            const pressureDiff = neighbor.properties.pressure - voxel.properties.pressure;
            const flowRate = 0.05 * deltaTime;
            
            // Transfer pressure
            const transfer = pressureDiff * flowRate;
            voxel.properties.pressure += transfer;
            neighbor.properties.pressure -= transfer;
          }
        }
      }
    }
  }
  
  private getNeighbors(x: number, y: number, z: number) {
    return [
      { pos: { x: x + 1, y, z }, neighbor: this.octree.getVoxel({ x: x + 1, y, z }) },
      { pos: { x: x - 1, y, z }, neighbor: this.octree.getVoxel({ x: x - 1, y, z }) },
      { pos: { x, y: y + 1, z }, neighbor: this.octree.getVoxel({ x, y: y + 1, z }) },
      { pos: { x, y: y - 1, z }, neighbor: this.octree.getVoxel({ x, y: y - 1, z }) },
      { pos: { x, y, z: z + 1 }, neighbor: this.octree.getVoxel({ x, y, z: z + 1 }) },
      { pos: { x, y, z: z - 1 }, neighbor: this.octree.getVoxel({ x, y, z: z - 1 }) },
    ];
  }
}

export class VoxelHealthSystem extends System {
  constructor(private octree: Octree) {
    super();
  }
  
  update(deltaTime: number): void {
    // Handle voxel damage/destruction based on health
    // This would be triggered by external events (explosions, mining, etc.)
  }
  
  damageVoxel(pos: Vec3, damage: number): void {
    const voxel = this.octree.getVoxel(pos);
    if (!voxel?.properties?.health) return;
    
    voxel.properties.health -= damage;
    
    if (voxel.properties.health <= 0) {
      // Voxel destroyed!
      this.octree.setVoxel(pos, { density: 0, material: 0 });
    }
  }
}
```

### Step 4: Visualize Properties

```typescript
// src/systems/PropertyVisualizationSystem.ts
import { System } from "@/ecs";
import { Octree } from "@/voxel";

export class TemperatureVisualizationSystem extends System {
  constructor(private octree: Octree) {
    super();
  }
  
  update(deltaTime: number): void {
    // Change voxel colors based on temperature
    // Hot = red, cold = blue
    
    // This would require extending MarchingCubes to read properties
    // for color calculation
  }
}
```

### Step 5: Complete Example Scene

```typescript
// src/scenes/PropertyDemoScene.ts
import { GameEngine } from "@/engine";
import { TemperatureDiffusionSystem, PressureDiffusionSystem, VoxelHealthSystem } from "@/systems";

export class PropertyDemoScene {
  setup(engine: GameEngine): void {
    const world = engine.getWorld();
    const octree = engine.getOctree();
    
    // Add property systems
    world.addSystem(new TemperatureDiffusionSystem(octree, 64));
    world.addSystem(new PressureDiffusionSystem(octree, 64));
    world.addSystem(new VoxelHealthSystem(octree));
    
    // Create a room
    this.buildRoom(engine);
    
    // Add a hot spot (heat source)
    this.createHeatSource(engine, { x: 16, y: 2, z: 16 });
    
    // Add a pressure source (gas leak)
    this.createPressureSource(engine, { x: 20, y: 2, z: 20 });
  }
  
  private buildRoom(engine: GameEngine): void {
    // Floor with properties
    for (let x = 0; x < 32; x++) {
      for (let z = 0; z < 32; z++) {
        engine.setVoxel({ x, y: 0, z }, {
          density: 1,
          material: 2,
          properties: {
            temperature: 293,  // Room temp (20°C)
            health: 100,
            hardness: 5
          }
        });
      }
    }
    
    // Walls
    for (let y = 1; y < 5; y++) {
      for (let x = 0; x < 32; x++) {
        // Front/back
        engine.setVoxel({ x, y, z: 0 }, {
          density: 1,
          material: 1,
          properties: { temperature: 293, health: 200, hardness: 8 }
        });
        engine.setVoxel({ x, y, z: 31 }, {
          density: 1,
          material: 1,
          properties: { temperature: 293, health: 200, hardness: 8 }
        });
      }
      
      for (let z = 0; z < 32; z++) {
        // Left/right
        engine.setVoxel({ x: 0, y, z }, {
          density: 1,
          material: 1,
          properties: { temperature: 293, health: 200, hardness: 8 }
        });
        engine.setVoxel({ x: 31, y, z }, {
          density: 1,
          material: 1,
          properties: { temperature: 293, health: 200, hardness: 8 }
        });
      }
    }
  }
  
  private createHeatSource(engine: GameEngine, pos: Vec3): void {
    engine.setVoxel(pos, {
      density: 1,
      material: 4, // Red
      properties: {
        temperature: 773, // 500°C
        pressure: 101325,
        health: 1000 // Very strong
      }
    });
  }
  
  private createPressureSource(engine: GameEngine, pos: Vec3): void {
    engine.setVoxel(pos, {
      density: 0.1, // Gas
      material: 5,  // Blue
      properties: {
        temperature: 293,
        pressure: 300000, // 3 atmospheres!
        gasType: 1
      }
    });
  }
}
```

## Performance Notes

⚠️ **Warning**: Simulating properties for every voxel is EXPENSIVE!

**Solutions:**
1. **Only simulate active regions** (near players/events)
2. **Update less frequently** (every 10 frames instead of every frame)
3. **Use lower resolution** (simulate every 2x2x2 block)
4. **GPU compute shaders** (best option for large scales)

## Summary

✅ **What you have now:**
- Basic voxel with density + material
- Excellent face culling (only renders exposed faces)

🔧 **What you need to add for custom properties:**
1. Extend `Voxel` interface with `properties` field
2. Create property simulation systems
3. Store/retrieve properties when setting voxels
4. Optionally visualize properties (color/particles)

**The architecture supports it - just extend the types and add Systems!**

