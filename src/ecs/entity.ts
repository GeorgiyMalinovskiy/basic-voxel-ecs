/**
 * Entity represents a unique identifier in the ECS system
 */
export class Entity {
  public readonly id: number;
  private static nextId = 0;

  constructor() {
    this.id = Entity.nextId++;
  }

  /**
   * Create a new entity with a specific ID (useful for networking/serialization)
   */
  static withId(id: number): Entity {
    const entity = Object.create(Entity.prototype);
    entity.id = id;
    Entity.nextId = Math.max(Entity.nextId, id + 1);
    return entity;
  }

  toString(): string {
    return `Entity(${this.id})`;
  }

  equals(other: Entity): boolean {
    return this.id === other.id;
  }
}

