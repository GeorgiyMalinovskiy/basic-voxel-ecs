import { Vec3, Voxel, AABB } from "./types";

/**
 * Octree node for sparse voxel storage
 */
class OctreeNode {
  public bounds: AABB;
  public level: number;
  public maxLevel: number;
  public children: (OctreeNode | null)[] = new Array(8).fill(null);
  public voxels = new Map<string, Voxel>();
  public isSubdivided = false;

  constructor(bounds: AABB, level = 0, maxLevel = 6) {
    this.bounds = bounds;
    this.level = level;
    this.maxLevel = maxLevel;
  }

  isLeaf(): boolean {
    return this.level >= this.maxLevel;
  }

  getCenter(): Vec3 {
    return {
      x: (this.bounds.min.x + this.bounds.max.x) / 2,
      y: (this.bounds.min.y + this.bounds.max.y) / 2,
      z: (this.bounds.min.z + this.bounds.max.z) / 2,
    };
  }

  containsPoint(point: Vec3): boolean {
    return (
      point.x >= this.bounds.min.x &&
      point.x < this.bounds.max.x &&
      point.y >= this.bounds.min.y &&
      point.y < this.bounds.max.y &&
      point.z >= this.bounds.min.z &&
      point.z < this.bounds.max.z
    );
  }

  getOctantIndex(point: Vec3): number {
    const center = this.getCenter();
    let index = 0;
    if (point.x >= center.x) index |= 1;
    if (point.y >= center.y) index |= 2;
    if (point.z >= center.z) index |= 4;
    return index;
  }

  getOctantBounds(index: number): AABB {
    const center = this.getCenter();
    const min = { ...this.bounds.min };
    const max = { ...this.bounds.max };

    if (index & 1) min.x = center.x;
    else max.x = center.x;

    if (index & 2) min.y = center.y;
    else max.y = center.y;

    if (index & 4) min.z = center.z;
    else max.z = center.z;

    return { min, max };
  }

  subdivide(): void {
    if (this.isSubdivided || this.isLeaf()) return;

    for (let i = 0; i < 8; i++) {
      const bounds = this.getOctantBounds(i);
      this.children[i] = new OctreeNode(bounds, this.level + 1, this.maxLevel);
    }

    this.isSubdivided = true;

    // Move voxels to children
    for (const [key, voxel] of this.voxels) {
      const [x, y, z] = key.split(",").map(Number);
      const point = { x, y, z };
      const octantIndex = this.getOctantIndex(point);
      this.children[octantIndex]!.voxels.set(key, voxel);
    }

    this.voxels.clear();
  }

  setVoxel(position: Vec3, voxel: Voxel): void {
    if (!this.containsPoint(position)) return;

    const key = `${Math.floor(position.x)},${Math.floor(
      position.y
    )},${Math.floor(position.z)}`;

    if (this.isLeaf()) {
      if (voxel.density === 0) {
        this.voxels.delete(key);
      } else {
        this.voxels.set(key, voxel);
      }
    } else {
      if (!this.isSubdivided) {
        this.subdivide();
      }
      const octantIndex = this.getOctantIndex(position);
      this.children[octantIndex]?.setVoxel(position, voxel);
    }
  }

  getVoxel(position: Vec3): Voxel | null {
    if (!this.containsPoint(position)) return null;

    const key = `${Math.floor(position.x)},${Math.floor(
      position.y
    )},${Math.floor(position.z)}`;

    if (this.isLeaf()) {
      return this.voxels.get(key) || null;
    } else if (this.isSubdivided) {
      const octantIndex = this.getOctantIndex(position);
      return this.children[octantIndex]?.getVoxel(position) || null;
    }

    return null;
  }

  getAllVoxels(): Map<string, Voxel> {
    const result = new Map<string, Voxel>();

    if (this.isLeaf()) {
      for (const [key, voxel] of this.voxels) {
        result.set(key, voxel);
      }
    } else if (this.isSubdivided) {
      for (const child of this.children) {
        if (child) {
          for (const [key, voxel] of child.getAllVoxels()) {
            result.set(key, voxel);
          }
        }
      }
    }

    return result;
  }
}

/**
 * Sparse voxel octree
 */
export class Octree {
  private root: OctreeNode;
  private worldSize: number;

  constructor(worldSize = 64, maxLevel = 6) {
    this.worldSize = worldSize;
    const bounds: AABB = {
      min: { x: 0, y: 0, z: 0 },
      max: { x: worldSize, y: worldSize, z: worldSize },
    };
    this.root = new OctreeNode(bounds, 0, maxLevel);
  }

  setVoxel(position: Vec3, voxel: Voxel): void {
    this.root.setVoxel(position, voxel);
  }

  getVoxel(position: Vec3): Voxel | null {
    return this.root.getVoxel(position);
  }

  getDensity(position: Vec3): number {
    const voxel = this.getVoxel(position);
    return voxel ? voxel.density : 0;
  }

  getMaterial(position: Vec3): number {
    const voxel = this.getVoxel(position);
    return voxel ? voxel.material : 0;
  }

  getAllVoxels(): Map<string, Voxel> {
    return this.root.getAllVoxels();
  }

  getWorldSize(): number {
    return this.worldSize;
  }

  clear(): void {
    const bounds: AABB = {
      min: { x: 0, y: 0, z: 0 },
      max: { x: this.worldSize, y: this.worldSize, z: this.worldSize },
    };
    this.root = new OctreeNode(bounds, 0, this.root.maxLevel);
  }
}
