# Switching Between Mesh Algorithms

The engine supports two mesh generation algorithms that can be set per-entity:

## Implementation Files

- **`CubicVoxelMesher.ts`** - Minecraft-style blocky voxels
- **`MarchingCubes.ts`** - Smooth marching cubes algorithm

## Algorithms

### 1. **CUBIC** (Minecraft-style)

- Blocky voxels with face culling
- Sharp edges and flat faces
- Better for building games, structures
- Faster performance

### 2. **MARCHING_CUBES** (Smooth terrain)

- Organic, smooth surfaces
- Interpolated vertices
- Better for terrain, caves, organic shapes
- More triangles, slightly slower

## Usage

### In Scene Setup

```typescript
import { MeshAlgorithm } from "@/components";

// Smooth terrain (default)
const terrainOctree = new Octree(64, 6);
const terrainData = new VoxelData(
  terrainOctree,
  true,
  MeshAlgorithm.MARCHING_CUBES
);
world.addComponent(terrainEntity, terrainData);

// Blocky building
const buildingOctree = new Octree(32, 5);
const buildingData = new VoxelData(buildingOctree, true, MeshAlgorithm.CUBIC);
world.addComponent(buildingEntity, buildingData);
```

### Switching at Runtime

```typescript
// Get the VoxelData component
const voxelData = world.getComponent(entity, VoxelData);

// Switch to cubic voxels
voxelData?.setAlgorithm(MeshAlgorithm.CUBIC);

// Switch to marching cubes
voxelData?.setAlgorithm(MeshAlgorithm.MARCHING_CUBES);
```

## Practical Examples

### Use CUBIC for:

- Player-placed blocks
- Buildings and structures
- Minecraft-style games
- UI elements
- When you need sharp, defined edges

### Use MARCHING_CUBES for:

- Natural terrain
- Caves and tunnels
- Organic sculptures
- Smooth spheres and curves
- When you want soft transitions

## Performance Tips

1. **Cubic is faster**: Fewer vertices, simpler calculations
2. **MC creates more triangles**: About 3-5x more than cubic
3. **Mix them**: Use cubic for far chunks, MC for nearby detail
4. **Density matters**: For cubic, use 0 or 1. For MC, use gradients (0.0 to 1.0)

## Example: Hybrid Scene

```typescript
// Smooth cave walls
const caveWalls = createCaveEntity();
const caveData = world.getComponent(caveWalls, VoxelData);
caveData?.setAlgorithm(MeshAlgorithm.MARCHING_CUBES);

// Blocky ore veins
const oreVeins = createOreEntity();
const oreData = world.getComponent(oreVeins, VoxelData);
oreData?.setAlgorithm(MeshAlgorithm.CUBIC);
```

## Density Values

- **For CUBIC**: Use `density: 1.0` for solid, `0.0` for empty
- **For MARCHING_CUBES**: Use gradients like `0.3` to `1.0` for smooth transitions
