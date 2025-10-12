import { Component } from "../../ecs";

/**
 * Position component - stores 3D position
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
 * Velocity component - stores 3D velocity
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
 * Rotation component - stores rotation angles
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
 * Scale component - stores scale factors
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
 * Voxel component - stores voxel data for rendering
 */
export class VoxelComponent extends Component {
  constructor(
    public voxelType: "sphere" | "box" | "terrain" = "box",
    public material: number = 1,
    public size: number = 1
  ) {
    super();
  }

  getType(): string {
    return "VoxelComponent";
  }

  clone(): VoxelComponent {
    return new VoxelComponent(this.voxelType, this.material, this.size);
  }
}

/**
 * Physics component - stores physics properties
 */
export class PhysicsComponent extends Component {
  constructor(
    public mass: number = 1,
    public friction: number = 0.8,
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
 * Lifetime component - stores entity lifetime
 */
export class LifetimeComponent extends Component {
  constructor(public timeLeft: number = 10) {
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
 * Spawner component - spawns new entities
 */
export class SpawnerComponent extends Component {
  constructor(
    public spawnType: "sphere" | "box" = "sphere",
    public spawnRate: number = 1,
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
      this.spawnType,
      this.spawnRate,
      this.lastSpawn,
      this.maxEntities
    );
  }
}

/**
 * Player component - marks player entity
 */
export class PlayerComponent extends Component {
  constructor(public health: number = 100) {
    super();
  }

  getType(): string {
    return "PlayerComponent";
  }

  clone(): PlayerComponent {
    return new PlayerComponent(this.health);
  }
}

/**
 * Camera component - marks camera entity
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
 * Input component - stores input state for player
 */
export class InputComponent extends Component {
  constructor(
    public moveForward: boolean = false,
    public moveBackward: boolean = false,
    public moveLeft: boolean = false,
    public moveRight: boolean = false,
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
      this.moveForward,
      this.moveBackward,
      this.moveLeft,
      this.moveRight,
      this.jump,
      this.mouseX,
      this.mouseY,
      this.mouseDeltaX,
      this.mouseDeltaY
    );
  }
}
