import { Vec3, Voxel, Octree } from "./octree";

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

// Edge table: which edges are intersected for each cube configuration
const EDGE_TABLE = [
  0x0, 0x109, 0x203, 0x30a, 0x406, 0x50f, 0x605, 0x70c, 0x80c, 0x905, 0xa0f,
  0xb06, 0xc0a, 0xd03, 0xe09, 0xf00, 0x190, 0x99, 0x393, 0x29a, 0x596, 0x49f,
  0x795, 0x69c, 0x99c, 0x895, 0xb9f, 0xa96, 0xd9a, 0xc93, 0xf99, 0xe90,
  // ... (continuing with full 256 entries)
  // For brevity, showing pattern - in real implementation, include all 256 values
];

// Triangle table: which triangles to draw for each cube configuration
const TRIANGLE_TABLE = [
  [],
  [0, 8, 3],
  [0, 1, 9],
  [1, 8, 3, 9, 8, 1],
  [1, 2, 10],
  [0, 8, 3, 1, 2, 10],
  [9, 2, 10, 0, 2, 9],
  [2, 8, 3, 2, 10, 8, 10, 9, 8],
  [3, 11, 2],
  [0, 11, 2, 8, 11, 0],
  // ... (continuing with full 256 entries)
  // For brevity, showing pattern - in real implementation, include all 256 triangle configurations
];

/**
 * Full edge table (256 entries)
 */
const FULL_EDGE_TABLE = new Array(256).fill(0).map((_, i) => {
  // This is a simplified generation - in practice, you'd use the pre-computed table
  let value = 0;
  if (i & 1) value |= 0x001;
  if (i & 2) value |= 0x002;
  if (i & 4) value |= 0x004;
  if (i & 8) value |= 0x008;
  if (i & 16) value |= 0x010;
  if (i & 32) value |= 0x020;
  if (i & 64) value |= 0x040;
  if (i & 128) value |= 0x080;
  return value;
});

/**
 * Simplified triangle table for demonstration
 */
const FULL_TRIANGLE_TABLE: number[][] = new Array(256).fill([]).map((_, i) => {
  // This is highly simplified - real marching cubes needs the full lookup table
  // For demonstration, we'll generate basic triangulations
  const triangles: number[] = [];

  // Simple case: if any corners are solid, generate a basic triangle
  if (i > 0 && i < 255) {
    // Generate triangles based on bit pattern (simplified)
    if (i & 1) triangles.push(0, 1, 2);
    if (i & 2) triangles.push(1, 3, 2);
    // Add more triangle patterns as needed
  }

  return triangles;
});

/**
 * Marching cubes implementation
 */
export class MarchingCubes {
  private isoLevel = 0.5; // Density threshold for surface

  constructor(isoLevel = 0.5) {
    this.isoLevel = isoLevel;
  }

  /**
   * Generate mesh from octree using simple cube rendering (temporary implementation)
   */
  generateMesh(octree: Octree, resolution = 1): Mesh {
    const vertices: MeshVertex[] = [];
    const indices: number[] = [];

    const worldSize = octree.getWorldSize();

    // Simple cube-based rendering for now
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
   * Add a simple cube for a voxel
   */
  private addCube(
    vertices: MeshVertex[],
    indices: number[],
    position: Vec3,
    size: number,
    voxel: Voxel
  ): void {
    // Use direct material color instead of getMaterialColor for now
    const color = this.getVoxelColor(voxel);
    const baseIndex = vertices.length;

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

    // Define face normals
    const normals = [
      { x: 0, y: 0, z: 1 }, // Front
      { x: 0, y: 0, z: -1 }, // Back
      { x: 1, y: 0, z: 0 }, // Right
      { x: -1, y: 0, z: 0 }, // Left
      { x: 0, y: 1, z: 0 }, // Top
      { x: 0, y: -1, z: 0 }, // Bottom
    ];

    // Define faces (which vertices to use for each face)
    const faces = [
      [0, 1, 2, 3], // Front
      [5, 4, 7, 6], // Back
      [1, 5, 6, 2], // Right
      [4, 0, 3, 7], // Left
      [3, 2, 6, 7], // Top
      [4, 5, 1, 0], // Bottom
    ];

    // Add vertices for each face
    for (let f = 0; f < faces.length; f++) {
      const face = faces[f];
      const normal = normals[f];

      // Add 4 vertices for this face
      for (let v = 0; v < 4; v++) {
        vertices.push({
          position: cubeVertices[face[v]],
          normal: normal,
          color: color,
        });
      }

      // Add 2 triangles for this face (quad made of 2 triangles)
      const faceBaseIndex = baseIndex + f * 4;
      indices.push(
        faceBaseIndex,
        faceBaseIndex + 1,
        faceBaseIndex + 2,
        faceBaseIndex,
        faceBaseIndex + 2,
        faceBaseIndex + 3
      );
    }
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
    const edgeFlags = FULL_EDGE_TABLE[cubeIndex];
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
    const triangles = FULL_TRIANGLE_TABLE[cubeIndex];
    for (let i = 0; i < triangles.length; i += 3) {
      const v1 = edgeVertices[triangles[i]];
      const v2 = edgeVertices[triangles[i + 1]];
      const v3 = edgeVertices[triangles[i + 2]];

      if (v1 !== null && v2 !== null && v3 !== null) {
        indices.push(v1, v2, v3);
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
