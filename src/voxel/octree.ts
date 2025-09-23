/**
 * Represents a single voxel with density and material information
 */
export interface Voxel {
  density: number; // 0 = empty, 1 = solid, values in between for smooth transitions
  material: number; // Material ID for texturing/coloring
}

/**
 * 3D vector for positions and bounds
 */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Axis-aligned bounding box
 */
export interface AABB {
  min: Vec3;
  max: Vec3;
}

/**
 * Octree node for spatial subdivision
 */
export class OctreeNode {
  public readonly bounds: AABB;
  public readonly level: number;
  public readonly maxLevel: number;

  // Children nodes (8 octants)
  public children: (OctreeNode | null)[] = new Array(8).fill(null);

  // Voxel data (only for leaf nodes)
  public voxels: Map<string, Voxel> = new Map();

  // Whether this node has been subdivided
  public isSubdivided = false;

  constructor(bounds: AABB, level = 0, maxLevel = 8) {
    this.bounds = bounds;
    this.level = level;
    this.maxLevel = maxLevel;
  }

  /**
   * Check if this node is a leaf (cannot be subdivided further)
   */
  isLeaf(): boolean {
    return this.level >= this.maxLevel;
  }

  /**
   * Get the size of this node
   */
  getSize(): number {
    return this.bounds.max.x - this.bounds.min.x;
  }

  /**
   * Get the center of this node
   */
  getCenter(): Vec3 {
    return {
      x: (this.bounds.min.x + this.bounds.max.x) / 2,
      y: (this.bounds.min.y + this.bounds.max.y) / 2,
      z: (this.bounds.min.z + this.bounds.max.z) / 2,
    };
  }

  /**
   * Check if a point is within this node's bounds
   */
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

  /**
   * Get the octant index for a point
   */
  getOctantIndex(point: Vec3): number {
    const center = this.getCenter();
    let index = 0;

    if (point.x >= center.x) index |= 1;
    if (point.y >= center.y) index |= 2;
    if (point.z >= center.z) index |= 4;

    return index;
  }

  /**
   * Get bounds for a specific octant
   */
  getOctantBounds(octantIndex: number): AABB {
    const center = this.getCenter();
    const min = { ...this.bounds.min };
    const max = { ...this.bounds.max };

    if (octantIndex & 1) min.x = center.x;
    else max.x = center.x;

    if (octantIndex & 2) min.y = center.y;
    else max.y = center.y;

    if (octantIndex & 4) min.z = center.z;
    else max.z = center.z;

    return { min, max };
  }

  /**
   * Subdivide this node into 8 children
   */
  subdivide(): void {
    if (this.isSubdivided || this.isLeaf()) return;

    for (let i = 0; i < 8; i++) {
      const octantBounds = this.getOctantBounds(i);
      this.children[i] = new OctreeNode(
        octantBounds,
        this.level + 1,
        this.maxLevel
      );
    }

    this.isSubdivided = true;

    // Move existing voxels to children
    for (const [key, voxel] of this.voxels) {
      const [x, y, z] = key.split(",").map(Number);
      const point = { x, y, z };
      const octantIndex = this.getOctantIndex(point);
      this.children[octantIndex]!.voxels.set(key, voxel);
    }

    // Clear voxels from this node
    this.voxels.clear();
  }

  /**
   * Set a voxel at the given position
   */
  setVoxel(position: Vec3, voxel: Voxel): void {
    if (!this.containsPoint(position)) return;

    const key = `${Math.floor(position.x)},${Math.floor(
      position.y
    )},${Math.floor(position.z)}`;

    if (this.isLeaf()) {
      // Leaf node: store voxel directly
      if (voxel.density === 0) {
        this.voxels.delete(key);
      } else {
        this.voxels.set(key, voxel);
      }
    } else {
      // Non-leaf node: subdivide if necessary and delegate to child
      if (!this.isSubdivided) {
        this.subdivide();
      }

      const octantIndex = this.getOctantIndex(position);
      this.children[octantIndex]?.setVoxel(position, voxel);
    }
  }

  /**
   * Get a voxel at the given position
   */
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

  /**
   * Get all voxels in this node and its children
   */
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

  /**
   * Get all leaf nodes that intersect with the given bounds
   */
  getLeafNodes(bounds?: AABB): OctreeNode[] {
    const result: OctreeNode[] = [];

    // Check if this node intersects with the query bounds
    if (bounds && !this.intersectsBounds(bounds)) {
      return result;
    }

    if (this.isLeaf()) {
      result.push(this);
    } else if (this.isSubdivided) {
      for (const child of this.children) {
        if (child) {
          result.push(...child.getLeafNodes(bounds));
        }
      }
    }

    return result;
  }

  /**
   * Check if this node's bounds intersect with the given bounds
   */
  private intersectsBounds(bounds: AABB): boolean {
    return !(
      this.bounds.max.x <= bounds.min.x ||
      this.bounds.min.x >= bounds.max.x ||
      this.bounds.max.y <= bounds.min.y ||
      this.bounds.min.y >= bounds.max.y ||
      this.bounds.max.z <= bounds.min.z ||
      this.bounds.min.z >= bounds.max.z
    );
  }
}

/**
 * Octree for efficient voxel storage and querying
 */
export class Octree {
  private root: OctreeNode;
  private worldSize: number;

  constructor(worldSize = 256, maxLevel = 8) {
    this.worldSize = worldSize;
    const bounds: AABB = {
      min: { x: 0, y: 0, z: 0 },
      max: { x: worldSize, y: worldSize, z: worldSize },
    };
    this.root = new OctreeNode(bounds, 0, maxLevel);
  }

  /**
   * Set a voxel at the given position
   */
  setVoxel(position: Vec3, voxel: Voxel): void {
    this.root.setVoxel(position, voxel);
  }

  /**
   * Get a voxel at the given position
   */
  getVoxel(position: Vec3): Voxel | null {
    return this.root.getVoxel(position);
  }

  /**
   * Get voxel density at position (0 if no voxel exists)
   */
  getDensity(position: Vec3): number {
    const voxel = this.getVoxel(position);
    return voxel ? voxel.density : 0;
  }

  /**
   * Get all voxels in the octree
   */
  getAllVoxels(): Map<string, Voxel> {
    return this.root.getAllVoxels();
  }

  /**
   * Get all leaf nodes in a region
   */
  getLeafNodes(bounds?: AABB): OctreeNode[] {
    return this.root.getLeafNodes(bounds);
  }

  /**
   * Get the world size
   */
  getWorldSize(): number {
    return this.worldSize;
  }

  /**
   * Clear all voxels
   */
  clear(): void {
    const bounds: AABB = {
      min: { x: 0, y: 0, z: 0 },
      max: { x: this.worldSize, y: this.worldSize, z: this.worldSize },
    };
    this.root = new OctreeNode(bounds, 0, this.root.maxLevel);
  }
}

