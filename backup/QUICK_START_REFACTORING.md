# Quick Start Refactoring Guide

This checklist provides a practical, step-by-step guide to refactor your voxel-ecs project. Start with the highest-priority items and work your way down.

---

## 🚀 Quick Wins (1-2 hours each)

These provide immediate benefits with minimal risk.

### ✅ 1. Extract Configuration Constants

**Time:** 1 hour | **Risk:** Low | **Impact:** Medium

```bash
# Create config file
mkdir -p src/config
touch src/config/engine-config.ts
```

Create `src/config/engine-config.ts`:

```typescript
export const ENGINE_CONFIG = {
  camera: {
    moveSpeed: 50,
    lookSpeed: 2,
    mouseSensitivity: 0.002,
    fov: Math.PI / 4,
    near: 0.1,
    far: 1000,
  },
  rendering: {
    defaultBackgroundColor: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 },
    defaultWorldSize: 128,
    defaultOctreeLevel: 6,
  },
  voxel: {
    initialVertexCapacity: 1000,
    initialIndexCapacity: 3000,
  },
} as const;
```

**Files to update:**

- [ ] `src/engine.ts` - Replace magic numbers
- [ ] `src/renderer/voxel-renderer.ts` - Use config for buffer sizes
- [ ] `src/renderer/camera.ts` - Use config for defaults

**Test:** Ensure app still works, then try changing a config value to verify it's being used.

---

### ✅ 2. Add Type Safety for Voxel Keys

**Time:** 30 minutes | **Risk:** Very Low | **Impact:** Low

Create `src/voxel/voxel-key.ts`:

```typescript
export class VoxelKey {
  private constructor(private readonly key: string) {}

  static fromVec3(pos: { x: number; y: number; z: number }): VoxelKey {
    return new VoxelKey(
      `${Math.floor(pos.x)},${Math.floor(pos.y)},${Math.floor(pos.z)}`
    );
  }

  static fromString(key: string): VoxelKey {
    return new VoxelKey(key);
  }

  toString(): string {
    return this.key;
  }

  toVec3(): { x: number; y: number; z: number } {
    const [x, y, z] = this.key.split(",").map(Number);
    return { x, y, z };
  }

  equals(other: VoxelKey): boolean {
    return this.key === other.key;
  }
}
```

**Files to update:**

- [ ] `src/voxel/octree.ts` - Use VoxelKey instead of string

**Test:** Run existing code, ensure no regressions.

---

### ✅ 3. Remove External ECS Update Callback

**Time:** 1 hour | **Risk:** Low | **Impact:** Medium

**Current problem:** `engine.setExternalECSUpdate()` is confusing.

**Fix:** Scenes should use the engine's ECS world directly or manage their own.

**Steps:**

1. Update `src/scenes/base-scene.ts`:

```typescript
export interface Scene {
  name: string;
  description: string;
  initialize(engine: VoxelEngine): Promise<void>;
  update(deltaTime: number): void; // Make required, not optional
  cleanup(engine: VoxelEngine): void;
}
```

2. Update `src/engine.ts`:

```typescript
// Remove:
private externalECSUpdate?: (deltaTime: number) => void;
setExternalECSUpdate(updateFn: (deltaTime: number) => void): void { ... }

// Keep simple:
private update(deltaTime: number): void {
  this.inputManager.update();
  this.cameraController.update(deltaTime);
  this.world.update(deltaTime);  // Only internal world
  this.voxelRenderer.update();
}
```

3. Update `src/main.ts` to call scene update separately:

```typescript
// In Demo class:
private update(deltaTime: number): void {
  this.engine.update(deltaTime);
  this.currentScene.update(deltaTime);
}
```

**Files to update:**

- [ ] `src/scenes/base-scene.ts` - Make update() required
- [ ] `src/engine.ts` - Remove external callback
- [ ] `src/main.ts` - Call scene.update() directly

**Test:** Ensure scenes still update correctly.

---

## 📦 Phase 1: Input System (2-4 hours)

Foundation for better testability and extensibility.

### ✅ 4. Create Input System

Follow the detailed guide in `REFACTORING_EXAMPLE_INPUT.md`.

**Checklist:**

- [ ] Create `src/input/input-manager.ts`
- [ ] Create `src/renderer/camera-controller.ts`
- [ ] Create `tests/unit/input/input-manager.test.ts`
- [ ] Create `tests/unit/renderer/camera-controller.test.ts`
- [ ] Update `src/engine.ts` to use new systems
- [ ] Test thoroughly
- [ ] Remove old input code from engine

**Validation:**

```bash
npm run test  # All tests pass
npm run dev   # App works as before
# Try WASD movement, mouse look, camera lock
```

---

## 📐 Phase 2: Scene Management (2-3 hours)

Better scene lifecycle and management.

### ✅ 5. Create Scene Manager

