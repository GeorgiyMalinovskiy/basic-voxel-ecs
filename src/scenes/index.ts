import { Scene } from "./base-scene";
import { ECSDemoScene } from "./ecs-demo";

// Re-export ECS demo
export { ECSDemoScene } from "./ecs-demo";

// Base classes
export { BaseScene } from "./base-scene";
export type { Scene } from "./base-scene";

/**
 * All available scenes
 */
export const ALL_SCENES: Scene[] = [new ECSDemoScene()];

/**
 * Get scene by name
 */
export function getSceneByName(name: string): Scene | undefined {
  return ALL_SCENES.find((scene) => scene.name === name);
}

/**
 * Get scene by index
 */
export function getSceneByIndex(index: number): Scene | undefined {
  return ALL_SCENES[index];
}
