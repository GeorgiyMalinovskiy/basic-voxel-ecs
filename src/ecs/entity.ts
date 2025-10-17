/**
 * Entity - just a unique ID
 */
export class Entity {
  private static nextId = 0;
  public readonly id: number;

  constructor() {
    this.id = Entity.nextId++;
  }

  toString(): string {
    return `Entity(${this.id})`;
  }
}
