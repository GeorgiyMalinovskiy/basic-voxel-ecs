import { Entity } from "./entity";
import { Component } from "./component";
import type { ComponentConstructor } from "./component";
import { System, Query } from "./system";

/**
 * The World manages all entities, components, and systems
 */
export class World {
  private entities = new Set<Entity>();
  private components = new Map<Entity, Map<ComponentConstructor, Component>>();
  private systems: System[] = [];
  private systemsMap = new Map<new () => System, System>();

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
   * Destroy an entity and all its components
   */
  destroyEntity(entity: Entity): void {
    this.entities.delete(entity);
    this.components.delete(entity);
  }

  /**
   * Add a component to an entity
   */
  addComponent<T extends Component>(entity: Entity, component: T): void {
    if (!this.entities.has(entity)) {
      throw new Error(`Entity ${entity.id} does not exist in this world`);
    }

    const entityComponents = this.components.get(entity)!;
    entityComponents.set(
      component.constructor as ComponentConstructor,
      component
    );
  }

  /**
   * Remove a component from an entity
   */
  removeComponent<T extends Component>(
    entity: Entity,
    ComponentType: ComponentConstructor<T>
  ): void {
    const entityComponents = this.components.get(entity);
    if (entityComponents) {
      entityComponents.delete(ComponentType);
    }
  }

  /**
   * Get a component from an entity
   */
  getComponent<T extends Component>(
    entity: Entity,
    ComponentType: ComponentConstructor<T>
  ): T | undefined {
    const entityComponents = this.components.get(entity);
    if (!entityComponents) return undefined;
    return entityComponents.get(ComponentType) as T | undefined;
  }

  /**
   * Check if an entity has a specific component
   */
  hasComponent<T extends Component>(
    entity: Entity,
    ComponentType: ComponentConstructor<T>
  ): boolean {
    const entityComponents = this.components.get(entity);
    if (!entityComponents) return false;
    return entityComponents.has(ComponentType);
  }

  /**
   * Get all components of an entity
   */
  getComponents(entity: Entity): Component[] {
    const entityComponents = this.components.get(entity);
    if (!entityComponents) return [];
    return Array.from(entityComponents.values());
  }

  /**
   * Add a system to the world
   */
  addSystem<T extends System>(system: T): T {
    this.systems.push(system);
    this.systemsMap.set(system.constructor as new () => System, system);
    system.onAddedToWorld(this);
    return system;
  }

  /**
   * Remove a system from the world
   */
  removeSystem<T extends System>(SystemType: new () => T): void {
    const system = this.systemsMap.get(SystemType);
    if (system) {
      const index = this.systems.indexOf(system);
      if (index >= 0) {
        this.systems.splice(index, 1);
      }
      this.systemsMap.delete(SystemType);
      system.onRemovedFromWorld();
    }
  }

  /**
   * Get a system by its type
   */
  getSystem<T extends System>(SystemType: new () => T): T | undefined {
    return this.systemsMap.get(SystemType) as T | undefined;
  }

  /**
   * Query entities based on components
   */
  queryEntities(query: Query): Entity[] {
    const result: Entity[] = [];

    for (const entity of this.entities) {
      if (query.matches(entity, this)) {
        result.push(entity);
      }
    }

    return result;
  }

  /**
   * Get all entities
   */
  getAllEntities(): Entity[] {
    return Array.from(this.entities);
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
   * Get number of entities
   */
  getEntityCount(): number {
    return this.entities.size;
  }

  /**
   * Clear all entities, components, and systems
   */
  clear(): void {
    // Remove all systems
    for (const system of this.systems) {
      system.onRemovedFromWorld();
    }
    this.systems.length = 0;
    this.systemsMap.clear();

    // Clear all entities and components
    this.entities.clear();
    this.components.clear();
  }
}
