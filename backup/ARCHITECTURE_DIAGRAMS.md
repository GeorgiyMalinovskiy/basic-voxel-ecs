# Architecture Diagrams

Visual representations of the current and proposed architectures.

---

## Current Architecture: God Object Pattern

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            VoxelEngine                                   │
│                         (458 lines, 20+ methods)                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  RESPONSIBILITIES:                                                       │
│  • Input handling (keyboard, mouse)                  ┌─────────────────┐│
│  • Camera movement calculation                       │  Game Loop      ││
│  • Camera control (orbit, translate)                 │  • update()     ││
│  • Voxel generation (sphere, box, terrain)           │  • render()     ││
│  • Scene management (external callback)              │  • handleInput()││
│  • ECS world management                              └─────────────────┘│
│  • Rendering orchestration                                              │
│  • Window resize handling                                               │
│  • Configuration (hardcoded)                                            │
│                                                                          │
│  DEPENDENCIES: (8 direct dependencies)                                  │
│  ├─> World (ECS)                                                        │
│  ├─> WebGPURenderer                                                     │
│  ├─> Camera                                                             │
│  ├─> VoxelRenderer                                                      │
│  ├─> Octree                                                             │
│  ├─> HTMLCanvasElement                                                  │
│  ├─> window (global)                                                    │
│  └─> document (global)                                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Problems:

