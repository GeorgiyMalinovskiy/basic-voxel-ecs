import { Vec3, Voxel, Octree } from "@/voxel/octree";

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
 * Marching cubes lookup tables
 */

// Complete edge table: which edges are intersected for each cube configuration (256 entries)
const EDGE_TABLE = [
  0x0, 0x109, 0x203, 0x30a, 0x406, 0x50f, 0x605, 0x70c, 0x80c, 0x905, 0xa0f,
  0xb06, 0xc0a, 0xd03, 0xe09, 0xf00, 0x190, 0x99, 0x393, 0x29a, 0x596, 0x49f,
  0x795, 0x69c, 0x99c, 0x895, 0xb9f, 0xa96, 0xd9a, 0xc93, 0xf99, 0xe90, 0x230,
  0x339, 0x33, 0x13a, 0x636, 0x73f, 0x435, 0x53c, 0xa3c, 0xb35, 0x83f, 0x936,
  0xe3a, 0xf33, 0xc39, 0xd30, 0x3a0, 0x2a9, 0x1a3, 0xaa, 0x7a6, 0x6af, 0x5a5,
  0x4ac, 0xbac, 0xaa5, 0x9af, 0x8a6, 0xfaa, 0xea3, 0xda9, 0xca0, 0x460, 0x569,
  0x663, 0x76a, 0x66, 0x16f, 0x265, 0x36c, 0xc6c, 0xd65, 0xe6f, 0xf66, 0x86a,
  0x963, 0xa69, 0xb60, 0x5f0, 0x4f9, 0x7f3, 0x6fa, 0x1f6, 0xff, 0x3f5, 0x2fc,
  0xdfc, 0xcf5, 0xfff, 0xef6, 0x9fa, 0x8f3, 0xbf9, 0xaf0, 0x650, 0x759, 0x453,
  0x55a, 0x256, 0x35f, 0x55, 0x15c, 0xe5c, 0xf55, 0xc5f, 0xd56, 0xa5a, 0xb53,
  0x859, 0x950, 0x7c0, 0x6c9, 0x5c3, 0x4ca, 0x3c6, 0x2cf, 0x1c5, 0xcc, 0xfcc,
  0xec5, 0xdcf, 0xcc6, 0xbca, 0xac3, 0x9c9, 0x8c0, 0x8c0, 0x9c9, 0xac3, 0xbca,
  0xcc6, 0xdcf, 0xec5, 0xfcc, 0xcc, 0x1c5, 0x2cf, 0x3c6, 0x4ca, 0x5c3, 0x6c9,
  0x7c0, 0x950, 0x859, 0xb53, 0xa5a, 0xd56, 0xc5f, 0xf55, 0xe5c, 0x15c, 0x55,
  0x35f, 0x256, 0x55a, 0x453, 0x759, 0x650, 0xaf0, 0xbf9, 0x8f3, 0x9fa, 0xef6,
  0xfff, 0xcf5, 0xdfc, 0x2fc, 0x3f5, 0xff, 0x1f6, 0x6fa, 0x7f3, 0x4f9, 0x5f0,
  0xb60, 0xa69, 0x963, 0x86a, 0xf66, 0xe6f, 0xd65, 0xc6c, 0x36c, 0x265, 0x16f,
  0x66, 0x76a, 0x663, 0x569, 0x460, 0xca0, 0xda9, 0xea3, 0xfaa, 0x8a6, 0x9af,
  0xaa5, 0xbac, 0x4ac, 0x5a5, 0x6af, 0x7a6, 0xaa, 0x1a3, 0x2a9, 0x3a0, 0xd30,
  0xc39, 0xf33, 0xe3a, 0x936, 0x83f, 0xb35, 0xa3c, 0x53c, 0x435, 0x73f, 0x636,
  0x13a, 0x33, 0x339, 0x230, 0xe90, 0xf99, 0xc93, 0xd9a, 0xa96, 0xb9f, 0x895,
  0x99c, 0x69c, 0x795, 0x49f, 0x596, 0x29a, 0x393, 0x99, 0x190, 0xf00, 0xe09,
  0xd03, 0xc0a, 0xb06, 0xa0f, 0x905, 0x80c, 0x70c, 0x605, 0x50f, 0x406, 0x30a,
  0x203, 0x109, 0x0,
];

