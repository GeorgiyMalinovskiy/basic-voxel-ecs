import { Vec3 } from "./types";
import {
  edgeTable,
  triTable,
  cornerOffsets,
  edgeConnections,
} from "./MarchingCubesTables";

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
 * Dense voxel grid interface for marching cubes
 */
export interface VoxelGrid {
  getSizeX(): number;
  getSizeY(): number;
  getSizeZ(): number;
  getDensity(x: number, y: number, z: number): number;
  getMaterial(x: number, y: number, z: number): number;
}

/**
 * Marching Cubes implementation with vertex interpolation
 * Generates smooth organic meshes from voxel density fields
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
   * Generate smooth mesh from voxel grid using marching cubes
   */
  generateMesh(grid: VoxelGrid): Mesh {
    const vertices: MeshVertex[] = [];
    const indices: number[] = [];

    const sizeX = grid.getSizeX();
    const sizeY = grid.getSizeY();
    const sizeZ = grid.getSizeZ();

    // Iterate through each cube in the grid
    for (let x = 0; x < sizeX - 1; x++) {
      for (let y = 0; y < sizeY - 1; y++) {
        for (let z = 0; z < sizeZ - 1; z++) {
          this.processCube(grid, x, y, z, vertices, indices);
        }
      }
    }

    return { vertices, indices };
  }

  /**
   * Process a single cube and generate triangles
   */
  private processCube(
    grid: VoxelGrid,
    x: number,
    y: number,
    z: number,
    vertices: MeshVertex[],
    indices: number[]
  ): void {
    // Get density values at 8 corners
    const cornerValues: number[] = [];
    for (let i = 0; i < 8; i++) {
      const [dx, dy, dz] = cornerOffsets[i];
      cornerValues[i] = grid.getDensity(x + dx, y + dy, z + dz);
    }

    // Determine cube configuration (0-255)
    let cubeIndex = 0;
    for (let i = 0; i < 8; i++) {
      if (cornerValues[i] > this.isoLevel) {
        cubeIndex |= 1 << i;
      }
    }

    // Check if cube is entirely inside or outside
    if (edgeTable[cubeIndex] === 0) {
      return;
    }

    // Find interpolated vertices on edges
    const edgeVertices: Vec3[] = new Array(12);
    for (let i = 0; i < 12; i++) {
      if (edgeTable[cubeIndex] & (1 << i)) {
        const [c1, c2] = edgeConnections[i];
        edgeVertices[i] = this.interpolateVertex(
          x,
          y,
          z,
          c1,
          c2,
          cornerValues[c1],
          cornerValues[c2]
        );
      }
    }

    // Generate triangles using simplified tri table
    // For now, use a simple approach: connect edge vertices
    this.generateTriangles(
      cubeIndex,
      edgeVertices,
      grid,
      x,
      y,
      z,
      vertices,
      indices
    );
  }

  /**
   * Interpolate vertex position along an edge
   */
  private interpolateVertex(
    x: number,
    y: number,
    z: number,
    corner1: number,
    corner2: number,
    value1: number,
    value2: number
  ): Vec3 {
    const [x1, y1, z1] = cornerOffsets[corner1];
    const [x2, y2, z2] = cornerOffsets[corner2];

    // Linear interpolation
    const t = (this.isoLevel - value1) / (value2 - value1);
    const t_clamped = Math.max(0, Math.min(1, t));

    return {
      x: x + x1 + (x2 - x1) * t_clamped,
      y: y + y1 + (y2 - y1) * t_clamped,
      z: z + z1 + (z2 - z1) * t_clamped,
    };
  }

  /**
   * Generate triangles for this cube configuration using the triangle table
   */
  private generateTriangles(
    cubeIndex: number,
    edgeVertices: Vec3[],
    grid: VoxelGrid,
    x: number,
    y: number,
    z: number,
    vertices: MeshVertex[],
    indices: number[]
  ): void {
    // Get the triangle configuration for this cube
    const triangulation = triTable[cubeIndex];

    // Get material color
    const material = grid.getMaterial(x, y, z);
    const color = this.getMaterialColor(material);

    // Generate triangles (each set of 3 indices defines a triangle)
    for (let i = 0; triangulation[i] !== -1; i += 3) {
      const edge0 = triangulation[i];
      const edge1 = triangulation[i + 1];
      const edge2 = triangulation[i + 2];

      // Get the interpolated vertex positions for this triangle
      const v1 = edgeVertices[edge0];
      const v2 = edgeVertices[edge1];
      const v3 = edgeVertices[edge2];

      if (v1 && v2 && v3) {
        const startIdx = vertices.length;

        // Calculate face normal
        const normal = this.calculateNormal(v1, v2, v3);

        // Add vertices with their normals and colors
        vertices.push(
          { position: v1, normal, color },
          { position: v2, normal, color },
          { position: v3, normal, color }
        );

        // Add triangle indices
        indices.push(startIdx, startIdx + 1, startIdx + 2);
      }
    }
  }

  /**
   * Calculate face normal from three vertices
   */
  private calculateNormal(v1: Vec3, v2: Vec3, v3: Vec3): Vec3 {
    // Edge vectors
    const e1x = v2.x - v1.x;
    const e1y = v2.y - v1.y;
    const e1z = v2.z - v1.z;

    const e2x = v3.x - v1.x;
    const e2y = v3.y - v1.y;
    const e2z = v3.z - v1.z;

    // Cross product
    const nx = e1y * e2z - e1z * e2y;
    const ny = e1z * e2x - e1x * e2z;
    const nz = e1x * e2y - e1y * e2x;

    // Normalize
    const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (length > 0) {
      return { x: nx / length, y: ny / length, z: nz / length };
    }
    return { x: 0, y: 1, z: 0 };
  }

  /**
   * Get color based on material ID
   */
  private getMaterialColor(material: number): Vec3 {
    switch (material) {
      case 1:
        return { x: 0.6, y: 0.6, z: 0.6 }; // Stone - gray
      case 2:
        return { x: 0.5, y: 0.4, z: 0.3 }; // Dirt - brown
      case 3:
        return { x: 0.3, y: 0.7, z: 0.3 }; // Grass - green
      case 4:
        return { x: 0.9, y: 0.3, z: 0.3 }; // Red
      case 5:
        return { x: 0.3, y: 0.4, z: 0.9 }; // Blue - brighter
      default:
        return { x: 0.8, y: 0.8, z: 0.8 }; // Light gray instead of white
    }
  }
}