Create `src/scenes/scene-manager.ts`:

```typescript
export class SceneManager {
  private currentScene: Scene | null = null;

  async loadScene(scene: Scene, engine: VoxelEngine): Promise<void> {
    // Cleanup old scene
    if (this.currentScene) {
      this.currentScene.cleanup(engine);
    }

    // Load new scene
    this.currentScene = scene;
    await scene.initialize(engine);
  }

  update(deltaTime: number): void {
    this.currentScene?.update(deltaTime);
  }

  getCurrentScene(): Scene | null {
    return this.currentScene;
  }
}
```

**Files to update:**

- [ ] Create `src/scenes/scene-manager.ts`
- [ ] Update `src/main.ts` to use SceneManager
- [ ] Update all scenes to implement full lifecycle

**Test:** Scene switching should work cleanly.

---

## 🎨 Phase 3: Voxel Generators (3-4 hours)

Remove duplication in voxel generation.

### ✅ 6. Extract Voxel Generators

Create generator interface and implementations.

#### Step 1: Create interface

```typescript
// src/voxel/generators/generator.interface.ts
export interface IVoxelGenerator {
  generate(octree: Octree): void;
}
```

#### Step 2: Create concrete generators

```bash
mkdir -p src/voxel/generators
touch src/voxel/generators/sphere-generator.ts
touch src/voxel/generators/box-generator.ts
touch src/voxel/generators/terrain-generator.ts
touch src/voxel/generators/composite-generator.ts
```

```typescript
// src/voxel/generators/sphere-generator.ts
export class SphereGenerator implements IVoxelGenerator {
  constructor(
    private center: Vec3,
    private radius: number,
    private material: number = 1
  ) {}

  generate(octree: Octree): void {
    for (
      let x = this.center.x - this.radius;
      x <= this.center.x + this.radius;
      x++
    ) {
      for (
        let y = this.center.y - this.radius;
        y <= this.center.y + this.radius;
        y++
      ) {
        for (
          let z = this.center.z - this.radius;
          z <= this.center.z + this.radius;
          z++
        ) {
          const distance = Math.sqrt(
            (x - this.center.x) ** 2 +
              (y - this.center.y) ** 2 +
              (z - this.center.z) ** 2
          );

          if (distance <= this.radius) {
            const density = Math.max(0, 1 - distance / this.radius);
            octree.setVoxel({ x, y, z }, { density, material: this.material });
          }
        }
      }
    }
  }
}
```

#### Step 3: Create composite generator

```typescript
// src/voxel/generators/composite-generator.ts
export class CompositeGenerator implements IVoxelGenerator {
  private generators: IVoxelGenerator[] = [];

  add(generator: IVoxelGenerator): this {
    this.generators.push(generator);
    return this;
  }

  generate(octree: Octree): void {
    this.generators.forEach((gen) => gen.generate(octree));
  }
}
```

#### Step 4: Update engine

```typescript
// In src/engine.ts - Keep simple helper methods that delegate:
generateSphere(center: Vec3, radius: number, material = 1): void {
  new SphereGenerator(center, radius, material).generate(this.octree);
  this.markMeshDirty();
}
```

#### Step 5: Update scenes to use generators

```typescript
// In a scene:
const worldGen = new CompositeGenerator()
  .add(new TerrainGenerator(16, { baseHeight: 8 }))
  .add(new SphereGenerator({ x: 5, y: 10, z: 5 }, 2))
  .add(new SphereGenerator({ x: 10, y: 12, z: 8 }, 3));

worldGen.generate(engine.getOctree());
engine.markMeshDirty();
```

**Checklist:**

- [ ] Create generator interface
- [ ] Create SphereGenerator
- [ ] Create BoxGenerator
- [ ] Create TerrainGenerator
- [ ] Create CompositeGenerator
- [ ] Update scenes to use generators
- [ ] (Optional) Remove old methods from engine
- [ ] Test all scenes still work

---

## 🎯 Phase 4: Testing Infrastructure (2-3 hours)

Essential for confidence in future changes.

### ✅ 7. Add Testing Setup

```bash
npm install -D vitest @vitest/ui happy-dom
```

