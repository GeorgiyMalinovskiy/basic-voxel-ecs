import { Component } from "@/ecs";

/**
 * Position component for ECS entities
 */
export class PositionComponent extends Component {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0
  ) {
    super();
  }

  getType(): string {
    return "PositionComponent";
  }

  clone(): PositionComponent {
    return new PositionComponent(this.x, this.y, this.z);
  }
}

/**
 * Velocity component for ECS entities
 */
export class VelocityComponent extends Component {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0
  ) {
    super();
  }

  getType(): string {
    return "VelocityComponent";
  }

  clone(): VelocityComponent {
    return new VelocityComponent(this.x, this.y, this.z);
  }
}

/**
 * Rotation component for ECS entities
 */
export class RotationComponent extends Component {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0
  ) {
    super();
  }

  getType(): string {
    return "RotationComponent";
  }

  clone(): RotationComponent {
    return new RotationComponent(this.x, this.y, this.z);
  }
}

/**
 * Scale component for ECS entities
 */
export class ScaleComponent extends Component {
  constructor(
    public x: number = 1,
    public y: number = 1,
    public z: number = 1
  ) {
    super();
  }

  getType(): string {
    return "ScaleComponent";
  }

  clone(): ScaleComponent {
    return new ScaleComponent(this.x, this.y, this.z);
  }
}

/**
 * Voxel component for ECS entities
 */
export class VoxelComponent extends Component {
  constructor(public size: number = 1, public material: number = 1) {
    super();
  }

  getType(): string {
    return "VoxelComponent";
  }

  clone(): VoxelComponent {
    return new VoxelComponent(this.size, this.material);
  }
}

/**
 * Physics component for ECS entities
 */
export class PhysicsComponent extends Component {
  constructor(
    public mass: number = 1,
    public friction: number = 0.3,
    public bounce: number = 0.3,
    public gravity: boolean = true
  ) {
    super();
  }

  getType(): string {
    return "PhysicsComponent";
  }

  clone(): PhysicsComponent {
    return new PhysicsComponent(
      this.mass,
      this.friction,
      this.bounce,
      this.gravity
    );
  }
}

/**
 * Lifetime component for ECS entities
 */
export class LifetimeComponent extends Component {
  constructor(public timeLeft: number = 5.0) {
    super();
  }

  getType(): string {
    return "LifetimeComponent";
  }

  clone(): LifetimeComponent {
    return new LifetimeComponent(this.timeLeft);
  }
}

/**
 * Spawner component for ECS entities
 */
export class SpawnerComponent extends Component {
  constructor(
    public spawnRate: number = 1.0,
    public lastSpawn: number = 0,
    public maxEntities: number = 10
  ) {
    super();
  }

  getType(): string {
    return "SpawnerComponent";
  }

  clone(): SpawnerComponent {
    return new SpawnerComponent(
      this.spawnRate,
      this.lastSpawn,
      this.maxEntities
    );
  }
}

/**
 * Player component for ECS entities
 */
export class PlayerComponent extends Component {
  constructor(public speed: number = 5.0, public jumpForce: number = 10.0) {
    super();
  }

  getType(): string {
    return "PlayerComponent";
  }

  clone(): PlayerComponent {
    return new PlayerComponent(this.speed, this.jumpForce);
  }
}

/**
 * Camera component for ECS entities
 */
export class CameraComponent extends Component {
  constructor(
    public fov: number = 75,
    public near: number = 0.1,
    public far: number = 1000
  ) {
    super();
  }

  getType(): string {
    return "CameraComponent";
  }

  clone(): CameraComponent {
    return new CameraComponent(this.fov, this.near, this.far);
  }
}

/**
 * Input component for ECS entities
 */
export class InputComponent extends Component {
  constructor(
    public forward: boolean = false,
    public backward: boolean = false,
    public left: boolean = false,
    public right: boolean = false,
    public jump: boolean = false,
    public mouseX: number = 0,
    public mouseY: number = 0,
    public mouseDeltaX: number = 0,
    public mouseDeltaY: number = 0
  ) {
    super();
  }

  getType(): string {
    return "InputComponent";
  }

  clone(): InputComponent {
    return new InputComponent(
      this.forward,
      this.backward,
      this.left,
      this.right,
      this.jump,
      this.mouseX,
      this.mouseY,
      this.mouseDeltaX,
      this.mouseDeltaY
    );
  }
}

/**
 * Maze component for ECS entities
 */
export class MazeComponent extends Component {
  constructor(
    public width: number = 20,
    public height: number = 20,
    public wallHeight: number = 3,
    public wallThickness: number = 1
  ) {
    super();
  }

  getType(): string {
    return "MazeComponent";
  }

  clone(): MazeComponent {
    return new MazeComponent(
      this.width,
      this.height,
      this.wallHeight,
      this.wallThickness
    );
  }
}

/**
 * Collectible component for ECS entities
 */
export class CollectibleComponent extends Component {
  constructor(public value: number = 1, public collected: boolean = false) {
    super();
  }

  getType(): string {
    return "CollectibleComponent";
  }

  clone(): CollectibleComponent {
    return new CollectibleComponent(this.value, this.collected);
  }
}

