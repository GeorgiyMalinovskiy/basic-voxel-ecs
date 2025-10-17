# Architecture Comparison: Current vs Proposed

## Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         VoxelEngine                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ • Input Handling (keyboard, mouse)                     │ │
│  │ • Camera Movement Logic                                │ │
│  │ • Voxel Generation (sphere, box, terrain)              │ │
│  │ • Game Loop                                            │ │
│  │ • Scene Management (via callback)                      │ │
│  │ • Configuration (hardcoded)                            │ │
│  │ • ECS World Reference                                  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
         │         │          │           │          │
         ▼         ▼          ▼           ▼          ▼
    ┌────────┐ ┌──────┐  ┌────────┐  ┌──────┐  ┌──────┐
    │Renderer│ │Camera│  │ Octree │  │ ECS  │  │Scene │
    └────────┘ └──────┘  └────────┘  │World │  │ (?)  │
                                      └──────┘  └──────┘
                                          │
                                          ▼
                              ┌────────────────────────┐
                              │  External Update       │
                              │  Callback Pattern      │
                              │  (confusing)           │
                              └────────────────────────┘

Issues:
❌ VoxelEngine has too many responsibilities (God Object)
❌ Input tightly coupled to engine
❌ No clear separation between engine and game logic
❌ Scene lifecycle unclear
❌ Hard to test
❌ Hard to extend
```

## Proposed Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                        Application Layer                       │
│  ┌─────────────┐         ┌──────────────┐                     │
│  │    Demo     │────────>│SceneManager  │                     │
│  │   (main)    │         │              │                     │
│  └─────────────┘         └──────────────┘                     │
└───────────────────────────────────┬───────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────┐
│                         Core Engine                            │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                    VoxelEngine (Simplified)              │  │
│  │  • Initialization & Lifecycle                           │  │
│  │  • Component Orchestration                              │  │
│  │  • Public API                                           │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
         │            │            │            │            │
         ▼            ▼            ▼            ▼            ▼
┌──────────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐
│    Input     │ │ Render  │ │  Voxel  │ │   ECS   │ │   Config    │
│   System     │ │ System  │ │ System  │ │  World  │ │   System    │
├──────────────┤ ├─────────┤ ├─────────┤ ├─────────┤ ├─────────────┤
│• InputMgr    │ │• IRenderer│ │• Octree │ │• World  │ │• Config     │
│• Mappings    │ │• Renderers│ │• Gens   │ │• Systems│ │• Settings   │
└──────────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────────┘
       │              │             │           │
       │              ▼             │           │
       │         ┌─────────┐        │           │
       │         │ Camera  │        │           │
       │         │ System  │        │           │
       │         ├─────────┤        │           │
       │         │• Camera │        │           │
       │         │• FPS Ctrl│       │           │
       └────────>│• Orbit Cl│◄──────┘           │
                 └─────────┘                    │
                                                │
┌───────────────────────────────────────────────┘
│              Scene Layer
▼
┌─────────────────────────────────────────────────────────┐
│                    IScene (Interface)                    │
│  • initialize(engine) : Promise<void>                   │
│  • update(deltaTime) : void                             │
│  • cleanup() : void                                     │
└─────────────────────────────────────────────────────────┘
         │                 │                 │
         ▼                 ▼                 ▼
   ┌──────────┐     ┌──────────┐     ┌──────────┐
   │  Demo    │     │   ECS    │     │ Marching │
   │  Scene   │     │  Demo    │     │  Cubes   │
   └──────────┘     └──────────┘     └──────────┘

Benefits:
✅ Clear separation of concerns
✅ Each system is independently testable
✅ Easy to add new camera controllers
✅ Easy to add new scene types
✅ Configuration centralized
✅ Input can be swapped/extended
✅ Renderer can be abstracted (WebGL2 fallback)
```

## System Interactions: Before vs After

### Current: Mixed Responsibilities

```
User Input
    │
    ▼
┌───────────────────┐
│  VoxelEngine      │──┐
│  handles input    │  │ Directly manipulates
│  in update loop   │  │
└───────────────────┘  │
                       ▼
                  ┌─────────┐
                  │ Camera  │
                  └─────────┘

Problems:
- Can't disable input easily
- Can't test camera without engine
- Can't swap input methods
- Hard to add gamepad support
```

### Proposed: Separated Concerns

