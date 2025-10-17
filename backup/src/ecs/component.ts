/**
 * Base class for all components in the ECS system
 */
export abstract class Component {
  /**
   * Unique identifier for this component type
   */
  static readonly ComponentType: string;

  /**
   * Get the component type identifier
   */
  abstract getType(): string;

  /**
   * Clone this component (useful for copying entities)
   */
  abstract clone(): Component;
}

/**
 * Type helper for component constructors
 */
export type ComponentConstructor<T extends Component = Component> = new (
  ...args: any[]
) => T;

/**
 * Component registry to map type strings to constructors
 */
export class ComponentRegistry {
  private static registry = new Map<string, ComponentConstructor>();

  static register<T extends Component>(
    type: string,
    constructor: ComponentConstructor<T>
  ): void {
    ComponentRegistry.registry.set(type, constructor);
  }

  static get<T extends Component>(
    type: string
  ): ComponentConstructor<T> | undefined {
    return ComponentRegistry.registry.get(type) as ComponentConstructor<T>;
  }

  static has(type: string): boolean {
    return ComponentRegistry.registry.has(type);
  }

  static getAllTypes(): string[] {
    return Array.from(ComponentRegistry.registry.keys());
  }
}

