/**
 * Component - pure data, no logic
 */
export abstract class Component {
  abstract getType(): string;
}

export type ComponentClass<T extends Component = Component> = new (
  ...args: any[]
) => T;
