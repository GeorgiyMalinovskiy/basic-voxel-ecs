import { Vec3, Voxel, Octree } from "./Octree";

/**
 * Vertex data for generated mesh
 */
export interface MeshVertex {
  position: Vec3;
  normal: Vec3;
  color: Vec3;
}

/**
 * Generated mesh data
 */
export interface Mesh {
  vertices: MeshVertex[];
  indices: number[];
}

/**
 * Marching Cubes mesh generator (with simple cube fallback)
 */
export class MarchingCubes {
  private isoLevel = 0.5;

  constructor(isoLevel = 0.5) {
    this.isoLevel = isoLevel;
  }

  setIsoLevel(level: number): void {
    this.isoLevel = level;
  }

  /**
   * Generate mesh from octree using simple cube rendering with face culling
   */
  generateMesh(octree: Octree, resolution = 1): Mesh {
    const vertices: MeshVertex[] = [];
    const indices: number[] = [];
    const worldSize = octree.getWorldSize();

    // Generate cubes for solid voxels
    for (let x = 0; x < worldSize; x += resolution) {
      for (let y = 0; y < worldSize; y += resolution) {
        for (let z = 0; z < worldSize; z += resolution) {
          const voxel = octree.getVoxel({ x, y, z });
          if (voxel && voxel.density > this.isoLevel) {
            this.addCube(
              vertices,
              indices,
              { x, y, z },
              resolution,
              voxel,
              octree
            );
          }
        }
      }
    }

    return { vertices, indices };
  }

  /**
   * Add a cube with face culling - only render exposed faces
   */
  private addCube(
    vertices: MeshVertex[],
    indices: number[],
    pos: Vec3,
    size: number,
    voxel: Voxel,
    octree: Octree
  ): void {
    const startIndex = vertices.length;
    const color = this.getMaterialColor(voxel.material);

    // Check neighbors for face culling
    const neighbors = {
      right:
        octree.getDensity({ x: pos.x + size, y: pos.y, z: pos.z }) >
        this.isoLevel,
      left:
        octree.getDensity({ x: pos.x - size, y: pos.y, z: pos.z }) >
        this.isoLevel,
      top:
        octree.getDensity({ x: pos.x, y: pos.y + size, z: pos.z }) >
        this.isoLevel,
      bottom:
        octree.getDensity({ x: pos.x, y: pos.y - size, z: pos.z }) >
        this.isoLevel,
      front:
        octree.getDensity({ x: pos.x, y: pos.y, z: pos.z + size }) >
        this.isoLevel,
      back:
        octree.getDensity({ x: pos.x, y: pos.y, z: pos.z - size }) >
        this.isoLevel,
    };

    // Right face (+X)
    if (!neighbors.right) {
      this.addFace(vertices, indices, pos, size, [1, 0, 0], color, startIndex);
    }

    // Left face (-X)
    if (!neighbors.left) {
      this.addFace(vertices, indices, pos, size, [-1, 0, 0], color, startIndex);
    }

    // Top face (+Y)
    if (!neighbors.top) {
      this.addFace(vertices, indices, pos, size, [0, 1, 0], color, startIndex);
    }

    // Bottom face (-Y)
    if (!neighbors.bottom) {
      this.addFace(vertices, indices, pos, size, [0, -1, 0], color, startIndex);
    }

    // Front face (+Z)
    if (!neighbors.front) {
      this.addFace(vertices, indices, pos, size, [0, 0, 1], color, startIndex);
    }

    // Back face (-Z)
    if (!neighbors.back) {
      this.addFace(vertices, indices, pos, size, [0, 0, -1], color, startIndex);
    }
  }

  /**
   * Add a single face
   */
  private addFace(
    vertices: MeshVertex[],
    indices: number[],
    pos: Vec3,
    size: number,
    normal: number[],
    color: Vec3,
    baseIndex: number
  ): void {
    const currentIndex = vertices.length;
    const [nx, ny, nz] = normal;

    // Calculate face vertices based on normal direction
    const faceVertices: Vec3[] = [];

    if (nx !== 0) {
      // X-aligned face
      const x = nx > 0 ? pos.x + size : pos.x;
      faceVertices.push(
        { x, y: pos.y, z: pos.z },
        { x, y: pos.y + size, z: pos.z },
        { x, y: pos.y + size, z: pos.z + size },
        { x, y: pos.y, z: pos.z + size }
      );
    } else if (ny !== 0) {
      // Y-aligned face
      const y = ny > 0 ? pos.y + size : pos.y;
      faceVertices.push(
        { x: pos.x, y, z: pos.z },
        { x: pos.x + size, y, z: pos.z },
        { x: pos.x + size, y, z: pos.z + size },
        { x: pos.x, y, z: pos.z + size }
      );
    } else {
      // Z-aligned face
      const z = nz > 0 ? pos.z + size : pos.z;
      faceVertices.push(
        { x: pos.x, y: pos.y, z },
        { x: pos.x + size, y: pos.y, z },
        { x: pos.x + size, y: pos.y + size, z },
        { x: pos.x, y: pos.y + size, z }
      );
    }

    // Add vertices
    for (const v of faceVertices) {
      vertices.push({
        position: v,
        normal: { x: nx, y: ny, z: nz },
        color,
      });
    }

    // Add indices (two triangles per face)
    const i = currentIndex;
    indices.push(i, i + 1, i + 2, i, i + 2, i + 3);
  }

  /**
   * Get color based on material ID
   */
  private getMaterialColor(material: number): Vec3 {
    switch (material) {
      case 1:
        return { x: 0.5, y: 0.5, z: 0.5 }; // Stone - gray
      case 2:
        return { x: 0.4, y: 0.3, z: 0.2 }; // Dirt - brown
      case 3:
        return { x: 0.2, y: 0.8, z: 0.2 }; // Grass - green
      case 4:
        return { x: 0.8, y: 0.2, z: 0.2 }; // Red
      case 5:
        return { x: 0.2, y: 0.2, z: 0.8 }; // Blue
      default:
        return { x: 1.0, y: 1.0, z: 1.0 }; // White
    }
  }
}
