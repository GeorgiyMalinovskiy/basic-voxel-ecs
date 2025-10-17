# Refactoring Recommendations for Voxel ECS Engine

## Executive Summary

This document provides refactoring recommendations for the voxel-ecs project, focusing on:

- **Simplicity**: Reducing complexity and improving clarity
- **DRY**: Eliminating code duplication
- **Separation/Encapsulation**: Better organizing responsibilities
- **Expandability**: Creating flexible, extensible architectures

---

## 1. Input System - Mixed Responsibilities

### Current Issues

- **Location**: `src/engine.ts` (lines 34-261)
- **Problem**: Engine class directly handles input (keyboard, mouse) mixing business logic with UI concerns
- **Impact**: Hard to extend, test, or swap input systems

### Recommendation: Extract Input System

```typescript
// src/input/input-manager.ts
export class InputManager {
  private keys = new Set<string>();
  private mouseState = { x: 0, y: 0, deltaX: 0, deltaY: 0, locked: false };
  private callbacks = new Map<string, Set<() => void>>();

  constructor(canvas: HTMLCanvasElement) {
    this.setupListeners(canvas);
  }

  isKeyPressed(key: string): boolean {
    /* ... */
  }
  getMouseDelta(): { x: number; y: number } {
    /* ... */
  }
  on(event: string, callback: () => void): void {
    /* ... */
  }
}
```

**Benefits**:

- Testable input system
- Easy to add gamepad/touch support
- Can disable/enable independently
- Cleaner engine code

---

## 2. Camera Control - Tight Coupling

### Current Issues

- **Location**: `src/engine.ts` (lines 154-219)
- **Problem**: Camera movement logic embedded in engine update loop
- **Impact**: Cannot reuse camera for different control schemes

### Recommendation: Extract Camera Controller

```typescript
// src/renderer/camera-controller.ts
export interface ICameraController {
  update(deltaTime: number, camera: Camera): void;
  setEnabled(enabled: boolean): void;
}

export class FPSCameraController implements ICameraController {
  constructor(private inputManager: InputManager) {}

  update(deltaTime: number, camera: Camera): void {
    // Move camera movement logic here
  }
}

export class OrbitCameraController implements ICameraController {
  // Different camera control scheme
}
```

**Benefits**:

- Multiple camera control schemes
- Easy to switch between FPS, orbit, cinematic cameras
- Testable camera behavior
- Follows Single Responsibility Principle

---

## 3. Scene Management - Inconsistent Pattern

### Current Issues

- **Location**: `src/scenes/`, `src/main.ts`
- **Problems**:
  - Scene lifecycle not fully defined (update is optional)
  - Scene selection logic in Demo class (main.ts)
  - External ECS update callback pattern is confusing
  - DemoScene has empty methods (lines 12-18 in demo/scene.ts)

### Recommendation: Unified Scene System

```typescript
// src/scenes/scene-manager.ts
export interface IScene {
  name: string;
  description: string;

  // Lifecycle methods
  initialize(engine: VoxelEngine): Promise<void>;
  update(deltaTime: number): void;
  cleanup(): void;
}

export class SceneManager {
  private currentScene: IScene | null = null;

  async loadScene(scene: IScene, engine: VoxelEngine): Promise<void> {
    if (this.currentScene) {
      this.currentScene.cleanup();
    }
    this.currentScene = scene;
    await scene.initialize(engine);
  }

  update(deltaTime: number): void {
    this.currentScene?.update(deltaTime);
  }
}
```

**Benefits**:

- Clear scene lifecycle
- Centralized scene management
- No optional methods in interface
- Easier to add scene transitions

---

## 4. Configuration - Scattered and Hardcoded

### Current Issues

- **Locations**: Multiple files
- **Problems**:
  - Magic numbers throughout (moveSpeed=50, lookSpeed=2, etc.)
  - Configuration mixed with initialization
  - No central configuration management

### Recommendation: Configuration System

