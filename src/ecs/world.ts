import { Entity } from "./Entity";
import { Component, ComponentClass } from "./Component";
import { System } from "./System";

/**
 * World - manages entities, components, and systems
 */
export class World {
  private entities = new Set<Entity>();
  private components = new Map<Entity, Map<ComponentClass, Component>>();
  private systems: System[] = [];

  /**
   * Create a new entity
   */
  createEntity(): Entity {
    const entity = new Entity();
    this.entities.add(entity);
    this.components.set(entity, new Map());
    return entity;
  }

  /**
   * Destroy an entity
   */
  destroyEntity(entity: Entity): void {
    this.entities.delete(entity);
    this.components.delete(entity);
  }

  /**
   * Add a component to an entity
   */
  addComponent<T extends Component>(entity: Entity, component: T): void {
    const entityComponents = this.components.get(entity);
    if (entityComponents) {
      entityComponents.set(component.constructor as ComponentClass, component);
    }
  }

  /**
   * Get a component from an entity
   */
  getComponent<T extends Component>(
    entity: Entity,
    componentClass: ComponentClass<T>
  ): T | undefined {
    const entityComponents = this.components.get(entity);
    return entityComponents?.get(componentClass) as T | undefined;
  }

  /**
   * Check if entity has a component
   */
  hasComponent<T extends Component>(
    entity: Entity,
    componentClass: ComponentClass<T>
  ): boolean {
    return this.components.get(entity)?.has(componentClass) ?? false;
  }

  /**
   * Query entities with specific components
   */
  query(...componentClasses: ComponentClass[]): Entity[] {
    const result: Entity[] = [];
    for (const entity of this.entities) {
      const has = componentClasses.every((cls) =>
        this.hasComponent(entity, cls)
      );
      if (has) {
        result.push(entity);
      }
    }
    return result;
  }

  /**
   * Add a system
   */
  addSystem(system: System): void {
    this.systems.push(system);
    system.onAddedToWorld(this);
  }

  /**
   * Update all systems
   */
  update(deltaTime: number): void {
    for (const system of this.systems) {
      system.update(deltaTime);
    }
  }

  /**
   * Get all entities
   */
  getAllEntities(): Entity[] {
    return Array.from(this.entities);
  }
}