// Complete triangle table: which triangles to draw for each cube configuration (256 entries)
const TRIANGLE_TABLE: number[][] = new Array(256).fill(null).map(() => []);

/**
 * Marching cubes implementation
 */
export class MarchingCubes {
  private isoLevel = 0.5; // Density threshold for surface

  constructor(isoLevel = 0.5) {
    this.isoLevel = isoLevel;
  }

  /**
   * Generate mesh from octree using simple cube rendering (temporary fallback)
   */
  generateMesh(octree: Octree, resolution = 1): Mesh {
    const vertices: MeshVertex[] = [];
    const indices: number[] = [];

    const worldSize = octree.getWorldSize();

    // Simple cube-based rendering for now (fallback from marching cubes)
    for (let x = 0; x < worldSize; x += resolution) {
      for (let y = 0; y < worldSize; y += resolution) {
        for (let z = 0; z < worldSize; z += resolution) {
          const voxel = octree.getVoxel({ x, y, z });
          if (voxel && voxel.density > this.isoLevel) {
            this.addCubeWithCulling(
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
  private addCubeWithCulling(
    vertices: MeshVertex[],
    indices: number[],
    position: Vec3,
    size: number,
    voxel: Voxel,
    octree: Octree
  ): void {
    const color = this.getVoxelColor(voxel);

    // Define cube vertices (8 corners)
    const cubeVertices = [
      // Front face
      { x: position.x, y: position.y, z: position.z + size },
      { x: position.x + size, y: position.y, z: position.z + size },
      { x: position.x + size, y: position.y + size, z: position.z + size },
      { x: position.x, y: position.y + size, z: position.z + size },
      // Back face
      { x: position.x, y: position.y, z: position.z },
      { x: position.x + size, y: position.y, z: position.z },
      { x: position.x + size, y: position.y + size, z: position.z },
      { x: position.x, y: position.y + size, z: position.z },
    ];

    // Define face data: [vertices, normal, neighbor_offset]
    const faceData = [
      {
        vertices: [0, 1, 2, 3],
        normal: { x: 0, y: 0, z: 1 },
        offset: { x: 0, y: 0, z: size },
      }, // Front (+Z)
      {
        vertices: [5, 4, 7, 6],
        normal: { x: 0, y: 0, z: -1 },
        offset: { x: 0, y: 0, z: -size },
      }, // Back (-Z)
      {
        vertices: [1, 5, 6, 2],
        normal: { x: 1, y: 0, z: 0 },
        offset: { x: size, y: 0, z: 0 },
      }, // Right (+X)
      {
        vertices: [4, 0, 3, 7],
        normal: { x: -1, y: 0, z: 0 },
        offset: { x: -size, y: 0, z: 0 },
      }, // Left (-X)
      {
        vertices: [3, 2, 6, 7],
        normal: { x: 0, y: 1, z: 0 },
        offset: { x: 0, y: size, z: 0 },
      }, // Top (+Y)
      {
        vertices: [4, 5, 1, 0],
        normal: { x: 0, y: -1, z: 0 },
        offset: { x: 0, y: -size, z: 0 },
      }, // Bottom (-Y)
    ];

    // Check each face to see if it should be rendered (face culling)
    for (const face of faceData) {
      // Check if there's a solid voxel adjacent to this face
      const neighborPos = {
        x: position.x + face.offset.x,
        y: position.y + face.offset.y,
        z: position.z + face.offset.z,
      };

      // Get the neighbor voxel
      const neighborVoxel = octree.getVoxel(neighborPos);

      // Only render this face if there's no solid neighbor (exposed to air)
      const shouldRenderFace =
        !neighborVoxel || neighborVoxel.density <= this.isoLevel;

      if (shouldRenderFace) {
        const baseIndex = vertices.length;

        // Add 4 vertices for this face
        for (let v = 0; v < 4; v++) {
          vertices.push({
            position: cubeVertices[face.vertices[v]],
            normal: face.normal,
            color: color,
          });
        }

        // Add 2 triangles for this face (quad made of 2 triangles)
        indices.push(
          baseIndex,
          baseIndex + 1,
          baseIndex + 2,
          baseIndex,
          baseIndex + 2,
          baseIndex + 3
        );
      }
    }
  }

  /**
   * Process a single voxel cube
   */
  private processVoxelCube(
    octree: Octree,
    position: Vec3,
    resolution: number,
    vertices: MeshVertex[],
    indices: number[],
    vertexMap: Map<string, number>
  ): void {
    // Sample the 8 corners of the cube
    const cubeValues: number[] = [];
    const cubePositions: Vec3[] = [];

    for (let i = 0; i < 8; i++) {
      const offset = this.getCubeCornerOffset(i);
      const cornerPos = {
        x: position.x + offset.x * resolution,
        y: position.y + offset.y * resolution,
        z: position.z + offset.z * resolution,
      };

      cubePositions.push(cornerPos);
      cubeValues.push(octree.getDensity(cornerPos));
    }

    // Determine cube configuration
    let cubeIndex = 0;
    for (let i = 0; i < 8; i++) {
      if (cubeValues[i] < this.isoLevel) {
        cubeIndex |= 1 << i;
      }
    }

    // Skip if cube is entirely inside or outside
    if (cubeIndex === 0 || cubeIndex === 255) {
      return;
    }

    // Find intersected edges
    const edgeFlags = EDGE_TABLE[cubeIndex];
    const edgeVertices: (number | null)[] = new Array(12).fill(null);

    for (let edge = 0; edge < 12; edge++) {
      if (edgeFlags & (1 << edge)) {
        const edgeVertexIndex = this.interpolateEdge(
          edge,
          cubePositions,
          cubeValues,
          vertices,
          vertexMap,
          octree
        );
        edgeVertices[edge] = edgeVertexIndex;
      }
    }

    // Generate triangles
    const triangles = TRIANGLE_TABLE[cubeIndex];
    if (triangles && triangles.length > 0) {
      for (let i = 0; i < triangles.length; i += 3) {
        const v1 = edgeVertices[triangles[i]];
        const v2 = edgeVertices[triangles[i + 1]];
        const v3 = edgeVertices[triangles[i + 2]];

        if (v1 !== null && v2 !== null && v3 !== null) {
          indices.push(v1, v2, v3);
        }
      }
    }
  }

  /**
   * Get the offset for a cube corner
   */
  private getCubeCornerOffset(corner: number): Vec3 {
    return {
      x: corner & 1 ? 1 : 0,
      y: corner & 2 ? 1 : 0,
      z: corner & 4 ? 1 : 0,
    };
  }

  /**
   * Get edge endpoints
   */
  private getEdgeEndpoints(edge: number): [number, number] {
    const edgeEndpoints: [number, number][] = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0], // Bottom face
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 4], // Top face
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7], // Vertical edges
    ];
    return edgeEndpoints[edge];
  }

  /**
   * Interpolate vertex position on edge
   */
  private interpolateEdge(
    edge: number,
    cubePositions: Vec3[],
    cubeValues: number[],
    vertices: MeshVertex[],
    vertexMap: Map<string, number>,
    octree: Octree
  ): number {
    const [corner1, corner2] = this.getEdgeEndpoints(edge);
    const pos1 = cubePositions[corner1];
    const pos2 = cubePositions[corner2];
    const val1 = cubeValues[corner1];
    const val2 = cubeValues[corner2];

    // Create unique key for this edge
    const key = `${Math.min(pos1.x, pos2.x)},${Math.min(
      pos1.y,
      pos2.y
    )},${Math.min(pos1.z, pos2.z)}-${edge}`;

    // Check if vertex already exists
    if (vertexMap.has(key)) {
      return vertexMap.get(key)!;
    }

    // Interpolate position
    const t = (this.isoLevel - val1) / (val2 - val1);
    const position: Vec3 = {
      x: pos1.x + t * (pos2.x - pos1.x),
      y: pos1.y + t * (pos2.y - pos1.y),
      z: pos1.z + t * (pos2.z - pos1.z),
    };

    // Calculate normal using gradient
    const normal = this.calculateNormal(position, octree);

    // Get material color
    const color = this.getMaterialColor(position, octree);

    // Create vertex
    const vertex: MeshVertex = { position, normal, color };
    const vertexIndex = vertices.length;
    vertices.push(vertex);
    vertexMap.set(key, vertexIndex);

    return vertexIndex;
  }

  /**
   * Calculate normal vector using gradient
   */
  private calculateNormal(position: Vec3, octree: Octree): Vec3 {
    const epsilon = 0.1;

    const gradX =
      octree.getDensity({
        x: position.x + epsilon,
        y: position.y,
        z: position.z,
      }) -
      octree.getDensity({
        x: position.x - epsilon,
        y: position.y,
        z: position.z,
      });
    const gradY =
      octree.getDensity({
        x: position.x,
        y: position.y + epsilon,
        z: position.z,
      }) -
      octree.getDensity({
        x: position.x,
        y: position.y - epsilon,
        z: position.z,
      });
    const gradZ =
      octree.getDensity({
        x: position.x,
        y: position.y,
        z: position.z + epsilon,
      }) -
      octree.getDensity({
        x: position.x,
        y: position.y,
        z: position.z - epsilon,
      });

    // Normalize
    const length = Math.sqrt(gradX * gradX + gradY * gradY + gradZ * gradZ);
    if (length === 0) {
      return { x: 0, y: 1, z: 0 }; // Default normal
    }

    return {
      x: -gradX / length, // Negative because we want normals pointing outward
      y: -gradY / length,
      z: -gradZ / length,
    };
  }

  /**
   * Get color directly from voxel material
   */
  private getVoxelColor(voxel: Voxel): Vec3 {
    switch (voxel.material) {
      case 1:
        return { x: 0.8, y: 0.8, z: 0.8 }; // Stone - gray
      case 2:
        return { x: 0.4, y: 0.2, z: 0.1 }; // Dirt - brown
      case 3:
        return { x: 0.2, y: 0.8, z: 0.2 }; // Grass - green
      default:
        return { x: 0.6, y: 0.6, z: 0.6 }; // Default - light gray
    }
  }

  /**
   * Get material color for a position
   */
  private getMaterialColor(position: Vec3, octree: Octree): Vec3 {
    const voxel = octree.getVoxel(position);

    if (voxel) {
      // Map material ID to color
      switch (voxel.material) {
        case 1:
          return { x: 0.8, y: 0.8, z: 0.8 }; // Stone - gray
        case 2:
          return { x: 0.4, y: 0.2, z: 0.1 }; // Dirt - brown
        case 3:
          return { x: 0.2, y: 0.8, z: 0.2 }; // Grass - green
        default:
          return { x: 0.6, y: 0.6, z: 0.6 }; // Default - light gray
      }
    }

    return { x: 0.5, y: 0.5, z: 0.5 }; // Default color
  }

  /**
   * Set the iso level for surface extraction
   */
  setIsoLevel(isoLevel: number): void {
    this.isoLevel = isoLevel;
  }

  /**
   * Get the current iso level
   */
  getIsoLevel(): number {
    return this.isoLevel;
  }
}