```typescript
// src/config/config.ts
export interface EngineConfiguration {
  rendering: {
    backgroundColor: GPUColor;
    defaultWorldSize: number;
    defaultOctreeLevel: number;
  };
  camera: {
    fov: number;
    near: number;
    far: number;
    moveSpeed: number;
    lookSensitivity: number;
  };
  physics: {
    gravity: number;
    timeStep: number;
  };
}

export const DEFAULT_CONFIG: EngineConfiguration = {
  /* ... */
};

export class Config {
  private static instance: Config;
  private config: EngineConfiguration;

  static getInstance(): Config {
    /* singleton */
  }
  get<K extends keyof EngineConfiguration>(key: K): EngineConfiguration[K] {
    /* ... */
  }
  set<K extends keyof EngineConfiguration>(
    key: K,
    value: EngineConfiguration[K]
  ): void {
    /* ... */
  }
}
```

**Benefits**:

- Single source of truth
- Easy to modify settings
- Can load from file/localStorage
- Better for debugging

---

## 5. Voxel Generation - Duplication and Poor Separation

### Current Issues

- **Location**: `src/engine.ts` (lines 354-408), `src/scenes/base-scene.ts`
- **Problems**:
  - Same sphere/box/terrain generation in multiple places
  - Engine knows about voxel generation algorithms
  - No separation between engine and world generation

### Recommendation: Extract World Generation

```typescript
// src/voxel/generators/index.ts
export interface IVoxelGenerator {
  generate(octree: Octree): void;
}

export class SphereGenerator implements IVoxelGenerator {
  constructor(
    private center: Vec3,
    private radius: number,
    private material: number = 1
  ) {}

  generate(octree: Octree): void {
    /* ... */
  }
}

export class TerrainGenerator implements IVoxelGenerator {
  constructor(
    private size: number,
    private heightConfig: TerrainHeightConfig
  ) {}

  generate(octree: Octree): void {
    /* ... */
  }
}

// src/voxel/generators/composite-generator.ts
export class CompositeGenerator implements IVoxelGenerator {
  private generators: IVoxelGenerator[] = [];

  add(generator: IVoxelGenerator): this {
    this.generators.push(generator);
    return this;
  }

  generate(octree: Octree): void {
    this.generators.forEach((g) => g.generate(octree));
  }
}
```

**Benefits**:

- Reusable generators
- Composable world generation
- Engine doesn't know about generation
- Easy to add procedural generation

---

## 6. ECS System - Incomplete Implementation

### Current Issues

- **Location**: `src/ecs/`
- **Problems**:
  - World has two update paths (internal + external callback)
  - Component registry exists but not used
  - No component serialization
  - Query system works but could be optimized

### Recommendation: Complete ECS Architecture

```typescript
// src/ecs/world.ts - Remove external update callback
// Make scenes use the ECS world directly instead

// src/ecs/component.ts - Use the registry
export abstract class Component {
  constructor() {
    ComponentRegistry.register(this.getType(), this.constructor as any);
  }
}

// src/ecs/serialization.ts - Add serialization
export class ECSSerializer {
  serialize(world: World): string {
    // Serialize entities and components to JSON
  }

  deserialize(data: string): World {
    // Reconstruct world from JSON
  }
}

// src/ecs/query-cache.ts - Add query caching for performance
export class QueryCache {
  private cache = new Map<string, Entity[]>();

  get(query: Query, world: World): Entity[] {
    const key = this.getQueryKey(query);
    if (!this.cache.has(key)) {
      this.cache.set(key, world.queryEntities(query));
    }
    return this.cache.get(key)!;
  }

  invalidate(): void {
    this.cache.clear();
  }
}
```

**Benefits**:

- More consistent ECS usage
- Better performance with query caching
- Save/load game state
- Follows standard ECS patterns

---

## 7. Error Handling - Minimal and Inconsistent

### Current Issues

- **Location**: Throughout codebase
- **Problems**:
  - Few try-catch blocks
  - Errors logged to console with no recovery
  - No error boundaries
  - User gets generic error messages

### Recommendation: Structured Error Handling

```typescript
// src/core/errors.ts
export class VoxelEngineError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = "VoxelEngineError";
  }
}

export class InitializationError extends VoxelEngineError {
  constructor(message: string, details?: any) {
    super(message, "INIT_ERROR", details);
  }
}

export class RenderError extends VoxelEngineError {
  constructor(message: string, details?: any) {
    super(message, "RENDER_ERROR", details);
  }
}

// src/core/error-handler.ts
export class ErrorHandler {
  private handlers = new Map<string, (error: VoxelEngineError) => void>();

  register(
    errorCode: string,
    handler: (error: VoxelEngineError) => void
  ): void {
    this.handlers.set(errorCode, handler);
  }

  handle(error: VoxelEngineError): void {
    const handler = this.handlers.get(error.code);
    if (handler) {
      handler(error);
    } else {
      console.error(error);
    }
  }
}
```