- ❌ Too many responsibilities (violates SRP)
- ❌ Hard to test (requires full setup)
- ❌ Hard to extend (modification required)
- ❌ Tight coupling (can't swap components)
- ❌ Mixed concerns (UI, logic, rendering)

---

## Proposed Architecture: Modular System

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Application Layer                             │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────┐         ┌──────────────┐        ┌──────────────┐   │
│  │    Demo     │────────▶│SceneManager  │───────▶│  IScene      │   │
│  │   (main)    │         │              │        │  • init()    │   │
│  │             │         │ • loadScene()│        │  • update()  │   │
│  │             │         │ • update()   │        │  • cleanup() │   │
│  └─────────────┘         └──────────────┘        └──────────────┘   │
│        │                                                             │
│        │ creates & configures                                       │
│        ▼                                                             │
└──────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────┐
│                          Engine Layer                                 │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                VoxelEngine (Simplified)                         │  │
│  │                   (~200 lines, 10 methods)                      │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │  RESPONSIBILITIES:                                             │  │
│  │  • System orchestration                                        │  │
│  │  • Lifecycle management (init, start, stop)                    │  │
│  │  • Public API                                                  │  │
│  │                                                                │  │
│  │  GAME LOOP:                                                    │  │
│  │  update(deltaTime) {                                           │  │
│  │    inputManager.update();           ← delegated                │  │
│  │    cameraController.update(dt);     ← delegated                │  │
│  │    world.update(dt);                ← delegated                │  │
│  │    voxelRenderer.update();          ← delegated                │  │
│  │  }                                                             │  │
│  └────────────────────────────────────────────────────────────────┘  │
│         │           │              │           │            │         │
│         │           │              │           │            │         │
└─────────┼───────────┼──────────────┼───────────┼────────────┼─────────┘
          │           │              │           │            │
          ▼           ▼              ▼           ▼            ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        Subsystem Layer                                │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐│
│  │   Input      │  │   Camera     │  │   Voxel      │  │  Config  ││
│  │   System     │  │   System     │  │   System     │  │  System  ││
│  ├──────────────┤  ├──────────────┤  ├──────────────┤  ├──────────┤│
│  │• InputMgr    │  │• Camera      │  │• Octree      │  │• Config  ││
│  │• Devices     │  │• IController │  │• IGenerator  │  │• Settings││
│  │• Actions     │  │• FPS/Orbit   │  │• Renderers   │  └──────────┘│
│  └──────────────┘  └──────────────┘  └──────────────┘               │
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │   Render     │  │     ECS      │  │   Physics    │               │
│  │   System     │  │   System     │  │   System     │               │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤               │
│  │• IRenderer   │  │• World       │  │• IAdapter    │               │
│  │• WebGPU      │  │• Entities    │  │• Cannon      │               │
│  │• WebGL2      │  │• Systems     │  │• Simple      │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### Benefits:

- ✅ Single responsibility per component
- ✅ Easy to test (mock dependencies)
- ✅ Easy to extend (add implementations)
- ✅ Loose coupling (swap implementations)
- ✅ Clear separation of concerns

---

## Component Interaction: Current vs Proposed

### Current: Direct Coupling

```
┌─────────────┐
│    Demo     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│         VoxelEngine                 │
│                                     │
│  handleInput() {                    │
│    if (keys.has('w'))              │
│      camera.translate(...)         │──┐
│  }                                  │  │ Direct manipulation
│                                     │  │
│  update() {                         │  │
│    handleInput()                    │  │
│    world.update()                   │  │
│  }                                  │  │
└─────────────────────────────────────┘  │
       │                                 │
       └─────────────────────────────────┘
              ▼
       ┌───────────┐
       │  Camera   │
       └───────────┘

Issues:
• Can't disable input independently
• Can't test camera without engine
• Can't swap input methods
• Hard to add new input types
```

### Proposed: Mediated Interaction

```
┌─────────────┐
│    Demo     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│         VoxelEngine                 │
│                                     │
│  update(deltaTime) {                │
│    inputManager.update();           │──┐
│    cameraController.update(dt);     │  │ Delegation
│    world.update(dt);                │  │
│  }                                  │  │
└─────────────────────────────────────┘  │
       │                                 │
       └─────────────────────────────────┘
              ▼                        ▼
       ┌─────────────┐         ┌─────────────────┐
       │InputManager │────────▶│CameraController │
       │             │         │                 │
       │• capture    │  reads  │• interpret      │
       │• map        │  state  │• apply          │
       └─────────────┘         └─────────────────┘
                                       │
                                       │ modifies
                                       ▼
                                ┌───────────┐
                                │  Camera   │
                                └───────────┘

Benefits:
✓ Can disable input independently
✓ Can test each component separately
✓ Can swap implementations easily
✓ Easy to add new input types
✓ Clear data flow
```

---

## Data Flow Comparison

### Current Data Flow

```
User Input
    │
    ├─> Keyboard Event
    │   └─> window.addEventListener('keydown')
    │       └─> engine.keys.add(key)
    │
    └─> Mouse Event
        └─> document.addEventListener('mousemove')
            └─> engine.mouseDelta += movement

                    ↓ (every frame)

            engine.handleInput(dt)
            • Check keys.has('w')
            • Calculate forward vector
            • Call camera.translate()
            • Check mouseDelta
            • Call camera.orbit()
            • Reset mouseDelta

                    ↓

                Camera updated

Problems:
❌ Input, logic, and camera control mixed
❌ Can't test logic without full setup
❌ Hard to modify or extend
```

### Proposed Data Flow

```
User Input
    │
    ├─> Keyboard Event
    │   └─> KeyboardMouseDevice
    │       └─> keys.add(key)
    │
    └─> Mouse Event
        └─> KeyboardMouseDevice
            └─> mouseDelta += movement

                    ↓ (every frame)

        inputManager.update()
        • Update all devices
        • Aggregate input state

                    ↓

    cameraController.update(dt)
    • Query: inputManager.isActionActive(MOVE_FORWARD)
    • Calculate: offset = forward * speed * dt
    • Apply: camera.translate(offset)
    • Query: inputManager.getActionValue(LOOK_HORIZONTAL)
    • Apply: camera.orbit(delta)

                    ↓

                Camera updated

Benefits:
✅ Clear separation of concerns
✅ Each component testable
✅ Easy to swap or extend
✅ Predictable data flow
```

---

## Testing Architecture

### Current: Integration Tests Only

```
┌────────────────────────────────────────────┐
│          Test Setup Required:               │
│  • Mock HTMLCanvasElement                  │
│  • Mock window events                      │
│  • Mock WebGPU (complex!)                  │
│  • Initialize full VoxelEngine             │
│  • Set up scene                            │
└────────────────────────────────────────────┘
              ↓
┌────────────────────────────────────────────┐
│        Test Execution:                      │
│  1. Simulate keydown event                 │
│  2. Call engine.update()                   │
│  3. Check camera.getPosition()             │
└────────────────────────────────────────────┘

Result: Slow, complex, brittle tests
```

### Proposed: Unit + Integration Tests

```
Unit Tests (Fast, Simple):
┌────────────────────────────────────────────┐
│      Test InputManager:                     │
│  • Mock canvas                             │
│  • Test key tracking                       │
│  • Test action mapping                     │
│  Time: <1ms                                │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│   Test CameraController:                    │
│  • Mock InputManager                       │
│  • Create real Camera                      │
│  • Test movement logic                     │
│  Time: <1ms                                │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│   Test VoxelGenerator:                      │
│  • Create real Octree                      │
│  • Test generation                         │
│  • Verify voxels created                   │
│  Time: ~5ms                                │
└────────────────────────────────────────────┘

Integration Tests (Complete):
┌────────────────────────────────────────────┐
│   Test Full Engine:                         │
│  • All components together                 │
│  • End-to-end functionality                │
│  Time: ~100ms                              │
└────────────────────────────────────────────┘

Result: Fast, focused, reliable test suite
```

---

## Extension Examples

### Adding Gamepad Support

#### Current Approach

```
Modify VoxelEngine
    ├─> Add gamepad polling in handleInput()
    ├─> Mix with keyboard/mouse logic
    ├─> Risk breaking existing input
    └─> Test entire engine again

Lines Changed: ~50
Files Modified: 1 (engine.ts)
Risk: HIGH
Test Coverage: Hard
```

#### Proposed Approach

```
Create GamepadDevice
    ├─> Implement IInputDevice
    ├─> Poll gamepad state
    └─> Map buttons to actions

inputManager.addDevice(new GamepadDevice())

Lines Changed: ~100 (new file)
Files Modified: 1 (new file)
Risk: LOW
Test Coverage: Easy
```

### Adding Orbit Camera

#### Current Approach

```
Modify VoxelEngine
    ├─> Add camera mode flag
    ├─> Add conditional logic in handleInput()
    │   if (mode === 'fps') { ... }
    │   else if (mode === 'orbit') { ... }
    ├─> Complexity increases
    └─> Test both modes together

Lines Changed: ~80
Files Modified: 1 (engine.ts)
Risk: MEDIUM
Complexity: +30%
```

#### Proposed Approach

```
Create OrbitCameraController
    ├─> Implement ICameraController
    └─> Different update() logic

engine.setCameraController(
  new OrbitCameraController(camera, input)
)

Lines Changed: ~120 (new file)
Files Modified: 1 (new file)
Risk: LOW
Complexity: No change to engine
```

---

## Directory Structure Comparison

### Current Structure

```
src/
├── ecs/                    # ECS core (flat)
│   ├── component.ts
│   ├── entity.ts
│   ├── system.ts
│   └── world.ts
├── physics/                # Physics adapters
│   ├── cannon-adapter.ts
│   ├── physics-adapter.ts
│   ├── physics-factory.ts
│   └── simple-adapter.ts
├── renderer/               # Rendering
│   ├── camera.ts
│   ├── shaders.ts
│   ├── voxel-renderer.ts
│   └── webgpu.ts
├── scenes/                 # Scene system
│   ├── base-scene.ts
│   ├── demo/
│   └── ecs-demo/
├── voxel/                  # Voxel system (flat)
│   ├── marching-cubes.ts
│   └── octree.ts
├── engine.ts               # GOD OBJECT (458 lines)
├── index.ts
└── main.ts                 # Demo application

Issues:
• No clear separation of core vs features
• Input handling buried in engine
• No configuration system
• No utilities folder
• Flat structure in some folders
```

### Proposed Structure

```
src/
├── core/                   # Core engine
│   ├── engine.ts          # Simplified (~200 lines)
│   ├── lifecycle.ts
│   ├── config.ts
│   └── errors.ts
├── input/                  # Input system (NEW)
│   ├── input-manager.ts
│   ├── devices/
│   │   ├── keyboard-mouse.ts
│   │   └── gamepad.ts
│   └── actions.ts
├── ecs/                    # ECS system
│   ├── core/
│   │   ├── entity.ts
│   │   ├── component.ts
│   │   ├── system.ts
│   │   └── world.ts
│   ├── serialization.ts   # NEW
│   └── query-cache.ts     # NEW
├── voxel/                  # Voxel system
│   ├── octree.ts
│   ├── marching-cubes.ts
│   ├── voxel-key.ts       # NEW
│   ├── dirty-tracker.ts   # NEW
│   └── generators/        # NEW
│       ├── generator.interface.ts
│       ├── sphere.ts
│       ├── box.ts
│       ├── terrain.ts
│       └── composite.ts
├── renderer/               # Rendering system
│   ├── interfaces/        # NEW
│   │   └── renderer.interface.ts
│   ├── webgpu/
│   │   ├── webgpu-renderer.ts
│   │   └── voxel-renderer.ts
│   ├── camera/            # NEW
│   │   ├── camera.ts
│   │   └── controllers/
│   │       ├── controller.interface.ts
│   │       ├── fps-controller.ts
│   │       └── orbit-controller.ts
│   └── shaders/
├── physics/                # Physics system
│   ├── interfaces/
│   └── adapters/
├── scenes/                 # Scene system
│   ├── scene-manager.ts   # NEW
│   ├── scene.interface.ts
│   └── demos/
├── utils/                  # Utilities (NEW)
│   ├── math.ts
│   └── async.ts
├── index.ts                # Main exports
└── main.ts                 # Demo application

Benefits:
✓ Clear separation of concerns
✓ Feature-based organization
✓ Easy to navigate
✓ Scalable structure
✓ Obvious where new code goes
```

---

## Metrics Dashboard

### Complexity Metrics

```
┌──────────────────────────────────────────────────────────┐
│                    VoxelEngine Class                      │
├──────────────────────────────────────────────────────────┤
│  Metric              Current    Proposed    Improvement  │
├──────────────────────────────────────────────────────────┤
│  Lines of Code       458        ~200        -56%         │
│  Methods             23         10          -57%         │
│  Responsibilities    8          2           -75%         │
│  Dependencies        8          6           -25%         │
│  Cyclomatic          High       Low         -60%         │
│  Complexity                                              │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                    Testability Score                      │
├──────────────────────────────────────────────────────────┤
│  Component           Current    Proposed    Improvement  │
├──────────────────────────────────────────────────────────┤
│  Input Handling      1/10       9/10        +800%        │
│  Camera Control      2/10       9/10        +350%        │
│  Voxel Generation    4/10       9/10        +125%        │
│  Scene Management    3/10       8/10        +167%        │
│  Overall Engine      2/10       7/10        +250%        │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                   Extension Points                        │
├──────────────────────────────────────────────────────────┤
│  Feature             Current    Proposed                 │
├──────────────────────────────────────────────────────────┤
│  Input Devices       0          ∞ (via interface)        │
│  Camera Types        0          ∞ (via interface)        │
│  Renderers           0          ∞ (via interface)        │
│  Voxel Generators    0          ∞ (via interface)        │
│  Scene Types         ∞          ∞ (improved lifecycle)   │
└──────────────────────────────────────────────────────────┘
```

---

## Summary Comparison

```
┌─────────────────────────────────────────────────────────────┐
│                    CURRENT ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────┤
│  Characteristics:                                           │
│  • Monolithic engine class                                  │
│  • Everything in one place                                  │
│  • Direct coupling                                          │
│  • Hard to test                                             │
│  • Hard to extend                                           │
│                                                             │
│  Good for:                                                  │
│  ✓ Prototyping                                              │
│  ✓ Small projects                                           │
│  ✓ Learning                                                 │
│                                                             │
│  Bad for:                                                   │
│  ✗ Testing                                                  │
│  ✗ Maintenance                                              │
│  ✗ Team development                                         │
│  ✗ Scaling features                                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    PROPOSED ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────┤
│  Characteristics:                                           │
│  • Modular system design                                    │
│  • Clear separation of concerns                             │
│  • Loose coupling                                           │
│  • Easy to test                                             │
│  • Easy to extend                                           │
│                                                             │
│  Good for:                                                  │
│  ✓ Testing                                                  │
│  ✓ Maintenance                                              │
│  ✓ Team development                                         │
│  ✓ Scaling features                                         │
│  ✓ Long-term projects                                       │
│                                                             │
│  Investment:                                                │
│  • 2-4 weeks initial refactoring                            │
│  • High return on investment                                │
│  • Pays off quickly with new features                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Next Steps

1. Review these diagrams alongside the other documentation
2. Choose a starting point from QUICK_START_REFACTORING.md
3. Begin with small, incremental changes
4. Test frequently
5. Commit often
6. Celebrate progress!

Remember: You don't need to implement everything at once. Each improvement makes the codebase better! 🚀

