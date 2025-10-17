# Using Marching Cubes for Player Entity

This guide shows how to render any entity (including the player) using Marching Cubes instead of pre-generated meshes.

## Two Approaches for Entity Meshes

### **Approach 1: Pre-Generated Static Mesh** (Fast, Simple)

```typescript
// Direct mesh assignment (no mesh regeneration)
const playerMesh = VoxelMeshGenerator.generatePlayer({
  x: 0.2,
  y: 0.5,
  z: 0.9,
});
world.addComponent(player, new VoxelMesh(playerMesh));
```

**Pros:**

- Fast - mesh is created once
- Simple code
- Low memory

**Cons:**

- Cannot modify shape at runtime
- Always blocky/fixed shape

---

### **Approach 2: VoxelData with Marching Cubes** (Dynamic, Smooth)

```typescript
// Create octree for player
const octree = new Octree(8, 4); // 8x8x8 voxel space

// Create smooth sphere shape
const centerX = 4,
  centerY = 4,
  centerZ = 4;
const radius = 3;

for (let x = 0; x < 8; x++) {
  for (let y = 0; y < 8; y++) {
    for (let z = 0; z < 8; z++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dz = z - centerZ;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance <= radius) {
        // Gradient density for smooth surface
        const density = Math.max(0, 1 - distance / radius);
        octree.setVoxel({ x, y, z }, { density, material: 5 });
      }
    }
  }
}

// Add VoxelData with MARCHING_CUBES
const voxelData = new VoxelData(octree, true, MeshAlgorithm.MARCHING_CUBES);
world.addComponent(player, voxelData);

// MeshGenerationSystem will automatically generate the mesh!
```

**Pros:**

- Smooth organic shapes
- Can modify voxels at runtime
- Can damage/deform the entity
- Supports different materials

**Cons:**

- More memory (stores octree)
- Mesh regeneration on changes
- More complex

---

## Complete Example: Smooth Player

```typescript
import { MeshAlgorithm, VoxelData } from "@/components";
import { Octree } from "@/voxel";

function createSmoothPlayer(world, entity) {
  // Small octree for player (8x8x8)
  const octree = new Octree(8, 4);

  // Create blob shape
  createBlobShape(octree, 4, 4, 4, 3, 5); // center (4,4,4), radius 3, material 5

  // Add VoxelData with marching cubes
  const voxelData = new VoxelData(octree, true, MeshAlgorithm.MARCHING_CUBES);
  world.addComponent(entity, voxelData);
}

function createBlobShape(octree, cx, cy, cz, radius, material) {
  const size = octree.getWorldSize();

  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      for (let z = 0; z < size; z++) {
        const dx = x - cx;
        const dy = y - cy;
        const dz = z - cz;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist <= radius) {
          const density = Math.max(0, 1 - dist / radius);
          octree.setVoxel({ x, y, z }, { density, material });
        }
      }
    }
  }
}
```

---

## Switching Between Approaches

### Start with Static Mesh

```typescript
// Initial creation
const mesh = VoxelMeshGenerator.generatePlayer({ x: 0.2, y: 0.5, z: 0.9 });
world.addComponent(player, new VoxelMesh(mesh));
```

### Later Switch to Marching Cubes

```typescript
// Remove static mesh
world.removeComponent(player, VoxelMesh);

// Add voxel data
const octree = createPlayerOctree();
const voxelData = new VoxelData(octree, true, MeshAlgorithm.MARCHING_CUBES);
world.addComponent(player, voxelData);

// MeshGenerationSystem will create VoxelMesh automatically
```

---

## Advanced: Animated/Deformable Player

```typescript
// In your game logic
const voxelData = world.getComponent(player, VoxelData);

if (voxelData) {
  // Damage player (remove voxels at hit location)
  voxelData.octree.setVoxel({ x: 5, y: 5, z: 5 }, { density: 0, material: 0 });

  // Mark for remesh
  voxelData.markDirty();

  // MeshGenerationSystem will regenerate on next frame
}
```

---

## Performance Comparison

| Aspect          | Static Mesh   | Marching Cubes    |
| --------------- | ------------- | ----------------- |
| Initial Setup   | Fast          | Medium            |
| Runtime Updates | None          | Dynamic           |
| Memory          | Low (~1KB)    | Medium (~8-64KB)  |
| Triangle Count  | ~36 triangles | ~50-200 triangles |
| Visual Quality  | Blocky        | Smooth            |

---

## When to Use Each

### Use Static Mesh If:

- Player shape never changes
- Performance is critical
- Blocky aesthetic is desired
- Multiple identical entities

### Use Marching Cubes If:

- Player can be damaged/deformed
- Smooth organic look desired
- Runtime shape modification needed
- Unique per-entity appearance

---

## Current MazeScene Implementation

The current implementation uses **Marching Cubes** for both:

- **Terrain**: Smooth cave-like walls
- **Player**: Smooth sphere/blob character

You can easily switch the player back to static mesh by uncommenting the `VoxelMeshGenerator` code!