```
User Input
    │
    ▼
┌─────────────────┐
│  InputManager   │
│  (captures)     │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ CameraController│
│ (interprets)    │
└─────────────────┘
         │
         ▼
    ┌─────────┐
    │ Camera  │
    │ (model) │
    └─────────┘

Benefits:
✅ Each component testable
✅ Can disable/swap at any level
✅ Easy to add new controllers
✅ Clear data flow
```

## Voxel Generation: Before vs After

### Current: Duplication

```
┌──────────────────────────────────────────────────┐
│              VoxelEngine                          │
│  • generateSphere(center, radius, material)      │
│  • generateBox(min, max, material)               │
│  • generateTerrain(size, height)                 │
└──────────────────────────────────────────────────┘
                      ▲
                      │ duplicates
┌──────────────────────────────────────────────────┐
│              BaseScene                            │
│  • generateSphere(...)  [calls engine]           │
│  • generateBox(...)     [calls engine]           │
│  • generateTerrain(...) [calls engine]           │
│  • generateRandomSpheres(...)                    │
│  • generateBuilding(...)                         │
│  • generateCave(...)                             │
└──────────────────────────────────────────────────┘

Issues:
❌ Same logic in two places
❌ Engine knows about world generation
❌ Hard to compose generators
❌ Scene helpers just proxy to engine
```

### Proposed: Composable Generators

```
                ┌────────────────────────┐
                │   IVoxelGenerator      │
                │  • generate(octree)    │
                └────────────────────────┘
                           △
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────────────┐  ┌──────────────┐  ┌──────────────┐
│    Sphere     │  │   Terrain    │  │  Composite   │
│  Generator    │  │  Generator   │  │  Generator   │
└───────────────┘  └──────────────┘  └──────────────┘

Usage in Scene:
const worldGen = new CompositeGenerator()
  .add(new TerrainGenerator(16, config))
  .add(new SphereGenerator({x:5, y:10, z:5}, 2))
  .add(new SphereGenerator({x:10, y:12, z:8}, 3));

worldGen.generate(engine.getOctree());

Benefits:
✅ Reusable generators
✅ Composable
✅ Engine agnostic
✅ Easy to test
✅ No duplication
```

## Data Flow Comparison

### Current Flow

```
main.ts (Demo)
    │
    ├─> Creates VoxelEngine
    │   └─> Internal game loop
    │       ├─> handleInput(deltaTime)
    │       ├─> world.update(deltaTime)
    │       ├─> externalECSUpdate(deltaTime) ← confusing
    │       └─> render()
    │
    └─> Scene.generate(engine)
        └─> Scene.update? (maybe exists)
            └─> Manually updates scene ECS
```

### Proposed Flow

```
main.ts (Demo)
    │
    ├─> Creates VoxelEngine (config)
    │   │
    │   └─> Initializes subsystems:
    │       ├─> InputManager
    │       ├─> Renderer
    │       ├─> Camera + Controller
    │       └─> ECS World
    │
    ├─> Creates SceneManager
    │   └─> loadScene(scene)
    │       └─> scene.initialize(engine)
    │
    └─> Engine game loop
        ├─> inputManager.update()
        ├─> cameraController.update(deltaTime)
        ├─> sceneManager.update(deltaTime)
        │   └─> currentScene.update(deltaTime)
        │       └─> scene's ECS world.update()
        └─> renderer.render()

Clear hierarchy, predictable flow
```

## Testing: Before vs After

### Current: Hard to Test

```typescript
// How do you test camera movement?
// You need to:
// 1. Mock HTMLCanvasElement
// 2. Mock window events
// 3. Create entire VoxelEngine
// 4. Simulate key presses
// 5. Check camera position

// Result: Integration test only, slow, brittle
```

### Proposed: Easy to Test

```typescript
// Unit test input manager
describe("InputManager", () => {
  it("should track key presses", () => {
    const input = new InputManager(mockCanvas);
    input.simulateKeyDown("w");
    expect(input.isKeyPressed("w")).toBe(true);
  });
});

// Unit test camera controller
describe("FPSCameraController", () => {
  it("should move camera forward on W key", () => {
    const input = new MockInputManager();
    input.setKey("w", true);

    const controller = new FPSCameraController(input);
    const camera = new Camera();
    const initialPos = camera.getPosition();

    controller.update(0.016, camera);

    const newPos = camera.getPosition();
    expect(newPos).not.toEqual(initialPos);
  });
});

// Result: Fast, focused unit tests
```