**Benefits**:

- Structured error information
- Recoverable errors
- Better user feedback
- Easier debugging

---

## 8. Renderer Abstraction - Limited

### Current Issues

- **Location**: `src/renderer/`
- **Problems**:
  - Tightly coupled to WebGPU
  - No abstraction for different rendering backends
  - WebGPURenderer is both an abstraction and concrete implementation

### Recommendation: Renderer Abstraction Layer

```typescript
// src/renderer/renderer-interface.ts
export interface IRenderer {
  initialize(): Promise<void>;
  beginFrame(): void;
  endFrame(): void;
  createShaderModule(code: string): any;
  createBuffer(descriptor: BufferDescriptor): any;
  // ... other methods
}

// src/renderer/webgpu/webgpu-renderer.ts
export class WebGPURenderer implements IRenderer {
  // Current WebGPURenderer implementation
}

// Future: src/renderer/webgl2/webgl2-renderer.ts
// Future: src/renderer/canvas2d/canvas2d-renderer.ts

// src/renderer/renderer-factory.ts
export class RendererFactory {
  static async create(
    type: "webgpu" | "webgl2",
    canvas: HTMLCanvasElement
  ): Promise<IRenderer> {
    switch (type) {
      case "webgpu":
        if (!navigator.gpu) {
          throw new Error("WebGPU not supported");
        }
        return new WebGPURenderer(canvas);
      default:
        throw new Error(`Unsupported renderer: ${type}`);
    }
  }
}
```

**Benefits**:

- Fallback to WebGL2 if WebGPU unavailable
- Easier testing with mock renderer
- Can add different rendering strategies
- Better browser support

---

## 9. Type Safety - Improvements Needed

### Current Issues

- **Location**: Throughout codebase
- **Problems**:
  - String keys for voxel positions
  - Any types in some places
  - Loose typing in component system

### Recommendation: Stronger Typing

```typescript
// src/voxel/voxel-key.ts
export class VoxelKey {
  private constructor(private readonly key: string) {}

  static fromVec3(pos: Vec3): VoxelKey {
    return new VoxelKey(
      `${Math.floor(pos.x)},${Math.floor(pos.y)},${Math.floor(pos.z)}`
    );
  }

  toString(): string {
    return this.key;
  }

  toVec3(): Vec3 {
    const [x, y, z] = this.key.split(",").map(Number);
    return { x, y, z };
  }
}

// Use branded types for IDs
export type EntityId = number & { readonly __brand: "EntityId" };
export type ComponentTypeId = string & { readonly __brand: "ComponentTypeId" };
```

**Benefits**:

- Compile-time safety
- Fewer runtime errors
- Better IDE support
- Self-documenting code

---

## 10. Testing Infrastructure - Missing

### Current Issues

- **Location**: Nowhere!
- **Problem**: No tests, making refactoring risky

### Recommendation: Add Testing

```typescript
// tests/unit/ecs/world.test.ts
import { describe, it, expect } from "vitest";
import { World, Entity, Component } from "@/ecs";

describe("World", () => {
  it("should create entities", () => {
    const world = new World();
    const entity = world.createEntity();
    expect(entity).toBeInstanceOf(Entity);
  });

  it("should add components to entities", () => {
    // ...
  });
});

// tests/integration/engine.test.ts
// tests/e2e/rendering.test.ts
```

