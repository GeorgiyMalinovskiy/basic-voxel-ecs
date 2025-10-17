import { Mesh, MeshVertex, Vec3 } from "./types";

/**
 * Generate simple voxel meshes for entities
 */
export class VoxelMeshGenerator {
  /**
   * Generate a simple cube mesh
   */
  static generateCube(
    size = 1,
    color: Vec3 = { x: 0.8, y: 0.2, z: 0.2 }
  ): Mesh {
    const vertices: MeshVertex[] = [];
    const indices: number[] = [];

    const s = size / 2; // Half size for centered cube

    // Define cube faces with proper winding order
    const faces = [
      // Right (+X)
      {
        vertices: [
          { x: s, y: -s, z: -s },
          { x: s, y: s, z: -s },
          { x: s, y: s, z: s },
          { x: s, y: -s, z: s },
        ],
        normal: { x: 1, y: 0, z: 0 },
      },
      // Left (-X)
      {
        vertices: [
          { x: -s, y: -s, z: s },
          { x: -s, y: s, z: s },
          { x: -s, y: s, z: -s },
          { x: -s, y: -s, z: -s },
        ],
        normal: { x: -1, y: 0, z: 0 },
      },
      // Top (+Y)
      {
        vertices: [
          { x: -s, y: s, z: -s },
          { x: s, y: s, z: -s },
          { x: s, y: s, z: s },
          { x: -s, y: s, z: s },
        ],
        normal: { x: 0, y: 1, z: 0 },
      },
      // Bottom (-Y)
      {
        vertices: [
          { x: -s, y: -s, z: s },
          { x: s, y: -s, z: s },
          { x: s, y: -s, z: -s },
          { x: -s, y: -s, z: -s },
        ],
        normal: { x: 0, y: -1, z: 0 },
      },
      // Front (+Z)
      {
        vertices: [
          { x: -s, y: -s, z: s },
          { x: s, y: -s, z: s },
          { x: s, y: s, z: s },
          { x: -s, y: s, z: s },
        ],
        normal: { x: 0, y: 0, z: 1 },
      },
      // Back (-Z)
      {
        vertices: [
          { x: s, y: -s, z: -s },
          { x: -s, y: -s, z: -s },
          { x: -s, y: s, z: -s },
          { x: s, y: s, z: -s },
        ],
        normal: { x: 0, y: 0, z: -1 },
      },
    ];

    // Build mesh from faces
    for (const face of faces) {
      const startIndex = vertices.length;

      // Add vertices for this face
      for (const pos of face.vertices) {
        vertices.push({
          position: pos,
          normal: face.normal,
          color,
        });
      }

      // Add indices (two triangles per face)
      indices.push(
        startIndex,
        startIndex + 1,
        startIndex + 2,
        startIndex,
        startIndex + 2,
        startIndex + 3
      );
    }

    return { vertices, indices };
  }

  /**
   * Generate a player character (simple biped)
   */
  static generatePlayer(color: Vec3 = { x: 0.2, y: 0.5, z: 0.9 }): Mesh {
    // For now, just return a cube. Can be extended later for a character model
    return this.generateCube(1.8, color); // Slightly taller for player
  }
}