## Extension Examples

### Adding Gamepad Support

#### Current Approach

```typescript
// Modify VoxelEngine class
// Add gamepad polling in handleInput()
// Mix with keyboard/mouse logic
// Risk breaking existing input
```

#### Proposed Approach

```typescript
// Create new input adapter
export class GamepadInputAdapter implements IInputDevice {
  update(): void {
    const gamepads = navigator.getGamepads();
    // Poll gamepad state
  }

  isActionPressed(action: string): boolean {
    // Map gamepad buttons to actions
  }
}

// Register with input manager
inputManager.addDevice(new GamepadInputAdapter());

// No changes to engine or camera controller!
```

### Adding Orbit Camera

#### Current Approach

```typescript
// Add orbit mode flag to engine
// Modify handleInput with conditional logic
// Becomes complex quickly
if (cameraMode === "fps") {
  // fps logic
} else if (cameraMode === "orbit") {
  // orbit logic
} else if (cameraMode === "cinematic") {
  // cinematic logic
}
```

#### Proposed Approach

```typescript
// Create new controller
export class OrbitCameraController implements ICameraController {
  update(deltaTime: number, camera: Camera): void {
    // Orbit-specific logic
  }
}

// Swap controller
engine.setCameraController(new OrbitCameraController(inputManager));

// Clean, no conditionals in engine
```

## Performance Improvements Enabled

### Proposed: Dirty Region Tracking

```
Current: Full octree traversal every mesh update
         ▼
    ┌─────────┐
    │ Octree  │──> getAllVoxels()
    └─────────┘    (expensive)
         │
         ▼
    ┌──────────────┐
    │MarchingCubes │
    └──────────────┘

Proposed: Only regenerate changed regions
         ▼
    ┌─────────┐    ┌──────────────────┐
    │ Octree  │───>│ DirtyTracker     │
    └─────────┘    └──────────────────┘
                            │
                   Only dirty regions
                            ▼
                   ┌──────────────────┐
                   │  MarchingCubes   │
                   │  (partial update)│
                   └──────────────────┘

Result: 10-100x faster updates for small changes
```

### Proposed: Query Caching

```
Current: Query executed every frame
    world.queryEntities(query) → O(n) every frame

Proposed: Cached queries
    queryCache.get(query, world) → O(1) when cached
    Invalidate on entity/component changes

Result: Significant performance gain for large entity counts
```

## Migration Path

### Phase 1: Foundation (Week 1)

```
1. Create new folders: core/, input/, config/
2. Move configuration to config/
3. Create InputManager (don't use yet)
4. Add tests for new code
```

### Phase 2: Input Migration (Week 2)

```
5. Switch VoxelEngine to use InputManager
6. Test thoroughly
7. Remove old input handling code
```

### Phase 3: Camera Controllers (Week 2-3)

```
8. Create ICameraController interface
9. Extract FPSCameraController
10. Update VoxelEngine to use controller
```

### Phase 4: Scene System (Week 3)

```
11. Create SceneManager
12. Update IScene interface
13. Remove external update callback
```

### Phase 5: Generators (Week 4)

```
14. Create generator interfaces
15. Extract generators from engine
16. Update scenes to use generators
17. Remove generation methods from engine
```

### Phase 6: Polish (Week 5)

```
18. Add error handling
19. Improve types
20. Add more tests
21. Update documentation
```

## Summary Table

| Aspect              | Current       | Proposed        | Benefit                |
| ------------------- | ------------- | --------------- | ---------------------- |
| **Testability**     | Hard          | Easy            | Fast, reliable tests   |
| **Extensibility**   | Modify engine | Add new classes | Open/Closed principle  |
| **Complexity**      | Centralized   | Distributed     | Easier to understand   |
| **Coupling**        | Tight         | Loose           | Independent components |
| **Reusability**     | Low           | High            | Compose behaviors      |
| **Maintainability** | Difficult     | Easy            | Clear responsibilities |
| **Performance**     | Good          | Better          | Optimizations enabled  |

## Conclusion

The proposed architecture maintains all current functionality while providing:

- **Better separation of concerns**
- **Improved testability**
- **Greater flexibility**
- **Easier maintenance**
- **Room for optimization**

The migration can be done incrementally without breaking existing functionality, making it a low-risk, high-reward refactoring.

