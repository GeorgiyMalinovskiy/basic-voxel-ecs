import { Entity } from "./entity";
import { Component } from "./component";
import type { ComponentConstructor } from "./component";
import { World } from "./world";

/**
 * Query for filtering entities based on components
 */
export class Query {
  public readonly withComponents: ComponentConstructor[];
  public readonly withoutComponents: ComponentConstructor[];

  constructor(
    options: {
      with?: ComponentConstructor[];
      without?: ComponentConstructor[];
    } = {}
  ) {
    this.withComponents = options.with || [];
    this.withoutComponents = options.without || [];
  }

  /**
   * Check if an entity matches this query
   */
  matches(entity: Entity, world: World): boolean {
    // Must have all required components
    for (const ComponentType of this.withComponents) {
      if (!world.hasComponent(entity, ComponentType)) {
        return false;
      }
    }

    // Must not have any excluded components
    for (const ComponentType of this.withoutComponents) {
      if (world.hasComponent(entity, ComponentType)) {
        return false;
      }
    }

    return true;
  }
}

/**
 * Base class for all systems in the ECS
 */
export abstract class System {
  protected world!: World;
  protected query?: Query;

  /**
   * Called when the system is added to the world
   */
  onAddedToWorld(world: World): void {
    this.world = world;
  }

  /**
   * Called when the system is removed from the world
   */
  onRemovedFromWorld(): void {
    // Override if needed
  }

  /**
   * Main update loop - called every frame
   */
  abstract update(deltaTime: number): void;

  /**
   * Get all entities that match this system's query
   */
  protected getEntities(): Entity[] {
    if (!this.query) return [];
    return this.world.queryEntities(this.query);
  }

  /**
   * Set the query for this system
   */
  protected setQuery(query: Query): void {
    this.query = query;
  }
}
