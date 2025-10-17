import { DemoScene } from "@/scenes/demo";
import { BaseScene, type Scene } from "@/scenes/base-scene";

export { BaseScene, type Scene };

/**
 * All available scenes
 */
export const ALL_SCENES: Scene[] = [
  // new ECSDemoScene(),
  new DemoScene(),
];

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
