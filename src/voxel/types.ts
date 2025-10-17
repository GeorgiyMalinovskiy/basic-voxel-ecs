/**
 * 3D vector/position
 */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Voxel data
 */
export interface Voxel {
  density: number; // 0-1, for marching cubes
  material: number; // Material ID
}

/**
 * Axis-Aligned Bounding Box
 */
export interface AABB {
  min: Vec3;
  max: Vec3;
}
