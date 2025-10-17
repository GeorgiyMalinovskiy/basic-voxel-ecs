/**
 * Simple recursive backtracking maze generator
 */
export class MazeGenerator {
  private width: number;
  private height: number;
  private maze: boolean[][];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.maze = Array(height)
      .fill(null)
      .map(() => Array(width).fill(true)); // true = wall
  }

  /**
   * Generate a maze using recursive backtracking
   */
  generate(): boolean[][] {
    const startX = 1;
    const startZ = 1;
    this.maze[startZ][startX] = false; // Mark as path

    this.carve(startX, startZ);

    // Ensure start and end are clear
    this.maze[1][1] = false;
    this.maze[this.height - 2][this.width - 2] = false;

    return this.maze;
  }

  /**
   * Recursive carving algorithm
   */
  private carve(x: number, z: number): void {
    const directions = [
      [0, -2], // North
      [2, 0], // East
      [0, 2], // South
      [-2, 0], // West
    ];

    // Shuffle directions
    for (let i = directions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [directions[i], directions[j]] = [directions[j], directions[i]];
    }

    for (const [dx, dz] of directions) {
      const newX = x + dx;
      const newZ = z + dz;

      if (
        newX > 0 &&
        newX < this.width - 1 &&
        newZ > 0 &&
        newZ < this.height - 1 &&
        this.maze[newZ][newX]
      ) {
        // Carve path
        this.maze[z + dz / 2][x + dx / 2] = false;
        this.maze[newZ][newX] = false;

        this.carve(newX, newZ);
      }
    }
  }

  /**
   * Get maze data
   */
  getMaze(): boolean[][] {
    return this.maze;
  }

  /**
   * Check if position is a wall
   */
  isWall(x: number, z: number): boolean {
    if (x < 0 || x >= this.width || z < 0 || z >= this.height) {
      return true;
    }
    return this.maze[z][x];
  }
}