Update `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

**Write tests for:**

- [ ] `tests/unit/input/input-manager.test.ts`
- [ ] `tests/unit/renderer/camera-controller.test.ts`
- [ ] `tests/unit/ecs/world.test.ts`
- [ ] `tests/unit/ecs/entity.test.ts`
- [ ] `tests/unit/voxel/octree.test.ts`
- [ ] `tests/unit/voxel/generators/*.test.ts`

**Run tests:**

```bash
npm run test        # Run all tests
npm run test:ui     # Open UI
npm run test:coverage  # Check coverage
```

---

## 🔧 Phase 5: Error Handling (2-3 hours)

Better error handling and recovery.

### ✅ 8. Add Structured Error Handling

Create `src/core/errors.ts`:

```typescript
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

export class InputError extends VoxelEngineError {
  constructor(message: string, details?: any) {
    super(message, "INPUT_ERROR", details);
  }
}
```

Create `src/core/error-handler.ts`:

```typescript
type ErrorHandler = (error: VoxelEngineError) => void;

export class ErrorHandlerRegistry {
  private handlers = new Map<string, ErrorHandler>();

  register(errorCode: string, handler: ErrorHandler): void {
    this.handlers.set(errorCode, handler);
  }

  handle(error: VoxelEngineError): void {
    const handler = this.handlers.get(error.code);
    if (handler) {
      handler(error);
    } else {
      console.error(`Unhandled error [${error.code}]:`, error);
    }
  }
}
```

**Update engine to use errors:**

```typescript
async initialize(): Promise<void> {
  try {
    await this.renderer.initialize();
    await this.voxelRenderer.initialize();
  } catch (error) {
    throw new InitializationError(
      'Failed to initialize renderer',
      { originalError: error }
    );
  }
}
```

**Checklist:**

- [ ] Create error classes
- [ ] Create error handler
- [ ] Update engine initialization
- [ ] Update renderer code
- [ ] Add error UI in main.ts
- [ ] Test error scenarios

---

## 📊 Progress Tracking

### Completed

- [ ] Extract configuration constants
- [ ] Add type safety for voxel keys
- [ ] Remove external ECS callback
- [ ] Create input system
- [ ] Create scene manager
- [ ] Extract voxel generators
- [ ] Add testing infrastructure
- [ ] Add error handling

### Optional Enhancements

- [ ] Renderer abstraction (WebGL2 fallback)
- [ ] Query caching for ECS
- [ ] Dirty region tracking for octree
- [ ] LOD system
- [ ] Frustum culling
- [ ] ECS serialization

---

## 📝 Daily Checklist Template

Copy this for each refactoring session:

```markdown
## Today's Goal: [Feature Name]

**Time Budget:** X hours
**Files to Modify:** [List]

### Pre-work

- [ ] Read relevant documentation
- [ ] Create feature branch: `git checkout -b refactor/feature-name`
- [ ] Backup current state

### Implementation

- [ ] Create new files
- [ ] Write tests (if applicable)
- [ ] Implement feature
- [ ] Run tests: `npm run test`
- [ ] Test manually: `npm run dev`

### Validation

- [ ] All tests pass
- [ ] No linter errors: `npm run lint`
- [ ] App works as before
- [ ] New feature works correctly

### Cleanup

- [ ] Remove commented code
- [ ] Update documentation
- [ ] Commit changes: `git commit -m "refactor: [description]"`

### Notes

[Any issues or observations]
```

---

## 🎓 Best Practices

### During Refactoring:

1. **One thing at a time** - Don't combine multiple refactorings
2. **Test frequently** - Run tests after each small change
3. **Commit often** - Small, focused commits
4. **Keep it working** - App should always run
5. **Document decisions** - Add comments for complex changes

### Testing Strategy:

```bash
# Before starting
npm run dev  # Verify current state

# During refactoring
npm run test  # Run tests frequently

# After completing
npm run test  # All tests pass
npm run build # Builds successfully
npm run dev   # Manual testing
```

### Commit Message Format:

```
refactor: [component] - [what changed]

Examples:
refactor: input - extract input system from engine
refactor: scenes - add scene manager
refactor: voxel - create generator interface
```

---

## 🚨 Rollback Plan

If something goes wrong:

```bash
# Discard uncommitted changes
git reset --hard HEAD

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# Go back to specific commit
git checkout <commit-hash>
```

---

## 📞 Need Help?

### Debug Checklist:

1. Check console for errors
2. Run `npm run lint`
3. Run `npm run test`
4. Check browser DevTools
5. Review recent changes: `git diff`
6. Search for similar issues in the codebase

### Common Issues:

- **Import errors**: Check path aliases in `tsconfig.json` and `vite.config.ts`
- **Type errors**: Ensure all files are updated consistently
- **Runtime errors**: Check initialization order
- **Tests failing**: Ensure mocks are set up correctly

---

## ✨ Success Criteria

You'll know the refactoring is successful when:

- ✅ All tests pass
- ✅ App works as before (or better)
- ✅ Code is easier to understand
- ✅ New features are easier to add
- ✅ You're confident making changes

---

## 🎉 After Completing All Phases

Celebrate! You've significantly improved your codebase:

- **Better separation of concerns**
- **More testable code**
- **Easier to extend**
- **More maintainable**
- **Better developer experience**

### Next Steps:

1. Update README with new architecture
2. Add architecture diagrams
3. Write developer documentation
4. Consider performance optimizations
5. Plan new features using the improved architecture

Good luck! 🚀