Add to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "happy-dom": "^12.0.0"
  }
}
```

---

## 11. Code Organization - Flat Structure

### Current Issues

- **Location**: Project structure
- **Problems**:
  - Some folders are flat (ecs, physics)
  - No clear core vs feature separation
  - Utilities scattered

### Recommendation: Better Organization

```
src/
├── core/                    # Core engine functionality
│   ├── engine.ts
│   ├── lifecycle.ts
│   ├── config.ts
│   └── errors.ts
├── ecs/                     # ECS system
│   ├── core/
│   │   ├── entity.ts
│   │   ├── component.ts
│   │   ├── system.ts
│   │   └── world.ts
│   ├── serialization/
│   └── query-cache.ts
├── voxel/                   # Voxel system
│   ├── octree.ts
│   ├── marching-cubes.ts
│   ├── generators/
│   │   ├── sphere.ts
│   │   ├── terrain.ts
│   │   └── composite.ts
│   └── types.ts
├── renderer/                # Rendering system
│   ├── interfaces/
│   │   └── renderer.interface.ts
│   ├── webgpu/
│   │   ├── webgpu-renderer.ts
│   │   └── voxel-renderer.ts
│   ├── camera/
│   │   ├── camera.ts
│   │   └── controllers/
│   └── shaders/
├── input/                   # Input handling
│   ├── input-manager.ts
│   └── input-mapping.ts
├── physics/                 # Physics system
│   ├── interfaces/
│   └── adapters/
├── scenes/                  # Scene system
│   ├── scene-manager.ts
│   ├── scene.interface.ts
│   └── demos/
├── utils/                   # Utilities
│   ├── math.ts
│   └── async.ts
└── index.ts                 # Main exports
```

---

## 12. Performance Considerations

### Issues & Recommendations

#### 12.1 Octree String Keys

- **Problem**: String concatenation and parsing for every voxel access
- **Solution**: Use typed VoxelKey class or numeric hashing

#### 12.2 No Dirty Tracking

- **Problem**: Full octree traversal for mesh generation
- **Solution**: Track dirty regions and only regenerate changed areas

```typescript
// src/voxel/dirty-region-tracker.ts
export class DirtyRegionTracker {
  private dirtyRegions: Set<AABB> = new Set();

  markDirty(bounds: AABB): void {
    this.dirtyRegions.add(bounds);
  }

  getDirtyRegions(): AABB[] {
    const regions = Array.from(this.dirtyRegions);
    this.dirtyRegions.clear();
    return regions;
  }
}
```

#### 12.3 No Frustum Culling

- **Problem**: Rendering entire mesh even if off-screen
- **Solution**: Add frustum culling

#### 12.4 No LOD System

- **Problem**: Same detail level at all distances
- **Solution**: Use octree levels for LOD

---

## Priority Implementation Order

### Phase 1: Foundation (High Priority)

1. **Input System** - Immediately improves testability
2. **Configuration System** - Makes everything else configurable
3. **Error Handling** - Prevents silent failures

### Phase 2: Architecture (Medium Priority)

4. **Camera Controllers** - Improves flexibility
5. **Scene Manager** - Better lifecycle management
6. **Voxel Generators** - Reduces duplication

### Phase 3: Enhancement (Lower Priority)

7. **ECS Improvements** - Performance and features
8. **Renderer Abstraction** - Better portability
9. **Type Safety** - Gradual improvement

### Phase 4: Quality (Continuous)

10. **Testing Infrastructure** - Essential for confidence
11. **Code Organization** - Improves maintainability
12. **Performance Optimization** - As needed

---

## Summary

### Key Principles Moving Forward

1. **Single Responsibility**: Each class should have one reason to change
2. **Dependency Injection**: Pass dependencies rather than creating them
3. **Interface Segregation**: Small, focused interfaces
4. **Open/Closed**: Open for extension, closed for modification
5. **Composition over Inheritance**: Prefer composing behaviors

### Quick Wins (< 1 day each)

- Extract configuration constants
- Create InputManager class
- Add VoxelKey type
- Remove external ECS update callback
- Add error classes

### Impact Assessment

- **Simplicity**: ⬆️ Significant improvement with separation of concerns
- **DRY**: ⬆️ Major reduction in duplication with generators and managers
- **Separation**: ⬆️ Much clearer boundaries and responsibilities
- **Expandability**: ⬆️⬆️ Dramatically easier to add features and swap implementations

---

## Conclusion

The current codebase is well-structured for an initial implementation but would benefit from these refactorings to support long-term growth. The recommendations follow industry best practices and will make the codebase more maintainable, testable, and extensible.

Start with Phase 1 items for immediate benefits, then gradually implement other phases based on feature needs and priorities.

